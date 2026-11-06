import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { ShopPrintHandoffError } from './shop-print-handoff';
import type { ShopFinalPrintSources, ShopSourceMaster } from './shop-final-print';

const markerName = '.halleus-shop-private-originals';
const markerContents = 'HALLEUS_SHOP_PRIVATE_ORIGINALS_V1\n';
const manifestName = 'source-manifest.json';
const maxOriginalBytes = 300_000_000;
const shaPattern = /^[a-f0-9]{64}$/i;

type SourceDefinition = {
  kind: 'moon-map' | 'moon-disc' | 'milky-way-photo';
  filename: string;
  sha256: string;
  creator: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  rightsConfirmed: true;
};

const approvedNames: Record<SourceDefinition['kind'], string> = {
  'moon-map': 'moon-map.tif',
  'moon-disc': 'moon-disc.jpg',
  'milky-way-photo': 'milky-way-photo.jpg',
};

function rejectOriginal(message: string, status = 409): never {
  throw new ShopPrintHandoffError(message, status);
}

function isWithin(parent: string, child: string): boolean {
  const destination = relative(parent, child);
  return destination === '' || (destination !== '..' && !destination.startsWith(`..${sep}`)
    && !isAbsolute(destination));
}

async function secureFile(path: string) {
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink() ||
      (process.platform === 'linux' && (metadata.mode & 0o077) !== 0)) {
    rejectOriginal('مجوز یا محل نگهداری فایل اصلی خصوصی معتبر نیست.');
  }
  return metadata;
}

async function secureRoot(path: string) {
  if (!isAbsolute(path)) rejectOriginal('مسیر منابع خصوصی باید مطلق باشد.');
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() ||
      (process.platform === 'linux' && (metadata.mode & 0o077) !== 0)) {
    rejectOriginal('مسیر منابع خصوصی چاپ محافظت نشده است.');
  }
  const root = await realpath(path);
  const repo = await realpath(process.cwd());
  if (isWithin(repo, root) || root.split(sep).some((segment) =>
    ['public', 'releases', '.next', '.git'].includes(segment))) {
    rejectOriginal('منبع خصوصی چاپ نباید داخل برنامه یا انتشار قرار داشته باشد.');
  }
  const markerPath = join(root, markerName);
  await secureFile(markerPath);
  if ((await readFile(markerPath, 'utf8')) !== markerContents) {
    rejectOriginal('شناسهٔ محل خصوصی منابع چاپ نامعتبر است.');
  }
  return root;
}

function parseDefinition(value: unknown, productId: 'p01' | 'p03'): SourceDefinition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    rejectOriginal('منبع تصویریِ تأییدشده برای چاپ ثبت نشده است.');
  }
  const item = value as Record<string, unknown>;
  const kind = item.kind;
  if ((productId === 'p01' && kind !== 'moon-map' && kind !== 'moon-disc') ||
      (productId === 'p03' && kind !== 'milky-way-photo')) {
    rejectOriginal('نوع منبع تصویری با محصول سفارش هماهنگ نیست.', 422);
  }
  const name = approvedNames[kind as SourceDefinition['kind']];
  if (item.filename !== name || typeof item.sha256 !== 'string' ||
      !shaPattern.test(item.sha256) || item.rightsConfirmed !== true ||
      typeof item.creator !== 'string' || !item.creator.trim() ||
      typeof item.sourceUrl !== 'string' || !/^https:\/\/[^\s/]+\//.test(item.sourceUrl) ||
      typeof item.license !== 'string' || !item.license.trim() ||
      typeof item.attribution !== 'string' || !item.attribution.trim()) {
    rejectOriginal('اطلاعات منبع، اعتبار تصویر یا مجوز استفاده ناقص است.', 422);
  }
  return item as SourceDefinition;
}

/**
 * Read only owner-provisioned originals outside the app tree. Never downloads,
 * uploads or writes files, and never treats product gallery proofs as originals.
 * No source root is inferred; the operator must configure it explicitly.
 */
export async function loadPrivateShopFinalPrintSources(
  productId: 'p01' | 'p02' | 'p03',
  rootValue = process.env.HALLEUS_SHOP_PRINT_ORIGINALS_DIR,
): Promise<ShopFinalPrintSources> {
  if (productId === 'p02') return {};
  if (!rootValue) rejectOriginal('منابع اصلیِ چاپ هنوز در فضای خصوصی ثبت نشده‌اند.');
  try {
    const root = await secureRoot(rootValue);
    const manifestPath = join(root, manifestName);
    const info = await secureFile(manifestPath);
    if (info.size > 16_384) rejectOriginal('فهرست منابع خصوصی چاپ بیش از حد بزرگ است.', 422);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    if (!manifest || manifest.format !== 'halleus.shop.private-originals.v1' ||
        !manifest.sources || typeof manifest.sources !== 'object' || Array.isArray(manifest.sources)) {
      rejectOriginal('فهرست منابع خصوصی چاپ معتبر نیست.', 422);
    }
    const definition = parseDefinition(
      (manifest.sources as Record<string, unknown>)[productId], productId,
    );
    const sourceFile = join(root, definition.filename);
    const sourceInfo = await secureFile(sourceFile);
    if (sourceInfo.size < 1 || sourceInfo.size > maxOriginalBytes) {
      rejectOriginal('اندازهٔ فایل اصلی چاپ خارج از محدودهٔ مجاز است.', 422);
    }
    const bytes = await readFile(sourceFile);
    if (createHash('sha256').update(bytes).digest('hex') !== definition.sha256.toLowerCase()) {
      rejectOriginal('اثر انگشت فایل اصلی چاپ با رکورد منبع مطابقت ندارد.', 422);
    }
    const source: ShopSourceMaster = {
      bytes, sha256: definition.sha256.toLowerCase(),
      creator: definition.creator, sourceUrl: definition.sourceUrl,
      license: definition.license, attribution: definition.attribution, rightsConfirmed: true,
    };
    if (productId === 'p03') return { milkyWayPhoto: source };
    return definition.kind === 'moon-map' ? { moonMap: source } : { moonDisc: source };
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) throw error;
    rejectOriginal('فایل اصلی چاپ یا فضای خصوصی آن قابل اعتبارسنجی نیست.');
  }
}

export const SHOP_PRIVATE_ORIGINALS_MARKER = { name: markerName, contents: markerContents } as const;

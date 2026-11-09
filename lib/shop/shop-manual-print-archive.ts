import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import sharp from 'sharp';
import { isValidShopOrderNumber } from './shop-order-number';
import { getShopPrintSpec } from './shop-print-spec';
import { SHOP_PRIVATE_ARCHIVE_MARKER } from './shop-print-archive';

const orderIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_JPEG_BYTES = 8 * 1024 * 1024;

export class ShopManualPrintArchiveError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

export async function archiveOwnerSuppliedShopPrint(input: {
  root: string;
  orderId: string;
  orderNumber: string;
  lineNumber: number;
  productId: 'p01' | 'p02';
  size: string;
  jpeg: Buffer;
}) {
  if (process.platform !== 'linux' || !isAbsolute(input.root) || !orderIdPattern.test(input.orderId) ||
      !isValidShopOrderNumber(input.orderNumber) ||
      !Number.isSafeInteger(input.lineNumber) || input.lineNumber < 1 || input.lineNumber > 20 ||
      !['p01', 'p02'].includes(input.productId) || !Buffer.isBuffer(input.jpeg) ||
      input.jpeg.length < 1024 || input.jpeg.length > MAX_JPEG_BYTES) {
    throw new ShopManualPrintArchiveError('فایل چاپ یا مسیر آرشیو معتبر نیست.', 422);
  }
  const spec = getShopPrintSpec(input.size);
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    metadata = await sharp(input.jpeg, { limitInputPixels: 25_000_000 }).metadata();
  } catch {
    throw new ShopManualPrintArchiveError('فایل JPG قابل خواندن نیست.', 422);
  }
  if (metadata.format !== 'jpeg' || metadata.width !== spec.minimumNativePixels.width ||
      metadata.height !== spec.minimumNativePixels.height || metadata.channels !== 3 ||
      metadata.space !== 'srgb' || !metadata.hasProfile || metadata.density !== 300) {
    throw new ShopManualPrintArchiveError('JPG باید دقیقاً اندازهٔ چاپ انتخابی، ۳۰۰ppi و RGB/sRGB باشد.', 422);
  }
  try {
    await sharp(input.jpeg, { limitInputPixels: 25_000_000 }).resize(32, 32).toBuffer();
  } catch {
    throw new ShopManualPrintArchiveError('دادهٔ تصویر JPG ناقص است.', 422);
  }
  const rootInfo = await lstat(input.root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o077) !== 0) {
    throw new ShopManualPrintArchiveError('آرشیو خصوصی ایمن نیست.');
  }
  const root = await realpath(input.root);
  const repoRoot = await realpath(process.cwd());
  const toArchive = relative(repoRoot, root);
  if (toArchive === '' || (toArchive !== '..' && !toArchive.startsWith(`..${sep}`) && !isAbsolute(toArchive)) ||
      root.split(sep).some((part) => ['public', '.next', 'releases', 'source'].includes(part))) {
    throw new ShopManualPrintArchiveError('آرشیو باید خارج از پروژه و نسخه‌های انتشار باشد.');
  }
  const marker = join(root, SHOP_PRIVATE_ARCHIVE_MARKER.name);
  const markerInfo = await lstat(marker);
  if (!markerInfo.isFile() || markerInfo.isSymbolicLink() || (markerInfo.mode & 0o077) !== 0 ||
      (await readFile(marker, 'utf8')) !== SHOP_PRIVATE_ARCHIVE_MARKER.contents) {
    throw new ShopManualPrintArchiveError('هویت آرشیو خصوصی تأیید نشد.');
  }
  const orderFolder = join(root, input.orderId.toLowerCase());
  await mkdir(orderFolder, { recursive: true, mode: 0o700 });
  const orderInfo = await lstat(orderFolder);
  if (!orderInfo.isDirectory() || orderInfo.isSymbolicLink() || (orderInfo.mode & 0o077) !== 0) {
    throw new ShopManualPrintArchiveError('مسیر خصوصی سفارش معتبر نیست.');
  }
  const sha256 = createHash('sha256').update(input.jpeg).digest('hex');
  const filename = `line-${input.lineNumber}-${input.productId}-${input.size}-manual-final`;
  const target = join(orderFolder, filename);
  const manifest = {
    contract: 'halleus.shop.owner-supplied-manual-print.v1',
    orderId: input.orderId.toLowerCase(), orderNumber: input.orderNumber,
    line: input.lineNumber, productId: input.productId, size: input.size,
    jpegSha256: sha256, jpegBytes: input.jpeg.length,
    nativePixels: spec.minimumNativePixels, targetPpi: 300,
    colorSpace: 'sRGB', safeAreaMm: 5,
    approvedBy: 'owner-manual-upload-confirmation', printArtworkReady: true,
  };
  let existing = false;
  try {
    await lstat(target);
    existing = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (existing) {
    const info = await lstat(target);
    if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) {
      throw new ShopManualPrintArchiveError('فایل موجود در مسیر خصوصی نامعتبر است.');
    }
    for (const name of ['manifest.json', 'artwork.jpg']) {
      const stat = await lstat(join(target, name));
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
        throw new ShopManualPrintArchiveError('فایل موجود در آرشیو خصوصی ایمن نیست.');
      }
    }
    const previous = await readFile(join(target, 'manifest.json'), 'utf8');
    const previousJpeg = await readFile(join(target, 'artwork.jpg'));
    if (previous !== `${JSON.stringify(manifest, null, 2)}\n` ||
        createHash('sha256').update(previousJpeg).digest('hex') !== sha256) {
      throw new ShopManualPrintArchiveError('برای جایگزینی فایل قبلی تأیید جداگانه لازم است.');
    }
    return { sha256, idempotent: true };
  }
  const staging = await mkdtemp(join(orderFolder, '.upload-'));
  try {
    await writeFile(join(staging, 'artwork.jpg'), input.jpeg, { mode: 0o600, flag: 'wx' });
    await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    try { await rename(staging, target); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST' ||
          (error as NodeJS.ErrnoException).code === 'ENOTEMPTY') {
        throw new ShopManualPrintArchiveError('فایل این ردیف قبلاً ثبت شده است.');
      }
      throw error;
    }
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { sha256, idempotent: false };
}

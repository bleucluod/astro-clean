import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile, mkdtemp } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import sharp from 'sharp';
import { getShopPrintSpec } from './shop-print-spec';

const markerName = '.halleus-private-shop-archive';
const markerText = 'HALLEUS_PRIVATE_SHOP_ARCHIVE_V1\n';
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

type PrivateJpegCandidate = {
  orderNumber: string;
  lineNumber: number;
  productId: 'p01' | 'p02' | 'p03';
  sizeCm: string;
  finalFormat: 'JPEG';
  safeAreaMm: 5;
  targetPpi: 300;
  bytes: Buffer;
  sourceManifest: {
    creator: string; sourceUrl: string; license: string; sha256: string; attribution: string;
  } | null;
  printArtworkReady: false;
};

/**
 * Explicit operator-configured retention path, NEVER a release/static directory.
 * The private directory and root marker must be pre-provisioned with mode 0700
 * by the VPS operator. This function never creates or guesses a storage root.
 */
async function assertPrivateArchiveRoot(path: string) {
  if (!isAbsolute(path) || !path || process.platform !== 'linux') {
    throw new Error('Private print archive must be an explicitly configured Linux absolute directory.');
  }
  const rootInfo = await lstat(path);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o077) !== 0) {
    throw new Error('Private print archive directory is not isolated to the owner.');
  }
  const root = await realpath(path);
  const repo = await realpath(process.cwd());
  const insideRepo = relative(repo, root);
  if (insideRepo === '' || (!insideRepo.startsWith(`..${sep}`) && insideRepo !== '..' &&
      !isAbsolute(insideRepo)) || root.split(sep).includes('releases') ||
      root.split(sep).includes('public') || root.split(sep).includes('.next')) {
    throw new Error('Private print archive cannot be placed inside an app or release tree.');
  }
  const marker = join(root, markerName);
  const markerInfo = await lstat(marker);
  if (!markerInfo.isFile() || markerInfo.isSymbolicLink() ||
      (await readFile(marker, 'utf8')) !== markerText) {
    throw new Error('Private print archive identity marker is missing.');
  }
  return root;
}

/**
 * Atomic, idempotent archival candidate with no external/public URL. Candidate
 * remains blocked for the print lab until the owner separately approves it.
 */
export async function archivePrivateShopPrintCandidate(
  path: string, orderId: string, candidate: PrivateJpegCandidate,
) {
  if (!uuidPattern.test(orderId) || !/^[1-9]\d{0,19}$/.test(candidate.orderNumber) ||
      !Number.isSafeInteger(candidate.lineNumber) || candidate.lineNumber < 1 || candidate.lineNumber > 20 ||
      !['p01', 'p02', 'p03'].includes(candidate.productId) ||
      !['10x15', '20x30', '30x45'].includes(candidate.sizeCm) ||
      !Buffer.isBuffer(candidate.bytes) || candidate.bytes.length === 0 ||
      candidate.finalFormat !== 'JPEG' || candidate.safeAreaMm !== 5 ||
      candidate.targetPpi !== 300 || candidate.printArtworkReady !== false) {
    throw new Error('Invalid private print candidate archival contract.');
  }
  const expected = getShopPrintSpec(candidate.sizeCm).minimumNativePixels;
  const image = await sharp(candidate.bytes).metadata();
  if (image.format !== 'jpeg' || image.width !== expected.width || image.height !== expected.height ||
      image.channels !== 3 || image.space !== 'srgb' || image.density !== 300 || !image.hasProfile ||
      (candidate.productId !== 'p02' && !candidate.sourceManifest)) {
    throw new Error('Unverified native print JPEG or missing licensed original provenance.');
  }
  const root = await assertPrivateArchiveRoot(path);
  const sha256 = createHash('sha256').update(candidate.bytes).digest('hex');
  const orderDir = join(root, orderId.toLowerCase());
  await mkdir(orderDir, { mode: 0o700, recursive: true });
  const directoryInfo = await lstat(orderDir);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink() ||
      (directoryInfo.mode & 0o077) !== 0) {
    throw new Error('Private order archive permissions are not restrictive.');
  }
  const key = `line-${candidate.lineNumber}-${candidate.productId}-${candidate.sizeCm}-${sha256}`;
  const finalDir = join(orderDir, key);
  const manifest = {
    format: 'halleus.private.print-candidate-archive.v1',
    orderId: orderId.toLowerCase(), orderNumber: candidate.orderNumber,
    line: candidate.lineNumber, productId: candidate.productId, sizeCm: candidate.sizeCm,
    jpegSha256: sha256, colorMode: 'RGB', targetPpi: 300, safeAreaMm: 5,
    printArtworkReady: false,
    approval: 'owner-and-print-lab-signoff-pending',
    sourceManifest: candidate.sourceManifest,
  };
  const existing = await stat(finalDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing) {
    const existingInfo = await lstat(finalDir);
  if (!existingInfo.isDirectory() || existingInfo.isSymbolicLink() ||
      (existingInfo.mode & 0o077) !== 0) {
      throw new Error('Existing private print archive directory is not private.');
    }
    for (const filename of ['manifest.json', 'artwork.jpg']) {
      const info = await lstat(join(finalDir, filename));
      if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) {
        throw new Error('Existing private print archive file is not private.');
      }
    }
    const previous = JSON.parse(await readFile(join(finalDir, 'manifest.json'), 'utf8')) as typeof manifest;
    const bytes = await readFile(join(finalDir, 'artwork.jpg'));
    if (JSON.stringify(previous) !== JSON.stringify(manifest) ||
        createHash('sha256').update(bytes).digest('hex') !== sha256) {
      throw new Error('Existing private print archive has changed unexpectedly.');
    }
    return { idempotent: true, sha256, archiveId: `${orderId.toLowerCase()}/${key}` };
  }
  const staging = await mkdtemp(join(orderDir, '.staging-'));
  try {
    await writeFile(join(staging, 'artwork.jpg'), candidate.bytes, { mode: 0o600, flag: 'wx' });
    await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await rename(staging, finalDir);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { idempotent: false, sha256, archiveId: `${orderId.toLowerCase()}/${key}` };
}

export const SHOP_PRIVATE_ARCHIVE_MARKER = { name: markerName, contents: markerText } as const;

/**
 * Dev-only WebP review export. Starts from the existing font-embedded,
 * approved PNG render; never shrinks, substitutes or recreates its artwork.
 * A failed size limit rejects the ZIP rather than changing its dimensions.
 */
const MAX_WEBP_BYTES = 100_000;
const QUALITY_STEPS = [0.90, 0.78, 0.67, 0.56, 0.46, 0.37, 0.29, 0.22, 0.16, 0.10, 0.05, 0];

async function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((file) => file ? resolve(file) :
      reject(new Error('مرورگر نتوانست خروجی WebP بسازد.')), 'image/webp', quality);
  });
}

function isWebpHeader(bytes: Uint8Array): boolean {
  return bytes.length === 12 &&
    bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
    bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80;
}

export async function renderNemadPosterWebpFromPng(
  png: Blob, expected: { width: number; height: number },
): Promise<Blob> {
  if (png.type !== 'image/png') throw new Error('فایل اصلی PNG معتبر نیست.');
  const original = await createImageBitmap(png);
  try {
    if (original.width !== expected.width || original.height !== expected.height) {
      throw new Error('ابعاد اصلی PNG برای WebP صحیح نیست.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = expected.width;
    canvas.height = expected.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('مرورگر امکان ساخت WebP را ندارد.');
    context.drawImage(original, 0, 0);

    for (const quality of QUALITY_STEPS) {
      const candidate = await encodeWebp(canvas, quality);
      if (candidate.type !== 'image/webp' ||
          !isWebpHeader(new Uint8Array(await candidate.slice(0, 12).arrayBuffer()))) {
        throw new Error('مرورگر WebP معتبر تولید نمی‌کند.');
      }
      if (candidate.size >= MAX_WEBP_BYTES) continue;
      const decoded = await createImageBitmap(candidate);
      try {
        if (decoded.width !== expected.width || decoded.height !== expected.height) {
          throw new Error('ابعاد WebP با تصویر اصلی یکسان نیست.');
        }
      } finally {
        decoded.close();
      }
      return candidate;
    }
    throw new Error('هیچ کیفیتی بدون تغییر ابعاد به زیر ۱۰۰KB نرسید؛ ZIP ناقص دانلود نمی‌شود.');
  } finally {
    original.close();
  }
}

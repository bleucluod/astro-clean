/** Dev-preview export only. The canvas receives a completely self-contained SVG:
 * approved glyph pixels and the three actual Estedad files are inlined first. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const POSTER_WIDTH = 900;
const POSTER_HEIGHT = 1350;
const TARGET_PPI = 300;

// Development-preview PNG sizes. These physical dimensions match SHOP_SIZES.
// Files remain review assets; production print approval follows its own contract.
export const NEMAD_POSTER_SIZES = {
  '10x15': { label: '۱۰ × ۱۵ سانتی‌متر', widthCm: 10, heightCm: 15 },
  '20x30': { label: '۲۰ × ۳۰ سانتی‌متر', widthCm: 20, heightCm: 30 },
  '30x45': { label: '۳۰ × ۴۵ سانتی‌متر', widthCm: 30, heightCm: 45 },
} as const;

export type NemadPosterSize = keyof typeof NEMAD_POSTER_SIZES;

export function getNemadPosterPixelSize(size: NemadPosterSize) {
  const selected = NEMAD_POSTER_SIZES[size];
  if (!selected) throw new Error('اندازهٔ خروجی معتبر نیست.');
  return {
    width: Math.ceil(selected.widthCm / 2.54 * TARGET_PPI),
    height: Math.ceil(selected.heightCm / 2.54 * TARGET_PPI),
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result) : reject(new Error('فایل فونت یا نماد قابل خواندن نیست.'));
    reader.onerror = () => reject(new Error('خواندن فایل فونت یا نماد ناموفق بود.'));
    reader.readAsDataURL(blob);
  });
}

async function embedSourceAssets(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(POSTER_WIDTH));
  clone.setAttribute('height', String(POSTER_HEIGHT));

  const fontAttribute = clone.querySelector('[font-family]')?.getAttribute('font-family') || '';
  const fontFamily = fontAttribute.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  if (!/^[_a-zA-Z0-9-]+$/.test(fontFamily)) {
    throw new Error('فونت اصلی تابلو شناسایی نشد؛ خروجی جایگزین ساخته نمی‌شود.');
  }

  const faces = await Promise.all([300, 400, 500].map(async (weight) => {
    const response = await fetch('/shop/nemad-man/bahman-preview/font?weight=' + weight, { cache: 'no-store' });
    if (!response.ok) throw new Error('فونت اصلی Estedad دریافت نشد؛ خروجی ساخته نمی‌شود.');
    const source = await blobToDataUrl(await response.blob());
    return '@font-face{font-family:"' + fontFamily + '";src:url("' + source + '") format("truetype");font-weight:' + weight + ';font-style:normal}';
  }));
  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = faces.join('\n');
  clone.insertBefore(style, clone.firstChild);

  const images = Array.from(clone.querySelectorAll('image'));
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute('href');
    if (!href) throw new Error('نماد تاییدشدهٔ تابلو پیدا نشد.');
    if (href.startsWith('data:')) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) throw new Error('منبع نماد خارج از سایت است.');
    const response = await fetch(url.href, { cache: 'no-store' });
    if (!response.ok) throw new Error('نماد تاییدشدهٔ تابلو دریافت نشد.');
    image.setAttribute('href', await blobToDataUrl(await response.blob()));
  }));

  return new XMLSerializer().serializeToString(clone);
}

/** Create exactly the same PNG bytes as the original single-image download. */
export async function renderNemadPosterPngBlob(source: SVGSVGElement, size: NemadPosterSize): Promise<Blob> {
  const svgText = await embedSourceAssets(source);
  const sourceUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const picture = new Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error('رندر SVG با فونت اصلی ناموفق بود.'));
      picture.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    const pixels = getNemadPosterPixelSize(size);
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('مرورگر امکان ساخت خروجی PNG را ندارد.');
    context.drawImage(picture, 0, 0, pixels.width, pixels.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((file) => file ? resolve(file) : reject(new Error('ساخت فایل PNG ناموفق بود.')), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function downloadNemadPosterPng(source: SVGSVGElement, filename: string, size: NemadPosterSize): Promise<void> {
  const png = await renderNemadPosterPngBlob(source, size);
  const pngUrl = URL.createObjectURL(png);
  try {
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 30_000);
  }
}

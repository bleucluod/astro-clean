/** Dev-preview export only. The canvas receives a completely self-contained SVG:
 * approved glyph pixels and the three actual Estedad files are inlined first. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const POSTER_WIDTH = 900;
const POSTER_HEIGHT = 1125;
const PNG_SCALE = 2;

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

export async function downloadNemadPosterPng(source: SVGSVGElement, filename: string): Promise<void> {
  const svgText = await embedSourceAssets(source);
  const sourceUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  let pngUrl: string | null = null;
  try {
    const picture = new Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error('رندر SVG با فونت اصلی ناموفق بود.'));
      picture.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = POSTER_WIDTH * PNG_SCALE;
    canvas.height = POSTER_HEIGHT * PNG_SCALE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('مرورگر امکان ساخت خروجی PNG را ندارد.');
    context.scale(PNG_SCALE, PNG_SCALE);
    context.drawImage(picture, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((file) => file ? resolve(file) : reject(new Error('ساخت فایل PNG ناموفق بود.')), 'image/png');
    });
    pngUrl = URL.createObjectURL(png);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(sourceUrl);
    if (pngUrl) {
      const completedUrl = pngUrl;
      window.setTimeout(() => URL.revokeObjectURL(completedUrl), 30_000);
    }
  }
}

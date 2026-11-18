'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './NemadManMockupGenerator.module.css';

type Point = { x: number; y: number };
type Quad = [Point, Point, Point, Point];
type SourceArt = { name: string; image: Blob };
type Entry = { name: string; data: Uint8Array };

const TEMPLATE = '/shop-preview/nemad-man/mockup-blank-console.webp';
// Pixel-verified face of the sole, fixed 1024x1536 scene. Corners are NOT user controls.
// Top-left, top-right, bottom-right, bottom-left: the visible printable surface only.
const CANVAS_FRONT: Quad = [
  { x: 254, y: 241 }, { x: 861, y: 204 },
  { x: 840, y: 1226 }, { x: 211, y: 1186 },
];
// Inverse projective map from output pixels to source artwork UV coordinates.
// Solved once for CANVAS_FRONT. A single pixel pass avoids strip gaps and seams.
const INVERSE = [
  0.00186885322, 0.0000850377655, -0.495182819,
  0.0000704023501, 0.00115497909, -0.296232159,
  0.000140701320, 0.0000495277950,
] as const;
const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 1536;
const MAX_ARTS = 300;
const MAX_ZIP_BYTES = 120 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 300 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;
const IMAGE_RE = /\.(png|jpe?g|webp)$/i;
const utf8 = new TextEncoder();

function safeName(name: string): string {
  const parts = name.replace(/\\/g, '/').split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[<>:"|?*\x00-\x1f]/g, '_').slice(0, 125));
  return parts.join('/') || 'image.webp';
}

function uniqueSources(items: SourceArt[]): SourceArt[] {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const name = safeName(item.name);
    const key = name.toLowerCase();
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    if (n === 1) return { ...item, name };
    const dot = name.lastIndexOf('.');
    return { ...item, name: name.slice(0, dot) + '-' + n + name.slice(dot) };
  });
}

async function readZip(file: File): Promise<SourceArt[]> {
  if (file.size > MAX_ZIP_BYTES) throw new Error('حجم ZIP ورودی بیش از ۱۲۰ مگابایت است.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let eocd = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (view.getUint32(p, true) === 0x06054b50) { eocd = p; break; }
  }
  if (eocd < 0) throw new Error('فایل ZIP معتبر نیست.');
  const numFiles = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (numFiles > MAX_ARTS || cdOffset >= bytes.length) throw new Error('تعداد یا ساختار فایل‌های ZIP مجاز نیست.');
  let pos = cdOffset;
  let totalUnpacked = 0;
  const result: SourceArt[] = [];
  for (let i = 0; i < numFiles; i++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) {
      throw new Error('فهرست داخلی ZIP خراب است.');
    }
    const flags = view.getUint16(pos + 8, true);
    const method = view.getUint16(pos + 10, true);
    const comp = view.getUint32(pos + 20, true);
    const expanded = view.getUint32(pos + 24, true);
    const nameSize = view.getUint16(pos + 28, true);
    const extraSize = view.getUint16(pos + 30, true);
    const commentSize = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    if (pos + 46 + nameSize + extraSize + commentSize > bytes.length) throw new Error('نام فایل ZIP نامعتبر است.');
    const name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameSize));
    pos += 46 + nameSize + extraSize + commentSize;
    if (name.endsWith('/') || !IMAGE_RE.test(name)) continue;
    if (flags & 1) throw new Error('ZIP رمزگذاری‌شده پشتیبانی نمی‌شود.');
    if (method !== 0 && method !== 8) throw new Error('نوع فشرده‌سازی ZIP پشتیبانی نمی‌شود.');
    totalUnpacked += expanded;
    if (totalUnpacked > MAX_UNPACKED_BYTES) throw new Error('اندازهٔ فایل‌های داخل ZIP بیش از حد مجاز است.');
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error('بخش دادهٔ ZIP خراب است.');
    }
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localName + localExtra;
    if (start + comp > bytes.length) throw new Error('فایل ZIP ناقص است.');
    const slice = bytes.slice(start, start + comp);
    let raw: Uint8Array;
    if (method === 0) raw = slice;
    else {
      try {
        const stream = new Blob([slice as BlobPart]).stream()
          .pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
        raw = new Uint8Array(await new Response(stream).arrayBuffer());
      } catch {
        throw new Error('مرورگرت استخراج این ZIP را پشتیبانی نمی‌کند؛ فایل‌ها را از ZIP بیرون بیاور و یکجا انتخاب کن.');
      }
    }
    if (raw.byteLength !== expanded) throw new Error('اندازهٔ فایل استخراج‌شده با ZIP مطابقت ندارد.');
    if (result.length >= MAX_ARTS) throw new Error('بیش از ۳۰۰ تصویر در ZIP است.');
    result.push({ name: safeName(file.name.replace(/\.zip$/i, '') + '/' + name), image: new Blob([raw as BlobPart]) });
  }
  return result;
}

async function collectFiles(files: File[]): Promise<SourceArt[]> {
  const found: SourceArt[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) found.push(...await readZip(file));
    else if (IMAGE_RE.test(file.name)) {
      found.push({ name: safeName(file.webkitRelativePath || file.name), image: file });
    }
    if (found.length > MAX_ARTS) throw new Error('حداکثر ۳۰۰ تصویر را در هر نوبت انتخاب کن.');
  }
  if (found.length === 0) throw new Error('هیچ تصویر PNG، JPG یا WebP معتبری پیدا نشد.');
  return uniqueSources(found);
}

function crc32(data: Uint8Array): number {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function zipBlob(entries: Entry[]): Blob {
  const local: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;
  for (const entry of entries) {
    const name = utf8.encode(entry.name);
    const size = entry.data.length;
    const crc = crc32(entry.data);
    const localHead = new Uint8Array(30);
    const h = new DataView(localHead.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, size, true);
    h.setUint32(22, size, true);
    h.setUint16(26, name.length, true);
    local.push(localHead as BlobPart, name as BlobPart, entry.data as BlobPart);
    const cHead = new Uint8Array(46);
    const c = new DataView(cHead.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, size, true);
    c.setUint32(24, size, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(cHead as BlobPart, name as BlobPart);
    centralSize += 46 + name.length;
    offset += 30 + name.length + size;
  }
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], { type: 'application/zip' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('بارگذاری تصویر قالب ناموفق بود.'));
    image.src = src;
  });
}

function compose(scene: HTMLImageElement, poster: ImageBitmap): HTMLCanvasElement {
  const width = OUTPUT_WIDTH;
  const height = OUTPUT_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas در این مرورگر قابل استفاده نیست.');
  ctx.drawImage(scene, 0, 0, width, height);

  // Read the actual uploaded artwork. Never generate or retype its typography.
  const artCanvas = document.createElement('canvas');
  artCanvas.width = poster.width;
  artCanvas.height = poster.height;
  const artCtx = artCanvas.getContext('2d', { willReadFrequently: true });
  if (!artCtx) throw new Error('پردازش تصویر اصلی ممکن نیست.');
  artCtx.drawImage(poster, 0, 0);
  const pixels = artCtx.getImageData(0, 0, poster.width, poster.height).data;
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  const surfaceCtx = surface.getContext('2d');
  if (!surfaceCtx) throw new Error('ساخت سطح شاسی ممکن نیست.');
  const surfaceImage = surfaceCtx.createImageData(width, height);
  const output = surfaceImage.data;
  const [a, b, c, d, e, f, g, h] = INVERSE;
  const srcW = poster.width;
  const srcH = poster.height;
  const minX = Math.floor(Math.min(...CANVAS_FRONT.map(p => p.x)));
  const maxX = Math.ceil(Math.max(...CANVAS_FRONT.map(p => p.x)));
  const minY = Math.floor(Math.min(...CANVAS_FRONT.map(p => p.y)));
  const maxY = Math.ceil(Math.max(...CANVAS_FRONT.map(p => p.y)));

  // One inverse-homography sample per output pixel, with bilinear interpolation.
  // No row/strip meshes, so joins and corners cannot leave white slivers.
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const den = g * px + h * py + 1;
      const u = (a * px + b * py + c) / den;
      const v = (d * px + e * py + f) / den;
      if (u < 0 || v < 0 || u > 1 || v > 1) continue;
      const sx = u * (srcW - 1);
      const sy = v * (srcH - 1);
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const dx = sx - x0;
      const dy = sy - y0;
      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;
      const p00 = (y0 * srcW + x0) * 4;
      const p10 = (y0 * srcW + x1) * 4;
      const p01 = (y1 * srcW + x0) * 4;
      const p11 = (y1 * srcW + x1) * 4;
      const dst = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        output[dst + channel] = pixels[p00 + channel] * w00 +
          pixels[p10 + channel] * w10 + pixels[p01 + channel] * w01 +
          pixels[p11 + channel] * w11;
      }
    }
  }
  surfaceCtx.putImageData(surfaceImage, 0, 0);

  // Pixel-exact face mask, preserving the dark burned-wood side of the mockup.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(CANVAS_FRONT[0].x, CANVAS_FRONT[0].y);
  for (let i = 1; i < CANVAS_FRONT.length; i++) {
    ctx.lineTo(CANVAS_FRONT[i].x, CANVAS_FRONT[i].y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(surface, 0, 0);

  // Subtle illumination from the photographed blank surface, confined to the face.
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.14;
  ctx.drawImage(scene, 0, 0, width, height);
  ctx.restore();
  return canvas;
}

function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob && blob.type === 'image/webp'
      ? resolve(blob)
      : reject(new Error('این مرورگر خروجی WebP را پشتیبانی نمی‌کند.')), 'image/webp', quality);
  });
}

async function smallWebp(full: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  // Preserve aspect ratio; favor legible text before reducing dimensions.
  const widths = [1024, 960, 900, 820, 750, 680];
  const qualities = [0.85, 0.74, 0.63, 0.53, 0.44, 0.36, 0.29, 0.23, 0.18];
  let smallest: Blob | null = null;
  for (const w of widths) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = Math.round(w * 1.5);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('امکان فشرده‌سازی تصویر وجود ندارد.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(full, 0, 0, w, canvas.height);
    for (const q of qualities) {
      const blob = await encodeWebp(canvas, q);
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size < maxBytes) return blob;
    }
  }
  throw new Error('حتی با کاهش کیفیت، رسیدن به حجم انتخابی ممکن نشد (' + (smallest?.size ?? 0) + ' بایت).');
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 12000);
}

export function NemadManMockupGenerator() {
  const filePicker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);
  const cancel = useRef(false);
  const [arts, setArts] = useState<SourceArt[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [limitKb, setLimitKb] = useState(70);

  useEffect(() => {
    folderPicker.current?.setAttribute('webkitdirectory', '');
    folderPicker.current?.setAttribute('directory', '');
  }, []);

  const importFiles = useCallback(async (files: File[]) => {
    if (busy || !files.length) return;
    setError('');
    try {
      const next = await collectFiles(files);
      setArts(next);
      setProgress(0);
    } catch (err) { setError(err instanceof Error ? err.message : 'ورود فایل‌ها ناموفق بود.'); }
  }, [busy]);

  useEffect(() => {
    let ended = false;
    let url: string | null = null;
    if (!arts.length) { setPreviewUrl(null); return; }
    (async () => {
      try {
        const [scene, poster] = await Promise.all([loadImage(TEMPLATE), createImageBitmap(arts[0].image)]);
        if (poster.width * poster.height > MAX_IMAGE_PIXELS) throw new Error('ابعاد تصویر ورودی خیلی بزرگ است.');
        const canvas = compose(scene, poster);
        poster.close();
        const blob = await encodeWebp(canvas, 0.87);
        url = URL.createObjectURL(blob);
        if (!ended) { setPreviewUrl(url); setError(''); }
        else URL.revokeObjectURL(url);
      } catch (err) {
        if (!ended) setError(err instanceof Error ? err.message : 'پیش‌نمایش ایجاد نشد.');
      }
    })();
    return () => { ended = true; if (url) URL.revokeObjectURL(url); };
  }, [arts]);

  const generate = async () => {
    if (busy || !arts.length) return;
    setBusy(true);
    cancel.current = false;
    setProgress(0);
    setError('');
    try {
      const scene = await loadImage(TEMPLATE);
      const entries: Entry[] = [];
      for (let i = 0; i < arts.length; i++) {
        if (cancel.current) throw new Error('پردازش متوقف شد؛ خروجی ناقص ذخیره نشد.');
        const art = arts[i];
        let poster: ImageBitmap;
        try { poster = await createImageBitmap(art.image); }
        catch { throw new Error('تصویر قابل خواندن نیست: ' + art.name); }
        if (poster.width * poster.height > MAX_IMAGE_PIXELS) {
          poster.close();
          throw new Error('ابعاد بیش از حد مجاز: ' + art.name);
        }
        const output = compose(scene, poster);
        poster.close();
        const blob = await smallWebp(output, limitKb * 1000);
        const data = new Uint8Array(await blob.arrayBuffer());
        const path = art.name.replace(IMAGE_RE, '.webp');
        entries.push({ name: path, data });
        setProgress(i + 1);
        // Release the main thread between images so Stop and progress remain responsive.
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }
      const zip = zipBlob(entries);
      saveBlob(zip, 'Halleus-Nemad-Man-Mockups-' + entries.length + '.zip');
    } catch (err) { setError(err instanceof Error ? err.message : 'ساخت خروجی ناموفق بود.'); }
    finally { setBusy(false); }
  };

  return <main className={styles.shell}>
    <header className={styles.head}>
      <p className={styles.eyebrow}>HALLEUS • NEMAD MAN</p>
      <h1>مولد گروهی موکاپ</h1>
      <p>طرح‌های اصلی را بدون بازطراحی AI روی شاسی بدون قاب می‌گذارد. همه‌چیز در مرورگر پردازش می‌شود؛ تصاویر به سرور فرستاده نمی‌شوند.</p>
    </header>
    <div className={styles.grid}>
      <section className={styles.panel}>
        <h2>۱. طرح‌ها را وارد کن</h2>
        <div className={styles.buttons}>
          <button type="button" onClick={() => filePicker.current?.click()} disabled={busy}>انتخاب چند عکس یا ZIP</button>
          <button type="button" className={styles.secondary} onClick={() => folderPicker.current?.click()} disabled={busy}>انتخاب پوشهٔ کامل</button>
        </div>
        <input ref={filePicker} className={styles.hidden} type="file" multiple accept=".webp,.png,.jpg,.jpeg,.zip" onChange={e => { void importFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <input ref={folderPicker} className={styles.hidden} type="file" multiple onChange={e => { void importFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <div className={styles.drop} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void importFiles(Array.from(e.dataTransfer.files)); }}>
          فایل‌ها یا ZIP را اینجا رها کن. پوشهٔ شامل ۷۲ تصویر را هم می‌توانی یکجا انتخاب کنی.
        </div>
        <p className={styles.count}>{arts.length ? `${arts.length} تصویر آماده • نمونه: ${arts[0].name}` : 'هنوز تصویری انتخاب نشده است.'}</p>
        <h2>۲. شاسی آماده و خودکار</h2>
        <p className={styles.tip}>جای طرح روی شاسی ثابت و دقیق است؛ بدون تنظیم دستی گوشه‌ها. لبهٔ برش چوبی قهوه‌ای خیلی تیره دارد و طرح اصلی دست‌نخورده می‌ماند.</p>
        <h2>۳. خروجی نهایی</h2>
        <label className={styles.inlineLabel}>سقف هر WebP
          <select disabled={busy} value={limitKb} onChange={e => setLimitKb(Number(e.target.value))}>
            <option value={70}>۷۰ کیلوبایت</option>
            <option value={100}>۱۰۰ کیلوبایت</option>
          </select>
        </label>
        <div className={styles.buttons}>
          <button type="button" disabled={busy || !arts.length} onClick={() => { void generate(); }}>ساخت ZIP همهٔ موکاپ‌ها</button>
          {busy && <button type="button" className={styles.secondary} onClick={() => { cancel.current = true; }}>توقف</button>}
        </div>
        {busy && <div className={styles.progress} role="status">ساخته‌شده: {progress} از {arts.length}<progress value={progress} max={arts.length}/></div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.tip}>هر فایل فقط یک خروجی می‌گیرد؛ نام فایل و پوشه حفظ می‌شود. حجم محدودیت سخت است؛ در صورت نیاز ابعاد و کیفیت به‌تدریج کاهش می‌یابند.</p>
      </section>
      <section className={styles.panel}>
        <div className={styles.previewHead}><h2>پیش‌نمایش اولین تصویر</h2><span>۲:۳</span></div>
        <div className={styles.stage}>
          {/* The original uploaded artwork is projected; no AI rendering of text or stars. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="پیش‌نمایش خودکار شاسی بدون قاب" src={previewUrl || TEMPLATE} />
        </div>
        <p className={styles.previewFoot}>{arts.length ? 'طرح اولین فایل ورودی روی صحنه نشان داده می‌شود.' : 'ابتدا تصاویر خودت را انتخاب کن تا طرح واقعی نمایش داده شود.'}</p>
      </section>
    </div>
  </main>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './NemadManMockupGenerator.module.css';

type Point = { x: number; y: number };
type Quad = [Point, Point, Point, Point];
type SourceArt = { name: string; image: Blob };
type Entry = { name: string; data: Uint8Array };
type BuiltMockup = { sourceName: string; fileName: string; blob: Blob; bytes: number };
type SourceVariant = 'all' | 'light' | 'dark';
type SceneId = 'console' | 'wall-bench' | 'workdesk';
type MockupScene = {
  id: SceneId;
  label: string;
  path: string;
  front: Quad;
  inverse: readonly [number, number, number, number, number, number, number, number];
  suffix: string;
};
type GitHubHead = { object: { sha: string } };
type GitHubCommit = { tree: { sha: string } };
type GitHubTree = { tree: Array<{ path: string; type: string }>; truncated: boolean };
type GitHubBlob = { sha: string };
type GitHubNewTree = { sha: string };
type GitHubNewCommit = { sha: string };


const TEMPLATE = '/shop-preview/nemad-man/mockup-blank-console.webp';
// Calibrated once to the slim black canvas in the bundled 1024x1536 scene.
// Top-left, top-right, bottom-right, bottom-left; never user-adjustable.
const CANVAS_FRONT: Quad = [
  { x: 253, y: 240 }, { x: 863, y: 201 },
  { x: 843, y: 1229 }, { x: 214, y: 1188 },
];
// Exact inverse homography from these four corners to the source image UV.
// Keep these values paired with CANVAS_FRONT when updating the scene asset.
const INVERSE = [
  0.0018636185359866, 7.6667851164004e-05, -0.48989577388396,
  7.3190193517959e-05, 0.001144769693486, -0.29326184539669,
  0.00014499156832027, 4.3231528835866e-05,
] as const;
// Separate photographed scenes, each with calibrated printable corners.
// Original console coordinates and filenames stay unchanged.
const SCENES: MockupScene[] = [
  { id: 'console', label: 'کنسول کنار پنجره', path: TEMPLATE,
    front: CANVAS_FRONT, inverse: INVERSE, suffix: '' },
  { id: 'wall-bench', label: 'دیوار و نیمکت سنگی',
    path: '/shop-preview/nemad-man/mockup-blank-wall-bench.webp',
    // Image-derived edge intersections (1024x1536): cover the whole printable face.
    // The previous coordinates left 2-4 px of bare cream canvas at its seams.
    front: [
      { x: 262.356, y: 188.096 }, { x: 854.679, y: 161.057 },
      { x: 855.822, y: 1068.116 }, { x: 260.802, y: 1059.980 },
    ],
    inverse: [
      0.00179028606, 0.00000318994163, -0.470292009,
      0.0000536078723, 0.00117436709, -0.234957866,
      0.0000695930162, 0.00000535729928,
    ],
    suffix: '-wall-bench',
  },
  { id: 'workdesk', label: 'میز کار کنار لپ‌تاپ · شاسی ۱۰×۱۵',
    path: '/shop-preview/nemad-man/mockup-blank-workdesk-10x15.webp',
    // Calibrated against the actual 1024×1536 desk photo; a slim, unframed 10×15 panel.
    // Measured from the actual blank artwork contour (pixel-level edge regression).
    // 0.5px subpixel bleed stays under the existing 1.8px matte-black edge.
    front: [
      { x: 206.307, y: 453.856 }, { x: 565.890, y: 441.208 },
      { x: 633.019, y: 1004.559 }, { x: 254.969, y: 1048.668 },
    ],
    inverse: [
      0.002704382719498739, -0.0002212474558725392, -0.4575186216209205,
      6.417555333256209e-05, 0.001824515770615366, -0.8413072731911292,
      -0.0001350372434986659, 0.0001170981321254611,
    ],
    suffix: '-desk-10x15',
  },
];
const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 1536;
const MAX_ARTS = 300;
const MAX_ZIP_BYTES = 120 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 300 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;
const IMAGE_RE = /\.(png|jpe?g|webp)$/i;
const utf8 = new TextEncoder();
// Explicitly limited to the existing private mockup archive. No arbitrary repo writes.
const ARCHIVE_REPO = 'bleucluod/halleus-gsc-private-backup';
const ARCHIVE_FOLDER = 'Halleus-Nemad-Man-24-Exports-20261117/mockups';
const ARCHIVE_MONTHS = [
  '01-farvardin', '02-ordibehesht', '03-khordad', '04-tir',
  '05-mordad', '06-shahrivar', '07-mehr', '08-aban',
  '09-azar', '10-dey', '11-bahman', '12-esfand',
] as const;
type ArchiveMonth = (typeof ARCHIVE_MONTHS)[number];

function variantOf(name: string): 'light' | 'dark' | 'other' {
  const file = name.replace(/\\/g, '/').split('/').pop() ?? '';
  if (/(?:^|[-_])light(?=\.[^.]+$)/i.test(file)) return 'light';
  if (/(?:^|[-_])dark(?=\.[^.]+$)/i.test(file)) return 'dark';
  return 'other';
}

function archiveMonthOf(sourceName: string, fallback: ArchiveMonth): ArchiveMonth {
  const folders = sourceName.replace(/\\/g, '/').split('/');
  return ARCHIVE_MONTHS.find(month => folders.includes(month)) ?? fallback;
}

function archivePath(item: BuiltMockup, fallback: ArchiveMonth): string {
  const month = archiveMonthOf(item.sourceName, fallback);
  return `${ARCHIVE_FOLDER}/${month}/${item.fileName}`;
}

function leafWebp(name: string): string {
  const last = name.replace(/\\/g, '/').split('/').pop() ?? '';
  return safeName(last).replace(IMAGE_RE, '.webp');
}

async function githubApi<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  // Credentials are used only for requests directly to api.github.com.
  const response = await fetch(`https://api.github.com/repos/${ARCHIVE_REPO}${path}`, {
    method,
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const result: { message?: string } = await response.json().catch(() => ({}));
    throw new Error(`GitHub HTTP ${response.status}: ${result.message ?? 'request failed'}`);
  }
  return response.json() as Promise<T>;
}

async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x4000) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + 0x4000)));
  }
  return btoa(parts.join(''));
}


async function publishMockups(
  token: string,
  uploads: Array<{ item: BuiltMockup; path: string }>,
  onProgress: (count: number) => void,
  onStage: (stage: string) => void,
): Promise<string> {
  const unique = new Set(uploads.map(entry => entry.path.toLowerCase()));
  if (!uploads.length || unique.size !== uploads.length) throw new Error('فایل تکراری یا انتخاب خالی است.');
      // Safety preflight: never overwrite existing files or bypass a moved branch.
      const head = await githubApi<GitHubHead>(token, '/git/ref/heads/main');
      const baseHead = head.object.sha;
      const parent = await githubApi<GitHubCommit>(token, `/git/commits/${baseHead}`);
      const tree = await githubApi<GitHubTree>(token, `/git/trees/${parent.tree.sha}?recursive=1`);
      if (tree.truncated) throw new Error('فهرست مخزن کامل نیست؛ برای جلوگیری از جایگزینی، آپلود متوقف شد.');
      const existing = new Set(tree.tree.filter(entry => entry.type === 'blob').map(entry => entry.path.toLowerCase()));
      const conflicts = uploads.filter(upload => existing.has(upload.path.toLowerCase()));
      if (conflicts.length) {
        throw new Error(`${conflicts.length} فایل در GitHub از قبل موجود است؛ هیچ فایلی جایگزین نشد. نمونه: ${conflicts[0].path}`);
      }
      onStage('آماده‌سازی فایل‌های منتخب…');
      const entries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
      for (const upload of uploads) {
        const content = await base64Of(upload.item.blob);
        const blob = await githubApi<GitHubBlob>(token, '/git/blobs', 'POST', { content, encoding: 'base64' });
        entries.push({ path: upload.path, mode: '100644', type: 'blob', sha: blob.sha });
        onProgress(entries.length);
      }
      onStage('ساخت یک Commit برای تمام فایل‌های منتخب…');
      const nextTree = await githubApi<GitHubNewTree>(token, '/git/trees', 'POST', {
        base_tree: parent.tree.sha, tree: entries,
      });
      const commit = await githubApi<GitHubNewCommit>(token, '/git/commits', 'POST', {
        message: `Add ${uploads.length} approved Nemad Man mockups`, tree: nextTree.sha, parents: [baseHead],
      });
      onStage('ثبت Commit روی main…');
      await githubApi(token, '/git/refs/heads/main', 'PATCH', { sha: commit.sha, force: false });
      return commit.sha;
}

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

function compose(scene: HTMLImageElement, poster: ImageBitmap, mockup: MockupScene): HTMLCanvasElement {
  const width = OUTPUT_WIDTH;
  const height = OUTPUT_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas در این مرورگر قابل استفاده نیست.');
  ctx.drawImage(scene, 0, 0, width, height);
  // Preserve shadows and surface illumination from the photographed blank
  // wall/desk panels without bleeding the blank face into the uploaded artwork.
  const photoPixels = mockup.id === 'wall-bench' || mockup.id === 'workdesk'
    ? ctx.getImageData(0, 0, width, height).data
    : null;

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
  const [a, b, c, d, e, f, g, h] = mockup.inverse;
  const srcW = poster.width;
  const srcH = poster.height;
  const referenceLuminance = mockup.id === 'workdesk' ? 193 : 209;
  const minX = Math.floor(Math.min(...mockup.front.map(p => p.x)));
  const maxX = Math.ceil(Math.max(...mockup.front.map(p => p.x)));
  const minY = Math.floor(Math.min(...mockup.front.map(p => p.y)));
  const maxY = Math.ceil(Math.max(...mockup.front.map(p => p.y)));

  // One inverse-homography sample per output pixel, with bilinear interpolation.
  // No row/strip meshes, so joins and corners cannot leave white slivers.
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const den = g * px + h * py + 1;
      const u = (a * px + b * py + c) / den;
      const v = (d * px + e * py + f) / den;
      // Clamp near the silhouette: a skipped edge pixel leaves the blank
      // canvas visible as a white triangle in dark artwork, especially in corners.
      const sx = Math.max(0, Math.min(srcW - 1, u * (srcW - 1)));
      const sy = Math.max(0, Math.min(srcH - 1, v * (srcH - 1)));
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
      // Scene-specific neutral white reference. Retain its soft natural shadows
      // even after replacing the entire 10×15 desk artwork with the uploaded WebP.
      const light = photoPixels
        ? Math.max(0.74, Math.min(1.10, Math.pow((
          photoPixels[dst] * 0.2126 + photoPixels[dst + 1] * 0.7152 +
          photoPixels[dst + 2] * 0.0722
        ) / referenceLuminance, 1.22)))
        : 1;
      for (let channel = 0; channel < 3; channel++) {
        const art = pixels[p00 + channel] * w00 +
          pixels[p10 + channel] * w10 + pixels[p01 + channel] * w01 +
          pixels[p11 + channel] * w11;
        output[dst + channel] = Math.min(255, art * light);
      }
      output[dst + 3] = 255;
    }
  }
  surfaceCtx.putImageData(surfaceImage, 0, 0);

  // Pixel-exact face mask, preserving the dark burned-wood side of the mockup.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mockup.front[0].x, mockup.front[0].y);
  for (let i = 1; i < mockup.front.length; i++) {
    ctx.lineTo(mockup.front[i].x, mockup.front[i].y);
  }
  ctx.closePath();
  ctx.clip();
  // A dark undercoat prevents any anti-aliased edge pixel from revealing the
  // original white blank surface; the full source artwork then covers it.
  ctx.fillStyle = '#090b0d';
  ctx.fill();
  ctx.drawImage(surface, 0, 0);

  // Console keeps its original blend; wall and desk shadows are already
  // baked into the projected artwork pixels.
  if (mockup.id === 'console') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.14;
    ctx.drawImage(scene, 0, 0, width, height);
  }
  ctx.restore();

  // Hide subpixel white halos at all four joins, keeping a genuinely thin
  // matte-black cut edge rather than adding a picture frame.
  ctx.beginPath();
  ctx.moveTo(mockup.front[0].x, mockup.front[0].y);
  for (let i = 1; i < mockup.front.length; i++) {
    ctx.lineTo(mockup.front[i].x, mockup.front[i].y);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0c0e10';
  ctx.lineWidth = 1.8;
  ctx.stroke();
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
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({});
  const [variantFilter, setVariantFilter] = useState<SourceVariant>('all');
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [built, setBuilt] = useState<BuiltMockup[]>([]);
  const [selectedUploads, setSelectedUploads] = useState<Record<string, boolean>>({});
  const [fallbackMonth, setFallbackMonth] = useState<ArchiveMonth>('04-tir');
  const [githubToken, setGithubToken] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [limitKb, setLimitKb] = useState(70);
  const [sceneId, setSceneId] = useState<SceneId>('console');
  const activeScene = SCENES.find(scene => scene.id === sceneId) ?? SCENES[0];

  const selectedArts = arts.filter(item => selectedSources[item.name] !== false);
  const shownArts = arts.filter(item => variantFilter === 'all' || variantOf(item.name) === variantFilter);
  const previewArt = arts.find(item => item.name === previewName) ?? selectedArts[0] ?? arts[0];
  const chosenUploads = built.filter(item => selectedUploads[item.sourceName] !== false);

  function clearBuilt() {
    setBuilt([]);
    setSelectedUploads({});
    setUploadSuccess(null);
    setUploadStage('');
  }

  function selectSources(mode: 'all' | 'none' | 'light' | 'dark') {
    setSelectedSources(Object.fromEntries(arts.map(item => [item.name,
      mode === 'all' || (mode !== 'none' && variantOf(item.name) === mode)])));
    clearBuilt();
  }

  function toggleSource(name: string) {
    setSelectedSources(previous => ({ ...previous, [name]: previous[name] === false }));
    clearBuilt();
  }

  function selectUploads(selectAll: boolean) {
    setSelectedUploads(Object.fromEntries(built.map(item => [item.sourceName, selectAll])));
    setUploadSuccess(null);
  }

  useEffect(() => {
    folderPicker.current?.setAttribute('webkitdirectory', '');
    folderPicker.current?.setAttribute('directory', '');
  }, []);

  const importFiles = async (files: File[]) => {
    if (busy || uploading || !files.length) return;
    setError('');
    try {
      const next = await collectFiles(files);
      setArts(next);
      setSelectedSources(Object.fromEntries(next.map(item => [item.name, true])));
      setVariantFilter('all');
      setPreviewName(next[0]?.name ?? null);
      clearBuilt();
      setProgress(0);
    } catch (err) { setError(err instanceof Error ? err.message : 'ورود فایل‌ها ناموفق بود.'); }
  };

  useEffect(() => {
    let ended = false;
    let url: string | null = null;
    if (!previewArt) { setPreviewUrl(null); return; }
    (async () => {
      try {
        const [scene, poster] = await Promise.all([loadImage(activeScene.path), createImageBitmap(previewArt.image)]);
        if (poster.width * poster.height > MAX_IMAGE_PIXELS) throw new Error('ابعاد تصویر ورودی خیلی بزرگ است.');
        const canvas = compose(scene, poster, activeScene);
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
  }, [previewArt, sceneId]);

  const generate = async () => {
    if (busy || uploading || !selectedArts.length) return;
    setBusy(true);
    cancel.current = false;
    setProgress(0);
    setError('');
    clearBuilt();
    try {
      const scene = await loadImage(activeScene.path);
      const entries: Entry[] = [];
      const rendered: BuiltMockup[] = [];
      for (let i = 0; i < selectedArts.length; i++) {
        if (cancel.current) throw new Error('پردازش متوقف شد؛ خروجی ناقص ذخیره نشد.');
        const art = selectedArts[i];
        let poster: ImageBitmap;
        try { poster = await createImageBitmap(art.image); }
        catch { throw new Error('تصویر قابل خواندن نیست: ' + art.name); }
        if (poster.width * poster.height > MAX_IMAGE_PIXELS) {
          poster.close();
          throw new Error('ابعاد بیش از حد مجاز: ' + art.name);
        }
        const output = compose(scene, poster, activeScene);
        poster.close();
        const blob = await smallWebp(output, limitKb * 1000);
        const data = new Uint8Array(await blob.arrayBuffer());
        // Scene suffix avoids filename collisions when the same poster is rendered
        // in both environments and later uploaded to the private archive.
        const path = art.name.replace(IMAGE_RE, activeScene.suffix + '.webp');
        const fileName = leafWebp(art.name).replace(/\.webp$/i, activeScene.suffix + '.webp');
        entries.push({ name: path, data });
        rendered.push({ sourceName: art.name, fileName, blob, bytes: blob.size });
        setProgress(i + 1);
        // Release the main thread between images so Stop and progress remain responsive.
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }
      const zip = zipBlob(entries);
      setBuilt(rendered);
      setSelectedUploads(Object.fromEntries(rendered.map(item => [item.sourceName, true])));
      saveBlob(zip, 'Halleus-Nemad-Man-Mockups-' + entries.length + '.zip');
    } catch (err) { setError(err instanceof Error ? err.message : 'ساخت خروجی ناموفق بود.'); }
    finally { setBusy(false); }
  };

  const pushSelected = async () => {
    if (busy || uploading || !chosenUploads.length) return;
    const token = githubToken.trim();
    if (!token) { setError('توکن دسترسی به مخزن خصوصی GitHub را وارد کن.'); return; }
    const uploads = chosenUploads.map(item => ({ item, path: archivePath(item, fallbackMonth) }));
    const uniquePaths = new Set(uploads.map(upload => upload.path.toLowerCase()));
    if (uniquePaths.size !== uploads.length) {
      setError('چند خروجی نام و مسیر مقصد یکسان دارند. فایل‌ها را جدا انتخاب کن تا چیزی اشتباهی جایگزین نشود.');
      return;
    }
    if (!window.confirm(`ثبت ${uploads.length} فایل منتخب در مخزن خصوصی ${ARCHIVE_REPO} روی main؟\nفایل‌های موجود جایگزین نمی‌شوند.`)) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStage('بررسی وضعیت مخزن و فایل‌های موجود…');
    setUploadSuccess(null);
    setError('');
    try {
      const sha = await publishMockups(token, uploads, setUploadProgress, setUploadStage);
      setUploadSuccess(sha);
      setGithubToken(''); // Clear token from React state after success.
      setUploadStage(`${uploads.length} فایل با یک Commit ثبت شد.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود به GitHub ناموفق بود.');
      setUploadStage('آپلود کامل نشد؛ وضعیت GitHub را پیش از تلاش دوباره بررسی کن.');
    } finally { setUploading(false); }
  };

  return <main className={styles.shell}>
    <header className={styles.head}>
      <p className={styles.eyebrow}>HALLEUS • NEMAD MAN</p>
      <h1>مولد گروهی موکاپ</h1>
      <p>فایل‌های اصلی دست‌نخورده روی شاسی بدون قاب قرار می‌گیرند. ساخت موکاپ و ZIP داخل مرورگر است؛ فقط اگر خودت «ثبت در GitHub» را بزنی، فایل‌های منتخب به مخزن خصوصی ارسال می‌شوند.</p>
    </header>
    <div className={styles.grid}>
      <section className={styles.panel}>
        <h2>۱. طرح‌ها را وارد کن</h2>
        <div className={styles.buttons}>
          <button type="button" onClick={() => filePicker.current?.click()} disabled={busy || uploading}>انتخاب چند عکس یا ZIP</button>
          <button type="button" className={styles.secondary} onClick={() => folderPicker.current?.click()} disabled={busy || uploading}>انتخاب پوشهٔ کامل</button>
        </div>
        <input ref={filePicker} className={styles.hidden} type="file" multiple accept=".webp,.png,.jpg,.jpeg,.zip" onChange={e => { void importFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <input ref={folderPicker} className={styles.hidden} type="file" multiple onChange={e => { void importFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <div className={styles.drop} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void importFiles(Array.from(e.dataTransfer.files)); }}>
          فایل‌ها یا ZIP را اینجا رها کن. پوشهٔ شامل ۷۲ تصویر را هم می‌توانی یکجا انتخاب کنی.
        </div>
        <p className={styles.count}>{arts.length ? `${arts.length} تصویر از ZIP یا پوشه • ${selectedArts.length} تصویر انتخاب‌شده` : 'هنوز تصویری انتخاب نشده است.'}</p>
        {arts.length > 0 && <>
          <h2>۲. انتخاب تصویر از ZIP</h2>
          <div className={styles.buttons}>
            <button type="button" className={styles.secondary} disabled={busy || uploading} onClick={() => selectSources('all')}>انتخاب همه</button>
            <button type="button" className={styles.secondary} disabled={busy || uploading} onClick={() => selectSources('light')}>فقط طرح روشن</button>
            <button type="button" className={styles.secondary} disabled={busy || uploading} onClick={() => selectSources('dark')}>فقط طرح تیره</button>
            <button type="button" className={styles.secondary} disabled={busy || uploading} onClick={() => selectSources('none')}>لغو همه</button>
          </div>
          <label className={styles.inlineLabel}>نمایش فایل‌های
            <select disabled={busy || uploading} value={variantFilter} onChange={e => setVariantFilter(e.target.value as SourceVariant)}>
              <option value="all">همه</option>
              <option value="light">روشن (light)</option>
              <option value="dark">تیره (dark)</option>
            </select>
          </label>
          <div className={styles.fileList}>
            {shownArts.map(item => <div className={styles.fileItem} key={item.name}>
              <input type="checkbox" aria-label={`انتخاب ${item.name}`} checked={selectedSources[item.name] !== false}
                disabled={busy || uploading} onChange={() => toggleSource(item.name)} />
              <span title={item.name}>{item.name}</span>
              <button type="button" className={styles.previewButton} disabled={busy || uploading} onClick={() => setPreviewName(item.name)}>
                {previewName === item.name ? 'در حال نمایش' : 'پیش‌نمایش'}
              </button>
            </div>)}
          </div>
          <p className={styles.tip}>برای دیدن نسخهٔ سفید و مشکی، نام فایل را از این فهرست انتخاب کن. فیلتر فقط نمایش فهرست را عوض می‌کند؛ دکمه‌های «فقط طرح روشن/تیره» انتخاب خروجی را تغییر می‌دهند.</p>
        </>}
        <h2>۳. انتخاب صحنهٔ موکاپ</h2>
        <label className={styles.inlineLabel}>محیط و چیدمان
          <select value={sceneId} disabled={busy || uploading} onChange={e => {
            setSceneId(e.target.value as SceneId);
            setPreviewUrl(null);
            clearBuilt();
          }}>
            {SCENES.map(scene => <option key={scene.id} value={scene.id}>{scene.label}</option>)}
          </select>
        </label>
        <p className={styles.tip}>هر صحنه جای دقیق چاپ خودش را دارد؛ بدون تنظیم دستی چهار گوشه. طرح اصلی دست‌نخورده و لبهٔ شاسی مشکی و باریک می‌ماند.</p>
        <h2>۴. خروجی نهایی</h2>
        <label className={styles.inlineLabel}>سقف هر WebP
          <select disabled={busy || uploading} value={limitKb} onChange={e => setLimitKb(Number(e.target.value))}>
            <option value={70}>۷۰ کیلوبایت</option>
            <option value={100}>۱۰۰ کیلوبایت</option>
          </select>
        </label>
        <div className={styles.buttons}>
          <button type="button" disabled={busy || uploading || !selectedArts.length} onClick={() => { void generate(); }}>ساخت ZIP از {selectedArts.length} تصویر منتخب</button>
          {busy && <button type="button" className={styles.secondary} onClick={() => { cancel.current = true; }}>توقف</button>}
        </div>
        {busy && <div className={styles.progress} role="status">ساخته‌شده: {progress} از {selectedArts.length}<progress value={progress} max={selectedArts.length}/></div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.tip}>هر فایل منتخب یک خروجی می‌گیرد و نام‌ها و ساختار پوشه در ZIP حفظ می‌شوند.</p>
        {built.length > 0 && <>
          <h2>۵. انتخاب فایل‌های قابل ثبت در GitHub</h2>
          <div className={styles.buttons}>
            <button type="button" className={styles.secondary} disabled={uploading} onClick={() => selectUploads(true)}>انتخاب همهٔ خروجی‌ها</button>
            <button type="button" className={styles.secondary} disabled={uploading} onClick={() => selectUploads(false)}>لغو همهٔ خروجی‌ها</button>
          </div>
          <p className={styles.count}>{chosenUploads.length} فایل برای آپلود انتخاب شده</p>
          <div className={styles.fileList}>
            {built.map(item => <label key={item.sourceName} className={styles.fileItem}>
              <input type="checkbox" disabled={uploading} checked={selectedUploads[item.sourceName] !== false}
                onChange={() => setSelectedUploads(previous => ({ ...previous, [item.sourceName]: previous[item.sourceName] === false }))} />
              <span title={archivePath(item, fallbackMonth)}>{archivePath(item, fallbackMonth)}</span>
              <small>{Math.round(item.bytes / 1024)} KiB</small>
            </label>)}
          </div>
          <h2>۶. ثبت انتخابی در GitHub</h2>
          <p className={styles.tip}>مخزن مقصد ثابت است: <strong>{ARCHIVE_REPO}</strong>، شاخهٔ <strong>main</strong>. پوشهٔ ماه از نام فایل‌ها تشخیص داده می‌شود.</p>
          <label className={styles.inlineLabel}>ماه برای فایل‌هایی که پوشهٔ ماه ندارند
            <select disabled={uploading} value={fallbackMonth} onChange={e => setFallbackMonth(e.target.value as ArchiveMonth)}>
              {ARCHIVE_MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
          </label>
          <label className={styles.tokenLabel}>Fine-grained GitHub Token (فقط دسترسی Contents: Read and write به مخزن خصوصی)
            <input type="password" autoComplete="off" value={githubToken} disabled={uploading}
              placeholder="github_pat_…" onChange={e => setGithubToken(e.target.value)} />
          </label>
          <p className={styles.tip}>توکن فقط در حافظهٔ همین صفحه می‌ماند؛ ذخیره نمی‌شود و بعد از ثبت موفق پاک می‌شود. فایل‌های موجود در GitHub هرگز بازنویسی نمی‌شوند.</p>
          <button type="button" disabled={busy || uploading || !chosenUploads.length} className={styles.pushButton} onClick={() => { void pushSelected(); }}>
            {uploading ? 'در حال ثبت در GitHub…' : `Push ${chosenUploads.length} فایل منتخب در GitHub`}
          </button>
          {uploading && <div className={styles.progress} role="status">{uploadStage} • {uploadProgress} از {chosenUploads.length}<progress value={uploadProgress} max={chosenUploads.length}/></div>}
          {!uploading && uploadStage && <p className={styles.tip}>{uploadStage}</p>}
          {uploadSuccess && <p className={styles.success}>ثبت شد: <a href={`https://github.com/${ARCHIVE_REPO}/commit/${uploadSuccess}`} target="_blank" rel="noreferrer">Commit {uploadSuccess.slice(0, 7)}</a></p>}
        </>}
      </section>
      <section className={styles.panel}>
        <div className={styles.previewHead}><h2>پیش‌نمایش تصویر انتخابی</h2><span>{activeScene.label} · ۲:۳</span></div>
        <div className={styles.stage}>
          {/* The original uploaded artwork is projected; no AI rendering of text or stars. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="پیش‌نمایش خودکار شاسی بدون قاب" src={previewUrl || activeScene.path} />
        </div>
        <p className={styles.previewFoot}>{previewArt ? previewArt.name : 'ابتدا یک تصویر یا ZIP انتخاب کن.'}</p>
      </section>
    </div>
  </main>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './NemadManMockupGenerator.module.css';

type Point = { x: number; y: number };
type Quad = [Point, Point, Point, Point];
type SourceArt = { name: string; image: Blob };
type Entry = { name: string; data: Uint8Array };
type BuiltMockup = { sourceName: string; fileName: string; blob: Blob; bytes: number };
type SourceVariant = 'all' | 'light' | 'dark';
type SceneId = 'console' | 'wall-bench' | 'workdesk' | 'gift-wrap' | 'trio-bookshelf';
type MockupScene = {
  id: SceneId;
  label: string;
  path: string;
  front: Quad;
  visible?: Point[]; // Only the exposed print is drawn; the lower portion stays behind gift wrap.
  inverse: readonly [number, number, number, number, number, number, number, number];
  suffix: string;
};
type TrioSize = 'small' | 'medium' | 'large';
type TrioChoices = Record<TrioSize, string>;
type TrioPanel = { id: TrioSize; label: string; front: Quad; outer: Quad;
  inverse: readonly [number, number, number, number, number, number, number, number]; referenceLuminance: number };
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
  { id: 'gift-wrap', label: 'کادوی نیمه‌باز · دایره زیر کاغذ',
    path: '/shop-preview/nemad-man/mockup-blank-gift-wrap.webp',
    // Full portrait 2:3 art stays behind the photographed wrapping. Only the
    // real exposed area is clipped; a substantial part of the star circle is hidden.
    front: [
      { x: 291.000, y: 480.500 }, { x: 791.500, y: 502.800 },
      { x: 767.000, y: 1261.000 }, { x: 264.500, y: 1233.500 },
    ],
    // Image-derived paper contact curve from the approved gift photograph.
    visible: [
      { x: 291.000, y: 480.500 }, { x: 791.500, y: 502.800 },
      { x: 780.000, y: 791.000 }, { x: 768.000, y: 799.000 }, { x: 748.000, y: 805.000 },
      { x: 728.000, y: 811.000 }, { x: 708.000, y: 816.000 }, { x: 683.000, y: 822.000 },
      { x: 663.000, y: 812.000 }, { x: 640.000, y: 809.000 }, { x: 620.000, y: 806.000 },
      { x: 600.000, y: 802.000 }, { x: 580.000, y: 799.000 }, { x: 560.000, y: 795.000 },
      { x: 540.000, y: 791.000 }, { x: 520.000, y: 787.000 }, { x: 500.000, y: 784.000 },
      { x: 480.000, y: 780.000 }, { x: 460.000, y: 777.000 }, { x: 440.000, y: 773.000 },
      { x: 420.000, y: 769.000 }, { x: 400.000, y: 766.000 }, { x: 380.000, y: 761.000 },
      { x: 360.000, y: 756.000 }, { x: 340.000, y: 751.000 }, { x: 320.000, y: 745.000 },
      { x: 301.000, y: 739.000 }, { x: 284.000, y: 735.000 },
    ],
    inverse: [
      0.00202213726921787, 7.11641934054095e-05, -0.622636340273698,
      -5.9741244622612e-05, 0.00134083001350543, -0.62688411930418,
      1.32953775545867e-05, 6.25173554025243e-06,
    ],
    suffix: '-gift-wrap',
  },
  { id: 'trio-bookshelf', label: 'کتابخانه · سه اندازه، سه طرح مستقل',
    path: '/shop-preview/nemad-man/mockup-blank-three-sizes-bookshelf.webp',
    front: CANVAS_FRONT, inverse: INVERSE, suffix: '-three-sizes' },
];
// Source photograph: approved Pinterest bookshelf scene, centered to 2:3 without stretching.
// Correct overlap order is large -> medium -> small. The outer silhouettes are
// occlusion masks, so the rear artwork never paints over a foreground black cut edge.
const TRIO_PANELS: TrioPanel[] = [
  { id: 'large', label: '۳۰×۴۵ سانتی\u200cمتر', front: [
    { x: 381.615, y: 192.0 },
    { x: 894.675, y: 146.387 },
    { x: 895.735, y: 1028.95 },
    { x: 362.534, y: 1027.89 }
  ], outer: [
    { x: 376.315, y: 184.575 },
    { x: 913.756, y: 138.961 },
    { x: 913.756, y: 1045.923 },
    { x: 358.294, y: 1043.801 }
  ], inverse: [0.002176619667246, 4.9686041616e-05, -0.840170413050349, 0.000116901929906, 0.001314925464333, -0.297077217991584, 0.000119412155157, 5.2156839785e-05] as const, referenceLuminance: 58 },
  { id: 'medium', label: '۲۰×۳۰ سانتی\u200cمتر', front: [
    { x: 161.126, y: 474.166 },
    { x: 520.48, y: 472.044 },
    { x: 518.36, y: 1024.707 },
    { x: 117.665, y: 1017.282 }
  ], outer: [
    { x: 155.826, y: 467.801 },
    { x: 530.021, y: 463.558 },
    { x: 526.841, y: 1038.497 },
    { x: 111.304, y: 1037.437 }
  ], inverse: [0.003177708649145, 0.000254285301616, -0.632584946839737, 1.3625093808e-05, 0.002307389541484, -1.096280991925642, 5.1892179754e-05, 0.000242294784151] as const, referenceLuminance: 64 },
  { id: 'small', label: '۱۰×۱۵ سانتی\u200cمتر', front: [
    { x: 415.536, y: 732.994 },
    { x: 618.004, y: 734.055 },
    { x: 616.944, y: 1039.558 },
    { x: 392.215, y: 1028.95 }
  ], outer: [
    { x: 409.176, y: 723.448 },
    { x: 628.605, y: 727.691 },
    { x: 626.484, y: 1044.862 },
    { x: 385.855, y: 1041.68 }
  ], inverse: [0.007678195283984, 0.000605033665767, -3.634052696037477, -2.9706782975e-05, 0.005669010523415, -4.143006566697439, 0.000210554640566, 0.000579121851875] as const, referenceLuminance: 69 },
];
const TRIO_ORDER: TrioSize[] = ['large', 'medium', 'small'];
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
  const photoPixels = mockup.id === 'wall-bench' || mockup.id === 'workdesk' || mockup.id === 'gift-wrap'
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
  const referenceLuminance = mockup.id === 'workdesk' ? 193 : mockup.id === 'gift-wrap' ? 203 : 209;
  const minX = Math.floor(Math.min(...mockup.front.map(p => p.x)));
  const maxX = Math.ceil(Math.max(...mockup.front.map(p => p.x)));
  const minY = Math.floor(Math.min(...mockup.front.map(p => p.y)));
  const maxY = Math.ceil(Math.max(...mockup.front.map(p => p.y)));
  // Precomputed contact line for the curved gift-paper lip, not a straight
  // line that would incorrectly cover parts of the photographed wrapping.
  const wrapFold = new Float32Array(width);
  if (mockup.id === 'gift-wrap' && mockup.visible) {
    const fold = mockup.visible.slice(2).reverse();
    for (let i = 1; i < fold.length; i++) {
      const left = fold[i - 1];
      const right = fold[i];
      for (let x = Math.ceil(left.x); x <= Math.floor(right.x); x++) {
        wrapFold[x] = left.y + (right.y - left.y) * (x - left.x) / (right.x - left.x);
      }
    }
  }

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
        ) / referenceLuminance, mockup.id === 'gift-wrap' ? 1.07 : 1.22)))
        : 1;
      // The physical wrapping lip casts a real, close-contact shadow over the print.
      // Below this seam the photo is preserved untouched, never stretched or recolored.
      const foldY = wrapFold[x];
      const foldDist = Math.max(0, Math.min(100, foldY - py));
      const wrapShadow = mockup.id === 'gift-wrap' && wrapFold[x] > 0
        ? 1 - 0.17 * Math.exp(-(foldDist * foldDist) / (2 * 13 * 13)) : 1;
      for (let channel = 0; channel < 3; channel++) {
        const art = pixels[p00 + channel] * w00 +
          pixels[p10 + channel] * w10 + pixels[p01 + channel] * w01 +
          pixels[p11 + channel] * w11;
        output[dst + channel] = Math.min(255, art * light * wrapShadow);
      }
      output[dst + 3] = 255;
    }
  }
  surfaceCtx.putImageData(surfaceImage, 0, 0);

  // Pixel-exact face mask, preserving the dark burned-wood side of the mockup.
  const exposedFace = mockup.visible ?? mockup.front;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(exposedFace[0].x, exposedFace[0].y);
  for (let i = 1; i < exposedFace.length; i++) {
    ctx.lineTo(exposedFace[i].x, exposedFace[i].y);
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
  ctx.moveTo(exposedFace[0].x, exposedFace[0].y);
  ctx.lineTo(exposedFace[1].x, exposedFace[1].y);
  ctx.lineTo(exposedFace[2].x, exposedFace[2].y);
  if (mockup.id === 'gift-wrap') {
    // Only the exposed top and side cuts have a black edge, never the paper lip.
    const last = exposedFace[exposedFace.length - 1];
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(exposedFace[0].x, exposedFace[0].y);
  } else {
    ctx.lineTo(exposedFace[3].x, exposedFace[3].y);
    ctx.closePath();
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0c0e10';
  ctx.lineWidth = mockup.id === 'gift-wrap' ? 3.5 : 1.8;
  ctx.stroke();
  return canvas;
}

// Separate three-image renderer. Each independent uploaded WebP is projected in
// its own full 2:3 UV space, then clipped by the physical fronts of later canvases.
// The approved interior photograph and its pre-existing shadows remain the base.
function insideQuad(x: number, y: number, polygon: Quad, margin = 0): boolean {
  // A convex clockwise quadrilateral. margin pushes the boundary outwards a few
  // pixels when protecting the foreground canvas edge from background paint.
  for (let i = 0; i < 4; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % 4];
    const cross = (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    if (cross < -margin * length) return false;
  }
  return true;
}

function composeTrio(
  scene: HTMLImageElement,
  posters: Record<TrioSize, ImageBitmap>,
): HTMLCanvasElement {
  const width = OUTPUT_WIDTH;
  const height = OUTPUT_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('امکان ساخت موکاپ سه‌اندازه در مرورگر وجود ندارد.');
  ctx.drawImage(scene, 0, 0, width, height);
  // Read before painting; luminance is from neutral photographed surfaces,
  // not from another person's design (preserves soft light/shadow on each print).
  const photographed = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < TRIO_ORDER.length; i++) {
    const panel = TRIO_PANELS.find(item => item.id === TRIO_ORDER[i]);
    if (!panel) throw new Error('قالب شاسی ناقص است.');
    const poster = posters[panel.id];
    const source = document.createElement('canvas');
    source.width = poster.width;
    source.height = poster.height;
    const sourceCtx = source.getContext('2d', { willReadFrequently: true });
    if (!sourceCtx) throw new Error('خواندن طرح اصلی ممکن نیست.');
    sourceCtx.drawImage(poster, 0, 0);
    const pixels = sourceCtx.getImageData(0, 0, poster.width, poster.height).data;
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerCtx = layer.getContext('2d');
    if (!layerCtx) throw new Error('ساخت لایهٔ شاسی ممکن نیست.');
    const image = layerCtx.createImageData(width, height);
    const out = image.data;
    const nextPanels = TRIO_ORDER.slice(i + 1).map(id => TRIO_PANELS.find(p => p.id === id));
    const [a, b, c, d, e, f, g, h] = panel.inverse;
    const minX = Math.max(0, Math.floor(Math.min(...panel.front.map(p => p.x))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...panel.front.map(p => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...panel.front.map(p => p.y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...panel.front.map(p => p.y))));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        if (!insideQuad(px, py, panel.front)) continue;
        // Never cover another canvas, including its thin black cut edge.
        if (nextPanels.some(front => front && insideQuad(px, py, front.outer, 2))) continue;
        const denom = g * px + h * py + 1;
        const u = (a * px + b * py + c) / denom;
        const v = (d * px + e * py + f) / denom;
        const sx = Math.max(0, Math.min(poster.width - 1, u * (poster.width - 1)));
        const sy = Math.max(0, Math.min(poster.height - 1, v * (poster.height - 1)));
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const x1 = Math.min(poster.width - 1, x0 + 1);
        const y1 = Math.min(poster.height - 1, y0 + 1);
        const fx = sx - x0, fy = sy - y0;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy, w11 = fx * fy;
        const p00 = (y0 * poster.width + x0) * 4;
        const p10 = (y0 * poster.width + x1) * 4;
        const p01 = (y1 * poster.width + x0) * 4;
        const p11 = (y1 * poster.width + x1) * 4;
        const dest = (y * width + x) * 4;
        const lum = photographed[dest] * 0.2126 + photographed[dest + 1] * 0.7152 + photographed[dest + 2] * 0.0722;
        const exposure = Math.max(0.78, Math.min(1.12, Math.pow(lum / panel.referenceLuminance, 0.68)));
        // Physical contact shadows on the inward edge of overlapping boards.
        const leftContact = Math.min(1, Math.max(0, (px - Math.min(...panel.front.map(p => p.x))) / 18));
        const nearEdge = 1 - 0.035 * (1 - leftContact);
        for (let channel = 0; channel < 3; channel++) {
          const art = pixels[p00 + channel] * w00 + pixels[p10 + channel] * w10 +
            pixels[p01 + channel] * w01 + pixels[p11 + channel] * w11;
          out[dest + channel] = Math.min(255, art * exposure * nearEdge);
        }
        out[dest + 3] = 255;
      }
    }
    layerCtx.putImageData(image, 0, 0);
    ctx.drawImage(layer, 0, 0);
  }
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
  const [trioChoices, setTrioChoices] = useState<TrioChoices>({ small: '', medium: '', large: '' });
  const activeScene = SCENES.find(scene => scene.id === sceneId) ?? SCENES[0];
  const isTrio = sceneId === 'trio-bookshelf';
  const trioSources = TRIO_ORDER.map(size => arts.find(item => item.name === trioChoices[size]));
  const trioReady = trioSources.every(Boolean) && new Set(TRIO_ORDER.map(size => trioChoices[size])).size === 3;


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
      setTrioChoices({ small: next[0]?.name ?? '', medium: next[1]?.name ?? '', large: next[2]?.name ?? '' });
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
    if ((isTrio && !trioReady) || (!isTrio && !previewArt)) {
      setPreviewUrl(null);
      return;
    }
    (async () => {
      let bitmaps: ImageBitmap[] = [];
      try {
        const scene = await loadImage(activeScene.path);
        let canvas: HTMLCanvasElement;
        if (isTrio) {
          const sources = TRIO_ORDER.map(size => arts.find(item => item.name === trioChoices[size]));
          if (sources.some(item => !item)) return;
          bitmaps = await Promise.all(sources.map(item => createImageBitmap(item!.image)));
          if (bitmaps.some(bitmap => bitmap.width * bitmap.height > MAX_IMAGE_PIXELS)) throw new Error('ابعاد یکی از تصویرها بیش از حد مجاز است.');
          canvas = composeTrio(scene, { large: bitmaps[0], medium: bitmaps[1], small: bitmaps[2] });
        } else {
          bitmaps = [await createImageBitmap(previewArt!.image)];
          if (bitmaps[0].width * bitmaps[0].height > MAX_IMAGE_PIXELS) throw new Error('ابعاد تصویر ورودی خیلی بزرگ است.');
          canvas = compose(scene, bitmaps[0], activeScene);
        }
        const blob = await encodeWebp(canvas, 0.87);
        url = URL.createObjectURL(blob);
        if (!ended) { setPreviewUrl(url); setError(''); }
        else URL.revokeObjectURL(url);
      } catch (err) {
        if (!ended) setError(err instanceof Error ? err.message : 'پیش‌نمایش ایجاد نشد.');
      } finally { bitmaps.forEach(bitmap => bitmap.close()); }
    })();
    return () => { ended = true; if (url) URL.revokeObjectURL(url); };
  }, [previewArt, sceneId, trioChoices.small, trioChoices.medium, trioChoices.large, arts]);

  const generate = async () => {
    if (busy || uploading || (isTrio ? !trioReady : !selectedArts.length)) return;
    setBusy(true);
    cancel.current = false;
    setProgress(0);
    setError('');
    clearBuilt();
    try {
      const scene = await loadImage(activeScene.path);
      if (isTrio) {
        if (!trioReady) throw new Error('برای هر سه اندازه باید یک طرح متفاوت انتخاب کنی.');
        const selected = TRIO_ORDER.map(size => arts.find(item => item.name === trioChoices[size]));
        if (selected.some(item => !item)) throw new Error('طرح انتخاب‌شده در ZIP پیدا نشد.');
        const bitmaps = await Promise.all(selected.map(item => createImageBitmap(item!.image)));
        let output: HTMLCanvasElement;
        try {
          if (bitmaps.some(bitmap => bitmap.width * bitmap.height > MAX_IMAGE_PIXELS)) throw new Error('ابعاد یک تصویر بیش از حد مجاز است.');
          output = composeTrio(scene, { large: bitmaps[0], medium: bitmaps[1], small: bitmaps[2] });
        } finally { bitmaps.forEach(bitmap => bitmap.close()); }
        const blob = await smallWebp(output, limitKb * 1000);
        const joined = TRIO_ORDER.map(size => trioChoices[size]).join('|');
        let hash = 2166136261;
        for (let i = 0; i < joined.length; i++) hash = Math.imul(hash ^ joined.charCodeAt(i), 16777619) >>> 0;
        const name = `three-sizes-bookshelf-${hash.toString(36)}.webp`;
        const builtItem: BuiltMockup = { sourceName: 'trio-bookshelf', fileName: name, blob, bytes: blob.size };
        setBuilt([builtItem]);
        setSelectedUploads({ 'trio-bookshelf': true });
        setProgress(1);
        saveBlob(zipBlob([{ name, data: new Uint8Array(await blob.arrayBuffer()) }]), 'Halleus-Three-Sizes-Bookshelf.zip');
        return;
      }
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
        {arts.length > 0 && !isTrio && <>
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
        {isTrio && <div className={styles.trioChooser}>
          <p className={styles.tip}>هر شاسی طرح مستقل دارد. شاسی بزرگ عقب، متوسط جلو و کوچک روی هر دو قرار می‌گیرد. هیچ بخشی از طرحِ پشت، روی شاسی جلویی کشیده نمی‌شود.</p>
          {([['small', '۱۰×۱۵ · جلو'], ['medium', '۲۰×۳۰ · وسط'], ['large', '۳۰×۴۵ · عقب']] as const).map(([size, label]) =>
            <label key={size} className={styles.inlineLabel}>{label}
              <select disabled={busy || uploading || !arts.length} value={trioChoices[size]}
                onChange={e => { setTrioChoices(previous => ({ ...previous, [size]: e.target.value })); setPreviewUrl(null); clearBuilt(); }}>
                <option value="">انتخاب طرح</option>
                {arts.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </label>
          )}
          {!trioReady && <p className={styles.error}>سه فایل متفاوت از ZIP یا پوشه انتخاب کن تا پیش‌نمایش و خروجی سه‌اندازه ساخته شود.</p>}
        </div>}
        <p className={styles.tip}>هر صحنه جای دقیق چاپ خودش را دارد؛ بدون تنظیم دستی چهار گوشه. طرح اصلی دست‌نخورده و لبهٔ شاسی مشکی و باریک می‌ماند.</p>
        <h2>۴. خروجی نهایی</h2>
        <label className={styles.inlineLabel}>سقف هر WebP
          <select disabled={busy || uploading} value={limitKb} onChange={e => setLimitKb(Number(e.target.value))}>
            <option value={70}>۷۰ کیلوبایت</option>
            <option value={100}>۱۰۰ کیلوبایت</option>
          </select>
        </label>
        <div className={styles.buttons}>
          <button type="button" disabled={busy || uploading || (isTrio ? !trioReady : !selectedArts.length)} onClick={() => { void generate(); }}>{isTrio ? 'ساخت موکاپ سه‌اندازه و ZIP یک‌تصویری' : `ساخت ZIP از ${selectedArts.length} تصویر منتخب`}</button>
          {busy && <button type="button" className={styles.secondary} onClick={() => { cancel.current = true; }}>توقف</button>}
        </div>
        {busy && <div className={styles.progress} role="status">ساخته‌شده: {progress} از {isTrio ? 1 : selectedArts.length}<progress value={progress} max={isTrio ? 1 : selectedArts.length}/></div>}
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
        <p className={styles.previewFoot}>{isTrio ? (trioReady ? 'سه طرح مستقل · ۱۰×۱۵، ۲۰×۳۰، ۳۰×۴۵' : 'سه طرح متفاوت انتخاب کن.') : (previewArt ? previewArt.name : 'ابتدا یک تصویر یا ZIP انتخاب کن.')}</p>
      </section>
    </div>
  </main>;
}

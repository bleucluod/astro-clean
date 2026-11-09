import { join } from 'node:path';
import sharp from 'sharp';
import { calculateShopStarAtlas } from './shop-sky-atlas';
import { calculateShopConstellationLines } from './shop-constellation-lines';
import { calculateShopBrightStarProof } from './shop-sky-stars';
import { renderShopBirthSkyR9, SHOP_P02_R9_LAYOUT } from './shop-birth-sky-r9';
import { safeShopArtworkText } from './shop-artwork-text';
import type { BirthSkyPersonalDetails } from './shop-birth-sky-artwork';

type SkyReference = { referenceUtc: string; latitude: number; longitude: number };
type SourceText = { token: string; attrs: Record<string, string>; text: string };
const SOURCE_W = SHOP_P02_R9_LAYOUT.width;
const SOURCE_H = SHOP_P02_R9_LAYOUT.height;
const fontDir = join(process.cwd(), 'assets/shop-print/fonts');
const fontName: Record<number, string> = {
  300: 'Estedad-Light.ttf', 400: 'Estedad-Regular.ttf', 500: 'Estedad-Medium.ttf',
};
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[ch]!);
}
function unesc(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_match, entity: string) =>
    ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity]!);
}

// R9 authors only flat <text> tags through fontText. Reject contract changes.
function extractText(svg: string): { skeleton: string; entries: SourceText[] } {
  const entries: SourceText[] = [];
  const skeleton = svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_source, attributes: string, content: string) => {
    if (content.includes('<')) throw new Error('Unexpected nested R9 typography');
    const attrs: Record<string, string> = {};
    for (const match of attributes.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/g)) attrs[match[1]] = match[2];
    if (!attrs.x || !attrs.y || !attrs['font-size'] || !attrs['font-weight']) {
      throw new Error('Unexpected R9 text attributes');
    }
    const token = `__R9_NATIVE_TEXT_${entries.length}__`;
    entries.push({ token, attrs, text: unesc(content) });
    return token;
  });
  if (entries.length < 3 || skeleton.includes('<text ') ||
      !skeleton.includes('id="r9-sourced-stars"') ||
      !skeleton.includes('id="r9-constellations"') ||
      !skeleton.includes('id="r9-poster-typography"')) {
    throw new Error('R9 scene or typography contract changed');
  }
  return { skeleton, entries };
}

/** The original R9 artistic haze uses fractal turbulence. Rendering that
 * expensive blur at 19 megapixels takes many minutes on ordinary hardware.
 * Bake ONLY the diffuse scene background at preview resolution; leave real
 * BSC5 stars, constellation paths, labels and typography native and crisp.
 */
async function rasterBackgroundAtPreviewSize(svg: string): Promise<Buffer> {
  const skyOpen = '<g id="r9-sky" mask="url(#r9-text-clearance)">';
  const starOpen = '<g id="r9-constellations">';
  const skyAt = svg.indexOf(skyOpen);
  const starsAt = svg.indexOf(starOpen, skyAt);
  const rootDimensions = 'viewBox="0 0 3000 4500" width="3000" height="4500"';
  if (skyAt < 0 || starsAt < 0 || starsAt <= skyAt ||
      svg.indexOf(skyOpen, skyAt + 1) >= 0 ||
      !svg.includes(rootDimensions)) throw new Error('R9 sky-layer contract changed');
  const prefix = svg.slice(0, skyAt).replace(rootDimensions,
    'viewBox="0 0 3000 4500" width="720" height="1080"');
  const diffuseLayer = svg.slice(skyAt, starsAt);
  if (!diffuseLayer.includes('id="r9-artistic-haze"') ||
      !diffuseLayer.includes('id="r9-cloud-warp"') && !prefix.includes('id="r9-cloud-warp"')) {
    throw new Error('R9 artistic haze contract changed');
  }
  // The original outer black backing + R9 cloud/gradient layer. The print
  // SVG applies the clearance mask once, after embedding this diffuse raster.
  const backgroundSvg = prefix +
    diffuseLayer.replace(' mask="url(#r9-text-clearance)"', '') +
    '</g></svg>';
  return sharp(Buffer.from(backgroundSvg, 'utf8'), { limitInputPixels: 1_000_000 })
    .png().toBuffer();
}

function injectDiffusedBackground(svg: string, raster: Buffer): string {
  const skyOpen = '<g id="r9-sky" mask="url(#r9-text-clearance)">';
  const skyAt = svg.indexOf(skyOpen);
  const starsAt = svg.indexOf('<g id="r9-constellations">', skyAt);
  if (skyAt < 0 || starsAt < 0 || starsAt <= skyAt) {
    throw new Error('R9 sky scene changed');
  }
  const image = '<image x="0" y="0" width="3000" height="4500" ' +
    'preserveAspectRatio="none" href="data:image/png;base64,' +
    raster.toString('base64') + '"/>';
  return svg.slice(0, skyAt) + skyOpen + image + svg.slice(starsAt);
}

// The background uses the exact approved R9 vector. Native Estedad glyphs
// use the approved TTFs, with no browser font fallback or watermark.
async function rasterText(source: SourceText, scaleX: number, scaleY: number) {
  const { attrs, text } = source;
  const fontSize = Number(attrs['font-size']);
  const weight = Number(attrs['font-weight']);
  const x = Number(attrs.x), y = Number(attrs.y);
  if (!Number.isFinite(fontSize) || fontSize < 15 || fontSize > 250 ||
      !Number.isFinite(x) || !Number.isFinite(y) || !fontName[weight]) {
    throw new Error('R9 font or coordinates changed');
  }
  const nameLayer = attrs['data-r9-name-layer'];
  const color = nameLayer === 'glow' ? '#C2D9E9' : nameLayer === 'face' ? '#E2EDF5' :
    (attrs.fill?.startsWith('#') ? attrs.fill : '#D9EAFD');
  const fontPixels = Math.max(8, Math.round(fontSize * scaleY));
  const bytes = await sharp({
    text: {
      text: `<span foreground="${color}">${esc(text)}</span>`,
      font: `Estedad ${fontPixels}`,
      fontfile: join(fontDir, fontName[weight]), rgba: true,
    },
  }).png().toBuffer();
  const first = await sharp(bytes).metadata();
  if (!first.width || !first.height || first.height > SOURCE_H * scaleY) {
    throw new Error('R9 native text metrics invalid');
  }
  // The browser's R9 text pass uses fillText(..., 2450). Match its maximum
  // glyph width even for the longest permitted personal names or city labels.
  const maxWidth = Math.round(2450 * scaleX);
  const native = first.width > maxWidth
    ? await sharp(bytes).resize(maxWidth, first.height, { fit: 'fill' }).png().toBuffer()
    : bytes;
  const meta = await sharp(native).metadata();
  const width = meta.width, height = meta.height;
  if (!width || !height) throw new Error('R9 native text bounds invalid');
  const anchor = attrs['text-anchor'] || 'start';
  const rtl = (attrs.direction || 'rtl') === 'rtl';
  const left = Math.round(x * scaleX - (anchor === 'middle' ? width / 2 :
    anchor === 'end' ? (rtl ? 0 : width) : (rtl ? width : 0)));
  // Pango returns tight glyph pixels rather than the SVG ascent metrics.
  // An adjusted baseline keeps the source positions, pending actual lab review.
  const top = Math.round(y * scaleY - height * .79);
  const opacity = attrs.opacity == null ? 1 : Math.max(0, Math.min(1, Number(attrs.opacity)));
  if (!Number.isFinite(opacity)) throw new Error('Invalid R9 text opacity');
  const input = nameLayer === 'glow'
    ? await sharp(native).blur(Math.max(.3, 13 * scaleX)).png().toBuffer()
    : native;
  return { input, left, top, opacity };
}

export async function renderShopP02R9NativeJpeg(input: {
  reference: SkyReference; details: BirthSkyPersonalDetails;
  numerals: 'fa' | 'en'; width: number; height: number;
}): Promise<Buffer> {
  const { reference, details, width, height } = input;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1000 || height < 1500 || width > 4000 || height > 6000 ||
      Math.abs(width / height - SOURCE_W / SOURCE_H) > .002) {
    throw new Error('P02 print size must be a supported native 2:3 format');
  }
  const actualDetails: BirthSkyPersonalDetails = {
    names: safeShopArtworkText(details.names, 'نام'),
    message: safeShopArtworkText(details.message, 'پیام'),
    date: safeShopArtworkText(details.date, 'تاریخ'),
    time: safeShopArtworkText(details.time, 'زمان'),
    city: safeShopArtworkText(details.city, 'شهر', 100),
  };
  const stars = calculateShopStarAtlas(reference);
  const figures = calculateShopConstellationLines(reference);
  const named = calculateShopBrightStarProof(reference);
  const svg = renderShopBirthSkyR9(stars, figures, named, actualDetails, { numerals: input.numerals });
  const diffuse = await rasterBackgroundAtPreviewSize(svg);
  const printScene = injectDiffusedBackground(svg, diffuse);
  const { skeleton, entries } = extractText(printScene);
  const scaleX = width / SOURCE_W, scaleY = height / SOURCE_H;
  const glyphs = await Promise.all(entries.map((entry) => rasterText(entry, scaleX, scaleY)));
  let embedded = skeleton;
  for (let index = 0; index < entries.length; index++) {
    const { input: image, left, top, opacity } = glyphs[index];
    const meta = await sharp(image).metadata();
    if (!meta.width || !meta.height || !Number.isFinite(left) || !Number.isFinite(top)) {
      throw new Error('R9 print typography has invalid coordinates');
    }
    // Keep replacement images INSIDE the original SVG groups, retaining
    // transforms for constellation guide rows and named-star labels.
    const replacement = `<image x="${(left / scaleX).toFixed(2)}" y="${(top / scaleY).toFixed(2)}"` +
      ` width="${(meta.width / scaleX).toFixed(2)}" height="${(meta.height / scaleY).toFixed(2)}"` +
      ` opacity="${opacity}" href="data:image/png;base64,${image.toString('base64')}"/>`;
    embedded = embedded.replace(entries[index].token, replacement);
  }
  if (embedded.includes('__R9_NATIVE_TEXT_') || embedded.includes('<text ')) {
    throw new Error('R9 glyph replacement incomplete');
  }
  // Paint the authored vector at native 300-PPI geometry, but never in one
  // giant SVG raster. Tiling avoids libvips/librsvg's high memory/time cost
  // when a dense BSC5 star field is rendered on a 30x45 poster.
  const rootDimensions = 'viewBox="0 0 3000 4500" width="3000" height="4500"';
  if (!embedded.includes(rootDimensions)) throw new Error('R9 SVG root dimensions changed');
  const tileLimit = 1024;
  const columns = Math.ceil(width / tileLimit);
  const rows = Math.ceil(height / tileLimit);
  const tiles: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let row = 0; row < rows; row++) {
    const top = row * tileLimit;
    const tileHeight = Math.min(tileLimit, height - top);
    for (let col = 0; col < columns; col++) {
      const left = col * tileLimit;
      const tileWidth = Math.min(tileLimit, width - left);
      const viewBox = [
        (left * SOURCE_W / width).toFixed(8),
        (top * SOURCE_H / height).toFixed(8),
        (tileWidth * SOURCE_W / width).toFixed(8),
        (tileHeight * SOURCE_H / height).toFixed(8),
      ].join(' ');
      const tileSvg = embedded.replace(rootDimensions,
        'viewBox="' + viewBox + '" width="' + tileWidth + '" height="' + tileHeight + '"');
      const input = await sharp(Buffer.from(tileSvg, 'utf8'), {
        limitInputPixels: tileLimit * tileLimit,
      }).png().toBuffer();
      tiles.push({ input, left, top });
    }
  }
  // The tiled source remains one identical R9 coordinate system: the
  // background alone was sampled at preview size; no star is downscaled.
  return sharp({ create: {
    width, height, channels: 3, background: '#000000',
  } }).composite(tiles).toColourspace('srgb')
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .withMetadata({ density: 300, icc: 'srgb' }).toBuffer();
}

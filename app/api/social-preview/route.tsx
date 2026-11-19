import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREVIEW_SIZE = { width: 1200, height: 630 } as const;
const FONT_PATH = join(process.cwd(), "assets/shop-print/fonts/Estedad-Medium.ttf");
const PUBLIC_ROOT = resolve(process.cwd(), "public");
const RIGHT_EDGE = 1120;

function safePhotoPath(value: string | null): string | null {
  if (!value || value.includes("..") || value.includes("%") || value.includes("\\")) return null;
  const inPublicArea = /^\/(?:shop-preview|wiki|halleus-visuals)\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$/.test(value);
  const approvedRootImage = /^\/halleus-(?:chart-wheel-sample-polished-centered|compare-og|privacy-hero|order-hero)\.(?:webp|png)$/.test(value);
  if (!inPublicArea && !approvedRootImage) return null;
  const path = resolve(PUBLIC_ROOT, value.slice(1));
  return path.startsWith(PUBLIC_ROOT + sep) ? path : null;
}

function shortText(value: string | null, fallback: string, limit: number): string {
  const cleaned = (value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, limit) : fallback;
}

function escapePango(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function background(title: string, page: string, hasPhoto: boolean): Buffer {
  const hash = Array.from(title + page).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 19,
  );
  const stars = Array.from({ length: 24 }, (_, index) => {
    const x = 65 + ((hash + index * 71) % 430);
    const y = 55 + ((hash * (index + 7) + index * 43) % 530);
    const radius = index % 5 === 0 ? 2.4 : 1.4;
    const opacity = index % 5 === 0 ? 0.66 : 0.35;
    return '<circle cx="' + x + '" cy="' + y + '" r="' + radius +
      '" fill="#b9cbdc" opacity="' + opacity + '"/>';
  }).join("");
  const frameY = hasPhoto ? 65 : 46;
  const frameWidth = hasPhoto ? 468 : 410;
  const frameHeight = hasPhoto ? 500 : 535;
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">' +
    '<defs><radialGradient id="halo"><stop offset="0" stop-color="#344353" stop-opacity=".45"/>' +
    '<stop offset="1" stop-color="#344353" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="1200" height="630" fill="#08090b"/>' +
    '<circle cx="270" cy="316" r="310" fill="url(#halo)"/>' +
    '<circle cx="270" cy="316" r="250" fill="none" stroke="#374657" stroke-width="1.4"/>' +
    '<circle cx="270" cy="316" r="181" fill="none" stroke="#344150" stroke-width="1"/>' +
    stars +
    '<rect x="65" y="' + frameY + '" width="' + frameWidth +
    '" height="' + frameHeight +
    '" fill="none" stroke="#71879c" stroke-opacity=".4" rx="15"/>' +
    '</svg>',
  );
}

async function textLayer(
  value: string,
  size: number,
  color: string,
  maxWidth: number,
  maxHeight: number,
  top: number,
  rtl = true,
) {
  // Pango shapes Persian correctly with the approved local Estedad TTF.
  // Do not set text.height: Sharp would enlarge shorter strings to fill it.
  const markup = '<span foreground="' + color + '">' +
    (rtl ? "\u200f" : "") + escapePango(value) + '</span>';
  const original = await sharp({
    text: {
      text: markup,
      font: "Estedad " + size,
      fontfile: FONT_PATH,
      width: maxWidth,
      align: "right",
      wrap: "word-char",
      rgba: true,
    },
  }).png().toBuffer();
  const { data, info } = await sharp(original).resize({
    width: maxWidth,
    height: maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  }).png().toBuffer({ resolveWithObject: true });
  return { input: data, left: RIGHT_EDGE - info.width, top };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = shortText(params.get("title"), "هالیوس؛ هر لحظه یک آسمان", 106);
  const section = shortText(params.get("section"), "هالیوس", 52);
  const page = shortText(params.get("page"), "/", 170);

  const path = safePhotoPath(params.get("photo"));
  let photo: Buffer | null = null;
  if (path) {
    try {
      // Read only allowlisted local images; ignore this dynamic path in tracing.
      const bytes = await readFile(/* turbopackIgnore: true */ path);
      if (bytes.length <= 3_000_000) {
        photo = await sharp(bytes).resize(466, 498, { fit: "cover" }).png().toBuffer();
      }
    } catch {
      // Missing optional photography falls back to the title-only card.
    }
  }

  const hasPhoto = photo !== null;
  const titleSize = hasPhoto
    ? (title.length > 88 ? 32 : title.length > 62 ? 36 : 42)
    : (title.length > 88 ? 38 : title.length > 62 ? 44 : 54);

  const layers = [];
  if (photo) layers.push({ input: photo, left: 66, top: 66 });
  layers.push(await textLayer(section, 24, "#b8c8d9", hasPhoto ? 535 : 700, 66, 133));
  layers.push(await textLayer(title, titleSize, "#f7fafc", hasPhoto ? 535 : 700, 287, 208));
  layers.push(await textLayer("HALLEUS.IR", 22, "#a5b1bf", 300, 45, 535, false));

  const image = await sharp(background(title, page, hasPhoto))
    .composite(layers)
    .png({ compressionLevel: 8 })
    .toBuffer();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { calculateShopMoonAtUtc } from './shop-moon-ephemeris';
import { safeShopArtworkText, xmlShopArtworkText } from './shop-artwork-text';

// An existing site visual, not a rights-cleared, native-resolution print master.
// Its 1152-pixel-wide crop cannot meet any offered size at 300 PPI.
const moonVisualPath = 'public/halleus-visuals/moon-apollo11.webp';
const moonVisualWidth = 2048;
const moonVisualHeight = 1152;
const width = 1024;
const height = 1536;
const diameter = 840;

/**
 * Exact projected illuminated-area outline in an illustrative north-up frame.
 * For fraction f, the terminator's horizontal ellipse axis is (1 - 2f)R;
 * hence the lit area is exactly f times the full disc area in the ideal model.
 * This does NOT reconstruct optical libration, observer tilt or moonrise angle.
 */
export function shopMoonIlluminationPath(fraction: number, waxing: boolean, radius = diameter / 2): string {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1 ||
      !Number.isFinite(radius) || radius <= 0) {
    throw new Error('Invalid moon illumination geometry.');
  }
  const sign = waxing ? 1 : -1;
  const steps = 180;
  const outer: string[] = [];
  const terminator: string[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const y = -1 + (2 * index) / steps;
    const halfWidth = Math.sqrt(Math.max(0, 1 - y * y)) * radius;
    outer.push(`${(sign * halfWidth + radius).toFixed(3)},${(y * radius + radius).toFixed(3)}`);
    terminator.push(`${(sign * (1 - 2 * fraction) * halfWidth + radius).toFixed(3)},${(y * radius + radius).toFixed(3)}`);
  }
  return `M ${outer.join(' L ')} L ${terminator.reverse().join(' L ')} Z`;
}

function moonCaptionLayer(input: { names: string; message: string; dateLabel: string; referenceUtc: string }) {
  const { names, message, dateLabel, referenceUtc } = input;
  const text = (y: number, size: number, value: string) => value ?
    `<text x="512" y="${y}" direction="rtl" text-anchor="middle" font-family="Vazirmatn, 'Noto Naskh Arabic', sans-serif" font-size="${size}" fill="#ebf3f8">${xmlShopArtworkText(value)}</text>` : '';
  const nameSize = names.length > 30 ? 29 : names.length > 19 ? 36 : 43;
  const messageSize = message.length > 39 ? 21 : 28;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="bg" cx="50%" cy="43%" r="80%"><stop stop-color="#202b37"/><stop offset="1" stop-color="#111921"/></radialGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <text x="512" y="138" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#a8bdcb" letter-spacing="6">THE MOON THAT DAY</text>
    ${text(1268, nameSize, names)}
    ${text(1326, messageSize, message)}
    ${text(1385, 25, dateLabel)}
    <text x="512" y="1454" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#9db0bf">ILLUMINATION AT ${xmlShopArtworkText(referenceUtc)}</text>
    <text x="512" y="1515" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9db0bf">ILLUSTRATIVE PHASE PROOF · NOT APPROVED FOR PRINT</text>
  </svg>`, 'utf8');
}

/**
 * Design-only private PNG for an *explicit* UTC instant, never a date-only order.
 * The existing photographic texture provides surface detail; the illuminated
 * portion follows the actual ephemeris. Texture orientation/libration is not
 * observationally reconstructed. No customer data or output file is persisted.
 */
export async function buildShopMoonPhaseArtworkProof(input: {
  referenceUtc: string;
  names?: string;
  message?: string;
  dateLabel?: string;
}) {
  const phase = calculateShopMoonAtUtc(input.referenceUtc);
  const names = safeShopArtworkText(input.names ?? '', 'نام');
  const message = safeShopArtworkText(input.message ?? '', 'پیام');
  const dateLabel = safeShopArtworkText(input.dateLabel ?? '', 'تاریخ');
  const original = await readFile(join(process.cwd(), moonVisualPath));
  const metadata = await sharp(original).metadata();
  if (metadata.width !== moonVisualWidth || metadata.height !== moonVisualHeight ||
      metadata.format !== 'webp' || metadata.channels !== 3 || metadata.space !== 'srgb') {
    throw new Error('Moon artwork source is not the reviewed RGB site visual.');
  }

  // Central detail crop: explicitly NOT an original 840-pixel lunar photograph
  // of this timestamp, and not a full-disc scientific texture map.
  const moonTexture = await sharp(original)
    .extract({ left: 448, top: 0, width: moonVisualHeight, height: moonVisualHeight })
    .resize(diameter, diameter).png().toBuffer();
  const discMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
    <circle cx="420" cy="420" r="418" fill="white"/></svg>`, 'utf8');
  const phaseMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
    <path d="${shopMoonIlluminationPath(phase.illuminatedFraction, phase.phaseAngleDegrees <= 180)}" fill="white"/></svg>`, 'utf8');
  const shadow = await sharp(moonTexture).modulate({ brightness: 0.13 })
    .composite([{ input: discMask, blend: 'dest-in' }]).png().toBuffer();
  const bright = await sharp(moonTexture)
    .composite([{ input: phaseMask, blend: 'dest-in' }, { input: discMask, blend: 'dest-in' }])
    .png().toBuffer();
  const composed = await sharp(moonCaptionLayer({ names, message, dateLabel, referenceUtc: phase.referenceUtc }))
    .composite([
      { input: shadow, left: 92, top: 243 },
      { input: bright, left: 92, top: 243 },
    ]).png().toBuffer();
  const bytes = await sharp(composed).flatten({ background: '#111921' })
    .toColourspace('srgb').png().toBuffer();

  return {
    format: 'halleus.proof.p01-explicit-utc-moon.v1' as const,
    productId: 'p01' as const,
    referenceUtc: phase.referenceUtc,
    illuminatedFraction: phase.illuminatedFraction,
    phaseAngleDegrees: phase.phaseAngleDegrees,
    phase: phase.phase,
    orientation: 'illustrative-north-up-waxing-right' as const,
    nativePixels: { width, height },
    printArtworkReady: false as const,
    documentKind: 'explicit-instant-phase-design-proof-not-date-only-order-or-print-ready' as const,
    retainedOnServer: false as const,
    bytes,
  };
}

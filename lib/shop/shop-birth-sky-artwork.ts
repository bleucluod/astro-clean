import type { calculateShopStarAtlas } from './shop-sky-atlas';
import type { calculateShopConstellationLines } from './shop-constellation-lines';
import type { calculateShopGalacticAtmosphere } from './shop-galactic-atmosphere';

type Sky = ReturnType<typeof calculateShopStarAtlas>;
type Figures = ReturnType<typeof calculateShopConstellationLines>;
type Atmosphere = ReturnType<typeof calculateShopGalacticAtmosphere>;

export type BirthSkyPersonalDetails = {
  names: string;
  message: string;
  date: string;
  time: string;
  city: string;
};

export const SHOP_P02_POSTER_LAYOUT = {
  id: 'halleus.p02.black-estedad.approved-visual.2026-11-08',
  width: 3000,
  height: 4500,
  background: '#000000',
  circle: { x: 1500, y: 1920, radius: 1135 },
  typography: {
    brandTop: 296,
    ornament: 390,
    headline: 565,
    name: 3500,
    message: 3660,
    city: 3880,
    date: 3985,
    separator: 4085,
    brandBottom: 4220,
  },
  colors: {
    white: '#F8FAFC',
    icy: '#D9EAFD',
    secondary: '#BCCCDC',
    muted: '#9AA6B2',
  },
} as const;

const F = SHOP_P02_POSTER_LAYOUT;
const escapeXml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]!);

function fontSize(value: string, normal: number, medium: number, compact: number): number {
  const length = [...value].length;
  return length > 34 ? compact : length > 20 ? medium : normal;
}

function typographyLines(details: BirthSkyPersonalDetails) {
  const name = details.names.trim() || 'آسمان تولد';
  const message = details.message.trim();
  const city = details.city.trim();
  const date = details.date.trim() + '  ·  ' + details.time.trim();
  const t = F.typography;
  return [
    { id: 'name', text: name, x: 1500, y: t.name, size: fontSize(name, 211, 164, 128),
      weight: 500, fill: F.colors.white, direction: 'rtl' as const },
    ...(message ? [{ id: 'message', text: message, x: 1500, y: t.message,
      size: fontSize(message, 78, 66, 54), weight: 300, fill: F.colors.icy,
      direction: 'rtl' as const }] : []),
    { id: 'city', text: city, x: 1500, y: t.city, size: fontSize(city, 61, 54, 47),
      weight: 400, fill: F.colors.secondary, direction: 'rtl' as const },
    { id: 'date', text: date, x: 1500, y: t.date, size: 55,
      weight: 400, fill: F.colors.secondary, direction: 'ltr' as const },
  ];
}

const textElement = (x: number, y: number, size: number, weight: number, fill: string,
  value: string, direction: 'ltr' | 'rtl' = 'rtl', tracking = 0): string =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"
     font-family="var(--font-p02-estedad), Estedad, sans-serif" text-anchor="middle"
     direction="${direction}"${tracking ? ` letter-spacing="${tracking}"` : ''}>${escapeXml(value)}</text>`;

function posterTypography(details: BirthSkyPersonalDetails): string {
  const t = F.typography;
  const lines = typographyLines(details).map((line) =>
    textElement(line.x, line.y, line.size, line.weight, line.fill, line.text, line.direction));
  return `<g id="p02-poster-typography">
    ${textElement(1500, t.brandTop, 48, 400, F.colors.secondary,
      'H A L L E U S  /  T H E  S K Y  A T  B I R T H', 'ltr')}
    <g stroke="${F.colors.muted}" stroke-width="1.3" opacity=".48">
      <path d="M1140 ${t.ornament} H1430 M1570 ${t.ornament} H1860"/>
    </g>
    <path d="M1500 ${t.ornament - 19} L1510 ${t.ornament} L1500 ${t.ornament + 19} L1490 ${t.ornament} Z"
      fill="${F.colors.icy}"/>
    ${textElement(1500, t.headline, 119, 500, F.colors.white, 'آسمان لحظهٔ تولد')}
    ${lines.join('')}
    ${details.message.trim() ? `<g stroke="${F.colors.muted}" opacity=".42" stroke-width="1.4">
      <path d="M945 ${t.message - 25} H1180 M1820 ${t.message - 25} H2055"/>
    </g>` : ''}
    <path d="M1380 ${t.separator} H1620" stroke="${F.colors.muted}" stroke-width="1.6" opacity=".7"/>
    ${textElement(1500, t.brandBottom, 53, 400, F.colors.secondary,
      'H  A  L  L  E  U  S', 'ltr')}
  </g>`;
}

/**
 * Pure data-driven, deterministic SVG. Stars and constellation segments are
 * projected by the existing real BSC5/astronomy-engine pipeline, not an AI image.
 * Atmospheric glows are decorative and only attached to actual catalog stars.
 */
export function renderShopBirthSkyArtwork(
  atlas: Sky,
  figures: Figures,
  details: BirthSkyPersonalDetails,
  options: { typography?: boolean; atmosphere?: Atmosphere } = {},
): string {
  if (atlas.referenceUtc !== figures.referenceUtc ||
      atlas.latitude !== figures.latitude || atlas.longitude !== figures.longitude) {
    throw new Error('Star and constellation geometry must share one reference instant and location.');
  }
  const atmosphere = options.atmosphere;
  if (atmosphere && (atmosphere.referenceUtc !== atlas.referenceUtc ||
      atmosphere.latitude !== atlas.latitude || atmosphere.longitude !== atlas.longitude)) {
    throw new Error('Galactic atmosphere and catalog stars must share the same sky reference.');
  }
  const { x: cx, y: cy, radius } = F.circle;
  const inside = (x: number, y: number) =>
    Number.isFinite(x) && Number.isFinite(y) && x * x + y * y <= 1.00001;

  // A real star at each light source. Brightness hierarchy and subtle
  // four-point glints are graphic treatments, not new or relocated stars.
  const stars = atlas.aboveHorizonStars.map((star) => {
    if (!inside(star.x, star.y) || !Number.isFinite(star.visualMagnitude)) {
      throw new Error('Invalid projected catalog star.');
    }
    const x = (cx + star.x * radius).toFixed(2);
    const y = (cy + star.y * radius).toFixed(2);
    const magnitude = star.visualMagnitude;
    const r = Math.max(1.48, Math.min(7.2, 4.75 * Math.pow(10, (2 - magnitude) / 7)));
    const opacity = Math.max(.50, Math.min(1, 1.05 - (magnitude - 1) * .115));
    const bright = magnitude <= 2.25;
    const prominent = magnitude <= 1.0;
    const glow = bright ? `<circle cx="${x}" cy="${y}" r="${(r * 5.8).toFixed(2)}"
       fill="url(#p02-star-halo)" opacity=".76"/>` : '';
    const sparkle = prominent ? `<g stroke="${F.colors.icy}" stroke-linecap="round"
       stroke-width="1.25" opacity=".58">
       <path d="M${(Number(x) - r * 4.5).toFixed(2)} ${y} h${(r * 9).toFixed(2)}
         M${x} ${(Number(y) - r * 5.2).toFixed(2)} v${(r * 10.4).toFixed(2)}"/>
       </g>` : '';
    return glow + sparkle + `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}"
      fill="${F.colors.white}" opacity="${opacity.toFixed(2)}"/>`;
  }).join('');

  // Rank 1 includes the strongest, recognized sourced constellation figures.
  // We intentionally exclude ranks 2 and 3 rather than drawing every sourced
  // path: all included line geometry still comes from the real sky projection.
  const constellationPaths = figures.lines
    .filter((line) => line.rank === 1)
    .map((line) => {
      const path = line.points.map((point, index) => {
        if (!inside(point.x, point.y)) throw new Error('Invalid projected constellation point.');
        return (index === 0 ? 'M' : 'L') +
          (cx + point.x * radius).toFixed(2) + ' ' +
          (cy + point.y * radius).toFixed(2);
      }).join(' ');
      return `<path d="${path}" stroke="${F.colors.icy}" fill="none"
        stroke-linecap="round" stroke-linejoin="round"
        stroke-width="1.7" stroke-opacity=".34"/>`;
    }).join('');

  // Fine-grained mist is oriented by the J2000 galactic equator in the same
  // live instant and location as the catalog. This is atmospheric illustration,
  // NEVER a claim that the Galactic dust was visible to the naked eye.
  const galaxySpine = (atmosphere?.band ?? []).map((polyline) => {
    const path = polyline.map((point, index) => {
      if (!inside(point.x, point.y)) throw new Error('Invalid galactic plane projection.');
      return (index ? 'L' : 'M') + (cx + point.x * radius).toFixed(2) +
        ' ' + (cy + point.y * radius).toFixed(2);
    }).join(' ');
    return `<path d="${path}" fill="none" stroke="${F.colors.icy}"
      stroke-width="230" stroke-opacity=".095" stroke-linecap="round"
      filter="url(#p02-galactic-soften)"/>`;
  }).join('');

  const dustClouds = (atmosphere?.clouds ?? []).map((point) => {
    if (!inside(point.x, point.y)) throw new Error('Invalid galactic cloud projection.');
    return `<circle cx="${(cx + point.x * radius).toFixed(1)}"
      cy="${(cy + point.y * radius).toFixed(1)}" r="${point.size.toFixed(1)}"
      fill="url(#p02-dust)" opacity="${point.brightness.toFixed(3)}"/>`;
  }).join('');
  const galacticGrain = (atmosphere?.grains ?? []).map((point) => {
    if (!inside(point.x, point.y)) throw new Error('Invalid galactic grain projection.');
    return `<circle cx="${(cx + point.x * radius).toFixed(1)}"
      cy="${(cy + point.y * radius).toFixed(1)}" r="${point.size.toFixed(2)}"
      fill="${F.colors.secondary}" opacity="${point.brightness.toFixed(3)}"/>`;
  }).join('');

  const north = cy - radius;
  const south = cy + radius;
  const west = cx - radius;
  const east = cx + radius;
  const compass = [
    ['N', cx, north - 72], ['S', cx, south + 102],
    ['W', west - 80, cy + 19], ['E', east + 80, cy + 19],
  ].map(([label, x, y]) => textElement(Number(x), Number(y), 52, 400,
    F.colors.secondary, String(label), 'ltr')).join('');
  const cardinalFlares = [
    [cx, north], [cx, south], [west, cy], [east, cy],
  ].map(([x, y]) => `<g>
    <circle cx="${x}" cy="${y}" r="33" fill="url(#p02-star-halo)"/>
    <path d="M${x - 24} ${y} H${x + 24} M${x} ${y - 26} V${y + 26}"
      fill="none" stroke="${F.colors.icy}" stroke-width="1.6" stroke-opacity=".86"/>
    <circle cx="${x}" cy="${y}" r="3.6" fill="${F.colors.white}"/>
  </g>`).join('');
  const ticks = `<g stroke="${F.colors.icy}" stroke-width="2.4" opacity=".85">
    <path d="M${cx} ${north - 20} v44 M${cx} ${south - 24} v44
      M${west - 20} ${cy} h44 M${east - 24} ${cy} h44"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F.width} ${F.height}"
    width="${F.width}" height="${F.height}" role="img"
    aria-label="نقشهٔ محاسبه‌شدهٔ آسمان تولد">
    <title>آسمان تولد — ${escapeXml(details.names.trim() || 'هالیوس')}</title>
    <desc>نقشهٔ محاسباتی ستاره‌های بالای افق، نه تصویر تاریخی آسمان</desc>
    <defs>
      <clipPath id="p02-circle"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath>
      <radialGradient id="p02-star-halo"><stop offset="0" stop-color="#F8FAFC" stop-opacity=".62"/>
        <stop offset=".20" stop-color="#D9EAFD" stop-opacity=".23"/>
        <stop offset="1" stop-color="#D9EAFD" stop-opacity="0"/></radialGradient>
      <radialGradient id="p02-dust"><stop offset="0" stop-color="#D9EAFD" stop-opacity=".20"/>
        <stop offset=".48" stop-color="#BCCCDC" stop-opacity=".085"/>
        <stop offset="1" stop-color="#BCCCDC" stop-opacity="0"/></radialGradient>
      <filter id="p02-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
      <filter id="p02-galactic-soften" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="26"/>
      </filter>
    </defs>
    <rect width="${F.width}" height="${F.height}" fill="${F.background}"/>
    <g clip-path="url(#p02-circle)">
      <g id="p02-galactic-atmosphere">${galaxySpine}${dustClouds}${galacticGrain}</g>
      <g id="p02-sourced-constellations">${constellationPaths}</g>
      <g id="p02-sourced-stars">${stars}</g>
    </g>
    <g fill="none" stroke="${F.colors.icy}">
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke-width="14" opacity=".24"
        filter="url(#p02-ring-glow)"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke-width="2.4" opacity=".87"/>
      <circle cx="${cx}" cy="${cy}" r="${radius + 10}" stroke-width="1.1" opacity=".26"/>
    </g>
    ${ticks}${cardinalFlares}${compass}
    ${options.typography === false ? '' : posterTypography(details)}
  </svg>`;
}

/** Use the same text coordinates in the canvas PNG and the in-page SVG. */
export async function paintShopBirthSkyTypography(
  canvas: CanvasRenderingContext2D,
  details: BirthSkyPersonalDetails,
  fontFamily: string,
): Promise<void> {
  const font = fontFamily.trim() || 'sans-serif';
  const setFont = async (size: number, weight: number) => {
    const description = `${weight} ${size}px ${font}`;
    await document.fonts.load(description);
    canvas.font = description;
  };
  const line = async (
    text: string, x: number, y: number, size: number, weight: number,
    color: string, direction: 'rtl' | 'ltr' = 'rtl',
  ) => {
    await setFont(size, weight);
    canvas.direction = direction;
    canvas.textAlign = 'center';
    canvas.textBaseline = 'alphabetic';
    canvas.fillStyle = color;
    canvas.fillText(text, x, y, 2500);
  };
  const t = F.typography;
  await line('H A L L E U S  /  T H E  S K Y  A T  B I R T H',
    1500, t.brandTop, 48, 400, F.colors.secondary, 'ltr');
  canvas.strokeStyle = F.colors.muted;
  canvas.globalAlpha = .48;
  canvas.lineWidth = 1.3;
  canvas.beginPath();
  canvas.moveTo(1140, t.ornament); canvas.lineTo(1430, t.ornament);
  canvas.moveTo(1570, t.ornament); canvas.lineTo(1860, t.ornament);
  canvas.stroke();
  canvas.globalAlpha = 1;
  canvas.fillStyle = F.colors.icy;
  canvas.beginPath();
  canvas.moveTo(1500, t.ornament - 19);
  canvas.lineTo(1510, t.ornament);
  canvas.lineTo(1500, t.ornament + 19);
  canvas.lineTo(1490, t.ornament);
  canvas.closePath(); canvas.fill();
  await line('آسمان لحظهٔ تولد', 1500, t.headline, 119, 500, F.colors.white);
  for (const text of typographyLines(details)) {
    await line(text.text, text.x, text.y, text.size, text.weight, text.fill, text.direction);
  }
  if (details.message.trim()) {
    canvas.strokeStyle = F.colors.muted;
    canvas.globalAlpha = .42;
    canvas.lineWidth = 1.4;
    canvas.beginPath();
    canvas.moveTo(945, t.message - 25); canvas.lineTo(1180, t.message - 25);
    canvas.moveTo(1820, t.message - 25); canvas.lineTo(2055, t.message - 25);
    canvas.stroke();
    canvas.globalAlpha = 1;
  }
  canvas.strokeStyle = F.colors.muted;
  canvas.globalAlpha = .7;
  canvas.lineWidth = 1.6;
  canvas.beginPath(); canvas.moveTo(1380, t.separator);
  canvas.lineTo(1620, t.separator); canvas.stroke();
  canvas.globalAlpha = 1;
  await line('H  A  L  L  E  U  S', 1500, t.brandBottom, 53, 400,
    F.colors.secondary, 'ltr');
}

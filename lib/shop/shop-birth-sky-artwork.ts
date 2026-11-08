import type { calculateShopStarAtlas } from './shop-sky-atlas';
import type { calculateShopConstellationLines } from './shop-constellation-lines';

type Sky = ReturnType<typeof calculateShopStarAtlas>;
type Figures = ReturnType<typeof calculateShopConstellationLines>;

type PersonalDetails = {
  names: string;
  message: string;
  date: string;
  time: string;
  city: string;
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

function textSize(value: string, normal: number, medium: number, small: number): number {
  return [...value].length > 40 ? small : [...value].length > 24 ? medium : normal;
}

/**
 * A flat, genuine, personalized sky artwork — not a mockup or a stock photo.
 * Uses the same source star positions and horizon projection as the private
 * P02 print candidate. An SVG review render does not imply lab/print approval.
 */
export function renderShopBirthSkyArtwork(
  atlas: Sky, figures: Figures, details: PersonalDetails,
): string {
  if (atlas.referenceUtc !== figures.referenceUtc ||
      atlas.latitude !== figures.latitude || atlas.longitude !== figures.longitude) {
    throw new Error('Star and constellation geometry must share one reference instant and location.');
  }
  const cx = 1500;
  const cy = 1930;
  const radius = 1130;
  const starDots = atlas.aboveHorizonStars.map((star) => {
    const x = (cx + star.x * radius).toFixed(2);
    const y = (cy + star.y * radius).toFixed(2);
    const starRadius = Math.min(4.9, Math.max(1.25,
      2.35 * Math.pow(10, (2.1 - star.visualMagnitude) / 8)));
    const opacity = Math.min(1, Math.max(.68, 1 - Math.max(0, star.visualMagnitude - 3.2) / 13));
    return '<circle cx="' + x + '" cy="' + y + '" r="' + starRadius.toFixed(2) +
      '" fill="#f3f8ff" opacity="' + opacity.toFixed(2) + '"/>';
  }).join('');
  const constellationPaths = figures.lines.map((line) => {
    const path = line.points.map((point, index) =>
      (index === 0 ? 'M' : 'L') + (cx + point.x * radius).toFixed(2) +
      ' ' + (cy + point.y * radius).toFixed(2)).join(' ');
    return '<path d="' + path + '" stroke="#b9d5e7" stroke-width="' +
      (line.rank === 1 ? '2.6' : '1.7') + '" stroke-opacity="' +
      (line.rank === 1 ? '.55' : '.32') + '" fill="none"/>';
  }).join('');

  const name = details.names.trim() || 'آسمان تولد';
  const message = details.message.trim();
  const fullDate = details.date.trim();
  const time = details.time.trim();
  const city = details.city.trim();
  // Escape all caller-owned strings. Only finite, engine-calculated coordinates
  // are used for SVG attributes and no user-controlled SVG markup is accepted.
  for (const scalar of [cx, cy, radius]) {
    if (!Number.isFinite(scalar)) throw new Error('Invalid sky artwork geometry.');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3000 4500"
     width="3000" height="4500" role="img"
     aria-label="نقشهٔ واقعی و محاسبه‌شدهٔ ستاره‌های لحظهٔ تولد">
  <title>آسمان تولد — ${escapeXml(name)}</title>
  <desc>نقشهٔ محاسبه‌شده از ستارگان بالای افق برای تاریخ، ساعت و شهر انتخاب‌شده؛ نه عکس تاریخی آسمان</desc>
  <defs>
    <radialGradient id="birth-sky-surface" cx="50%" cy="39%" r="78%">
      <stop offset="0%" stop-color="#283f55"/>
      <stop offset="56%" stop-color="#1c2e40"/>
      <stop offset="100%" stop-color="#101b28"/>
    </radialGradient>
    <clipPath id="birth-sky-circle"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath>
  </defs>
  <rect width="3000" height="4500" fill="url(#birth-sky-surface)"/>
  <g fill="#d6e7f4" text-anchor="middle" font-family="var(--font-vazirmatn), Vazirmatn, sans-serif">
    <text x="1500" y="450" font-size="39" letter-spacing="6" opacity=".7" direction="ltr">HALLEUS  /  THE SKY AT BIRTH</text>
    <text x="1500" y="610" font-size="70" font-weight="650" direction="rtl">آسمان لحظهٔ تولد</text>
  </g>
  <g fill="none" stroke="#b8d0e1">
    <circle cx="${cx}" cy="${cy}" r="${radius}" stroke-width="2.5" opacity=".65"/>
    <circle cx="${cx}" cy="${cy}" r="${radius + 20}" stroke-width="1" opacity=".26"/>
    <circle cx="${cx}" cy="${cy}" r="${Math.round(radius * .667)}" stroke-width="1" opacity=".13"/>
    <circle cx="${cx}" cy="${cy}" r="${Math.round(radius * .333)}" stroke-width="1" opacity=".10"/>
  </g>
  <g clip-path="url(#birth-sky-circle)">${constellationPaths}${starDots}</g>
  <g fill="#bfd6e6" font-family="sans-serif" font-size="31" text-anchor="middle" opacity=".64">
    <text x="1500" y="742">N</text><text x="1500" y="3152">S</text>
    <text x="300" y="1942">W</text><text x="2700" y="1942">E</text>
  </g>
  <g text-anchor="middle" font-family="var(--font-vazirmatn), Vazirmatn, sans-serif" direction="rtl">
    <text x="1500" y="3550" fill="#f3f8fc" font-size="${textSize(name, 74, 58, 43)}" font-weight="650">${escapeXml(name)}</text>
    ${message ? '<text x="1500" y="3660" fill="#dae7f1" font-size="' +
      textSize(message, 45, 39, 32) + '">' + escapeXml(message) + '</text>' : ''}
    <text x="1500" y="3890" fill="#c9dbe8" font-size="${textSize(city, 42, 37, 31)}">${escapeXml(city)}</text>
    <text x="1500" y="3995" fill="#b7cbda" font-size="38" direction="ltr">${escapeXml(fullDate)}  ·  ${escapeXml(time)}</text>
  </g>
  <path d="M 1340 4160 H 1660" stroke="#afc8db" stroke-opacity=".48" stroke-width="1.5"/>
  <text x="1500" y="4250" text-anchor="middle" font-family="sans-serif"
        font-size="26" letter-spacing="4" fill="#8fa9bc">A MOMENT WRITTEN IN STARS</text>
</svg>`;
}

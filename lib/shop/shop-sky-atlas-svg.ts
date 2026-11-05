import type { calculateShopStarAtlas } from './shop-sky-atlas';

type Atlas = ReturnType<typeof calculateShopStarAtlas>;

function xml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}

/** Original scalable vector mockup, not a lab-approved personalized print master. */
export function renderShopStarAtlasProofSvg(atlas: Atlas, cityName: string): string {
  const centerX = 1500;
  const centerY = 2020;
  const radius = 1160;
  const dots = atlas.aboveHorizonStars.map((star) => {
    const x = (centerX + radius * star.x).toFixed(2);
    const y = (centerY + radius * star.y).toFixed(2);
    const radiusOfStar = Math.min(6, Math.max(1.8, 3.4 * Math.pow(10, (2.2 - star.visualMagnitude) / 7))).toFixed(2);
    const opacity = Math.min(1, Math.max(0.72, 1 - Math.max(0, star.visualMagnitude - 3.2) / 10)).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${radiusOfStar}" fill="#ecf7ff" opacity="${opacity}"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="3544" height="5315" viewBox="0 0 3000 4500" role="img" aria-label="BSC5 real-star atlas proof, not approved print artwork">
  <title>Birth sky — calculation and layout proof only</title>
  <desc>Original vector using ${atlas.catalogueCount} Yale Bright Star Catalogue entries to magnitude ${atlas.brightnessLimit}; ${atlas.aboveHorizonCount} above the horizon. No synthetic or constellation stars.</desc>
  <defs>
    <radialGradient id="sky" cx="48%" cy="44%" r="80%"><stop offset="0%" stop-color="#23384d"/><stop offset="100%" stop-color="#142433"/></radialGradient>
    <clipPath id="sky-disc"><circle cx="${centerX}" cy="${centerY}" r="${radius}"/></clipPath>
  </defs>
  <rect width="3000" height="4500" fill="url(#sky)"/>
  <g stroke="#adc4d4" fill="none" opacity="0.4" stroke-width="2">
    <circle cx="${centerX}" cy="${centerY}" r="${radius}"/>
    <circle cx="${centerX}" cy="${centerY}" r="773" opacity="0.35"/>
    <circle cx="${centerX}" cy="${centerY}" r="386" opacity="0.35"/>
    <path d="M ${centerX} ${centerY - radius} V ${centerY + radius} M ${centerX - radius} ${centerY} H ${centerX + radius}" opacity="0.25"/>
  </g>
  <g clip-path="url(#sky-disc)">${dots}</g>
  <g text-anchor="middle" font-family="sans-serif" fill="#e5eff8">
    <text x="1500" y="520" font-size="76" letter-spacing="14">THE SKY THAT DAY</text>
    <text x="1500" y="670" font-size="38" fill="#aec7da">${xml(cityName)}</text>
    <text x="1500" y="737" font-size="32" fill="#aec7da">${xml(atlas.referenceUtc)}</text>
    <text x="1500" y="3590" font-size="40" letter-spacing="8">A MOMENT IN THE SKY</text>
    <text x="1500" y="3654" font-size="28" fill="#a9bdcc">NORTH-UP · HORIZON CIRCLE · J2000 STAR POSITIONS</text>
    <text x="1500" y="3880" font-size="29" fill="#dcb8bc">CALCULATION PROOF · NOT APPROVED FOR PRINT</text>
    <text x="1500" y="3935" font-size="25" fill="#a9bdcc">${atlas.aboveHorizonCount} STARS ABOVE HORIZON / ${atlas.catalogueCount} BRIGHT STARS CATALOGUED</text>
    <text x="1500" y="4130" font-size="24" fill="#8199aa">YALE BRIGHT STAR CATALOGUE · CDS V/50 · MAG ≤ 6</text>
  </g>
  <g text-anchor="middle" font-family="sans-serif" font-size="33" fill="#9eb8cb"><text x="1500" y="808">N</text><text x="1500" y="3240">S</text><text x="2745" y="2033">E</text><text x="255" y="2033">W</text></g>
</svg>
`;
}

import type { calculateShopBrightStarProof } from './shop-sky-stars';

type Proof = ReturnType<typeof calculateShopBrightStarProof>;

function xml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}

/** Calculation-only visual; intentionally cannot be mistaken for a print master. */
export function renderShopBrightStarProofSvg(proof: Proof, placeLabel: string): string {
  const cx = 450;
  const cy = 635;
  const radius = 330;
  const circles = proof.aboveHorizonStars.map((star) => {
    const x = (cx + radius * star.x).toFixed(2);
    const y = (cy + radius * star.y).toFixed(2);
    return `    <circle cx="${x}" cy="${y}" r="5" fill="#e4f5ff" stroke="#92d9ff" stroke-width="1.5" />\n` +
      `    <text x="${x}" y="${(Number(y) - 13).toFixed(2)}" text-anchor="middle" font-size="14" fill="#d9edff">${xml(star.labelEn)}</text>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1300" viewBox="0 0 900 1300" role="img" aria-label="Curated bright-star calculation proof, not a complete sky or print artwork">
  <rect width="900" height="1300" fill="#142538" />
  <text x="450" y="105" text-anchor="middle" font-size="34" font-family="sans-serif" fill="#f0f7ff">BRIGHT STAR / CALCULATION PROOF</text>
  <text x="450" y="151" text-anchor="middle" font-size="19" font-family="sans-serif" fill="#a5bed3">${xml(placeLabel)}</text>
  <text x="450" y="184" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#a5bed3">${xml(proof.referenceUtc)}</text>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#1d3449" stroke="#98b6ce" stroke-width="2" />
  <circle cx="${cx}" cy="${cy}" r="220" fill="none" stroke="#57758e" stroke-width="1" />
  <circle cx="${cx}" cy="${cy}" r="110" fill="none" stroke="#57758e" stroke-width="1" />
  <path d="M 450 305 V 965 M 120 635 H 780" fill="none" stroke="#57758e" stroke-width="1" />
  <g font-family="sans-serif" font-size="19" fill="#bfddf0" text-anchor="middle">
    <text x="450" y="280">N</text><text x="805" y="642">E</text>
    <text x="450" y="1005">S</text><text x="95" y="642">W</text>
  </g>
  <g font-family="sans-serif">
${circles}
  </g>
  <text x="450" y="1110" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#d9edff">${proof.aboveHorizonStarCount} above horizon / ${proof.catalogueStarCount} curated stars</text>
  <text x="450" y="1149" text-anchor="middle" font-size="17" font-family="sans-serif" fill="#ffc7ba">NOT A COMPLETE STAR ATLAS · NOT PRINT-READY</text>
  <text x="450" y="1194" text-anchor="middle" font-size="15" font-family="sans-serif" fill="#b3c5d2">${xml(proof.catalogueVersion)}</text>
</svg>
`;
}

import type { ZodiacSignId } from '@/src/lib/chart/zodiac';

/** Canonical, approved silver glyphs for the Nemad Man collection.
 * Cropped from the one approved 4x3 image; not AI-redrawn or font glyphs.
 * Treat v1 paths as immutable; a different design requires an approved v2.
 */
export const NEMAD_MAN_ZODIAC_GLYPH_PACK_VERSION = 'approved-silver-v1-2026-11-17' as const;
export const NEMAD_MAN_ZODIAC_GLYPHS = {
  aries: '/nemad-man/zodiac-glyphs-v1/aries.webp',
  taurus: '/nemad-man/zodiac-glyphs-v1/taurus.webp',
  gemini: '/nemad-man/zodiac-glyphs-v1/gemini.webp',
  cancer: '/nemad-man/zodiac-glyphs-v1/cancer.webp',
  leo: '/nemad-man/zodiac-glyphs-v1/leo.webp',
  virgo: '/nemad-man/zodiac-glyphs-v1/virgo.webp',
  libra: '/nemad-man/zodiac-glyphs-v1/libra.webp',
  scorpio: '/nemad-man/zodiac-glyphs-v1/scorpio.webp',
  sagittarius: '/nemad-man/zodiac-glyphs-v1/sagittarius.webp',
  capricorn: '/nemad-man/zodiac-glyphs-v1/capricorn.webp',
  aquarius: '/nemad-man/zodiac-glyphs-v1/aquarius.webp',
  pisces: '/nemad-man/zodiac-glyphs-v1/pisces.webp',
} as const satisfies Readonly<Record<ZodiacSignId, string>>;

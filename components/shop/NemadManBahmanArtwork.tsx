import localFont from 'next/font/local';
import { getNemadPosterSky, type NemadSign } from '@/lib/shop/nemad-man-bahman-preview';
import { NEMAD_MAN_ZODIAC_GLYPHS } from '@/lib/shop/nemad-man-zodiac-glyphs';

const estedad = localFont({
  src: [
    { path: '../../assets/shop-print/fonts/Estedad-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../assets/shop-print/fonts/Estedad-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../assets/shop-print/fonts/Estedad-Medium.ttf', weight: '500', style: 'normal' },
  ],
  display: 'swap',
});

/** Approved dark design plus a cool light variant; both share one geometry,
 * astronomical source, typography and the immutable approved zodiac glyphs. */
export type NemadPosterTheme = 'dark' | 'light';

export function NemadManBahmanArtwork({ name, date, sign, theme = 'dark' }: {
  name: string; date: string; sign: NemadSign; theme?: NemadPosterTheme;
}) {
  const sky = getNemadPosterSky(sign);
  const isLight = theme === 'light';
  const latinName = /^[\x20-\x7E]+$/.test(name);
  const nameSize = Array.from(name).length > 16 ? 46 : Array.from(name).length > 9 ? 58 : 72;

  return (
    <svg viewBox="0 0 900 1350" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`پیش‌نمایش تابلوی بدون قاب ${sign.displayFa} برای ${name}، ${date}`}>
      <title>{`تابلو مینیمال برج ${sign.displayFa} / ${sign.en}`}</title>
      <desc>صورت فلکی مرجع J2000 با جهت شمال بالا و شرق چپ؛ این تصویر نقشهٔ آسمان تولد نیست.</desc>
      <defs>
        <radialGradient id="nemad-globe" cx="51%" cy="48%" r="70%">
          <stop stopColor={isLight ? '#F5F8FB' : '#15191d'}/>
          <stop offset=".62" stopColor={isLight ? '#EBF1F6' : '#0d1115'}/>
          <stop offset="1" stopColor={isLight ? '#E0E9F0' : '#080a0c'}/>
        </radialGradient>
        <radialGradient id="nemad-star-halo">
          <stop stopColor={isLight ? '#526D86' : '#f5faff'} stopOpacity={isLight ? '.26' : '.52'}/>
          <stop offset=".28" stopColor={isLight ? '#718BA3' : '#e3edf5'} stopOpacity={isLight ? '.10' : '.15'}/>
          <stop offset="1" stopColor={isLight ? '#718BA3' : '#e3edf5'} stopOpacity="0"/>
        </radialGradient>
        {/* Reuse the Night of Us proof lettering; soft cool-white glow is kept restrained on black. */}
        <filter id="nemad-night-text-soft-glow" x="-30%" y="-65%" width="160%" height="230%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.25" result="nemad-soft-alpha"/>
          <feFlood floodColor="#d9eafd" floodOpacity=".10" result="nemad-soft-tint"/>
          <feComposite in="nemad-soft-tint" in2="nemad-soft-alpha" operator="in" result="nemad-soft-glow"/>
          <feMerge><feMergeNode in="nemad-soft-glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Restrained silver highlight is exclusive to the personal name. */}
        <linearGradient id="nemad-name-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff"/>
          <stop offset=".48" stopColor="#eef4f9"/>
          <stop offset="1" stopColor="#b9c9d8"/>
        </linearGradient>
        {/* A visibly layered, cool graphite-silver ink for the personal name
            in the light colorway, separate from the approved night silver. */}
        <linearGradient id="nemad-name-ink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E3348"/>
          <stop offset=".30" stopColor="#344E66"/>
          <stop offset=".47" stopColor="#8096A8"/>
          <stop offset=".56" stopColor="#536E85"/>
          <stop offset=".78" stopColor="#304A62"/>
          <stop offset="1" stopColor="#20364D"/>
        </linearGradient>
        {/* A quiet ink impression beneath the light name. SVG-local so PNG
            exports and previews use the same depth without web font effects. */}
        <filter id="nemad-light-name-depth" x="-25%" y="-60%" width="150%" height="220%"
          colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="nemad-ink-blur"/>
          <feOffset in="nemad-ink-blur" dx="0" dy="3" result="nemad-ink-offset"/>
          <feFlood floodColor="#465E75" floodOpacity=".28" result="nemad-ink-color"/>
          <feComposite in="nemad-ink-color" in2="nemad-ink-offset" operator="in" result="nemad-ink-shadow"/>
          <feMerge>
            <feMergeNode in="nemad-ink-shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Tint existing approved WebP only in light mode; preserve raster alpha. */}
        <filter id="nemad-light-glyph-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix"
            values="0.25 0 0 0 0.035  0 0.30 0 0 0.04  0 0 0.35 0 0.05  0 0 0 1 0"/>
        </filter>
        <clipPath id="nemad-sky-clip"><circle cx="450" cy="430" r="294"/></clipPath>
      </defs>
      <rect width="900" height="1350" fill={isLight ? '#F8FAFC' : '#000000'}/>
      <circle cx="450" cy="430" r="294" fill="url(#nemad-globe)"/>
      <g clipPath="url(#nemad-sky-clip)">
        <g transform="translate(0 72)">
          <g>
          {sky.stars.map((star, index) => (
            <g key={`catalogue-${index}`}>
              {star.prominent ? <circle cx={star.x} cy={star.y} r={star.radius * 6.7} fill="url(#nemad-star-halo)" opacity=".6" /> : null}
              <circle cx={star.x} cy={star.y} r={star.radius}
                fill={isLight ? '#526B82' : '#e5ebef'}
                opacity={isLight ? Math.min(.86, star.opacity * .94) : Math.min(.87, star.opacity * .84)}/>
            </g>
          ))}
        </g>
        <g fill="none" stroke={isLight ? '#526B82' : '#dce5eb'} strokeWidth="1.65"
          strokeOpacity={isLight ? '.80' : '.95'} strokeLinejoin="round" strokeLinecap="round">
          {sky.paths.map((line, index) => (
            <polyline key={`figure-${index}`} points={line.map(({x,y}) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}/>
          ))}
        </g>
        {sky.nodes.map((star, index) => (
          <g key={`key-star-${index}`}>
            <circle cx={star.x} cy={star.y} r={star.radius * 5.35} fill="url(#nemad-star-halo)" opacity=".82"/>
            <circle cx={star.x} cy={star.y} r={star.radius * .86} fill={isLight ? '#38546D' : '#f1f5f8'}/>
          </g>
        ))}
        </g>
      </g>
      <circle cx="450" cy="430" r="294" stroke={isLight ? '#7790A4' : '#d8e0e5'}
        strokeOpacity={isLight ? '.28' : '.045'} strokeWidth="1" fill="none"/>
      {/* Shared user-approved zodiac pack; no hand-drawn or font glyph fallback. */}
      <image href={NEMAD_MAN_ZODIAC_GLYPHS[sign.id]} x="340" y="755" width="220" height="180"
        preserveAspectRatio="xMidYMid meet" filter={isLight ? 'url(#nemad-light-glyph-ink)' : undefined} />
      {/* Editorial group: quiet zodiac, prominent name, date without a divider. */}
      <g textAnchor="middle" fontFamily={estedad.style.fontFamily}
        stroke={isLight ? '#F8FAFC' : '#09131b'} strokeOpacity={isLight ? '.25' : '.68'}
        strokeWidth="2.3" paintOrder="stroke">
        <text x="450" y="980" fontWeight="300" fontSize="31"
          fill={isLight ? '#52657A' : '#bcccdc'} opacity=".8">{sign.displayFa}</text>
        <text x="450" y="1090" fontSize={nameSize} fontWeight="500"
          fill={isLight ? 'url(#nemad-name-ink)' : 'url(#nemad-name-silver)'} strokeWidth="1.7"
          direction={latinName ? 'ltr' : 'rtl'}
          filter={isLight ? 'url(#nemad-light-name-depth)' : 'url(#nemad-night-text-soft-glow)'}>{name}</text>
      </g>
      <text x="450" y="1190" textAnchor="middle"
        fontFamily={estedad.style.fontFamily}
        fontSize="25" fontWeight="400" fill={isLight ? '#52657A' : '#bcccdc'}
        opacity={isLight ? '.86' : '.76'}
        direction="rtl" unicodeBidi="isolate">{date}</text>
      {/* P02 R9 footer reference: x 1500/3000, y 4310/4500, size 52/4500.
          Preserve relative vertical placement, color and opacity on this 900x1350 poster. */}
      <text x="450" y="1293" textAnchor="middle" fontFamily={estedad.style.fontFamily}
        fontSize="15.6" fontWeight="400" fill={isLight ? '#64748B' : '#8A96A1'}
        opacity={isLight ? '.70' : '.52'} direction="ltr">
        H  A  L  L  E  U  S
      </text>
    </svg>
  );
}

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

/** Frameless, black-on-black minimal poster aligned to the approved Aquarius sample.
 * All constellation lines and stars use the existing J2000 catalogue data.
 * The subtle disc and typography are decorative—not a recorded birth sky. */
export function NemadManBahmanArtwork({ name, date, sign }: {
  name: string; date: string; sign: NemadSign;
}) {
  const sky = getNemadPosterSky(sign);
  const latinName = /^[\x20-\x7E]+$/.test(name);
  const nameSize = Array.from(name).length > 16 ? 46 : Array.from(name).length > 9 ? 58 : 72;

  return (
    <svg viewBox="0 0 900 1125" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`پیش‌نمایش تابلوی بدون قاب ${sign.displayFa} برای ${name}، ${date}`}>
      <title>{`تابلو مینیمال برج ${sign.displayFa} / ${sign.en}`}</title>
      <desc>صورت فلکی مرجع J2000 با جهت شمال بالا و شرق چپ؛ این تصویر نقشهٔ آسمان تولد نیست.</desc>
      <defs>
        <radialGradient id="nemad-globe" cx="51%" cy="48%" r="70%">
          <stop stopColor="#15191d"/>
          <stop offset=".62" stopColor="#0d1115"/>
          <stop offset="1" stopColor="#080a0c"/>
        </radialGradient>
        <radialGradient id="nemad-star-halo">
          <stop stopColor="#f5faff" stopOpacity=".52"/>
          <stop offset=".28" stopColor="#e3edf5" stopOpacity=".15"/>
          <stop offset="1" stopColor="#e3edf5" stopOpacity="0"/>
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
        <clipPath id="nemad-sky-clip"><circle cx="450" cy="358" r="294"/></clipPath>
      </defs>
      <rect width="900" height="1125" fill="#000000"/>
      <circle cx="450" cy="358" r="294" fill="url(#nemad-globe)"/>
      <g clipPath="url(#nemad-sky-clip)">
        <g>
          {sky.stars.map((star, index) => (
            <g key={`catalogue-${index}`}>
              {star.prominent ? <circle cx={star.x} cy={star.y} r={star.radius * 6.7} fill="url(#nemad-star-halo)" opacity=".6" /> : null}
              <circle cx={star.x} cy={star.y} r={star.radius} fill="#e5ebef" opacity={Math.min(.87, star.opacity * .84)}/>
            </g>
          ))}
        </g>
        <g fill="none" stroke="#dce5eb" strokeWidth="1.65" strokeOpacity=".95" strokeLinejoin="round" strokeLinecap="round">
          {sky.paths.map((line, index) => (
            <polyline key={`figure-${index}`} points={line.map(({x,y}) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}/>
          ))}
        </g>
        {sky.nodes.map((star, index) => (
          <g key={`key-star-${index}`}>
            <circle cx={star.x} cy={star.y} r={star.radius * 5.35} fill="url(#nemad-star-halo)" opacity=".82"/>
            <circle cx={star.x} cy={star.y} r={star.radius * .86} fill="#f1f5f8"/>
          </g>
        ))}
      </g>
      <circle cx="450" cy="358" r="294" stroke="#d8e0e5" strokeOpacity=".045" strokeWidth="1" fill="none"/>
      {/* Shared user-approved zodiac pack; no hand-drawn or font glyph fallback. */}
      <image href={NEMAD_MAN_ZODIAC_GLYPHS[sign.id]} x="340" y="629" width="220" height="180" preserveAspectRatio="xMidYMid meet" />
      {/* Editorial group: quiet zodiac, prominent name, date without a divider. */}
      <g textAnchor="middle" fontFamily={estedad.style.fontFamily}
        stroke="#09131b" strokeOpacity=".68" strokeWidth="2.3" paintOrder="stroke">
        <text x="450" y="845" fontWeight="300" fontSize="31" fill="#bcccdc" opacity=".8">{sign.displayFa}</text>
        <text x="450" y="935" fontSize={nameSize} fontWeight="500"
          fill="url(#nemad-name-silver)" strokeWidth="1.7"
          direction={latinName ? 'ltr' : 'rtl'} filter="url(#nemad-night-text-soft-glow)">{name}</text>
      </g>
      <text x="450" y="1009" textAnchor="middle"
        fontFamily={estedad.style.fontFamily}
        fontSize="25" fontWeight="400" fill="#bcccdc" opacity=".76"
        direction="rtl" unicodeBidi="isolate">{date}</text>
    </svg>
  );
}

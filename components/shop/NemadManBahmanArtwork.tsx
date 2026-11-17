import { getNemadPosterSky, type NemadSign } from '@/lib/shop/nemad-man-bahman-preview';
import { NEMAD_MAN_ZODIAC_GLYPHS } from '@/lib/shop/nemad-man-zodiac-glyphs';

/** Frameless, black-on-black minimal poster aligned to the approved Aquarius sample.
 * All constellation lines and stars use the existing J2000 catalogue data.
 * The subtle disc and typography are decorative—not a recorded birth sky. */
export function NemadManBahmanArtwork({ name, date, sign }: {
  name: string; date: string; sign: NemadSign;
}) {
  const sky = getNemadPosterSky(sign);
  const latinName = /^[\x20-\x7E]+$/.test(name);
  const nameSize = Array.from(name).length > 16 ? 43 : Array.from(name).length > 9 ? 51 : 61;

  return (
    <svg viewBox="0 0 900 1125" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`پیش‌نمایش تابلوی بدون قاب ${sign.fa} برای ${name}، ${date}`}>
      <title>{`تابلو مینیمال برج ${sign.fa} / ${sign.en}`}</title>
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
        <g fill="none" stroke="#dce5eb" strokeWidth="1.45" strokeOpacity=".87" strokeLinejoin="round" strokeLinecap="round">
          {sky.paths.map((line, index) => (
            <polyline key={`figure-${index}`} points={line.map(({x,y}) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}/>
          ))}
        </g>
        {sky.nodes.map((star, index) => (
          <g key={`key-star-${index}`}>
            <circle cx={star.x} cy={star.y} r={star.radius * 4.8} fill="url(#nemad-star-halo)" opacity=".72"/>
            <circle cx={star.x} cy={star.y} r={star.radius * .78} fill="#f1f5f8"/>
          </g>
        ))}
      </g>
      <circle cx="450" cy="358" r="294" stroke="#d8e0e5" strokeOpacity=".045" strokeWidth="1" fill="none"/>
      {/* Shared user-approved zodiac pack; no hand-drawn or font glyph fallback. */}
      <image href={NEMAD_MAN_ZODIAC_GLYPHS[sign.id]} x="340" y="629" width="220" height="180" preserveAspectRatio="xMidYMid meet" />
      <g fill="#e9f0f4" textAnchor="middle" fontFamily="var(--font-vazirmatn), Vazirmatn, 'Noto Sans Arabic', sans-serif">
        <text x="450" y="845" fontWeight="420" fontSize="46">{sign.fa}</text>
        <text x="450" y="935" fontSize={nameSize} fontWeight="500" direction={latinName ? 'ltr' : 'rtl'}>{name}</text>
        <text x="450" y="1013" fontSize="28" fontWeight="390" fill="#c5cbd1" direction="rtl">{date}</text>
      </g>
      <text x="450" y="1088" textAnchor="middle" fontSize="13" opacity=".34"
        fontFamily="var(--font-vazirmatn), Vazirmatn, sans-serif" fill="#a7adb3">پیش‌نمایش هالیوس</text>
    </svg>
  );
}

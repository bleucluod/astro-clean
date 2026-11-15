import { BAHMAN_CONSTELLATION, BAHMAN_DECORATIVE_STARS } from '@/lib/shop/nemad-man-bahman-preview';

export function NemadManBahmanArtwork({ name, date }: { name: string; date: string }) {
  const latin = /^[\x20-\x7E]+$/.test(name);
  const fontSize = Array.from(name).length > 16 ? 39 : Array.from(name).length > 9 ? 46 : 53;
  return (
    <svg viewBox="0 0 900 1125" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={'پیش‌نمایش تابلو مینیمال برج دلو برای ' + name + '، ' + date}>
      <title>تابلو نماد بهمن، مدل مینیمال</title>
      <desc>طرح نمونهٔ بدون قاب؛ صورت فلکی دلو ثابت است و با تاریخ تولد محاسبه نمی‌شود.</desc>
      <defs>
        <radialGradient id="bahman-background"><stop stopColor="#172b40"/><stop offset="1" stopColor="#081724"/></radialGradient>
        <radialGradient id="bahman-disc"><stop stopColor="#24384d"/><stop offset="1" stopColor="#1a2c3e"/></radialGradient>
        <clipPath id="bahman-disc-clip"><circle cx="450" cy="375" r="286"/></clipPath>
      </defs>
      <rect width="900" height="1125" fill="url(#bahman-background)" />
      <circle cx="450" cy="375" r="286" fill="url(#bahman-disc)" opacity=".82" />
      <g clipPath="url(#bahman-disc-clip)">
        {BAHMAN_DECORATIVE_STARS.map((star, index) => (
          <circle key={'dust-' + index} cx={star.x} cy={star.y} r={star.r} fill="#dce9f6" opacity={index % 5 === 0 ? 0.75 : 0.45} />
        ))}
        {BAHMAN_CONSTELLATION.map((line, index) => (
          <polyline key={'aqr-' + index} points={line.map((p) => p.x + ',' + p.y).join(' ')}
            fill="none" stroke="#e9f3fc" strokeOpacity=".94" strokeWidth="2.15"
            strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {BAHMAN_CONSTELLATION.flat().map((p, index) => (
          <circle key={'aqr-star-' + index} cx={p.x} cy={p.y}
            r={index % 4 === 0 ? 5.9 : 3.7} fill="#f4fbff" />
        ))}
      </g>
      <g stroke="#e4eff9" strokeWidth="5" strokeLinecap="square" fill="none" opacity=".93">
        <path d="M387 771 L407 755 L428 771 L450 755 L471 771 L492 755 L513 771" />
        <path d="M387 790 L407 774 L428 790 L450 774 L471 790 L492 774 L513 790" />
      </g>
      <g textAnchor="middle" fill="#eef5fd" fontFamily="var(--font-vazirmatn), Vazirmatn, sans-serif">
        <text x="450" y="873" fontSize="59" fontWeight="500">دلو</text>
        <text x="450" y="953" fontSize={fontSize} fontWeight="500" direction={latin ? 'ltr' : 'rtl'}>{name}</text>
        <text x="450" y="1026" fontSize="30" fontWeight="400" fill="#cbdce9">{date}</text>
      </g>
      <text x="450" y="1091" textAnchor="middle" fontFamily="var(--font-vazirmatn), sans-serif"
        fontSize="15" fill="#9bb6cb" opacity=".53">پیش‌نمایش هالیوس</text>
    </svg>
  );
}

import type { calculateShopStarAtlas } from './shop-sky-atlas';
import type { calculateShopConstellationLines } from './shop-constellation-lines';
import type { calculateShopBrightStarProof } from './shop-sky-stars';
import type { BirthSkyPersonalDetails } from './shop-birth-sky-artwork';

type Atlas = ReturnType<typeof calculateShopStarAtlas>;
type Figures = ReturnType<typeof calculateShopConstellationLines>;
type NamedStars = ReturnType<typeof calculateShopBrightStarProof>;
type SourcePoint = { x: number; y: number };
type FigureLine = Figures['lines'][number];

export const SHOP_P02_R9_LAYOUT = {
  id: 'halleus.p02.r9-v5.approved-dynamic.2026-11-09',
  width: 3000, height: 4500,
  sky: { x: 1500, y: 2170, radius: 1816 },
  footerBrand: { x: 1500, y: 4310, opacity: .52 },
} as const;

const fa: Record<string, string> = {
  And:'آندرومدا', Ant:'ماشین بادی', Aps:'مرغ بهشتی', Aqr:'دلو', Aql:'عقاب', Ara:'محراب', Ari:'حمل', Aur:'ارابه‌ران',
  Boo:'گاوران', Cam:'زرافه', Cap:'جدی', Car:'شاه‌تخته', Cas:'ذات‌الکرسی', Cen:'قنطورس', Cep:'قیفاووس', Cet:'قیطس',
  CMa:'سگ بزرگ', CMi:'سگ کوچک', Cnc:'سرطان', Col:'کبوتر', Com:'گیسو', CrA:'تاج جنوبی', CrB:'تاج شمالی',
  Crt:'جام', Cru:'صلیب جنوبی', Crv:'کلاغ', CVn:'سگ‌های شکاری', Cyg:'ماکیان', Del:'دلفین', Dra:'اژدها',
  Equ:'اسب کوچک', Eri:'نهر', Gem:'جوزا', Gru:'درنا', Her:'جاثی', Hya:'مار آبی', Leo:'اسد', Lep:'خرگوش',
  Lib:'میزان', LMi:'شیر کوچک', Lup:'گرگ', Lyn:'سیاه‌گوش', Lyr:'شلیاق', Mon:'تک‌شاخ', Oph:'مارافسای',
  Ori:'شکارچی', Peg:'اسب بالدار', Per:'برساوش', Phe:'ققنوس', PsA:'ماهی جنوبی', Psc:'حوت', Pup:'پاشنهٔ کشتی',
  Sco:'عقرب', Sct:'سپر', Ser:'مار', Sgr:'قوس', Tau:'ثور', Tri:'مثلث', UMa:'دب اکبر', UMi:'دب اصغر',
  Vel:'بادبان', Vir:'سنبله', Vul:'روباه',
};
const xml = (v: string) => v.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[c]!);
const num = (v: number) => v.toFixed(2);
const clamp = (a:number,lo:number,hi:number) => Math.max(lo,Math.min(hi,a));
const project = (p: SourcePoint) => ({x: SHOP_P02_R9_LAYOUT.sky.x + p.x * SHOP_P02_R9_LAYOUT.sky.radius,
  y: SHOP_P02_R9_LAYOUT.sky.y + p.y * SHOP_P02_R9_LAYOUT.sky.radius});
const safe = (p: SourcePoint) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x*p.x+p.y*p.y<=1.0001;

/** Numerals from any keyboard must match the poster's calendar. */
type PosterNumerals='fa'|'en';
const latinDigits='0123456789';
const persianDigits='۰۱۲۳۴۵۶۷۸۹';
const arabicDigits='٠١٢٣٤٥٦٧٨٩';
function posterDigits(value:string,numerals:PosterNumerals):string {
  const target=numerals==='fa'?persianDigits:latinDigits;
  return value.replace(/[0-9۰-۹٠-٩]/g,glyph=>{
    const ascii=latinDigits.indexOf(glyph);
    const persian=persianDigits.indexOf(glyph);
    const arabic=arabicDigits.indexOf(glyph);
    const index=ascii>=0?ascii:persian>=0?persian:arabic;
    return index<0?glyph:target[index];
  });
}

function fontText(text:string,x:number,y:number,size:number,weight:number,fill:string,opts:{anchor?:'start'|'middle'|'end',dir?:'rtl'|'ltr',opacity?:number}={}) {
  return `<text x="${num(x)}" y="${num(y)}" font-size="${size}" font-weight="${weight}"
    font-family="var(--font-p02-estedad), Estedad, sans-serif" fill="${fill}"
    direction="${opts.dir || 'rtl'}" text-anchor="${opts.anchor || 'start'}"${opts.opacity==null?'':` opacity="${opts.opacity}"`}>${xml(text)}</text>`;
}

/** A constellation must be readable on the PRINT, not merely above the horizon.
 * The R9 sky mask fades above y≈1100 and below y≈3060; the personalized
 * text sits beneath y≈3500. This weight evaluates the actual fixed layout,
 * without changing any star/constellation astronomical coordinates.
 */
function visibleFigureWeight(point: SourcePoint): number {
  const p = project(point);
  const x = Math.min(clamp((p.x - 125) / 285, 0, 1), clamp((2875 - p.x) / 285, 0, 1));
  const y = Math.min(clamp((p.y - 810) / 425, 0, 1), clamp((3430 - p.y) / 505, 0, 1));
  return x * y;
}

function scoredFigures(lines: FigureLine[]) {
  const grouped = new Map<string, {
    id: string; lines: FigureLine[]; total: number; readable: number; landmarks: number;
  }>();
  for (const line of lines) {
    if (line.rank !== 1 || line.points.length < 2) continue;
    if (!line.points.every(safe)) throw new Error('Invalid R9 constellation source geometry');
    let total = 0, readable = 0, landmarks = 0;
    for (let i = 0; i < line.points.length; i++) {
      if (visibleFigureWeight(line.points[i]) >= .52) landmarks++;
      if (i === 0) continue;
      const a = line.points[i - 1], b = line.points[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y) * SHOP_P02_R9_LAYOUT.sky.radius;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const weight = (visibleFigureWeight(a) + 2 * visibleFigureWeight(mid) + visibleFigureWeight(b)) / 4;
      total += length;
      readable += length * weight;
    }
    if (total < 44) continue; // do not select tiny horizon fragments
    const slot = grouped.get(line.constellationId) || {
      id: line.constellationId, lines: [], total: 0, readable: 0, landmarks: 0,
    };
    slot.lines.push(line);
    slot.total += total;
    slot.readable += readable;
    slot.landmarks += landmarks;
    grouped.set(slot.id, slot);
  }
  return [...grouped.values()]
    .filter(c => c.readable >= 185 && c.readable / c.total >= .30 && c.landmarks >= 2)
    .sort((a, b) => {
      // Keep the entire actual path, but prefer a complete, central silhouette
      // over a longer river-like shape mostly lost beyond the frame/mask.
      const score = (c: typeof a) => 4.6 * c.readable / c.total +
        .42 * Math.log1p(c.readable) + .10 * Math.min(c.landmarks, 12) +
        .11 * Math.min(c.lines.length, 4);
      return score(b) - score(a) || a.id.localeCompare(b.id);
    })
    .slice(0, 3);
}
function figureSvg(figure:ReturnType<typeof scoredFigures>[number],index:number,sourceStars:ReturnType<typeof renderStars>['starCoords']) {
  const rawPaths=figure.lines.map((line,i) => {
    const d=line.points.map((p,j)=>`${j?'L':'M'}${num(project(p).x)} ${num(project(p).y)}`).join(' ');
    return {d,i};
  });
  // The low-opacity path from R9-v5 became almost invisible at preview size.
  // A soft under-stroke plus a legible source path preserves exact geometry.
  const original=rawPaths.map(({d,i})=>`<g data-sourced-figure-part="${xml(figure.id)}">
    <path d="${d}" fill="none" stroke="#A9CADF" stroke-width="4.1" stroke-opacity=".17"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path data-constellation="${xml(figure.id)}" data-part="${i}" d="${d}"
      fill="none" stroke="#D9EAFD" stroke-width="1.85" stroke-opacity=".67"
      stroke-linecap="round" stroke-linejoin="round"/>
    </g>`).join('') + starVertices(figure, sourceStars, 1, true);
  const points=figure.lines.flatMap(line=>line.points.map(project));
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
  const scale=Math.min(260/w,82/h);
  const rowY=3862+index*131; // exact v5: original 4017 - 155
  const dx=376-(minX+maxX)*scale/2,dy=rowY-(minY+maxY)*scale/2;
  // The identical `d` appears in both the sky and the guide, never rejoined
  // or approximated. Only a matrix scales/translates guide copies.
  const icon=`<g id="r9-guide-icon-${xml(figure.id)}" data-constellation="${xml(figure.id)}"
    data-mirrors-source-paths="${rawPaths.length}">
    <g transform="matrix(${scale.toFixed(8)} 0 0 ${scale.toFixed(8)} ${dx.toFixed(5)} ${dy.toFixed(5)})">
    ${rawPaths.map(({d})=>`<path d="${d}" fill="none" stroke="#A9CADF" stroke-width="${num(1.45/scale)}" opacity=".94" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    ${starVertices(figure,sourceStars,scale)}
    </g>
    ${fontText(fa[figure.id]||figure.id,770,rowY+13,40,300,'#D9EAFD')}
  </g>`;
  return {original,icon};
}

function starVertices(figure:ReturnType<typeof scoredFigures>[number],sourceStars:ReturnType<typeof renderStars>['starCoords'],scale:number,emphasize=false) {
  const used=new Set<string>();const nodes:string[]=[];
  for(const line of figure.lines) {
    const endpoints=[line.points[0],line.points[line.points.length-1]].map(project);
    for(const vertex of endpoints) {
      const nearest=sourceStars.reduce<{x:number,y:number,mag:number,dist:number}|null>((best,s)=>{
        const dist=Math.hypot(s.x-vertex.x,s.y-vertex.y);
        return dist<(best?.dist??12)?{...s,dist}:best;
      },null);
      if(!nearest)continue;
      const key=`${num(nearest.x)}:${num(nearest.y)}`;
      if(used.has(key))continue;
      used.add(key);
      if (emphasize) {
        // An accent is allowed only at the same real BSC5 star coordinate.
        // Never invent a luminous point at an arbitrary constellation vertex.
        if (nearest.mag <= 4.25) {
          nodes.push(`<circle cx="${num(nearest.x)}" cy="${num(nearest.y)}" r="12"
            fill="url(#r9-halo)" opacity=".24"/>`);
          nodes.push(`<circle cx="${num(nearest.x)}" cy="${num(nearest.y)}" r="3.3"
            fill="#F8FAFC" opacity=".96"/>`);
        }
      } else {
        nodes.push(`<circle cx="${num(nearest.x)}" cy="${num(nearest.y)}"
          r="${num(2.15/scale)}" fill="#F8FAFC" opacity=".96"/>`);
      }
    }
  }
  return nodes.join('');
}

function renderStars(atlas:Atlas) {
  const rendered:{x:number,y:number,mag:number}[]=[];
  const nodes:string[]=[];
  for(const star of atlas.aboveHorizonStars) {
    if(!safe(star)||!Number.isFinite(star.visualMagnitude)) throw new Error('Invalid R9 catalog star');
    const {x,y}=project(star);const m=star.visualMagnitude;
    const baseline=clamp(1.8*Math.pow(10,(2-m)/6),.52,6.8);
    const radius=baseline<.9?Math.max(1.75,baseline*2.75):baseline<2?baseline*1.7:baseline*1.18;
    const opacity=clamp(.95-(m-1)*.105+(baseline<.9?.23:.09),.58,.99);
    if(m<=2.2)nodes.push(`<circle cx="${num(x)}" cy="${num(y)}" r="${num(radius*3.8)}" fill="url(#r9-halo)" opacity=".25"/>`);
    if(m<=.8){const k=radius*2.1;nodes.push(`<path d="M${num(x)} ${num(y-k)}V${num(y+k)} M${num(x-k*.64)} ${num(y)}H${num(x+k*.64)}" stroke="#D9EAFD" fill="none" stroke-width=".95" opacity=".31"/>`);}
    nodes.push(`<circle class="r9-catalog-star" cx="${num(x)}" cy="${num(y)}" r="${num(radius)}" fill="${m<1?'#F8FAFC':m<3?'#D9EAFD':'#BCCCDC'}" opacity="${num(opacity)}"/>`);
    rendered.push({x,y,mag:m});
  }
  return {markup:nodes.join(''),starCoords:rendered};
}

function namedLabels(named:NamedStars,stars:ReturnType<typeof renderStars>['starCoords']) {
  const ordered=named.aboveHorizonStars.map(item=>{
    if(!safe(item)) throw new Error('Invalid R9 named star position');
    const projected=project(item);let best:{x:number,y:number,mag:number}|null=null,dist=Infinity;
    for(const star of stars){const d=Math.hypot(projected.x-star.x,projected.y-star.y);if(d<dist){best=star;dist=d;}}
    // Names only attach to an actual bright BSC5 star close to the curated
    // projection. If there is no reliable match, omit rather than mislabel.
    return {...item,star:best,dist};
  }).filter(t=>t.star&&t.dist<=20&&t.star.mag<=3.6)
    .sort((a,b)=>(a.star?.mag??Infinity)-(b.star?.mag??Infinity)||a.labelEn.localeCompare(b.labelEn));
  const placed:{x:number,y:number}[]=[];const nodes:string[]=[];
  for(const item of ordered) {
    if(placed.length>=6)break;
    if(!item.star)continue;
    const point=item.star;
    let candidate:{x:number,y:number,ox:number,oy:number}|null=null;
    for(const [ox,oy] of [[135,-80],[-135,-75],[135,112],[-135,108]]) {
      const x=point.x+ox,y=point.y+oy;
      if(x<200||x>2800||y<800||y>3370)continue;
      if(placed.some(p=>Math.abs(p.x-x)<360&&Math.abs(p.y-y)<122))continue;
      candidate={x,y,ox,oy};break;
    }
    if(!candidate)continue;
    const {x,y,ox,oy}=candidate;placed.push({x,y});
    nodes.push(`<g data-named-star="${xml(item.id)}"><path d="M${num(point.x)} ${num(point.y)}L${num(point.x+ox*.36)} ${num(point.y+oy*.56)}" stroke="#9AA6B2" stroke-width="1.5" opacity=".54" fill="none"/>
      <circle cx="${num(point.x)}" cy="${num(point.y)}" r="7.5" stroke="#D9EAFD" stroke-width="1.05" fill="none" opacity=".42"/>
      ${fontText(item.labelFa,x,y,45,300,'#D9EAFD',{anchor:'middle',opacity:.92})}
      ${fontText(item.labelEn.toUpperCase(),x,y+38,24,300,'#9AA6B2',{anchor:'middle',dir:'ltr',opacity:.65})}
    </g>`);
  }
  return `<g id="r9-actual-named-star-labels">${nodes.join('')}</g>`;
}


/** A subtle, name-only icy gradient and glow from the approved preview. */
function personalNameText(name:string,size:number):string {
  const glow=fontText(name,2720,3520,size,500,'#C2D9E9',{opacity:.34})
    .replace('<text ','<text data-r9-name-layer="glow" filter="url(#r9-name-soft-glow)" ');
  const face=fontText(name,2720,3520,size,500,'url(#r9-name-ice-gradient)')
    .replace('<text ','<text data-r9-name-layer="face" stroke="#EAF3FA" stroke-width="1.2" stroke-opacity=".26" paint-order="stroke fill" ');
  return `<g id="r9-personal-name">${glow}${face}</g>`;
}

function posterTypography(details:BirthSkyPersonalDetails,guide:string,numerals:PosterNumerals) {
  const name=posterDigits(details.names.trim()||'آسمان تولد',numerals);
  const message=posterDigits(details.message.trim(),numerals);
  const city=posterDigits(details.city.trim(),numerals);
  const date=posterDigits(details.date.trim()+'  ·  '+details.time.trim(),numerals);
  const size=(v:string,a:number,b:number,c:number)=>[...v].length>34?c:[...v].length>20?b:a;
  return `<g id="r9-poster-typography">
    ${personalNameText(name,size(name,221,169,121))}
    ${message?fontText(message,2720,3730,size(message,73,62,48),300,'#D9EAFD'):''}
    ${fontText(city,2720,3978,size(city,52,46,38),400,'#BCCCDC')}
    ${fontText(date,2720,4087,55,400,'#BCCCDC',{anchor:'end',dir:'ltr'})}
    <path d="M2390 4172H2720" stroke="#9AA6B2" stroke-width="1.4" opacity=".46"/>
    ${guide}
    ${fontText('H  A  L  L  E  U  S',1500,4310,52,400,'#8A96A1',{anchor:'middle',dir:'ltr',opacity:.52})}
  </g>`;
}

/** Approved R9-v5 scene, built from live BSC5, constellation and named-star geometry. */
export function renderShopBirthSkyR9(
  atlas:Atlas,figures:Figures,named:NamedStars,details:BirthSkyPersonalDetails,
  options:{typography?:boolean;numerals?:PosterNumerals}={},
):string {
  if(![figures,named].every(v=>v.referenceUtc===atlas.referenceUtc&&v.latitude===atlas.latitude&&v.longitude===atlas.longitude)) {
    throw new Error('R9 stellar, figure, and name data must share the same UTC instant and location');
  }
  const chosen=scoredFigures(figures.lines);
  const {markup,starCoords}=renderStars(atlas);
  const arts=chosen.map((f,i)=>figureSvg(f,i,starCoords));
  const ids=chosen.map(f=>f.id);
  const guide=`<g id="r9-dynamic-constellation-guide" data-constellations="${xml(ids.join(','))}">
    <path d="M232 3715V4203" stroke="#9AA6B2" stroke-width="1.25" opacity=".34"/>
    ${fontText('راهنمای صورت‌های فلکی',770,3765,45,400,'#D9EAFD')}
    ${arts.map(a=>a.icon).join('')}
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3000 4500" width="3000" height="4500" role="img"
    aria-label="نقشهٔ آسمان تولد با ستارگان واقعی و صورت‌های فلکی محاسبه‌شده">
    <title>آسمان تولد — ${xml(details.names.trim()||'هالیوس')}</title>
    <desc>ستارگان از کاتالوگ واقعی BSC5 محاسبه شده‌اند؛ مه کهکشانی زمینه صرفاً هنری است</desc>
    <defs>
      <linearGradient id="r9-name-ice-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F8FAFC"/>
        <stop offset="47%" stop-color="#E2EDF5"/>
        <stop offset="100%" stop-color="#ADC2D2"/>
      </linearGradient>
      <filter id="r9-name-soft-glow" x="-25%" y="-60%" width="150%" height="220%" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="13"/>
      </filter>
      <radialGradient id="r9-depth"><stop offset="0" stop-color="#0B1723" stop-opacity=".8"/><stop offset=".63" stop-color="#050C15" stop-opacity=".45"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>
      <radialGradient id="r9-halo"><stop offset="0" stop-color="#F8FAFC" stop-opacity=".75"/><stop offset=".12" stop-color="#D9EAFD" stop-opacity=".34"/><stop offset=".45" stop-color="#BCCCDC" stop-opacity=".09"/><stop offset="1" stop-color="#BCCCDC" stop-opacity="0"/></radialGradient>
      <radialGradient id="r9-cloud"><stop offset="0" stop-color="#BCCCDC" stop-opacity=".28"/><stop offset=".26" stop-color="#9CB9D0" stop-opacity=".13"/><stop offset=".75" stop-color="#526F8A" stop-opacity=".035"/><stop offset="1" stop-color="#304C67" stop-opacity="0"/></radialGradient>
      <filter id="r9-cloud-warp" x="-30%" y="-50%" width="160%" height="200%"><feTurbulence type="fractalNoise" baseFrequency=".004 .007" numOctaves="3" seed="19" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="135" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="r9-darklane-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="44"/></filter>
      <linearGradient id="r9-sky-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black"/><stop offset=".14" stop-color="black"/><stop offset=".245" stop-color="white"/><stop offset=".68" stop-color="white"/><stop offset=".80" stop-color="black"/><stop offset="1" stop-color="black"/></linearGradient>
      <mask id="r9-text-clearance" maskUnits="userSpaceOnUse" x="0" y="0" width="3000" height="4500"><rect width="3000" height="4500" fill="url(#r9-sky-fade)"/></mask>
    </defs>
    <rect width="3000" height="4500" fill="#000000"/>
    <g id="r9-sky" mask="url(#r9-text-clearance)">
      <rect width="3000" height="4500" fill="url(#r9-depth)"/>
      <g id="r9-artistic-haze" filter="url(#r9-cloud-warp)">
        <ellipse cx="200" cy="3070" rx="880" ry="245" transform="rotate(-31 200 3070)" fill="url(#r9-cloud)" opacity=".74"/>
        <ellipse cx="700" cy="2800" rx="1000" ry="280" transform="rotate(-32 700 2800)" fill="url(#r9-cloud)" opacity=".85"/>
        <ellipse cx="1240" cy="2450" rx="1030" ry="310" transform="rotate(-31 1240 2450)" fill="url(#r9-cloud)" opacity="1"/>
        <ellipse cx="1800" cy="2060" rx="970" ry="285" transform="rotate(-31 1800 2060)" fill="url(#r9-cloud)" opacity=".96"/>
        <ellipse cx="2480" cy="1650" rx="910" ry="235" transform="rotate(-31 2480 1650)" fill="url(#r9-cloud)" opacity=".73"/>
      </g>
      <g filter="url(#r9-darklane-blur)" opacity=".40"><path d="M-150 3085C790 2735 1440 2180 3240 1470" stroke="#01040B" stroke-width="64" fill="none"/></g>
      <g id="r9-constellations">${arts.map(a=>a.original).join('')}</g>
      <g id="r9-sourced-stars">${markup}</g>
    </g>
    ${namedLabels(named,starCoords)}
    ${options.typography===false?'':posterTypography(details,guide,options.numerals||'fa')}
  </svg>`;
}

/** Draw only the source SVG's authored text with the same actual Estedad face.
 * Canvas SVG-to-image font fallback is browser-dependent, so text is painted
 * separately while every non-text pixel comes from the identical source SVG.
 */
export async function paintShopBirthSkyR9Text(
  canvas:CanvasRenderingContext2D,svg:string,fontFamily:string,
):Promise<void> {
  if(!fontFamily.trim())throw new Error('The local Estedad font has not loaded');
  const dom=new DOMParser().parseFromString(svg,'image/svg+xml');
  if(dom.querySelector('parsererror'))throw new Error('Invalid R9 SVG for PNG text');
  const texts=Array.from(dom.querySelectorAll('text'));
  const loaded=new Set<string>();
  canvas.save();
  try {
    canvas.textBaseline='alphabetic';
    for(const item of texts) {
      const str=item.textContent||'';
      const size=Number(item.getAttribute('font-size')||0);
      const weight=Number(item.getAttribute('font-weight')||400);
      const x=Number(item.getAttribute('x')),y=Number(item.getAttribute('y'));
      if(!Number.isFinite(x)||!Number.isFinite(y)||size<=0||size>250||![300,400,500].includes(weight)) {
        throw new Error('R9 SVG typography attributes differ from the approved contract');
      }
      const font=`${weight} ${size}px ${fontFamily}`;
      if(!loaded.has(font)) { await document.fonts.load(font);loaded.add(font); }
      canvas.font=font;
      canvas.direction=item.getAttribute('direction')==='ltr'?'ltr':'rtl';
      const anchor=item.getAttribute('text-anchor')||'start';
      canvas.textAlign=anchor==='middle'?'center':anchor==='end'?'end':'start';
      canvas.globalAlpha=clamp(Number(item.getAttribute('opacity')||1),0,1);
      // The name has SVG effects but PNG strips text and draws it with the
      // genuine Estedad font: mirror those effects in the canvas text pass.
      canvas.shadowColor='transparent';
      canvas.shadowBlur=0;
      canvas.shadowOffsetX=0;
      canvas.shadowOffsetY=0;
      const nameLayer=item.getAttribute('data-r9-name-layer');
      if(nameLayer==='glow') {
        canvas.fillStyle='#C2D9E9';
        canvas.shadowColor='#B8D1E3';
        canvas.shadowBlur=24;
        canvas.fillText(str,x,y,2450);
      } else if(nameLayer==='face') {
        const ice=canvas.createLinearGradient(x,y-size*.96,x,y+size*.13);
        ice.addColorStop(0,'#F8FAFC');
        ice.addColorStop(.47,'#E2EDF5');
        ice.addColorStop(1,'#ADC2D2');
        canvas.fillStyle=ice;
        canvas.shadowColor='rgba(12,29,44,.30)';
        canvas.shadowOffsetY=2;
        canvas.shadowBlur=2;
        canvas.strokeStyle='rgba(234,243,250,.26)';
        canvas.lineWidth=1.2;
        canvas.strokeText(str,x,y,2450);
        canvas.fillText(str,x,y,2450);
      } else {
        canvas.fillStyle=item.getAttribute('fill')||'#F8FAFC';
        canvas.fillText(str,x,y,2450);
      }
    }
  }finally{canvas.restore();}
}

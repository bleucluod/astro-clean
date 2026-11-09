import * as Astronomy from 'astronomy-engine';
import { parseShopSkyReference } from './shop-sky-stars';

/** Real topocentric positions; the detailed disk illustrations are artistically enlarged,
 * not photographs or scale-accurate apparent diameters. */
export type ShopSolarBodyId =
  | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'moon';

export type ShopSolarBody = {
  id: ShopSolarBodyId;
  x: number;
  y: number;
  altitudeDegrees: number;
  azimuthDegrees: number;
  illuminatedFraction: number;
  sunwardAngleDegrees: number;
};
export type ShopSolarSystem = {
  referenceUtc: string;
  latitude: number;
  longitude: number;
  bodies: ShopSolarBody[];
};

const bodies = [
  { id: 'mercury', body: Astronomy.Body.Mercury },
  { id: 'venus', body: Astronomy.Body.Venus },
  { id: 'mars', body: Astronomy.Body.Mars },
  { id: 'jupiter', body: Astronomy.Body.Jupiter },
  { id: 'saturn', body: Astronomy.Body.Saturn },
  { id: 'uranus', body: Astronomy.Body.Uranus },
  { id: 'neptune', body: Astronomy.Body.Neptune },
  { id: 'moon', body: Astronomy.Body.Moon },
] as const;

const RAD = Math.PI / 180;
const position = (altitude: number, azimuth: number) => {
  const r = (90 - altitude) / 90;
  return { x: r * Math.sin(azimuth * RAD), y: -r * Math.cos(azimuth * RAD) };
};

/** Earth is the observer, the Sun is intentionally not a poster body.
 * Below-horizon bodies are excluded; distant Uranus/Neptune are included
 * if geometrically above the horizon even when invisible to the naked eye. */
export function calculateShopSolarSystem(reference: {
  referenceUtc: string; latitude: number; longitude: number;
}): ShopSolarSystem {
  const date = parseShopSkyReference(reference);
  const observer = new Astronomy.Observer(reference.latitude, reference.longitude, 0);
  const horizon = (body: Astronomy.Body) => {
    const eq = Astronomy.Equator(body, date, observer, true, true);
    const h = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
    if (![h.altitude, h.azimuth].every(Number.isFinite)) {
      throw new Error('Solar-system ephemeris returned an invalid position.');
    }
    return h;
  };
  const sun = horizon(Astronomy.Body.Sun);
  const sunXY = position(sun.altitude, sun.azimuth);
  const visible: ShopSolarBody[] = [];
  for (const item of bodies) {
    const h = horizon(item.body);
    if (h.altitude <= 0) continue;
    const xy = position(h.altitude, h.azimuth);
    const fraction = Astronomy.Illumination(item.body, date).phase_fraction;
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
      throw new Error('Invalid solar-system illumination.');
    }
    // The bright hemisphere faces the Sun on the local chart projection.
    const angle = Math.atan2(sunXY.y - xy.y, sunXY.x - xy.x) / RAD;
    visible.push({
      id: item.id, x: xy.x, y: xy.y,
      altitudeDegrees: h.altitude, azimuthDegrees: h.azimuth,
      illuminatedFraction: fraction, sunwardAngleDegrees: angle,
    });
  }
  return {
    referenceUtc: date.toISOString(),
    latitude: reference.latitude,
    longitude: reference.longitude,
    bodies: visible,
  };
}

type Attributes = Record<string, string | number>;
function element(name: string, attrs: Attributes, children?: string) {
  const attributeText = Object.entries(attrs)
    .map(([key, value]) => ' ' + key + '="' + String(value) + '"').join('');
  return children == null ? '<' + name + attributeText + '/>' :
    '<' + name + attributeText + '>' + children + '</' + name + '>';
}
const n = (v: number) => v.toFixed(2);

/** Cool, low-contrast engraved bodies: recognizable, not sticker-like. */
const specs: Record<ShopSolarBodyId, {
  radius: number; light: string; mid: string; dark: string; title: string;
}> = {
  mercury: { radius: 27, light: '#C2D0DA', mid: '#93A6B3', dark: '#405263', title: 'عطارد' },
  venus: { radius: 32, light: '#E0EAF0', mid: '#B7C9D4', dark: '#677E90', title: 'زهره' },
  mars: { radius: 32, light: '#BDAFAF', mid: '#858995', dark: '#405263', title: 'مریخ' },
  jupiter: { radius: 39, light: '#D6E1E8', mid: '#A7B8C6', dark: '#4C6275', title: 'مشتری' },
  saturn: { radius: 32, light: '#D0DCE5', mid: '#9BAFBF', dark: '#4A6276', title: 'زحل' },
  uranus: { radius: 31, light: '#B8D6E0', mid: '#85ACBE', dark: '#40677C', title: 'اورانوس' },
  neptune: { radius: 32, light: '#96B8D1', mid: '#648BAA', dark: '#304C6B', title: 'نپتون' },
  moon: { radius: 44, light: '#E0E9EF', mid: '#B4C4D0', dark: '#465A6B', title: 'ماه' },
};

function texturedCrater(x: number, y: number, r: number, opacity: number) {
  return element('g', { opacity },
    element('circle', { cx: x, cy: y, r, fill: '#506778', opacity: .36 }) +
    element('circle', { cx: x + 1, cy: y - 1, r: r * .71, fill: '#CAD8E1', opacity: .28 }) +
    element('path', {
      d: 'M' + n(x - r) + ' ' + n(y) + 'A' + n(r) + ' ' + n(r) +
        ' 0 0 0 ' + n(x + r) + ' ' + n(y),
      fill: 'none', stroke: '#D9EAFD', 'stroke-width': .95, opacity: .25,
    })
  );
}

/** Surface features are deliberate vector illustrations, not photographic textures. */
function detail(id: ShopSolarBodyId, r: number): string {
  const lines: string[] = [];
  const arc = (y: number, stroke: string, width: number, opacity: number) =>
    element('path', {
      d: 'M' + n(-r - 5) + ' ' + n(y) + ' C' + n(-r * .45) + ' ' + n(y - 6) +
        ' ' + n(r * .35) + ' ' + n(y + 7) + ' ' + n(r + 6) + ' ' + n(y - 3),
      fill: 'none', stroke, 'stroke-width': width, opacity, 'stroke-linecap': 'round',
    });
  if (id === 'mercury' || id === 'moon') {
    const craters = id === 'moon' ?
      [[-22,-24,11], [17,-33,8], [-3,3,15], [29,13,10], [-32,31,8], [11,37,13], [35,-15,5]] :
      [[-12,-14,8], [14,-8,5], [-8,16,7], [20,19,8], [-23,5,4]];
    const factor = id === 'moon' ? r / 59 : r / 33;
    for (const [x,y,rad] of craters) lines.push(texturedCrater(x * factor, y * factor, rad * factor, .46));
  } else if (id === 'venus') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*11,'#D9EAFD',3.3,.21));
    lines.push(element('ellipse',{cx:-9,cy:-8,rx:16,ry:5,fill:'#D9EAFD',opacity:.12,transform:'rotate(-20 -9 -8)'}));
  } else if (id === 'mars') {
    lines.push(element('path',{
      d:'M-30 -9 Q-13 -24 1 -13 L14 -3 -3 8 -17 4 -26 13 Z',
      fill:'#626D7B',opacity:.39,
    }));
    lines.push(element('path',{
      d:'M7 11 Q17 3 29 19 L19 28 5 22 Z',fill:'#6E7783',opacity:.30,
    }));
    lines.push(element('ellipse',{cx:0,cy:-26,rx:17,ry:4,fill:'#D9EAFD',opacity:.49}));
  } else if (id === 'jupiter') {
    const bands = [
      [-26,6,'#788A9B',.32],[-17,4,'#D8E4EA',.38],
      [-8,7,'#8396A6',.44],[3,4,'#DAE5EB',.45],
      [14,7,'#7C93A6',.38],[25,5,'#C2D2DD',.38],
    ] as const;
    for (const [y,w,c,o] of bands) lines.push(arc(y,c,w,o));
    // A muted spot preserves the recognizable Jovian signature.
    lines.push(element('ellipse',{cx:14,cy:13,rx:8,ry:4,fill:'#A7979C',opacity:.50,transform:'rotate(-11 14 13)'}));
    lines.push(element('ellipse',{cx:14,cy:13,rx:5,ry:2,fill:'#C4B9BD',opacity:.33}));
  } else if (id === 'saturn') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*10,'#CBD9E2',j===0?4.5:3,.23));
  } else if (id === 'uranus') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*12,'#D0E6EC',3,.18));
  } else if (id === 'neptune') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*12,'#AECBDD',3.4,.22));
    lines.push(element('ellipse',{cx:12,cy:8,rx:10,ry:5,fill:'#496A86',opacity:.34}));
    lines.push(element('path',{d:'M-23 -5 Q4 -11 24 -3',fill:'none',stroke:'#C9DBE8','stroke-width':2.6,opacity:.30}));
  }
  return lines.join('');
}

function moonPhasePath(r: number, fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  if (f < .0001) return '';
  if (f > .9999) return element('circle',{r,fill:'#CAD9E3',opacity:.91});
  const ellipseRadius = Math.max(.02, Math.abs(2*f-1)*r);
  const terminal = f < .5 ?
    ' A' + n(ellipseRadius) + ' ' + n(r) + ' 0 0 0 0 ' + n(-r) :
    ' A' + n(ellipseRadius) + ' ' + n(r) + ' 0 0 1 0 ' + n(-r);
  const path = 'M0 ' + n(-r) + ' A' + n(r) + ' ' + n(r) +
    ' 0 0 1 0 ' + n(r) + (Math.abs(f-.5)<.001 ? ' L0 ' + n(-r) : terminal) + ' Z';
  return element('path',{d:path,fill:'#CAD9E3',opacity:.91});
}

function illustratedBody(body: ShopSolarBody): string {
  const spec = specs[body.id];
  if (!spec || ![body.x,body.y,body.illuminatedFraction,body.sunwardAngleDegrees].every(Number.isFinite) ||
      body.illuminatedFraction < 0 || body.illuminatedFraction > 1 ||
      body.x*body.x+body.y*body.y > 1.0001) {
    throw new Error('Invalid solar-system poster body');
  }
  const r=spec.radius;
  const id='r9-body-'+body.id;
  const gradient=id+'-surface', shade=id+'-shade', clip=id+'-clip';
  const defs=element('defs',{},
    element('radialGradient',{id:gradient,cx:'29%',cy:'23%',r:'83%'},
      element('stop',{offset:'0%', 'stop-color':spec.light})+
      element('stop',{offset:'53%','stop-color':spec.mid})+
      element('stop',{offset:'100%','stop-color':spec.dark}))+
    element('radialGradient',{id:shade,cx:'26%',cy:'26%',r:'88%'},
      element('stop',{offset:'35%','stop-color':'#FFFFFF','stop-opacity':0})+
      element('stop',{offset:'76%','stop-color':'#050C19','stop-opacity':.15})+
      element('stop',{offset:'100%','stop-color':'#020610','stop-opacity':.57}))+
    element('radialGradient',{id:id+'-halo'},
      element('stop',{offset:0,'stop-color':spec.light,'stop-opacity':.34})+
      element('stop',{offset:1,'stop-color':spec.mid,'stop-opacity':0}))+
    element('clipPath',{id:clip},element('circle',{r}))
  );
  const ringBack=body.id==='saturn'?
    element('g',{transform:'rotate(-20)'},
      element('ellipse',{rx:65,ry:21,fill:'none',stroke:'#7895AA','stroke-width':8,opacity:.19})+
      element('ellipse',{rx:67,ry:22,fill:'none',stroke:'#BDCFD9','stroke-width':3,opacity:.47})+
      element('ellipse',{rx:52,ry:17,fill:'none',stroke:'#647C8C','stroke-width':2.2,opacity:.42})): '';
  const ringFront=body.id==='saturn'?
    element('g',{transform:'rotate(-20)'},
      element('path',{d:'M-63 0 A63 20 0 0 0 63 0',fill:'none',stroke:'#B7CAD5','stroke-width':5,opacity:.52})+
      element('path',{d:'M-67 0 A67 22 0 0 0 67 0',fill:'none',stroke:'#D9EAFD','stroke-width':1.8,opacity:.47})+
      element('path',{d:'M-51 0 A51 16 0 0 0 51 0',fill:'none',stroke:'#607C91','stroke-width':2,opacity:.46})): '';
  const disk = element('circle',{r,fill:'url(#'+gradient+')'});
  let inside=element('g',{'clip-path':'url(#'+clip+')'},
    disk + detail(body.id,r) + element('circle',{r,fill:'url(#'+shade+')',opacity:.84}));
  if (body.id==='moon') {
    inside=element('g',{'clip-path':'url(#'+clip+')'},
      element('circle',{r,fill:'#263745'}) +
      element('g',{transform:'rotate('+n(body.sunwardAngleDegrees)+')'},
        moonPhasePath(r,body.illuminatedFraction))+
      detail('moon',r)+
      element('circle',{r,fill:'url(#'+shade+')',opacity:.33}));
  } else if (body.id==='venus'||body.id==='mercury') {
    const shadeFraction=1-body.illuminatedFraction;
    if(shadeFraction>.02) {
      const phaseShadow=element('g',{transform:'rotate('+n(body.sunwardAngleDegrees)+')'},
        element('circle',{r,fill:'#111522',opacity:.69})+
        element('g',{},moonPhasePath(r,body.illuminatedFraction)));
      // Use the correct illuminated fraction rather than drawing a fully lit sphere.
      // Keep recognizable surface details on top of the masked phase.
      inside=element('g',{'clip-path':'url(#'+clip+')'},disk+phaseShadow+detail(body.id,r));
    }
  }
  const artwork=defs+
    element('circle',{r:r*1.8,fill:'url(#'+id+'-halo)',opacity:.32})+
    ringBack + inside + ringFront +
    element('circle',{r,fill:'none',stroke:spec.light,'stroke-width':.85,opacity:.24});
  const x=1500+body.x*1816, y=2170+body.y*1816;
  return element('g',{
    id, 'data-solar-body':body.id, 'data-altitude-deg':n(body.altitudeDegrees),
    'data-illuminated-fraction':body.illuminatedFraction.toFixed(6),
    transform:'translate('+n(x)+' '+n(y)+')', opacity:.88,
  },element('title',{},spec.title)+artwork);
}

/** All above-horizon planets and Moon are drawn at real sky coordinates.
 * Enlarged native SVG artwork avoids external images, CORS, and PNG taint.
 * Earth/Sun are intentionally absent; no legend, labels, or invented bodies. */
export function renderShopSolarSystem(system: ShopSolarSystem): string {
  if (!Number.isFinite(Date.parse(system.referenceUtc)) ||
      !Number.isFinite(system.latitude) || !Number.isFinite(system.longitude)) {
    throw new Error('Invalid solar-system coordinate reference');
  }
  const seen=new Set<ShopSolarBodyId>();
  const rendered=system.bodies.map(body=>{
    if(seen.has(body.id))throw new Error('Duplicate solar-system body');
    seen.add(body.id);
    return illustratedBody(body);
  }).join('');
  return element('g',{
    id:'r9-solar-system-bodies',
    'data-solar-reference':system.referenceUtc,
    'data-visible-body-count':system.bodies.length,
  },rendered);
}

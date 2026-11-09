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

const specs: Record<ShopSolarBodyId, {
  radius: number; light: string; mid: string; dark: string; title: string;
}> = {
  mercury: { radius: 33, light: '#CEC6C1', mid: '#898482', dark: '#393C42', title: 'عطارد' },
  venus: { radius: 39, light: '#F0E8DC', mid: '#B7B8B5', dark: '#626D77', title: 'زهره' },
  mars: { radius: 40, light: '#D49B82', mid: '#9E5549', dark: '#4D343A', title: 'مریخ' },
  jupiter: { radius: 55, light: '#ECE1D5', mid: '#B69B90', dark: '#5B5D69', title: 'مشتری' },
  saturn: { radius: 42, light: '#DFD5C3', mid: '#9B9692', dark: '#515968', title: 'زحل' },
  uranus: { radius: 42, light: '#C3E6E9', mid: '#86BCCB', dark: '#3B6479', title: 'اورانوس' },
  neptune: { radius: 43, light: '#8FC4F0', mid: '#3A79B2', dark: '#173A74', title: 'نپتون' },
  moon: { radius: 59, light: '#DFE2E4', mid: '#A6ADB7', dark: '#343A48', title: 'ماه' },
};

function texturedCrater(x: number, y: number, r: number, opacity: number) {
  return element('g', { opacity },
    element('circle', { cx: x, cy: y, r, fill: '#4B5360', opacity: .54 }) +
    element('circle', { cx: x + 1, cy: y - 1, r: r * .71, fill: '#B4BCC5', opacity: .40 }) +
    element('path', {
      d: 'M' + n(x - r) + ' ' + n(y) + 'A' + n(r) + ' ' + n(r) +
        ' 0 0 0 ' + n(x + r) + ' ' + n(y),
      fill: 'none', stroke: '#F4F6F8', 'stroke-width': 1.2, opacity: .40,
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
    for (const [x,y,rad] of craters) lines.push(texturedCrater(x,y,rad,.70));
  } else if (id === 'venus') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*14,'#F8F5EC',6,.29));
    lines.push(element('ellipse',{cx:-13,cy:-11,rx:21,ry:8,fill:'#F8F4EA',opacity:.20,transform:'rotate(-20 -13 -11)'}));
  } else if (id === 'mars') {
    lines.push(element('path',{
      d:'M-38 -11 Q-17 -31 1 -16 L18 -3 -3 10 -22 4 -35 18 Z',
      fill:'#5A3841',opacity:.62,
    }));
    lines.push(element('path',{
      d:'M10 15 Q24 3 38 21 L24 35 7 28 Z',fill:'#683B40',opacity:.43,
    }));
    lines.push(element('ellipse',{cx:0,cy:-34,rx:22,ry:6,fill:'#DCE3E6',opacity:.73}));
  } else if (id === 'jupiter') {
    const bands = [
      [-37,12,'#87777B',.44],[-26,7,'#E5D9CB',.53],
      [-14,12,'#9B7778',.65],[-1,5,'#E8D8CC',.72],
      [12,13,'#A86F6F',.54],[27,7,'#E1D1C7',.63],[37,8,'#847783',.40],
    ] as const;
    for (const [y,w,c,o] of bands) lines.push(arc(y,c,w,o));
    lines.push(element('ellipse',{cx:19,cy:16,rx:13,ry:7,fill:'#B6756A',opacity:.83,transform:'rotate(-11 19 16)'}));
    lines.push(element('ellipse',{cx:19,cy:16,rx:8,ry:3.8,fill:'#CD9F96',opacity:.56}));
  } else if (id === 'saturn') {
    for (let j=-2;j<=3;j++) lines.push(arc(j*12,'#D7C5B3',j===0?7:5,.34));
  } else if (id === 'uranus') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*16,'#E1F3F1',4,.24));
  } else if (id === 'neptune') {
    for (let j=-2;j<=2;j++) lines.push(arc(j*15,'#A1C9EE',5,.25));
    lines.push(element('ellipse',{cx:16,cy:8,rx:15,ry:8,fill:'#245084',opacity:.6}));
    lines.push(element('path',{d:'M-26 -5 Q4 -11 29 -3',fill:'none',stroke:'#E0EFF6','stroke-width':3.5,opacity:.48}));
  }
  return lines.join('');
}

function moonPhasePath(r: number, fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  if (f < .0001) return '';
  if (f > .9999) return element('circle',{r,fill:'#D7DCE2',opacity:.96});
  const ellipseRadius = Math.max(.02, Math.abs(2*f-1)*r);
  const terminal = f < .5 ?
    ' A' + n(ellipseRadius) + ' ' + n(r) + ' 0 0 0 0 ' + n(-r) :
    ' A' + n(ellipseRadius) + ' ' + n(r) + ' 0 0 1 0 ' + n(-r);
  const path = 'M0 ' + n(-r) + ' A' + n(r) + ' ' + n(r) +
    ' 0 0 1 0 ' + n(r) + (Math.abs(f-.5)<.001 ? ' L0 ' + n(-r) : terminal) + ' Z';
  return element('path',{d:path,fill:'#D7DCE2',opacity:.96});
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
      element('ellipse',{rx:90,ry:28,fill:'none',stroke:'#8899AB','stroke-width':15,opacity:.31})+
      element('ellipse',{rx:92,ry:29,fill:'none',stroke:'#E3D7C5','stroke-width':5,opacity:.63})+
      element('ellipse',{rx:72,ry:22,fill:'none',stroke:'#635F69','stroke-width':4,opacity:.49})): '';
  const ringFront=body.id==='saturn'?
    element('g',{transform:'rotate(-20)'},
      element('path',{d:'M-88 0 A88 27 0 0 0 88 0',fill:'none',stroke:'#D1C4B8','stroke-width':9,opacity:.77})+
      element('path',{d:'M-92 0 A92 29 0 0 0 92 0',fill:'none',stroke:'#F2E7D8','stroke-width':2.5,opacity:.75})+
      element('path',{d:'M-70 0 A70 21 0 0 0 70 0',fill:'none',stroke:'#5A6575','stroke-width':3,opacity:.75})): '';
  const disk = element('circle',{r,fill:'url(#'+gradient+')'});
  let inside=element('g',{'clip-path':'url(#'+clip+')'},
    disk + detail(body.id,r) + element('circle',{r,fill:'url(#'+shade+')',opacity:.84}));
  if (body.id==='moon') {
    inside=element('g',{'clip-path':'url(#'+clip+')'},
      element('circle',{r,fill:'#252C39'}) +
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
    element('circle',{r:r*2.1,fill:'url(#'+id+'-halo)',opacity:.58})+
    ringBack + inside + ringFront +
    element('circle',{r,fill:'none',stroke:spec.light,'stroke-width':1.35,opacity:.30});
  const x=1500+body.x*1816, y=2170+body.y*1816;
  return element('g',{
    id, 'data-solar-body':body.id, 'data-altitude-deg':n(body.altitudeDegrees),
    'data-illuminated-fraction':body.illuminatedFraction.toFixed(6),
    transform:'translate('+n(x)+' '+n(y)+')',
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

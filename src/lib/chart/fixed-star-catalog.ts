import * as Astronomy from "astronomy-engine";
import type { ZodiacKey, RealEngineReportHouseNumber } from "@/types/astro";
import { normalizeChartPlacement, type NormalizedChart } from "./normalized-chart";

export const FIXED_STAR_CATALOG_VERSION = "halleus-fixed-stars-v1-20260831" as const;
export const FIXED_STAR_CANDIDATE_CONJUNCTION_ORB_DEGREES = 1 as const;

export type HalleusFixedStarId =
  | "regulus" | "spica" | "aldebaran" | "antares" | "algol" | "sirius"
  | "fomalhaut" | "vega" | "altair" | "deneb" | "betelgeuse" | "pollux"
  | "castor" | "procyon";

export type FixedStarCatalogEntry = {
  id: HalleusFixedStarId;
  labelFa: string;
  labelEn: string;
  raJ2000Hours: number;
  decJ2000Degrees: number;
  pmRaCosDecMasPerYear: number;
  pmDecMasPerYear: number;
};

export const FIXED_STAR_CATALOG: readonly FixedStarCatalogEntry[] = [
  { id:"regulus", labelFa:"رگولوس", labelEn:"Regulus", raJ2000Hours:10+8/60+22.4593/3600, decJ2000Degrees:11+58/60+1.9027/3600, pmRaCosDecMasPerYear:-248.73, pmDecMasPerYear:5.59 },
  { id:"spica", labelFa:"اسپیکا", labelEn:"Spica", raJ2000Hours:13+25/60+11.5793/3600, decJ2000Degrees:-(11+9/60+40.759/3600), pmRaCosDecMasPerYear:-42.50, pmDecMasPerYear:-31.73 },
  { id:"aldebaran", labelFa:"الدبران", labelEn:"Aldebaran", raJ2000Hours:4+35/60+55.2387/3600, decJ2000Degrees:16+30/60+33.485/3600, pmRaCosDecMasPerYear:62.78, pmDecMasPerYear:-189.35 },
  { id:"antares", labelFa:"آنتارس", labelEn:"Antares", raJ2000Hours:16+29/60+24.4609/3600, decJ2000Degrees:-(26+25/60+55.209/3600), pmRaCosDecMasPerYear:-10.16, pmDecMasPerYear:-23.21 },
  { id:"algol", labelFa:"الگول", labelEn:"Algol", raJ2000Hours:3+8/60+10.1315/3600, decJ2000Degrees:40+57/60+20.332/3600, pmRaCosDecMasPerYear:2.39, pmDecMasPerYear:-1.44 },
  { id:"sirius", labelFa:"سیریوس", labelEn:"Sirius", raJ2000Hours:6+45/60+8.9173/3600, decJ2000Degrees:-(16+42/60+58.017/3600), pmRaCosDecMasPerYear:-546.05, pmDecMasPerYear:-1223.14 },
  { id:"fomalhaut", labelFa:"فومالهوت", labelEn:"Fomalhaut", raJ2000Hours:22+57/60+39.0465/3600, decJ2000Degrees:-(29+37/60+20.050/3600), pmRaCosDecMasPerYear:329.22, pmDecMasPerYear:-164.21 },
  { id:"vega", labelFa:"وگا", labelEn:"Vega", raJ2000Hours:18+36/60+56.3364/3600, decJ2000Degrees:38+47/60+1.291/3600, pmRaCosDecMasPerYear:201.03, pmDecMasPerYear:287.47 },
  { id:"altair", labelFa:"آلتایر", labelEn:"Altair", raJ2000Hours:19+50/60+46.9990/3600, decJ2000Degrees:8+52/60+5.959/3600, pmRaCosDecMasPerYear:536.87, pmDecMasPerYear:385.57 },
  { id:"deneb", labelFa:"دنب", labelEn:"Deneb", raJ2000Hours:20+41/60+25.9147/3600, decJ2000Degrees:45+16/60+49.217/3600, pmRaCosDecMasPerYear:1.56, pmDecMasPerYear:1.55 },
  { id:"betelgeuse", labelFa:"بتلگیز", labelEn:"Betelgeuse", raJ2000Hours:5+55/60+10.3053/3600, decJ2000Degrees:7+24/60+25.426/3600, pmRaCosDecMasPerYear:27.33, pmDecMasPerYear:10.86 },
  { id:"pollux", labelFa:"پولوکس", labelEn:"Pollux", raJ2000Hours:7+45/60+18.9503/3600, decJ2000Degrees:28+1/60+34.315/3600, pmRaCosDecMasPerYear:-625.69, pmDecMasPerYear:-45.96 },
  { id:"castor", labelFa:"کاستور", labelEn:"Castor", raJ2000Hours:7+34/60+35.8628/3600, decJ2000Degrees:31+53/60+17.795/3600, pmRaCosDecMasPerYear:-206.33, pmDecMasPerYear:-148.18 },
  { id:"procyon", labelFa:"پروسیون", labelEn:"Procyon", raJ2000Hours:7+39/60+18.1183/3600, decJ2000Degrees:5+13/60+29.975/3600, pmRaCosDecMasPerYear:-716.58, pmDecMasPerYear:-1034.60 },
] as const;

const ZODIAC: ZodiacKey[] = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
const J2000_MS = Date.UTC(2000,0,1,12,0,0);
const JULIAN_YEAR_MS = 365.25*86400000;

export type CalculatedFixedStar = FixedStarCatalogEntry & {
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house: RealEngineReportHouseNumber | null;
  source: "halleus-icrs-j2000-proper-motion-astronomy-engine";
  catalogueVersion: typeof FIXED_STAR_CATALOG_VERSION;
};

export type FixedStarConjunctionCandidate = {
  starId: HalleusFixedStarId;
  starLabelFa: string;
  starLabelEn: string;
  anchorId: string;
  anchorLabel: string;
  anchorClass: "core-angle-or-luminary" | "other-natal-placement";
  orbDegrees: number;
  narrativeEligibleByContactOnly: false;
};

function norm(v:number){const n=v%360;return n<0?n+360:n;}
function angularDistance(a:number,b:number){const d=Math.abs(norm(a)-norm(b));return Math.min(d,360-d);}

export function calculateFixedStarLongitude(entry: FixedStarCatalogEntry, utcDate: Date): number {
  if (!(utcDate instanceof Date) || !Number.isFinite(utcDate.getTime())) throw new Error("Invalid fixed-star UTC date.");
  const years=(utcDate.getTime()-J2000_MS)/JULIAN_YEAR_MS;
  const dec=entry.decJ2000Degrees+(entry.pmDecMasPerYear*years)/3_600_000;
  const cosDec=Math.cos(dec*Math.PI/180);
  if(Math.abs(cosDec)<1e-8) throw new Error(`Fixed-star RA correction unstable for ${entry.id}.`);
  const raDeg=norm(entry.raJ2000Hours*15+(entry.pmRaCosDecMasPerYear*years)/(3_600_000*cosDec));
  const ra=raDeg*Math.PI/180, decr=dec*Math.PI/180;
  const time=new Astronomy.AstroTime(utcDate);
  const v=new Astronomy.Vector(Math.cos(decr)*Math.cos(ra),Math.cos(decr)*Math.sin(ra),Math.sin(decr),time);
  const ecl=Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time),v);
  return norm(Math.atan2(ecl.y,ecl.x)*180/Math.PI);
}

function houseFor(longitude:number, chart:NormalizedChart, id:string, label:string): RealEngineReportHouseNumber|null {
  if(!chart.houseContext.housesReady || chart.houses.length!==12) return null;
  return normalizeChartPlacement({id,label,pointType:"calculated-point",longitude}, chart.houseContext.firstHouseCuspLongitude, chart.houseContext.appliedSystem, chart.houses).house.house;
}

export function calculateCuratedFixedStars(utcDate:Date, chart:NormalizedChart): CalculatedFixedStar[] {
  return FIXED_STAR_CATALOG.map((entry)=>{
    const longitude=calculateFixedStarLongitude(entry,utcDate);
    const signIndex=Math.floor(longitude/30)%12;
    return {...entry,longitude,signId:ZODIAC[signIndex],degreeInSign:longitude-signIndex*30,house:houseFor(longitude,chart,`fixed-star:${entry.id}`,entry.labelEn),source:"halleus-icrs-j2000-proper-motion-astronomy-engine",catalogueVersion:FIXED_STAR_CATALOG_VERSION};
  });
}

export function findFixedStarConjunctionCandidates(input:{stars:CalculatedFixedStar[];chart:NormalizedChart;ascendantLongitude:number;midheavenLongitude:number;}): FixedStarConjunctionCandidate[] {
  const anchors=[
    ...input.chart.placements.map(p=>({id:p.id,label:p.label,longitude:p.normalizedLongitude,anchorClass:(p.id==="sun"||p.id==="moon")?"core-angle-or-luminary" as const:"other-natal-placement" as const})),
    {id:"asc",label:"Ascendant",longitude:norm(input.ascendantLongitude),anchorClass:"core-angle-or-luminary" as const},
    {id:"mc",label:"Midheaven",longitude:norm(input.midheavenLongitude),anchorClass:"core-angle-or-luminary" as const},
  ];
  return input.stars.flatMap(star=>anchors.map(anchor=>({star,anchor,orb:angularDistance(star.longitude,anchor.longitude)})).filter(x=>x.orb<=FIXED_STAR_CANDIDATE_CONJUNCTION_ORB_DEGREES).map(({star,anchor,orb})=>({starId:star.id,starLabelFa:star.labelFa,starLabelEn:star.labelEn,anchorId:anchor.id,anchorLabel:anchor.label,anchorClass:anchor.anchorClass,orbDegrees:orb,narrativeEligibleByContactOnly:false as const}))).sort((a,b)=>a.orbDegrees-b.orbDegrees);
}

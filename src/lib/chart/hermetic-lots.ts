import type { RealEngineReportHouseNumber, RealEngineReportSpecialPoint, ZodiacKey } from "@/types/astro";
import { normalizeChartPlacement, type NormalizedChart } from "./normalized-chart";

export const TRADITIONAL_LOTS_VERSION="halleus-paulus-lots-v1-20260831" as const;
export const TRADITIONAL_LOTS_TRADITION="Paulus Alexandrinus / Hermes-Panaretos formulas" as const;
export type TraditionalLotId="fortune"|"spirit"|"eros"|"necessity"|"courage"|"victory"|"nemesis";
export type TraditionalLotSect="day"|"night";
export type CalculatedTraditionalLot={id:TraditionalLotId;labelFa:string;labelEn:string;formulaId:string;tradition:typeof TRADITIONAL_LOTS_TRADITION;sect:TraditionalLotSect;dayNightBehavior:"sect-reversing";longitude:number;signId:ZodiacKey;degreeInSign:number;house:RealEngineReportHouseNumber|null;houseSystemContext:"placidus-placement-only";wholeSignInterpretationApplied:false;source:"halleus-traditional-lot-formula";};
const ZODIAC:ZodiacKey[]=["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
const META:Record<TraditionalLotId,{fa:string;en:string}>={fortune:{fa:"سهم بخت",en:"Lot of Fortune"},spirit:{fa:"سهم روح",en:"Lot of Spirit"},eros:{fa:"سهم اروس",en:"Lot of Eros"},necessity:{fa:"سهم ضرورت",en:"Lot of Necessity"},courage:{fa:"سهم شجاعت",en:"Lot of Courage"},victory:{fa:"سهم پیروزی",en:"Lot of Victory"},nemesis:{fa:"سهم نمسیس",en:"Lot of Nemesis"}};
function norm(v:number){const n=v%360;return n<0?n+360:n;}
function houseFor(longitude:number,chart:NormalizedChart,id:string,label:string):RealEngineReportHouseNumber|null{if(!chart.houseContext.housesReady||chart.houses.length!==12)return null;return normalizeChartPlacement({id,label,pointType:"calculated-point",longitude},chart.houseContext.firstHouseCuspLongitude,chart.houseContext.appliedSystem,chart.houses).house.house;}
function placement(chart:NormalizedChart,id:string){const p=chart.placements.find(x=>x.id===id);if(!p)throw new Error(`Traditional Lot requires natal placement: ${id}`);return p.normalizedLongitude;}
function mk(id:TraditionalLotId,formulaId:string,sect:TraditionalLotSect,longitude:number,chart:NormalizedChart):CalculatedTraditionalLot{const l=norm(longitude),si=Math.floor(l/30)%12;return{id,labelFa:META[id].fa,labelEn:META[id].en,formulaId,tradition:TRADITIONAL_LOTS_TRADITION,sect,dayNightBehavior:"sect-reversing",longitude:l,signId:ZODIAC[si],degreeInSign:l-si*30,house:houseFor(l,chart,`lot:${id}`,META[id].en),houseSystemContext:"placidus-placement-only",wholeSignInterpretationApplied:false,source:"halleus-traditional-lot-formula"};}
export function calculateTraditionalLots(input:{chart:NormalizedChart;ascendantLongitude:number;specialPoints:RealEngineReportSpecialPoint[]}):CalculatedTraditionalLot[]{
 const fortunePoint=input.specialPoints.find(p=>p.id==="part-of-fortune");if(!fortunePoint||fortunePoint.status!=="calculated")throw new Error("Traditional Lots require the validated Halleus Fortune point.");
 const sect=fortunePoint.calculationContext?.sect;if(sect!=="day"&&sect!=="night")throw new Error("Fortune sect context is missing.");
 const asc=norm(input.ascendantLongitude),fortune=fortunePoint.longitude,sun=placement(input.chart,"sun"),moon=placement(input.chart,"moon"),mercury=placement(input.chart,"mercury"),venus=placement(input.chart,"venus"),mars=placement(input.chart,"mars"),jupiter=placement(input.chart,"jupiter"),saturn=placement(input.chart,"saturn");
 const spirit=sect==="day"?norm(asc+sun-moon):norm(asc+moon-sun);
 const necessity=sect==="day"?norm(asc+fortune-mercury):norm(asc+mercury-fortune);
 const eros=sect==="day"?norm(asc+venus-spirit):norm(asc+spirit-venus);
 const courage=sect==="day"?norm(asc+fortune-mars):norm(asc+mars-fortune);
 const victory=sect==="day"?norm(asc+jupiter-spirit):norm(asc+spirit-jupiter);
 const nemesis=sect==="day"?norm(asc+fortune-saturn):norm(asc+saturn-fortune);
 return [mk("fortune",`fortune:${sect}:reuse-validated-fortune`,sect,fortune,input.chart),mk("spirit",sect==="day"?"spirit:asc+sun-moon":"spirit:asc+moon-sun",sect,spirit,input.chart),mk("eros",sect==="day"?"eros:asc+venus-spirit":"eros:asc+spirit-venus",sect,eros,input.chart),mk("necessity",sect==="day"?"necessity:asc+fortune-mercury":"necessity:asc+mercury-fortune",sect,necessity,input.chart),mk("courage",sect==="day"?"courage:asc+fortune-mars":"courage:asc+mars-fortune",sect,courage,input.chart),mk("victory",sect==="day"?"victory:asc+jupiter-spirit":"victory:asc+spirit-jupiter",sect,victory,input.chart),mk("nemesis",sect==="day"?"nemesis:asc+fortune-saturn":"nemesis:asc+saturn-fortune",sect,nemesis,input.chart)];
}

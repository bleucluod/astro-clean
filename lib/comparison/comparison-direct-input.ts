import type {BirthInput} from "@/types/astro";
export type DirectBirth = Pick<BirthInput,"name"|"birthDate"|"birthTime"|"birthTimeAccuracy"|"birthCity"|"birthCountry"|"birthCityId"|"birthLatitude"|"birthLongitude"|"birthTimezone">;
export type DirectComparisonRequest = {birthA:DirectBirth;birthB:DirectBirth;relationshipContext:"romantic";retryKey:string};
const keys=["name","birthDate","birthTime","birthTimeAccuracy","birthCity","birthCountry","birthCityId","birthLatitude","birthLongitude","birthTimezone"];
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==="object"&&!Array.isArray(v));
const bounded=(v:unknown,max:number):v is string=>typeof v==="string"&&v.length>0&&v.length<=max&&v===v.trim()&&!/[\x00-\x1f\x7f]/u.test(v);
const coordinate=(v:unknown,limit:number):v is number=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=limit;
export function parseDirectBirth(v:unknown):DirectBirth|null {
 if(!object(v)||Object.keys(v).some(k=>!keys.includes(k))||
 !bounded(v.name,100)||!bounded(v.birthDate,10)||!/^\d{4}-\d{2}-\d{2}$/.test(v.birthDate)||
 !bounded(v.birthTime,5)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.birthTime)||
 (v.birthTimeAccuracy!=="known"&&v.birthTimeAccuracy!=="unknown")||
 !bounded(v.birthCity,220)||!bounded(v.birthCountry,120)||
 (v.birthCityId!==undefined&&!bounded(v.birthCityId,220))||
 !coordinate(v.birthLatitude,90)||!coordinate(v.birthLongitude,180)||!bounded(v.birthTimezone,100))return null;
 const date=new Date(v.birthDate+"T00:00:00.000Z");
 if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==v.birthDate||date.valueOf()>Date.now())return null;
 try{new Intl.DateTimeFormat("en",{timeZone:v.birthTimezone});}catch{return null;}
 return {name:v.name,birthDate:v.birthDate,birthTime:v.birthTimeAccuracy==="unknown"?"12:00":v.birthTime,
 birthTimeAccuracy:v.birthTimeAccuracy,birthCity:v.birthCity,birthCountry:v.birthCountry,
 ...(v.birthCityId?{birthCityId:v.birthCityId}:{}),birthLatitude:v.birthLatitude,birthLongitude:v.birthLongitude,birthTimezone:v.birthTimezone};
}
export function parseDirectComparison(v:unknown):DirectComparisonRequest|null {
 if(!object(v)||Object.keys(v).length!==4||Object.keys(v).some(k=>!["birthA","birthB","relationshipContext","retryKey"].includes(k))||
 v.relationshipContext!=="romantic"||typeof v.retryKey!=="string"||!/^[A-Za-z0-9_-]{16,128}$/.test(v.retryKey))return null;
 const birthA=parseDirectBirth(v.birthA),birthB=parseDirectBirth(v.birthB);
 return birthA&&birthB?{birthA,birthB,relationshipContext:"romantic",retryKey:v.retryKey}:null;
}

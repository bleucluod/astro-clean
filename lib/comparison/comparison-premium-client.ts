"use client";
import {getSupabaseBrowserAccessState} from "@/lib/auth/supabase-browser-client";
import type {ComparisonRequest} from "./comparison-premium-store";
export async function requestPremiumComparison(input:ComparisonRequest,sessionStillCurrent=()=>true):Promise<string>{
 const auth=await getSupabaseBrowserAccessState();
 if(auth.kind==="unavailable"||!sessionStillCurrent())throw Error("AUTH");
 const response=await fetch("/api/compare/premium",{method:"POST",cache:"no-store",
 headers:{"Content-Type":"application/json",...(auth.kind==="account"?{Authorization:"Bearer "+auth.accessToken}:{})},body:JSON.stringify(input)});
 const data=await response.json();
 if(!response.ok||data.ok!==true||typeof data.reportId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.reportId))throw Error("CREATE");
 return data.reportId;
}

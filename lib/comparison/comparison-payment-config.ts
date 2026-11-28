import {getHalleusRuntimeEnv} from '@/lib/config/env';
export function isComparisonStorageReady(){
 const e=getHalleusRuntimeEnv();
 return process.env.HALLEUS_ENABLE_COMPARE_PRIVATE_STORAGE==='true' &&
 Boolean(e.authSecret&&e.databaseUrl&&e.accountStorageEnabled&&e.supabaseLoginEnabled&&e.supabaseUrl&&e.supabaseServiceRoleKey);
}
export function comparisonPaymentConfig(){
 const apiKey=process.env.HALLEUS_BITPAY_API_KEY,secret=process.env.HALLEUS_BITPAY_CALLBACK_SECRET;
 if(!isComparisonStorageReady()||process.env.HALLEUS_COMPARE_BITPAY_LEDGER_READY!=='true'||
 process.env.HALLEUS_COMPARE_BITPAY_CONTRACT_APPROVED!=='true'||!apiKey||apiKey.length<8||!secret||Buffer.byteLength(secret)<32)return null;
 return {apiKey,secret};
}
export function isComparisonCheckoutReady(){return process.env.HALLEUS_COMPARE_BITPAY_PAYMENTS_ENABLED==='true'&&Boolean(comparisonPaymentConfig());}

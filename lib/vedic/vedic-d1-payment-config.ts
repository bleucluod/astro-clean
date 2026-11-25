import {getHalleusRuntimeEnv} from '@/lib/config/env';
export function isVedicD1StorageReady(){
 const e=getHalleusRuntimeEnv();
 return process.env.HALLEUS_ENABLE_VEDIC_D1_PRIVATE_STORAGE==='true' &&
 Boolean(e.databaseUrl&&e.accountStorageEnabled&&e.supabaseLoginEnabled&&e.supabaseUrl&&e.supabaseServiceRoleKey);
}
export function vedicPaymentConfig(){
 const apiKey=process.env.HALLEUS_BITPAY_API_KEY,secret=process.env.HALLEUS_BITPAY_CALLBACK_SECRET;
 if(!isVedicD1StorageReady()||process.env.HALLEUS_VEDIC_BITPAY_LEDGER_READY!=='true'||
 process.env.HALLEUS_VEDIC_BITPAY_CONTRACT_APPROVED!=='true'||!apiKey||apiKey.length<8||!secret||Buffer.byteLength(secret)<32)return null;
 return {apiKey,secret};
}
export function isVedicD1CheckoutReady(){return process.env.HALLEUS_VEDIC_BITPAY_PAYMENTS_ENABLED==='true'&&Boolean(vedicPaymentConfig());}

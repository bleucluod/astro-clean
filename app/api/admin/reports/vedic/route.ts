import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import { isVedicD1StorageReady } from "@/lib/vedic/vedic-d1-payment-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only operational metadata. No manuscript, birth data, contact details or provider identifiers.
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "reports.read");
    if (!isVedicD1StorageReady()) return noStoreJsonResponse({ok:true,enabled:false,reports:[],hasMore:false});
    const page = new URL(request.url).searchParams.get("page") ?? "1";
    if (!/^[1-9][0-9]{0,3}$/.test(page)) return noStoreJsonResponse({ok:false,error:"Invalid page."},400);
    const rows = await getAdminDatabase()`
      select r.id,r.created_at,p.status,p.amount_toman,p.factor_id
      from halleus_private.vedic_d1_reports r
      left join halleus_private.vedic_d1_payments p on p.report_id=r.id
      order by r.created_at desc,r.id limit 21 offset ${(Number(page)-1)*20}
    `;
    return noStoreJsonResponse({ok:true,enabled:true,hasMore:rows.length>20,reports:rows.slice(0,20).map(row=>({
      id:String(row.id),createdAt:new Date(String(row.created_at)).toISOString(),
      status:row.status==="verified"?"paid":row.status?"pending":"locked",
      amountToman:row.amount_toman==null?null:Number(row.amount_toman),
      factor:row.factor_id==null?null:String(row.factor_id)
    }))});
  } catch (error) { return adminErrorResponse(error); }
}

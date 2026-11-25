import { createHash } from 'node:crypto';
import { getAdminDatabase } from '@/lib/admin/admin-database';
import type { VedicD1ValidatedBirth } from './vedic-d1-contract';
import type { VedicD1FreeReading } from './vedic-d1-reading-contract';
import type { VedicD1PrivateManuscriptDraft } from './vedic-d1-premium-contract';
import type { SavedVedicD1 } from './vedic-d1-private-http';

function mapRow(row: Record<string, unknown>): SavedVedicD1 {
  const status=row.payment_status==='verified'?'paid':row.payment_status?'pending':'locked';
  return {id:String(row.id),name:String(row.display_name),
    createdAt:new Date(String(row.created_at)).toISOString(),reading:row.free_reading as VedicD1FreeReading,
    payment:{status,amountToman:row.amount_toman==null?null:Number(row.amount_toman),factor:row.factor_id==null?null:String(row.factor_id)},
    ...(status==='paid'&&row.manuscript?{manuscript:row.manuscript as NonNullable<SavedVedicD1['manuscript']>}: {})};
}

export async function storeVedicD1(owner: string, birth: VedicD1ValidatedBirth, name: string,
    reading: VedicD1FreeReading, manuscript: VedicD1PrivateManuscriptDraft, ownerKind: 'account'|'guest' = 'account'): Promise<SavedVedicD1> {
  const hash = createHash('sha256').update(JSON.stringify([
    birth.birthDateGregorian,birth.birthTime,birth.city.id,birth.utcIso,name,
    manuscript.calculationVersion,manuscript.writerRulesVersion
  ])).digest('hex');
  const sql = getAdminDatabase();
  return sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(hashtextextended(${'vedic-d1:'+ownerKind+':'+owner},0))`;
    const ownerColumn=ownerKind==='account'?'owner_id':'guest_owner_id';
    const inserted=await tx`
      insert into halleus_private.vedic_d1_reports
        (${tx(ownerColumn)},input_hash,display_name,calculation_version,writer_version,free_reading,private_manuscript)
      values (${owner}::uuid,${hash},${name},${manuscript.calculationVersion},${manuscript.writerRulesVersion},
        ${JSON.stringify(reading)}::text::jsonb,${JSON.stringify(manuscript)}::text::jsonb)
      on conflict (${tx(ownerColumn)},input_hash) do nothing
      returning id,display_name,created_at,free_reading
    `;
    if(inserted.length) return mapRow(inserted[0]);
    const rows=await tx`select r.id,r.display_name,r.created_at,r.free_reading,p.status as payment_status,p.amount_toman,p.factor_id
      from halleus_private.vedic_d1_reports r left join halleus_private.vedic_d1_payments p on p.report_id=r.id
      where r.${tx(ownerColumn)}=${owner}::uuid and r.input_hash=${hash} limit 1`;
    if(!rows.length) throw new Error('VEDIC_D1_SAVE_NOT_FOUND');
    return mapRow(rows[0]);
  });
}
export async function getPrivateVedicD1(owner: string,id: string): Promise<SavedVedicD1|null> {
  const sql=getAdminDatabase();
  const rows=await sql`select r.id,r.display_name,r.created_at,r.free_reading,p.status as payment_status,p.amount_toman,p.factor_id,
    case when p.status='verified' then r.private_manuscript else null end as manuscript
    from halleus_private.vedic_d1_reports r left join halleus_private.vedic_d1_payments p on p.report_id=r.id
    where r.owner_id=${owner}::uuid and r.id=${id}::uuid limit 1`;
  return rows.length?mapRow(rows[0]):null;
}
export async function listPrivateVedicD1(owner: string,offset: number): Promise<SavedVedicD1[]> {
  const sql=getAdminDatabase();
  const rows=await sql`select r.id,r.display_name,r.created_at,r.free_reading,p.status as payment_status,p.amount_toman,p.factor_id
    from halleus_private.vedic_d1_reports r left join halleus_private.vedic_d1_payments p on p.report_id=r.id
    where r.owner_id=${owner}::uuid order by r.created_at desc,r.id limit 21 offset ${offset}`;
  return rows.map(mapRow);
}

/** Claim the signed browser's guest reports, preserving existing account invoices and IDs. */
export async function claimVedicD1GuestReports(account:string,guest:string):Promise<number> {
  return getAdminDatabase().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(hashtextextended(${'vedic-d1:account:'+account},0))`;
    await tx`select pg_advisory_xact_lock(hashtextextended(${'vedic-d1:guest:'+guest},0))`;
    // An invoice can only be created for an authenticated owner. Fail closed if this invariant is broken.
    const unsafe=await tx`select p.id from halleus_private.vedic_d1_payments p join halleus_private.vedic_d1_reports r on r.id=p.report_id where r.guest_owner_id=${guest}::uuid limit 1`;
    if(unsafe.length)throw Error('VEDIC_GUEST_PAYMENT_INVARIANT');
    const duplicates=await tx`delete from halleus_private.vedic_d1_reports g using halleus_private.vedic_d1_reports a
      where g.guest_owner_id=${guest}::uuid and a.owner_id=${account}::uuid and a.input_hash=g.input_hash returning g.id`;
    const moved=await tx`update halleus_private.vedic_d1_reports set owner_id=${account}::uuid,guest_owner_id=null
      where guest_owner_id=${guest}::uuid returning id`;
    return duplicates.length+moved.length;
  });
}
export async function listGuestVedicD1(guest:string,offset:number):Promise<SavedVedicD1[]> {
  const rows=await getAdminDatabase()`select id,display_name,created_at,free_reading
    from halleus_private.vedic_d1_reports where guest_owner_id=${guest}::uuid
    order by created_at desc,id limit 21 offset ${offset}`;
  return rows.map(mapRow);
}
export async function getGuestVedicD1(guest:string,id:string):Promise<SavedVedicD1|null> {
  const rows=await getAdminDatabase()`select id,display_name,created_at,free_reading
    from halleus_private.vedic_d1_reports where guest_owner_id=${guest}::uuid and id=${id}::uuid limit 1`;
  return rows.length?mapRow(rows[0]):null;
}

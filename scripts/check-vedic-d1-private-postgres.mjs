// Isolated disposable DB only. Never uses DATABASE_URL or production credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
const url=process.env.HALLEUS_VEDIC_TEST_DATABASE_URL;
if(!url||process.env.HALLEUS_VEDIC_TEST_DISPOSABLE!=='yes')
  throw Error('EXTERNAL_BLOCK: explicitly provision a disposable PostgreSQL test database');
const parsed=new URL(url);
if(!['postgres:','postgresql:'].includes(parsed.protocol)||
  !/^halleus_vedic_test_[a-z0-9_]+$/.test(parsed.pathname.slice(1)))
  throw Error('SAFETY_FATAL: test database name must start halleus_vedic_test_');
const migration=readFileSync(new URL('../database/migrations/0045_private_vedic_d1_reports.sql',import.meta.url),'utf8');
const paymentMigration=readFileSync(new URL('../database/migrations/0046_private_vedic_d1_payments.sql',import.meta.url),'utf8');
assert.match(migration,/\bbegin;\s*create table/i);
assert.match(migration,/commit;\s*$/i);
const sql=postgres(url,{max:1,connect_timeout:5,prepare:false});
const rollback=new Error('ROLLBACK_SUCCESSFUL_FIXTURE');
try {
  const identity=await sql`select current_database() as db, to_regnamespace('auth') as auth_schema,
    to_regnamespace('halleus_private') as private_schema, to_regclass('public.halleus_reports') as existing_reports`;
  const actual=identity[0];
  if(actual.db!==parsed.pathname.slice(1)||actual.auth_schema||actual.private_schema||actual.existing_reports)
    throw Error('SAFETY_FATAL: target is not the expected empty disposable fixture');
  const roles=await sql`select rolname from pg_roles where rolname in ('anon','authenticated')`;
  if(roles.length!==2)throw Error('EXTERNAL_BLOCK: fixture needs anon and authenticated roles');
  try {
    await sql.begin(async tx=>{
      await tx.unsafe('create schema auth; create schema halleus_private; create table auth.users (id uuid primary key); revoke all on schema halleus_private from public, anon, authenticated;');
      await tx.unsafe(migration.replace(/\bbegin;/i,'').replace(/commit;\s*$/i,''));
      await tx.unsafe('create sequence halleus_private.shared_display_numbers_seq as bigint');
      await tx.unsafe(paymentMigration.replace(/\bbegin;/i,'').replace(/commit;\s*$/i,''));
      const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
      await tx`insert into auth.users(id) values (${a}::uuid),(${b}::uuid)`;
      const insert=(owner,hash,free='{"kind":"free-d1"}')=>tx`
        insert into halleus_private.vedic_d1_reports(owner_id,input_hash,display_name,calculation_version,writer_version,free_reading,private_manuscript)
        values (${owner}::uuid,${hash},'fixture','calc','writer',${free}::text::jsonb,'{"kind":"private-d1-draft"}'::jsonb)
        on conflict(owner_id,input_hash) do nothing returning id`;
      const first=await insert(a,'a'.repeat(64));assert.equal(first.length,1);
      assert.equal((await insert(a,'a'.repeat(64))).length,0);
      assert.equal((await insert(b,'a'.repeat(64))).length,1);
      const id=first[0].id;
      assert.equal((await tx`select id from halleus_private.vedic_d1_reports where id=${id}::uuid and owner_id=${b}::uuid`).length,0);
      assert.equal((await tx`select id from halleus_private.vedic_d1_reports where id=${id}::uuid and owner_id=${a}::uuid`).length,1);
      const acl=await tx`select has_table_privilege('anon','halleus_private.vedic_d1_reports','SELECT') as anon_read,
        has_table_privilege('authenticated','halleus_private.vedic_d1_reports','SELECT') as auth_read,
        has_table_privilege('authenticated','halleus_private.vedic_d1_reports','INSERT') as auth_write,
        (select relrowsecurity from pg_class where oid='halleus_private.vedic_d1_reports'::regclass) as rls`;
      assert.deepEqual([acl[0].anon_read,acl[0].auth_read,acl[0].auth_write,acl[0].rls],[false,false,false,true]);
      // A savepoint keeps intentional constraint failures independent.
      await assert.rejects(tx.savepoint(sp=>sp`insert into halleus_private.vedic_d1_reports(owner_id,input_hash,display_name,calculation_version,writer_version,free_reading,private_manuscript)
        values (${a}::uuid,${'b'.repeat(64)},'fixture','calc','writer','{}'::jsonb,'{"kind":"private-d1-draft"}'::jsonb)`),e=>e.code==='23514');
      const proof='c'.repeat(64);
      const payment=await tx`insert into halleus_private.vedic_d1_payments(report_id,amount_toman,amount_rial,proof_hash) values (${id}::uuid,300000,3000000,${proof}) returning id,factor_id`;
      assert.equal(payment.length,1);
      await assert.rejects(tx.savepoint(sp=>sp`insert into halleus_private.vedic_d1_payments(report_id,amount_toman,amount_rial,proof_hash)
        values (${id}::uuid,300000,3000000,${'d'.repeat(64)})`),e=>e.code==='23505');
      const p=payment[0].id;
      await assert.rejects(tx.savepoint(sp=>sp`update halleus_private.vedic_d1_payments set amount_rial=1 where id=${p}::uuid`),e=>e.code==='23514');
      await assert.rejects(tx.savepoint(sp=>sp`update halleus_private.vedic_d1_payments set status='verified',verified_at=now() where id=${p}::uuid`),e=>e.code==='23514');
      await tx`update halleus_private.vedic_d1_payments set status='verify_pending',provider_payment_id='88',provider_transaction_id='99' where id=${p}::uuid`;
      const readFull=(owner)=>tx`select case when p.status='verified' then r.private_manuscript else null end as manuscript
        from halleus_private.vedic_d1_reports r join halleus_private.vedic_d1_payments p on p.report_id=r.id where r.id=${id}::uuid and r.owner_id=${owner}::uuid`;
      assert.equal((await readFull(a))[0].manuscript,null);
      await tx`update halleus_private.vedic_d1_payments set status='verified',verified_at=now() where id=${p}::uuid`;
      assert.equal((await readFull(a))[0].manuscript.kind,'private-d1-draft');
      assert.equal((await readFull(b)).length,0);
      const payAcl=await tx`select has_table_privilege('anon','halleus_private.vedic_d1_payments','SELECT') as anon_read,
        has_table_privilege('authenticated','halleus_private.vedic_d1_payments','UPDATE') as auth_write,
        (select relrowsecurity from pg_class where oid='halleus_private.vedic_d1_payments'::regclass) as rls`;
      assert.deepEqual([payAcl[0].anon_read,payAcl[0].auth_write,payAcl[0].rls],[false,false,true]);
      throw rollback;
    });
  } catch(e){if(e!==rollback)throw e;}
  const cleanup=await sql`select to_regnamespace('auth') as auth_schema,to_regnamespace('halleus_private') as private_schema`;
  assert.equal(cleanup[0].auth_schema,null);assert.equal(cleanup[0].private_schema,null);
  console.log('VEDIC_D1_PRIVATE_POSTGRES_PASS (transaction rolled back)');
} finally {await sql.end({timeout:1});}

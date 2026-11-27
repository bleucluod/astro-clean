import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { parseComparisonPreviewRequest } from './comparison-preview-orchestration.mjs';
import { projectComparisonChapterPreview } from './comparison-preview-projection.mjs';

export const DEMO_PRICE_TOMAN = 500000;
const failure = code => ({ ok: false, code });
const hash = value => createHash('sha256').update(value).digest('hex');
const parse = JSON.parse;

// This is a disposable local test database, not the Halleus production store.
export function openComparisonDemoStore(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sessions (owner TEXT PRIMARY KEY, account INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS charts (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(owner), report TEXT NOT NULL, time_status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS comparisons (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(owner), retry TEXT NOT NULL, binding TEXT NOT NULL, record TEXT NOT NULL, preview TEXT NOT NULL, UNIQUE(owner,retry));
    CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES comparisons(id), status TEXT NOT NULL CHECK(status IN ('pending','cancelled','verified')), amount INTEGER NOT NULL CHECK(amount=500000));
    CREATE UNIQUE INDEX IF NOT EXISTS demo_active_invoice ON invoices(report_id) WHERE status IN ('pending','verified');`);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  function atomic(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const session = owner => get('SELECT account FROM sessions WHERE owner=?', owner);
  const owned = (owner,id) => get('SELECT * FROM comparisons WHERE owner=? AND id=?',owner,id);
  function view(row) {
    const paid = Boolean(get("SELECT id FROM invoices WHERE report_id=? AND status='verified'",row.id));
    const record = parse(row.record);
    const summary = {id:row.id,chartALabel:record.chartALabel,chartBLabel:record.chartBLabel,relationshipContext:record.relationshipContext,updatedAt:record.updatedAt};
    return { ok:true, reportId:row.id, paid, summary, preview:parse(row.preview), ...(paid ? {record} : {}) };
  }
  return {
    close: () => db.close(),
    session(token) {
      const owner = hash(token);
      run('INSERT OR IGNORE INTO sessions(owner) VALUES (?)',owner);
      return owner;
    },
    login(owner) {
      run('UPDATE sessions SET account=1 WHERE owner=?',owner);
      return {ok:true,account:Boolean(session(owner)?.account)};
    },
    status(owner) {
      return {ok:true,account:Boolean(session(owner)?.account),charts:all('SELECT report FROM charts WHERE owner=? ORDER BY rowid DESC',owner).map(row=>parse(row.report)),reports:all('SELECT id,record FROM comparisons WHERE owner=? ORDER BY rowid DESC',owner).map(row=>{const record=parse(row.record);return {id:row.id,chartALabel:record.chartALabel,chartBLabel:record.chartBLabel,relationshipContext:record.relationshipContext,updatedAt:record.updatedAt};})};
    },
    saveChart(owner,report,timeStatus) {
      if (!session(owner) || !report?.realEngine || !['exact','unknown'].includes(timeStatus)) return failure('INVALID_CHART');
      const id = 'demo-chart-'+randomUUID();
      run('INSERT INTO charts VALUES (?,?,?,?)',id,owner,JSON.stringify({...report,id}),timeStatus);
      return {ok:true,chartId:id,chart:{...report,id}};
    },
    create(owner,raw,generate) {
      const input = parseComparisonPreviewRequest(raw);
      if (!session(owner) || !input) return failure('INVALID_REQUEST');
      return atomic(()=>{
        const binding = JSON.stringify(input);
        const prior = get('SELECT * FROM comparisons WHERE owner=? AND retry=?',owner,input.retryKey);
        if (prior) return prior.binding===binding ? view(prior) : failure('RETRY_CONFLICT');
        const a = get('SELECT * FROM charts WHERE owner=? AND id=?',owner,input.chartAId);
        const b = get('SELECT * FROM charts WHERE owner=? AND id=?',owner,input.chartBId);
        if (!a || !b) return failure('CHART_UNAVAILABLE');
        if ((a.time_status==='unknown' && input.chartABirthTimeStatus==='exact') || (b.time_status==='unknown' && input.chartBBirthTimeStatus==='exact')) return failure('TIME_STATUS_INVALID');
        const id = 'demo-comparison-'+randomUUID();
        const generated = generate(parse(a.report),parse(b.report),{...input,recordId:id});
        const record = generated?.record;
        if (!record || record.id!==id || record.chartAId!==input.chartAId || record.chartBId!==input.chartBId || record.relationshipContext!==input.relationshipContext || record.chartABirthTimeStatus!==input.chartABirthTimeStatus || record.chartBBirthTimeStatus!==input.chartBBirthTimeStatus || record.privacy?.visibility!=='private' || record.privacy?.indexingPolicy!=='noindex') return failure('GENERATION_INVALID');
        const preview = projectComparisonChapterPreview(record.reading,generated.plan);
        run('INSERT INTO comparisons VALUES (?,?,?,?,?,?)',id,owner,input.retryKey,binding,JSON.stringify(record),JSON.stringify(preview));
        return view(owned(owner,id));
      });
    },
    read(owner,id) { const row=owned(owner,id); return row ? view(row) : failure('REPORT_UNAVAILABLE'); },
    checkout(owner,id) {
      return atomic(()=>{
        if (!owned(owner,id)) return failure('REPORT_UNAVAILABLE');
        if (!session(owner)?.account) return failure('LOGIN_REQUIRED');
        const prior=get("SELECT id,status,amount FROM invoices WHERE report_id=? AND status IN ('pending','verified')",id);
        if (prior) return {ok:true,invoiceId:prior.id,status:prior.status,amountToman:prior.amount};
        const invoiceId='demo-invoice-'+randomUUID();
        run("INSERT INTO invoices VALUES (?,?,'pending',?)",invoiceId,id,DEMO_PRICE_TOMAN);
        return {ok:true,invoiceId,status:'pending',amountToman:DEMO_PRICE_TOMAN};
      });
    },
    settle(owner,id,invoiceId,outcome) {
      if (!['verified','cancelled'].includes(outcome)) return failure('INVALID_OUTCOME');
      return atomic(()=>{
        if (!owned(owner,id)) return failure('REPORT_UNAVAILABLE');
        if (!session(owner)?.account) return failure('LOGIN_REQUIRED');
        const invoice=get('SELECT status FROM invoices WHERE id=? AND report_id=?',invoiceId,id);
        if (!invoice || (invoice.status!=='pending' && invoice.status!==outcome)) return failure('INVOICE_UNAVAILABLE');
        if (invoice.status==='pending') run('UPDATE invoices SET status=? WHERE id=?',outcome,invoiceId);
        return view(owned(owner,id));
      });
    }
  };
}

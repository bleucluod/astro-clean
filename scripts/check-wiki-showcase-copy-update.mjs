import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const requireNode = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const read = (path) => fs.readFileSync(resolve(root, path), "utf8");
function loadModule(path, deps) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  assert.deepEqual((compiled.diagnostics ?? []).filter((d) =>
    d.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  const run = vm.runInNewContext("(function(module,exports,require){" + compiled.outputText + "\n})", {
    console, crypto: requireNode("node:crypto"), TextEncoder, TextDecoder,
  });
  run(module, module.exports, (name) => {
    if (name in deps) return deps[name];
    if (name.startsWith("node:")) return requireNode(name);
    throw Error("Unexpected dependency: " + name);
  });
  return module.exports;
}

const UID = (n) => n.toString(16).padStart(8, "0") + "-1111-4111-8111-111111111111";
const field = (i) => ({ title: `عنوان قبلی ${i}`, description: `توضیح قبلی ${i}`, buttonLabel: `دکمه قبلی ${i}` });
const replacement = (i) => ({ title: `هدیهٔ شخصی ${i}`, description: `تاریخ عزیزت رو برای یک تابلو انتخاب کن ${i}`, buttonLabel: `دیدن تابلو ${i}` });
const items = [1,2].map((i) => ({
  articleId: UID(i), articleSlug: `article-${i}`, articleVersion: 4,
  productId: i === 1 ? "p01" : "p02", afterSectionIndex: i,
  sectionAnchor: "sec1-12345678", sectionTitle: `بخش ${i}`,
  expectedOriginal: field(i), replacement: replacement(i),
}));
const bundle = { schemaVersion:1, packageType:"HALLEUS_WIKI_SHOWCASE_PUBLISHED_COPY_UPDATE",
  expectedCount: items.length, items };
const rows = items.map((it,i) => ({
  showcase_id: UID(i+80), article_id: it.articleId, product_id: it.productId,
  after_section_index: it.afterSectionIndex, section_anchor: it.sectionAnchor,
  section_title: it.sectionTitle, content_version: it.articleVersion,
  slug:it.articleSlug, enabled:true, revision:2,
  title:it.expectedOriginal.title, description:it.expectedOriginal.description,
  button_label:it.expectedOriginal.buttonLabel,
}));
let writes = 0, audits = 0;
const sql = async (chunks, ...values) => {
  const stmt = chunks.join("?").replace(/\s+/g," ").trim().toLowerCase();
  if (stmt.startsWith("select s.id::text as showcase_id")) {
    const ids = values[0];
    return rows.filter((r) => ids.includes(r.article_id)).map((r) => ({ ...r }));
  }
  if (stmt.startsWith("update halleus_private.wiki_shop_showcases")) {
    const r = rows.find((row) => row.showcase_id === values[4]);
    assert.ok(r);
    assert.equal(r.revision, values[5]);
    r.title = values[0]; r.description = values[1]; r.button_label = values[2];
    r.revision++; writes++;
    return [{ id:r.showcase_id }];
  }
  if (stmt.startsWith("insert into halleus_private.admin_audit_events")) {
    audits++; return [];
  }
  throw Error("Unexpected SQL: " + stmt);
};
sql.begin = async (cb) => {
  const snapshot = rows.map((r) => ({...r}));
  const previous = writes, previousAudits = audits;
  try { return await cb(sql); }
  catch (error) {
    rows.splice(0, rows.length, ...snapshot);
    writes = previous; audits = previousAudits;
    throw error;
  }
};
const { readWikiShowcaseCopyPackage, updatePublishedWikiShowcaseCopy } =
  loadModule("lib/wiki/wiki-showcase-copy-update.ts", {
    "@/lib/admin/admin-auth": {AdminAccessError: class AdminAccessError extends Error { constructor(status,message) { super(message); this.status=status; }}},
    "@/lib/admin/admin-database": {
      asRecord:(v)=>v && typeof v==="object" && !Array.isArray(v) ? v : {},
      asNumber:(v)=>Number(v)||0,
      asString:(v)=>v==null?"":String(v),
      getAdminDatabase:()=>sql,
    },
  });
const actor = {userId:UID(666),role:"admin",correlationId:"test-correlation"};
assert.equal(readWikiShowcaseCopyPackage(bundle).length,2);
assert.throws(() => readWikiShowcaseCopyPackage({...bundle,items:[items[0],items[0]]}), /Duplicate/);
assert.throws(() => readWikiShowcaseCopyPackage({...bundle,items:[{...items[0],enabled:false}],expectedCount:1}), /Unexpected/);
assert.throws(() => readWikiShowcaseCopyPackage({...bundle,expectedCount:3}), /Invalid/);
assert.throws(() => readWikiShowcaseCopyPackage({...bundle,items:[{...items[0],replacement:{...items[0].replacement,buttonLabel:""}}],expectedCount:1}), /Invalid copy field/);
const bulk = Array.from({length:289},(_,i)=>({...items[0],articleId:UID(1000+i),articleSlug:`article-${1000+i}`}));
assert.equal(readWikiShowcaseCopyPackage({...bundle,expectedCount:289,items:bulk}).length,289);
const preview=await updatePublishedWikiShowcaseCopy(actor,bundle,false);
assert.equal(preview.matchedCount,2);
assert.equal(preview.changedCount,2);
assert.equal(writes,0);
const stale = structuredClone(bundle);
stale.items[1].expectedOriginal.title = "different old text";
await assert.rejects(updatePublishedWikiShowcaseCopy(actor,stale,true),/differs from approved/);
assert.equal(writes,0,"Preflight mismatch cannot partially write");
rows[1].section_anchor="sec1-87654321";
await assert.rejects(updatePublishedWikiShowcaseCopy(actor,bundle,true),/placement\/product\/version/);
assert.equal(writes,0,"Wrong placement cannot write");
rows[1].section_anchor=items[1].sectionAnchor;
const applied=await updatePublishedWikiShowcaseCopy(actor,bundle,true);
assert.equal(applied.changedCount,2);
assert.equal(applied.matchedCount,2);
assert.equal(writes,2);
assert.equal(audits,1);
assert.equal(applied.slugs.join(","),"article-1,article-2");
assert.equal(rows[0].product_id,"p01");
assert.equal(rows[0].after_section_index,1);
assert.equal(rows[0].enabled,true);
const replay=await updatePublishedWikiShowcaseCopy(actor,bundle,true);
assert.equal(replay.changedCount,0,"Reupload is idempotent");
assert.equal(replay.alreadyAppliedCount,2);
assert.equal(writes,2);
const route=read("app/api/admin/wiki/shop-showcases/route.ts");
const panel=read("components/admin/WikiShopShowcasePanel.tsx");
assert.match(route,/copy-updates\.json/);
assert.match(route,/updatePublishedWikiShowcaseCopy/);
assert.match(route,/revalidatePath\("\/wiki\/" \+ slug/);
assert.match(panel,/متن ویترین‌های منتشرشده/);
assert.match(panel,/copyMode/);
assert.match(panel,/تأیید و جایگزینی متن/);
console.log("SHOWCASE_COPY_UPDATE_GUARD=PASS validation, no-partial-write, idempotent, unchanged identities, route and UI");

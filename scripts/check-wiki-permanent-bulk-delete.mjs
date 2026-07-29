import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};

const route = read("app/api/admin/wiki/articles/bulk-actions/route.ts");
const service = read("lib/wiki/wiki-cms-service.ts");
const panel = read("components/admin/WikiAdminPanel.tsx");
const migration = read("database/migrations/0007_wiki_permanent_bulk_delete.sql");

for (const [label, source] of [["route", route], ["service", service], ["panel", panel]]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      failures.push(`${label} parse error: ${diagnostic.messageText}`);
    }
  }
}

requireText("route action", route, 'action !== "permanent_delete"');
requireText("route confirmation", route, "body.confirmation");
requireText("owner boundary", service, 'input.actor.role !== "owner"');
requireText("counted confirmation", service, "`DELETE ${articleIds.length} ARCHIVED`");
requireText("database primitive", service, "permanently_delete_wiki_articles");
requireText("UI owner boundary", panel, 'session.role === "owner"');
requireText("deleted list filter", service, "${status} = 'deleted' and article.deleted_at is not null");
requireText("deleted tab", panel, '["deleted", "حذف‌شده"]');
requireText("UI irreversible copy", panel, "این عملیات قابل بازیابی نیست");
requireText("UI soft-delete boundary", panel, 'article.status === "archived" && Boolean(article.deletedAt)');
requireText("transaction", migration, "begin;");
requireText("row lock", migration, "for update;");
requireText("archived boundary", migration, "status = 'archived'");
requireText("soft-delete boundary", migration, "deleted_at is not null");
requireText("live inbound block", migration, "Remove live inbound Wiki links before permanent deletion.");
requireText("running job block", migration, "A running Wiki publish job blocks permanent deletion.");
requireText("revision deletion gate", migration, "halleus.wiki_permanent_delete");
for (const dependency of [
  "delete from public.wiki_redirects",
  "delete from public.wiki_internal_links",
  "update halleus_private.wiki_import_items",
  "delete from halleus_private.wiki_publish_jobs",
  "delete from public.wiki_article_drafts",
  "delete from public.wiki_article_revisions",
  "delete from public.wiki_articles",
]) requireText("dependency cleanup", migration, dependency);
requireText("audit action", migration, "admin.wiki.articles_bulk_permanently_deleted");
requireText("service role only", migration, "to service_role");

if (failures.length) {
  console.error("Wiki permanent bulk delete check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Wiki permanent bulk delete check passed.");
console.log("- only owner-confirmed, soft-deleted archived articles are eligible");
console.log("- live inbound links and running jobs block deletion");
console.log("- dependencies, article rows, and audit evidence share one transaction");

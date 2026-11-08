#!/usr/bin/env node
/**
 * Execute the real overview aggregations against the LIVE service's DB connection,
 * inside one explicit PostgreSQL READ ONLY transaction. No credentials or rows
 * are printed. This must run as root on the VPS before release activation.
 */
import assert from "node:assert/strict";
import { readFileSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import postgres from "postgres";
import vm from "node:vm";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const servicePid = process.argv[2] ?? "";
function fail(message) {
  console.error("ADMIN_OVERVIEW_DB_READONLY=" + message);
  process.exitCode = 1;
}
function adminRuntime() {
  if (process.getuid?.() !== 0) throw new Error("requires_root_for_process_environment");
  if (!/^[1-9]\d{0,9}$/.test(servicePid)) throw new Error("invalid_service_pid");
  const executable = readlinkSync("/proc/" + servicePid + "/exe");
  if (!/(?:^|\/)node(?:js)?$/.test(executable)) throw new Error("service_not_node");
  const fields = readFileSync("/proc/" + servicePid + "/environ").toString("utf8").split("\0");
  const item = fields.find((value) => value.startsWith("DATABASE_URL="));
  const url = item?.slice("DATABASE_URL=".length);
  if (!url) throw new Error("service_database_url_missing");
  return url;
}
function createService(tx) {
  const source = readFileSync(resolve(root, "lib/admin/admin-overview-trends.ts"), "utf8");
  const constantSource = readFileSync(resolve(root, "lib/telegram/telegram-queue.ts"), "utf8");
  if (!constantSource.includes("export const TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS = 30 * 60_000;")) {
    throw new Error("telegram_freshness_contract_changed");
  }
  const out = ts.transpileModule(source, {
    fileName: "lib/admin/admin-overview-trends.ts", reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((out.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  const factory = vm.runInNewContext("(function (require, exports) {" + out.outputText + "\n})", {
    Date, Promise, Map, Number, Object, Array, String, RegExp, Intl,
  });
  factory((name) => {
    if (name === "@/lib/telegram/telegram-queue") {
      return { TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS: 30 * 60_000 };
    }
    if (name === "@/lib/admin/admin-database") {
      return {
        getAdminDatabase: () => tx,
        asNumber: (value) => Number.isFinite(Number(value)) ? Number(value) : 0,
        asRecord: (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {},
      };
    }
    throw new Error("unexpected_dependency");
  }, exports);
  if (typeof exports.getAdminOverviewTrends !== "function") throw new Error("overview_export_missing");
  return exports.getAdminOverviewTrends;
}

let sql;
try {
  const databaseUrl = adminRuntime();
  sql = postgres(databaseUrl, { max: 1, idle_timeout: 2, connect_timeout: 10, prepare: false });
  // This is a single connection and an explicit transaction with the DB's read-only guarantee.
  await sql.begin("read only", async (tx) => {
    const overview = createService(tx);
    const owner = {
      role: "owner",
      capabilities: ["dashboard.read", "shop_orders.read", "wiki.read", "telegram.read"],
    };
    const result = await overview(7, owner);
    assert.equal(result.days, 7);
    assert.ok(Array.isArray(result.daily));
    assert.ok(result.groups.includes("shop"));
    assert.ok(result.groups.includes("wiki"));
    assert.ok(result.groups.includes("telegram"));
    assert.ok(result.snapshot.shop && result.snapshot.wiki && result.snapshot.telegram);
    const analyst = await overview(7, { role: "analyst", capabilities: ["dashboard.read"] });
    assert.equal(analyst.snapshot.shop, null);
    assert.equal(analyst.snapshot.wiki, null);
    assert.equal(analyst.snapshot.telegram, null);
    assert.equal(analyst.groups.includes("shop"), false);
    console.log("ADMIN_OVERVIEW_DB_READONLY=PASS real_queries owner_and_non_owner");
  });
} catch (error) {
  const code = String(error?.code ?? "");
  const sqlstate = /^[0-9A-Z]{5}$/.test(code) ? code : null;
  // Never print raw driver messages: they may reveal runtime topology or credentials.
  const known = new Set(["requires_root_for_process_environment", "invalid_service_pid",
    "service_not_node", "service_database_url_missing", "telegram_freshness_contract_changed",
    "overview_export_missing", "unexpected_dependency"]);
  const diagnostic = sqlstate ? "sqlstate_" + sqlstate :
    known.has(String(error?.message)) ? String(error.message) :
    error?.name === "AssertionError" ? "projection_assertion" : "runtime_or_connection_unavailable";
  fail("BLOCKED_" + diagnostic);
} finally {
  if (sql) await sql.end({ timeout: 2 }).catch(() => {});
}

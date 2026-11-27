import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { generateReportContract } from "@/lib/report-generation";
import { createPrivateComparison, getDefaultComparisonBirthTimeStatus } from "@/lib/comparison/comparison-product-service";
import { buildComparisonEvidencePlan } from "@/lib/comparison/comparison-evidence-plan";
import type { AstrologyReport, BirthInput } from "@/types/astro";
import type { CreateComparisonInput } from "@/types/comparison-product";
import { openComparisonDemoStore } from "@/lib/comparison/comparison-demo-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "halleus_compare_demo_v1";
const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const reject = (code: string, status = 400) => json({ ok: false, code }, status);
const text = (value: unknown) => typeof value === "string" && value.length <= 220 ? value : "";
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;

function allowed(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.HALLEUS_COMPARE_LOCAL_DEMO !== "1") return false;
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    const url = new URL(request.url);
    return local.has(origin.hostname) && local.has(url.hostname) &&
      origin.host === request.headers.get("host") && origin.protocol === "http:";
  } catch { return false; }
}

function birth(value: unknown): BirthInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const input: BirthInput = {
    name: text(p.name), birthDate: text(p.birthDate), birthTime: text(p.birthTime),
    birthCity: text(p.birthCity), birthCountry: text(p.birthCountry),
    birthCityId: text(p.birthCityId), birthLatitude: number(p.birthLatitude),
    birthLongitude: number(p.birthLongitude), birthTimezone: text(p.birthTimezone),
    birthTimeAccuracy: p.birthTimeAccuracy === "unknown" ? "unknown" : "known",
  };
  if (!input.name || !input.birthDate || !input.birthCity || !input.birthTimezone ||
      input.birthLatitude === undefined || input.birthLongitude === undefined) return null;
  return input;
}

export async function POST(request: Request) {
  if (!allowed(request)) return reject("DEMO_DISABLED", 404);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return reject("INVALID_REQUEST", 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reject("INVALID_REQUEST");
    body = parsed as Record<string, unknown>;
  } catch { return reject("INVALID_REQUEST"); }
  const previous = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  const valid = typeof previous === "string" && /^[a-f0-9]{64}$/.test(previous);
  if (!valid && body.action !== "init") return reject("DEMO_SESSION_REQUIRED", 401);
  const token = valid ? previous! : randomBytes(32).toString("hex");
  // Never use DATABASE_URL, Supabase, or a real payment provider in this route.
  const folder = join(homedir(), ".halleus-compare-demo", createHash("sha256").update(process.cwd()).digest("hex").slice(0, 20));
  let store: ReturnType<typeof openComparisonDemoStore> | undefined;
  try {
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    store = openComparisonDemoStore(join(folder, "demo.sqlite"));
    const owner = store.session(token);
    let result: unknown;
    switch (body.action) {
      case "init": result = store.status(owner); break;
      case "login": result = store.login(owner); break;
      case "save-chart": {
        const input = birth(body.input);
        if (!input) return reject("INVALID_CHART");
        const generated = generateReportContract({ input });
        if (!generated.ok || generated.contract.fallback.used ||
            !generated.contract.report?.realEngine) return reject("CHART_CALCULATION_FAILED");
        const report = generated.contract.report;
        result = store.saveChart(owner, report, getDefaultComparisonBirthTimeStatus(report));
        break;
      }
      case "create": result = store.create(owner, body.input, (a: AstrologyReport, b: AstrologyReport, input: CreateComparisonInput) => {
        const generated = createPrivateComparison(a, b, input);
        if (!generated.ok) return null;
        return { record: generated.record, plan: buildComparisonEvidencePlan(generated.record.report) };
      }); break;
      case "read": result = store.read(owner, text(body.reportId)); break;
      case "checkout": result = store.checkout(owner, text(body.reportId)); break;
      case "settle": result = store.settle(owner, text(body.reportId), text(body.invoiceId), text(body.outcome)); break;
      default: return reject("INVALID_REQUEST");
    }
    const response = json(result);
    if (!valid) response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return reject("DEMO_OPERATION_FAILED", 500);
  } finally { store?.close(); }
}

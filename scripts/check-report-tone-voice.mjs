import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const tonePath = "lib/report-quality/tone-profile.ts";
const writerPath = "lib/astrology/real-engine-report-writer.ts";
const toneSource = readFileSync(tonePath, "utf8");
const writerSource = readFileSync(writerPath, "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

for (const marker of [
  "preferredPatterns",
  "avoidedPatterns",
  "applyHalleusReportVoice",
  "فارسی روان، صمیمی و محترمانه",
  "توضیح یکپارچه چارت",
  "دعوت به مشاهده",
]) {
  assert.ok(toneSource.includes(marker), `Tone profile is missing: ${marker}`);
}

assert.ok(
  writerSource.includes(
    'import { applyHalleusReportVoice } from "@/lib/report-quality/tone-profile";',
  ),
  "The live report writer does not import the shared voice policy.",
);
assert.ok(
  writerSource.includes("return applyHalleusReportVoice(text)"),
  "The live report sanitizer does not apply the shared voice policy.",
);

const transpiled = ts.transpileModule(toneSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`;
const { applyHalleusReportVoice, HALLEUS_REPORT_TONE_PROFILE } = await import(moduleUrl);

const fixtures = [
  ["تو همیشه از تغییر فرار می‌کنی.", "گاهی از تغییر فرار می‌کنی."],
  ["تو هرگز احساساتت را نمی‌گویی.", "گاهی احساساتت را نمی‌گویی."],
  ["سرنوشت تو تنهایی است.", "این چارت درباره تنهایی است."],
  [
    "چارت ثابت می‌کند که این یعنی حتماً موفق می‌شوی.",
    "چارت به‌صورت نمادین نشان می‌دهد که این می‌تواند به این معنا باشد که موفق می‌شوی.",
  ],
  ["تمرکز روی self-reflection مفید است.", "تمرکز روی خودنگری مفید است."],
];

for (const [input, expected] of fixtures) {
  assert.equal(applyHalleusReportVoice(input), expected);
}

for (const phrase of HALLEUS_REPORT_TONE_PROFILE.avoidedPatterns) {
  assert.ok(
    !applyHalleusReportVoice(`نمونه: ${phrase}.`).includes(phrase),
    `Avoided phrase survives voice normalization: ${phrase}`,
  );
}

assert.equal(
  packageJson.scripts?.["check:report-tone-voice"],
  "node scripts/check-report-tone-voice.mjs",
  "Package script is not registered.",
);

console.log("Report tone and voice guard passed.");

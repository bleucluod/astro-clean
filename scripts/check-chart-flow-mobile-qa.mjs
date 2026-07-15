import fs from "node:fs";

const requiredFiles = [
  "components/ChartForm.tsx",
  "app/globals.css",
  "app/chart/chart-shell.module.css",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");

const chartForm = read("components/ChartForm.tsx");
const css = `${read("app/globals.css")}\n${read("app/chart/chart-shell.module.css")}`;
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

const mustContain = (text, token, label) => {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
};

const mustNotContain = (text, token, label) => {
  if (text.includes(token)) {
    throw new Error(`${label} still contains stale token: ${token}`);
  }
};

for (const token of [
  "birth-time-picker-grid",
  "city-suggestion-chips",
  "city-suggestion-chip",
  "chart-form-status",
  "ساخت گزارش",
  "ساعت تولدم را نمی‌دانم",
  "گزارشم را در حساب هالیوس نگه دار",
]) {
  mustContain(chartForm, token, "ChartForm mobile QA");
}

for (const stale of [
  "<datalist",
  "list={citySuggestions",
  "در حال ساخت...</button>",
  'type="time"',
  'href="/reports"',
]) {
  mustNotContain(chartForm, stale, "ChartForm mobile QA");
}

for (const token of [
  "Chart flow mobile QA + final input polish v0.1.178",
  ".birth-time-picker-grid",
  ".city-suggestion-chips",
  ".city-suggestion-chip",
  ".chart-form-status",
]) {
  mustContain(css, token, "chart mobile QA CSS");
}

mustContain(context, "v0.1.178", "project context");
mustContain(ideaGarden, "v0.1.178", "idea garden");

console.log("Chart flow mobile QA check passed.");

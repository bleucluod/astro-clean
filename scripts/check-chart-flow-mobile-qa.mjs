import fs from "node:fs";

const requiredFiles = [
  "components/ChartForm.tsx",
  "app/globals.css",
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
const css = read("app/globals.css");
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
  "time-choice-row-mobile",
  "birth-time-input",
  "city-suggestion-chips",
  "city-suggestion-chip",
  "chart-form-status",
  "ساخت و باز کردن گزارش",
  "گزارش‌ها",
  "اگر ساعت دقیق را نمی‌دانی",
  "شمسی یا میلادی",
]) {
  mustContain(chartForm, token, "ChartForm mobile QA");
}

for (const stale of [
  "<datalist",
  "list={citySuggestions",
  "در حال ساخت...</button>",
]) {
  mustNotContain(chartForm, stale, "ChartForm mobile QA");
}

for (const token of [
  "Chart flow mobile QA + final input polish v0.1.178",
  ".time-choice-row-mobile",
  ".birth-time-input",
  ".city-suggestion-chips",
  ".city-suggestion-chip",
  ".chart-form-status",
]) {
  mustContain(css, token, "chart mobile QA CSS");
}

mustContain(context, "v0.1.178", "project context");
mustContain(ideaGarden, "v0.1.178", "idea garden");

console.log("Chart flow mobile QA check passed.");

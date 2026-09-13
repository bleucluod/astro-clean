import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);
const ts = requireFromHere("typescript");
const React = requireFromHere("react");
const { renderToStaticMarkup } = requireFromHere("react-dom/server");
const file = path.resolve("components/wiki/WikiArticleRender.tsx");
const source = readFileSync(file, "utf8");
for (const token of ["HALLEUS_WIKI_KEY_POINTS_COUNT_V12", "visibleKeyPoints", "if (count === 0)", "new Intl.NumberFormat(\"fa-IR\", { useGrouping: false })"]) if (!source.includes(token)) throw new Error(`WikiArticleRender missing ${token}`);
const js = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const moduleRecord = { exports: {} };
const cssModule = new Proxy({ __esModule: true, default: new Proxy({}, { get: (_, prop) => String(prop) }) }, { get(target, prop) { if (prop in target) return target[prop]; return String(prop); } });
const localRequire = (id) => {
  if (id.endsWith("wiki.module.css")) return cssModule;
  if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
  return requireFromHere(id);
};
new Function("require", "module", "exports", "__filename", "__dirname", js)(localRequire, moduleRecord, moduleRecord.exports, file, path.dirname(file));
const { WikiKeyPoints } = moduleRecord.exports;
if (typeof WikiKeyPoints !== "function") throw new Error("WikiKeyPoints export not found after transpile");
const fa = new Intl.NumberFormat("fa-IR", { useGrouping: false });
const cases = [
  { points: [], count: 0, title: null },
  { points: ["   "], count: 0, title: null },
  { points: ["الف"], count: 1, title: "یک نکته که باید با خودت ببری" },
  { points: ["الف", "ب"], count: 2, title: "دو نکته که باید با خودت ببری" },
  { points: ["الف", "ب", "پ"], count: 3, title: "سه نکته‌ای که باید با خودت ببری" },
  { points: ["الف", " ", "ب", "پ", "ت"], count: 4, title: `${fa.format(4)} نکته که باید با خودت ببری` },
  { points: Array.from({ length: 12 }, (_, i) => `نکته ${i + 1}`), count: 12, title: `${fa.format(12)} نکته که باید با خودت ببری` },
];
for (const test of cases) {
  const html = renderToStaticMarkup(React.createElement(WikiKeyPoints, { keyPoints: test.points, targets: {} }));
  const liCount = (html.match(/<li(?:\s|>)/g) ?? []).length;
  if (liCount !== test.count) throw new Error(`Expected ${test.count} li, got ${liCount}: ${html}`);
  if (test.count === 0) { if (html !== "") throw new Error(`Zero-point SSR must be empty, got: ${html}`); }
  else if (!html.includes(test.title)) throw new Error(`Missing exact title ${test.title}: ${html}`);
}
console.log("Wiki key-points SSR guard passed for 0/1/2/3/4/12 visible items and whitespace filtering.");

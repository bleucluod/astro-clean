import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function mustExist(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required logo/favicon asset: ${path}`);
  }

  const stats = statSync(fullPath);
  if (!stats.isFile() || stats.size < 100) {
    throw new Error(`Logo/favicon asset is unexpectedly small or not a file: ${path}`);
  }
}

function mustContain(label, text, token) {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
}

function mustNotContain(label, text, token) {
  if (text.includes(token)) {
    throw new Error(`${label} must not contain token: ${token}`);
  }
}

function assertPng(path) {
  const data = readFileSync(join(root, path));
  const pngSignature = "89504e470d0a1a0a";
  if (data.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${path} is not a valid PNG signature`);
  }
}

function assertIco(path) {
  const data = readFileSync(join(root, path));
  if (data.subarray(0, 4).toString("hex") !== "00000100") {
    throw new Error(`${path} is not a valid ICO signature`);
  }
}

const requiredAssets = [
  "app/favicon.ico",
  "app/icon.png",
  "app/apple-icon.png",
  "public/favicon.ico",
  "public/apple-touch-icon.png",
  "public/icon.png",
  "public/halleus-logo/emblem-transparent.png",
  "public/halleus-logo/full-logo-transparent.png",
  "public/halleus-logo/wordmark-persian-transparent.png",
  "public/halleus-logo/favicon-32x32.png",
  "public/halleus-logo/favicon-192x192.png",
  "public/halleus-logo/favicon-512x512.png",
];

for (const asset of requiredAssets) {
  mustExist(asset);
}

for (const asset of requiredAssets.filter((asset) => asset.endsWith(".png"))) {
  assertPng(asset);
}

for (const asset of requiredAssets.filter((asset) => asset.endsWith(".ico"))) {
  assertIco(asset);
}

const appShell = read("components/AppShell.tsx");
const layout = read("app/layout.tsx");
const packageJson = JSON.parse(read("package.json"));
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const token of [
  'import Image from "next/image";',
  "/halleus-logo/emblem-transparent.png",
  "site-brand-logo-emblem",
  "footer-brand-logo",
  'aria-label="Halleus | هالیوس"',
]) {
  mustContain("AppShell brand", appShell, token);
}

mustNotContain("AppShell brand", appShell, '<span className="site-brand-mark">✦</span>');

for (const token of [
  "icons:",
  "/favicon.ico",
  "/halleus-logo/favicon-32x32.png",
  "/halleus-logo/favicon-192x192.png",
  "/apple-touch-icon.png",
]) {
  mustContain("layout metadata icons", layout, token);
}

if (
  packageJson.scripts?.["check:logo-favicon-assets"] !==
  "node scripts/check-logo-favicon-assets.mjs"
) {
  throw new Error("package.json missing check:logo-favicon-assets script");
}

for (const token of [
  "sun-gold logo/favicon package",
  "public/halleus-logo/emblem-transparent.png",
]) {
  mustContain("project context logo note", projectContext, token);
}

for (const token of [
  "Halleus sun-gold logo/favicon package",
  "username/password account bridge",
]) {
  mustContain("idea garden logo note", ideaGarden, token);
}

console.log("Logo/favicon asset check passed.");

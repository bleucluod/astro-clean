import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(text, token, label) {
  if (!text.includes(token)) {
    throw new Error(`${label} is missing: ${token}`);
  }
}

const css = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));

[
  "dana-regular.woff2",
  "dana-medium.woff2",
  "dana-demibold.woff2",
  "dana-bold.woff2",
].forEach((fileName) => {
  const fontPath = path.join(root, "public", "fonts", "dana", fileName);
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Dana font asset is missing: ${fileName}`);
  }
});

assertIncludes(css, "Core UX Typography v0.1.198a", "typography marker");
assertIncludes(css, 'font-family: "Dana"', "Dana font-face");
assertIncludes(css, "--font-ui", "Dana font variable");
assertIncludes(css, "#fffaf3", "warmer background palette");
assertIncludes(css, "font-size: 15px", "base font scale");

assertIncludes(
  packageJson.scripts?.["check:core-ux-typography"] ?? "",
  "scripts/check-core-ux-typography.mjs",
  "package script",
);

console.log("Core UX typography check passed.");

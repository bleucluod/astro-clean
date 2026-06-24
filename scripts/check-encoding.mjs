import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const scanRoots = ["app", "components", "lib", "types"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".md"]);
const badMarkers = [
  String.fromCharCode(0x00d8),
  String.fromCharCode(0x00d9),
  String.fromCharCode(0x00db),
  String.fromCharCode(0x00da),
  String.fromCharCode(0x00e2, 0x20ac),
  "\\u06",
];

async function walk(dir) {
  let entries = [];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
        continue;
      }

      files.push(...(await walk(fullPath)));
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = [];

for (const root of scanRoots) {
  files.push(...(await walk(root)));
}

const hits = [];

for (const file of files) {
  const content = await readFile(file, "utf8");

  for (const marker of badMarkers) {
    if (content.includes(marker)) {
      hits.push({ file, marker });
      break;
    }
  }
}

if (hits.length > 0) {
  console.error("Encoding check failed. Possible mojibake/literal unicode markers found:");

  for (const hit of hits) {
    console.error(`- ${hit.file}`);
  }

  process.exit(1);
}

console.log(`Encoding check passed for ${files.length} files.`);

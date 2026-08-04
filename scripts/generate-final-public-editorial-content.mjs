import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "content", "public-editorial-final");
const outputPath = path.join(root, "lib", "public-content", "final-editorial-content.generated.json");
const pages = {
  home: "03-homepage.md",
  chart: "04-chart.md",
  compare: "05-compare.md",
  sky: "06-sky.md",
  product: "07-product.md",
  pricing: "08-pricing.md",
  order: "09-order.md",
  privacy: "10-privacy.md",
};

function cleanInline(value) {
  return value.replace(/  $/, "").trim();
}

function parseSectionBody(body) {
  const blocks = [];
  const lines = body.split(/\r?\n/);
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = cleanInline(rawLine);
    if (!line || line === "---") {
      flushParagraph();
      flushList();
      continue;
    }

    const field = line.match(/^- \*\*(Eyebrow|H1|H2):\*\*\s*(.+)$/);
    if (field) {
      flushParagraph();
      flushList();
      blocks.push({ type: field[1].toLowerCase(), text: field[2] });
      continue;
    }

    if (/^- \*\*(نوع نمایش):\*\*/.test(line) || /^\*\*(یادداشت نمایش|قانون Production):\*\*/.test(line)) {
      continue;
    }

    const heading = line.match(/^####\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "subheading", text: heading[1] });
      continue;
    }

    const action = line.match(/^\*\*(CTA(?: اصلی| دوم| سوم)?|Link|لینک فرعی|Microcopy|Partial State|Unavailable State|Loading|Success|Error|قیمت|دوره یا نوع پرداخت|زمان تحویل|قالب تحویل):\*\*\s*(.+)$/);
    if (action) {
      flushParagraph();
      flushList();
      blocks.push({ type: action[1].startsWith("CTA") || action[1] === "Link" || action[1] === "لینک فرعی" ? "action" : "note", label: action[1], text: action[2] });
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const unordered = line.match(/^-\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      const orderedValue = Boolean(ordered);
      if (!list || list.ordered !== orderedValue) {
        flushList();
        list = { type: "list", ordered: orderedValue, items: [] };
      }
      list.items.push((ordered ?? unordered)[1]);
      continue;
    }

    if (/^\*\*[^*]+:\*\*/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "fact", text: line });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parsePage(markdown) {
  const metadataMatch = markdown.match(/## ۲\. Metadata\s+([\s\S]*?)\n## ۳\./);
  const metadata = {};
  if (metadataMatch) {
    for (const line of metadataMatch[1].split(/\r?\n/)) {
      const match = line.match(/^- \*\*([^*]+):\*\*\s*(.+)$/);
      if (match) metadata[match[1]] = match[2].replaceAll("`", "");
    }
  }

  const structure = markdown.match(/## ۳\. ساختار کامل صفحه\s+([\s\S]*?)\n## ۴\./)?.[1] ?? "";
  const sections = [];
  const matcher = /### Section: `([^`]+)`\s+([\s\S]*?)(?=\n---\n\n### Section:|$)/g;
  for (const match of structure.matchAll(matcher)) {
    sections.push({ id: match[1], blocks: parseSectionBody(match[2]) });
  }
  return { metadata, sections };
}

const generated = {};
for (const [key, filename] of Object.entries(pages)) {
  generated[key] = parsePage(await readFile(path.join(sourceDirectory, filename), "utf8"));
}

const serialized = `${JSON.stringify(generated, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error("Final public editorial content is not synchronized with its Markdown sources.");
    process.exit(1);
  }
  console.log("Final public editorial content is synchronized.");
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
  console.log(`Generated ${outputPath}`);
}

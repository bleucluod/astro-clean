import { readFileSync } from "node:fs";
const map = JSON.parse(readFileSync(new URL("../content/seo/internal-links-roadmap-v5.json", import.meta.url), "utf8"));
const wikiRows = map.rows.filter(row => row.source.startsWith("/wiki/"));
const slugs = [...new Set(wikiRows.map(row => row.source.slice(6)))];
const normalize = text => String(text ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
const token = row => "[[page:" + row.destination + "|" + row.anchor + "]]";
const format = row => row.sentence.replace("**" + row.anchor + "**", token(row));
const occurrences = (text, literal) => String(text ?? "").split(literal).length - 1;

function candidates(sections, heading) {
  const matches = [];
  for (const [si, section] of sections.entries()) {
    const ordered = Array.isArray(section.orderedBlocks) ? section.orderedBlocks : null;
    if (ordered) {
      const headings = ordered.flatMap((block, bi) => block.kind === "heading" && normalize(block.text) === normalize(heading) ? [bi] : []);
      const spans = headings.map(bi => [bi + 1, ordered.findIndex((b, i) => i > bi && b.kind === "heading")]);
      if (normalize(section.title) === normalize(heading)) spans.unshift([0, ordered.findIndex(b => b.kind === "heading")]);
      for (const [start, end] of spans) {
        const ps = [];
        for (let i = start; i < (end < 0 ? ordered.length : end); i++) {
          const b = ordered[i];
          if (b.kind === "paragraph" && b.text && !/^!\[/.test(b.text)) ps.push({ sectionIndex: si, blockIndex: i, paragraph: b.text });
        }
        matches.push(ps);
      }
    } else if (normalize(section.title) === normalize(heading)) {
      matches.push((section.paragraphs ?? []).flatMap((paragraph, pi) => paragraph && !/^!\[/.test(paragraph) ? [{ sectionIndex: si, paragraphIndex: pi, paragraph }] : []));
    }
  }
  return matches;
}

function plan(row, article) {
  if (!article) return { ...row, status: "missing-published-article" };
  const matches = candidates(article.sections ?? [], row.heading);
  if (matches.length !== 1 || !matches[0].length) return { ...row, status: "heading-or-paragraph-drift", matches: matches.length };
  const p = row.placement.includes("بند اول") ? matches[0][0] : matches[0].at(-1);
  const expected = row.source === map.combined.source ? map.combined.sentence : format(row);
  const body = String(article.body_markdown ?? "");
  const destTokenCount = occurrences(body, "[[page:" + row.destination + "|");
  const exactTokenCount = occurrences(p.paragraph, token(row));
  const state = destTokenCount === 1 && exactTokenCount === 1 ? "already-present"
    : destTokenCount || exactTokenCount || body.includes("](" + row.destination + ")") || body.includes("](https://halleus.ir" + row.destination + ")") ? "existing-link-review"
    : occurrences(body, p.paragraph) !== 1 ? "body-paragraph-drift"
    : row.placement.includes("جایگزین بند قدیمی") ? "legacy-replacement-review"
    : "placement-ready";
  return { ...row, status: state, ...p, proposedSentence: expected, contentVersion: article.content_version };
}

function selfCheck() {
  const all = map.rows;
  if (all.length !== 86 || new Set(all.map(r => r.source + "|" + r.destination)).size !== 86 || wikiRows.length !== 69 || slugs.length !== 52) throw Error("roadmap counts");
  const by = new Map();
  for (const r of all) by.set(r.destination, (by.get(r.destination) ?? 0) + 1);
  if (by.size !== 15 || by.get("/vedic") !== 14 || by.get("/shop/moon-phase-print") !== 12 || by.get("/shop/birth-sky-map") !== 12 || [...by].filter(([d,n]) => d.endsWith("-sign") && n === 4).length !== 12) throw Error("destination quotas");
  const row = wikiRows[0], p = "Sample paragraph.";
  const sample = { sections: [{ title: row.heading, paragraphs: [p] }], body_markdown: p, content_version: 1 };
  if (plan(row, sample).status !== "placement-ready") throw Error("paragraph fixture");
  const h3 = { sections: [{ title: "parent", paragraphs: [p], orderedBlocks: [{kind:"heading",level:3,text:row.heading},{kind:"paragraph",text:p}] }], body_markdown:p };
  if (plan(row,h3).status !== "placement-ready") throw Error("ordered heading fixture");
  if (plan(row,{...sample,body_markdown:p+" "+p}).status !== "body-paragraph-drift") throw Error("ambiguity fixture");
  if (plan(row,{...sample,sections:[...sample.sections,...sample.sections]}).status !== "heading-or-paragraph-drift") throw Error("heading ambiguity fixture");
}
selfCheck();
if (process.argv.includes("--self-check")) {
  console.log("ROADMAP_V5_MANIFEST_SELF_CHECK_OK");
} else {
  if (process.argv.slice(2).length) throw Error("Read-only preflight: no apply flag supported.");
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required for the live Wiki preflight.");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL,{max:1,prepare:false});
  try {
    const output = await sql.begin(async tx => {
      await tx`set transaction read only`;
      const articles = await tx`
        select slug, stable_id, content_version, intro, sections, body_markdown, updated_at
        from public.wiki_articles
        where slug = any(${slugs}::text[]) and status = 'published'
          and published_at is not null and published_at <= now()
          and deleted_at is null
      `;
      const bySlug = new Map(articles.map(a => [a.slug,a]));
      const placements = wikiRows.map(row => plan(row,bySlug.get(row.source.slice(6))));
      const legacy = map.legacyCopyReview.map(slug => {
        const a = bySlug.get(slug);
        return a ? {slug, contentVersion:a.content_version, intro:a.intro, sections:a.sections, bodyMarkdown:a.body_markdown} : {slug, missing:true};
      });
      return { mode:"read-only", roadmapBlob:map.roadmapBlob, articleCount:articles.length, placements, legacy, readyForApply:false };
    });
    console.log(JSON.stringify(output,null,2));
  } finally { await sql.end(); }
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after the R3 closeout DB transaction and the new renderer are active.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'content/r3-batch07/manifest.json'), 'utf8'));
if (manifest.schema !== 'HALLEUS_R3_BATCH07_MANIFEST_V1' || manifest.records?.length !== 74) {
  throw Error('SAFETY_FATAL: locked 74-article batch unavailable');
}
const extras = new Map([
  ['what-is-chinese-astrology', '[[article:chinese-zodiac-compatibility-marriage|سازگاری طالع‌بینی چینی]]'],
  ['chinese-zodiac-birth-month-inner-animal', '[[article:what-is-moon-sign|نشان ماه چیست]]'],
  ['birth-month-flowers', '[[article:birth-chart-basics|چارت تولد چیست]]'],
]);
const docs = manifest.records.map((entry) => {
  const bytes = readFileSync(resolve(root, 'content/r3-batch07/wiki', entry.page_id + '.json'));
  if (createHash('sha256').update(bytes).digest('hex') !== entry.candidate_json_sha256) {
    throw Error('SAFETY_FATAL: approved bytes changed ' + entry.page_id);
  }
  const doc = JSON.parse(bytes.toString('utf8'));
  if (doc.slug !== entry.slug || doc.canonical_url !== 'https://halleus.ir/wiki/' + entry.slug) {
    throw Error('SAFETY_FATAL: approved identity changed ' + entry.page_id);
  }
  const token = extras.get(doc.slug);
  if (token) {
    if (doc.content.body_markdown.split(token).length !== 2) throw Error('SAFETY_FATAL: extra token footprint changed');
    doc.content.body_markdown = doc.content.body_markdown.replace(token, token.split('|')[1].slice(0, -2));
  }
  return doc;
});
const decode = (value) => value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|zwnj|rlm);/gi, (_, entity) => {
  const lower = entity.toLowerCase();
  if (lower[0] === '#') {
    const n = lower[1] === 'x' ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  }
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', zwnj: '\u200c', rlm: '\u200f' }[lower] || ' ';
});
const textOnly = (html) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[^]*?-->/g, ' ')
  .replace(/<\/?(?:a|strong|em|b|i|code|span)\b[^>]*>/gi, '')
  .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const textExpected = (value) => value.replace(/\[\[(?:page|article):[^|\]]+\|([^\]]+)\]\]/g, '$1')
  .replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: decode(match[1].match(/\bhref="([^"]+)"/i)?.[1] ?? ''), label: textOnly(match[2]) }))
    .filter((entry) => entry.href);
}
function verifyArticle(doc, html) {
  const content = doc.content;
  const text = textOnly(html);
  const title = textOnly(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  if (!title.includes(content.seo_title)) return 'SEO title mismatch';
  if (!text.includes(content.title)) return 'article title absent';
  if (!text.includes(textExpected(content.intro).slice(0, 42))) return 'approved intro absent';
  for (const section of content.sections) if (!text.includes(section.title)) return 'H2 absent: ' + section.title;
  const blocks = [...(content.intro_blocks || []), ...content.sections.flatMap((section) => section.orderedBlocks || [])];
  if (blocks.some((block) => block.kind === 'table') && !/<table\b/i.test(html)) return 'table missing';
  for (const block of blocks) {
    if (block.kind === 'heading' && !text.includes(textExpected(block.text))) return 'H3 missing';
    if (block.kind === 'image' && !decode(html).includes(block.alt)) return 'image ALT missing';
  }
  const pageLinks = anchors(html);
  for (const match of content.body_markdown.matchAll(/\[\[(article|page):([^|\]]+)(?:\|([^\]]+))?\]\]/g)) {
    const href = match[1] === 'article' ? '/wiki/' + match[2] : match[2];
    if (!pageLinks.some((link) => link.href === href && (!match[3] || link.label === match[3]))) {
      return 'approved body link missing: ' + href;
    }
  }
  const deleted = extras.get(doc.slug);
  if (deleted) {
    const target = '/wiki/' + deleted.match(/^\[\[article:([^|]+)/)[1];
    if (pageLinks.some((link) => link.href === target)) return 'extra editorial link still visible: ' + target;
    if (!text.includes(deleted.split('|')[1].slice(0, -2))) return 'delinked anchor prose missing';
  }
  return null;
}
async function request(url, allowRedirect = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { signal: controller.signal, redirect: allowRedirect ? 'manual' : 'follow',
      cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  } finally {
    clearTimeout(timer);
  }
}
async function scan(base) {
  const errors = [];
  for (let i = 0; i < docs.length; i += 4) {
    const subset = docs.slice(i, i + 4);
    const results = await Promise.allSettled(subset.map(async (doc) => {
      const response = await request(base + '/wiki/' + doc.slug);
      if (response.status !== 200) throw Error('HTTP ' + response.status);
      return response.text();
    }));
    results.forEach((result, n) => {
      const issue = result.status === 'fulfilled' ? verifyArticle(subset[n], result.value) : String(result.reason);
      if (issue) errors.push(subset[n].page_id + ': ' + issue);
    });
  }
  try {
    const response = await request(base + '/sitemap.xml');
    if (response.status !== 200) throw Error('sitemap HTTP ' + response.status);
    const xml = await response.text();
    const slugs = [...xml.matchAll(/<loc>https?:\/\/[^<]+\/wiki\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
    if (slugs.length !== 287 || new Set(slugs).size !== 287) errors.push('canonical sitemap count expected 287, got ' + slugs.length);
    for (const old of ['pluto-in-twelve-houses', 'bts-members-birth-chart']) {
      if (slugs.includes(old)) errors.push('old redirected path in sitemap: ' + old);
      const redirect = await request(base + '/wiki/' + old, true);
      if (redirect.status !== 301) errors.push('historical 301 redirect missing: ' + old + ' status=' + redirect.status);
    }
  } catch (error) { errors.push('sitemap/redirect verification: ' + String(error)); }
  return errors;
}

for (const base of ['http://127.0.0.1:3000', 'https://halleus.ir']) {
  let errors = [];
  for (let attempt = 1; attempt <= 20; attempt++) {
    errors = await scan(base);
    if (!errors.length) break;
    console.log('R3_CLOSEOUT_LIVE_PENDING base=' + base + ' attempt=' + attempt + ' issues=' + errors.length +
      ' sample=' + errors.slice(0, 3).join(' | '));
    if (attempt < 20) await new Promise((done) => setTimeout(done, 20000));
  }
  if (errors.length) throw Error('R3_CLOSEOUT_LIVE_FAILURE base=' + base + ' ' + errors.join('; '));
  console.log('PASS | R3_CLOSEOUT_LIVE base=' + base + ' articles=74 sitemap=287 redirects=2');
}
console.log('HALLEUS_R3_FINAL_CLOSEOUT_LIVE_PARITY_OK');

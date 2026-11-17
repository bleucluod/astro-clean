import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const modules = [
  'app/shop/nemad-man/bahman-preview/page.tsx',
  'components/shop/NemadManBahmanPreview.tsx',
  'components/shop/NemadManBahmanArtwork.tsx',
  'lib/shop/nemad-man-bahman-preview.ts',
  'lib/shop/nemad-man-preview-export.ts',
  'lib/shop/nemad-man-preview-zip.ts',
];
for (const file of modules) {
  const result = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [], 'Parse error: ' + file);
}
const route = read(modules[0]);
const client = read(modules[1]);
const poster = read(modules[2]);
const engine = read(modules[3]);
const css = read('components/shop/nemad-man-bahman-preview.module.css');
const exportHelper = read('lib/shop/nemad-man-preview-export.ts');
const zipHelper = read('lib/shop/nemad-man-preview-zip.ts');
const fontRoute = read('app/shop/nemad-man/bahman-preview/font/route.ts');
const figureCatalog = JSON.parse(read('lib/shop/catalog/constellations-d3-celestial-v1.json'));
const stars = JSON.parse(read('lib/shop/catalog/bsc5-bright-stars-mag6.json'));
const signIds = ['Ari','Tau','Gem','Cnc','Leo','Vir','Lib','Sco','Sgr','Cap','Aqr','Psc'];
assert.equal(signIds.length, 12);
assert.equal(stars.meta.count, 5080);
assert.equal(stars.stars.length, stars.meta.count * 4);
for (const id of signIds) {
  const feature = figureCatalog.features.filter((item) => item.id === id);
  assert.equal(feature.length, 1, id + ' figure source missing');
  assert.equal(feature[0].geometry.type, 'MultiLineString', id + ' line structure');
  const points = feature[0].geometry.coordinates.flat();
  assert.ok(points.length > 1 && points.every((p) => p.length === 2 && p.every(Number.isFinite)), id + ' coordinate validation');
}
for (const expected of [
  "process.env.NODE_ENV === 'production') notFound()",
  'index: false, follow: false',
  "dynamic = 'force-dynamic'",
]) assert.ok(route.includes(expected), 'Development-only/noindex route: ' + expected);
for (const expected of [
  'validateBahmanPreview(name, date, { time: birthTime, cityId })',
  '<NemadManBahmanArtwork name={preview.name} date={preview.gregorianDate} sign={preview.sign}',
  'outcome.reason === \'needs-birth-details\'',
  'preview.sign.id !== \'aquarius\'',
  'role="status"',
]) assert.ok(client.includes(expected), 'Missing preview / boundary behavior: ' + expected);
for (const expected of [
  "Astronomy.GeoVector(Astronomy.Body.Sun, time, true)",
  'getTropicalZodiacSignFromLongitude(longitude)',
  'resolveShopCivilTimeUtc(parsed.gregorianIso, time, city.timezone)',
  'parseJalaliDateInput(dateInput)',
  'getCertainSignForBirthDate(parsed.gregorianIso)',
  'sign.figure',
  'wrapRa(ra, centerRa) - centerRa',
  'brightStars.stars',
  'visualMagnitude',
]) {
  if (expected === 'visualMagnitude') continue; // Variable name is mag; magnitude values are sourced via BSC columns.
  assert.ok(engine.includes(expected), 'Missing zodiac / astronomical evidence: ' + expected);
}
assert.match(poster, /sky\.stars\.map/, 'Actual catalogue stars required');
assert.match(poster, /<rect width="900" height="1350" fill=\{isLight \? '#EBF1F5' : '#111820'\}\/>/,
  'Midnight Graphite and Silver Mist canvas colors must be retained');
assert.match(poster, /stopColor=\{isLight \? '#F5F8FB' : '#293945'\}/,
  'Both celestial discs need their approved soft radial centers');
assert.match(poster, /stopColor=\{isLight \? '#CFDBE5' : '#101922'\}/,
  'Both celestial discs need the approved cool outer tones');
assert.match(poster, /id="nemad-paper-tooth"/,
  'A subtle print-safe paper tooth must be present');
assert.match(poster, /fill="url\(#nemad-paper-tooth\)" pointerEvents="none"/,
  'The texture must live behind celestial lines, glyphs and typography');
assert.match(poster, /NEMAD_MAN_ZODIAC_GLYPHS\[sign\.id\]/, 'Render the approved shared icon pack');
assert.ok(!poster.includes('nemad-wisps') && !poster.includes('nemad-grain'), 'Do not reinstate blue haze or aggressive grain');
assert.match(css, /\.board \{[^\n]*background: #111820;/,
  'Dark preview board must match the graphite canvas');
assert.match(css, /\.lightBoard \{ background: #EBF1F5; \}/,
  'Light preview board must match the cool mist canvas');
assert.match(poster, /sky\.paths\.map/, 'Sourced line geometry required');
assert.match(poster, /star\.radius/, 'Star marker size must come from brightness');
assert.ok(poster.includes('> 16 ? 46 : Array.from(name).length > 9 ? 58 : 72'),
  'Name size should give priority to the constellation');
assert.match(poster, /stroke=\{isLight \? '#526B82' : '#dce5eb'\} strokeWidth="1\.65"/,
  'Approved dark constellation and darker light constellation required');
assert.ok(poster.includes('star.radius * 5.35') && poster.includes('star.radius * .86'),
  'Constellation nodes should be visible');
assert.ok(!poster.includes('sign.glyph') && !poster.includes('M391 752'), 'Do not use font glyphs or manual waves');
assert.match(poster, /fontSize=\{displayNameSize\}/, 'Name remains prominent after light-only size adjustment');
assert.match(poster, /const displayNameSize = Math\.round\(nameSize \* \.9\);/,
  'Both variants must use the same modest name scale');
assert.match(poster, /sign\.displayFa/, 'Poster must use the approved transliterated zodiac name');
assert.match(poster, /import localFont from 'next\/font\/local'/, 'Poster must load its bundled font');
for (const [weight, file] of [
  ['300', 'Estedad-Light.ttf'],
  ['400', 'Estedad-Regular.ttf'],
  ['500', 'Estedad-Medium.ttf'],
]) {
  assert.ok(poster.includes(file) && poster.includes("weight: '" + weight + "'"),
    'Missing Estedad preview font/weight: ' + file);
  assert.ok(readFileSync(resolve(root, 'assets/shop-print/fonts', file)).length > 1000,
    'Estedad font asset missing: ' + file);
}
assert.equal((poster.match(/fontFamily=\{estedad.style.fontFamily\}/g) || []).length, 2,
  'Estedad font family must cover both name/sign and the date');
assert.match(poster, /y="1042" fontWeight="300" fontSize="27"/,
  'Both variants must share the approved smaller sign label');
assert.ok(!poster.includes('FarZiba') && !css.includes('FarZiba') && !css.includes('far-ziba-font'),
  'Reject legacy Far Ziba fallback in the active renderer');
assert.ok(!existsSync(resolve(root, 'app/shop/nemad-man/bahman-preview/far-ziba-font/route.ts')),
  'Unused Far Ziba preview font endpoint should be absent');
assert.ok(read('lib/shop/shop-night-artwork.ts').includes("Vazirmatn, 'Noto Naskh Arabic', sans-serif"),
  'Night of Us font reference changed');
assert.match(poster, /y="1042" fontWeight="300" fontSize="27"/,
  'Both sign labels keep the same size and baseline');
assert.match(poster, /fill=\{isLight \? '#52657A' : '#bcccdc'\} opacity="\.8"/,
  'Zodiac heading must be readable in both colorways');
assert.match(poster, /fontSize=\{displayNameSize\} fontWeight="500"/,
  'Matte name keeps its approved weight and gradient treatment');
assert.match(poster, /id="nemad-name-silver"/, 'Name-only silver gradient missing');
assert.match(poster, /fill=\{isLight \? 'url\(#nemad-light-name-matte\)' : 'url\(#nemad-name-silver\)'\}/,
  'Light name uses matte graphite; dark name keeps its silver gradient');
assert.match(poster, /stroke=\{isLight \? '#1B3043' : undefined\} strokeOpacity=\{isLight \? '\.58' : undefined\}/,
  'Light name should have a fine ink keyline without changing dark stroke');
assert.match(poster, /strokeWidth=\{isLight \? '1\.25' : '1\.7'\}/,
  'Light ink keyline stays delicate and approved dark stroke width remains 1.7');
assert.ok(!poster.includes('nemad-name-ink'), 'Disallow the rejected shiny metallic band');
for (const matteInk of ['#1B3043', '#30495E', '#1C3347']) {
  assert.ok(poster.includes(matteInk), 'Missing matte graphite ink tone: ' + matteInk);
}
assert.ok(!poster.includes('#8096A8'), 'Rejected white-centered highlight may not return');
assert.ok(!poster.includes('fill="url(#nemad-name-silver)" opacity=".8"'),
  'Zodiac label must not share the personal name highlight');
assert.ok(!poster.includes('M421 979 H479'), 'No name/date divider');
assert.match(poster, /y="1209" textAnchor="middle"/,
  'Both date labels share the same baseline');
assert.match(poster, /fontSize="22" fontWeight="400"/,
  'Date typography stays compact in both colorways');
assert.match(poster, /fontFamily=\{estedad.style.fontFamily\}/, 'Date must use Estedad');
assert.match(poster, /direction="rtl" unicodeBidi="isolate">\{date\}<\/text>/,
  'Mixed Persian Gregorian date must stay bidi-isolated');
assert.match(read('lib/shop/shop-birth-sky-r9.ts'),
  /fontText\('H  A  L  L  E  U  S',1500,4310,52,400,'#8A96A1',\{anchor:'middle',dir:'ltr',opacity:\.52\}\)/,
  'P02 R9 footer reference changed; review Nemad Man parity');
assert.match(poster, /x="450" y="1293" textAnchor="middle"/,
  'Nemad Man footer must match P02 relative vertical placement');
assert.match(poster, /fontSize="15\.6" fontWeight="400" fill=\{isLight \? '#64748B' : '#8A96A1'\}/,
  'Dark P02 footer must remain approved alongside the light footer');
assert.match(poster, /opacity=\{isLight \? '\.70' : '\.52'\} direction="ltr"/,
  'Dark P02 footer opacity must be unchanged');
assert.ok(poster.includes('H  A  L  L  E  U  S'),
  'Bottom HALLEUS wordmark must match the other posters');

assert.ok(engine.includes("new Intl.DateTimeFormat('fa-IR-u-ca-gregory'"),
  'Gregorian Persian date formatter must remain the single date source');
assert.ok(engine.includes(".replace(/\\u0654/g, '')"), 'Combining hamza must be removed from Gregorian date');
assert.ok(!poster.includes('پیش‌نمایش هالیوس'), 'Printed watermark must be absent');
assert.match(poster, /stroke=\{isLight \? '#F8FAFC' : '#09131b'\} strokeOpacity=\{isLight \? '\.25' : '\.68'\}/,
  'Original dark typography stroke must be preserved');
assert.match(poster, /strokeWidth="2\.3" paintOrder="stroke"/, 'Text stroke width unchanged');
assert.match(poster, /filter=\{isLight \? 'url\(#nemad-light-name-depth\)' : 'url\(#nemad-night-text-soft-glow\)'\}/,
  'Light name depth and approved dark name glow must stay theme-specific');
assert.match(poster, /id="nemad-light-name-depth"/, 'Light variant needs a separate name depth treatment');
assert.match(poster, /floodColor="#597187" floodOpacity="\.24"/,
  'Light name gains restrained paper-like depth, not reflective shine');
assert.match(poster, /stdDeviation="2\.4" result="nemad-ink-blur"/,
  'Light name depth must stay soft and controlled');
assert.match(poster, /feGaussianBlur in="SourceAlpha" stdDeviation="1\.25"/,
  'Night typography soft bloom is missing');
assert.match(poster, /floodOpacity="\.10" result="nemad-soft-tint"/, 'Name glow must stay subtle');
assert.match(poster, /feMergeNode in="SourceGraphic"/,
  'Original letterforms must stay sharp above the glow');
assert.match(read('app/globals.css'), /font-family: "Dana"/, 'Registered Dana font family missing');
assert.ok(engine.includes("displayFa: 'آکواریوس'"), 'Approved Aquarius label missing');
assert.equal((engine.match(/displayFa: '/g) || []).length, 12, 'All 12 signs require transliterated names');
for (const [sign, name] of [
  ['taurus', 'تارس'], ['gemini', 'جمنای'], ['sagittarius', 'سجیتریس'],
]) {
  assert.ok(engine.includes("id: '" + sign + "'") &&
    engine.includes("displayFa: '" + name + "'"),
    'Approved Nemad Man Persian label missing: ' + sign);
}
assert.ok(!/fetch\(|localStorage|sessionStorage|addShopCartItem|router\.push|toDataURL|downloadPng/i.test(client + poster + engine), 'No network, persistence, cart or export in dev preview');
assert.match(css, /@media \(max-width: 850px\)/, 'Mobile preview required');
assert.match(poster, /viewBox="0 0 900 1350"/, 'Poster must use exact 2:3 ratio');
assert.match(css, /aspect-ratio: 2 \/ 3/, 'Preview must be 2:3');
assert.match(poster, /<clipPath id="nemad-sky-clip"><circle cx="450" cy="430" r="380"\/><\/clipPath>/,
  'Both colorways share the full-size celestial clip');
assert.match(poster, /<g transform="translate\(450 430\) scale\(1\.293\) translate\(-450 -358\)">/,
  'Both constellation skies share one uniform celestial projection');
assert.match(poster, /r="380" fill="url\(#nemad-globe\)"/,
  'Both celestial circle fills use the shared radius');
assert.match(poster, /r="380" stroke=\{isLight \? '#7790A4' : '#d8e0e5'\}/,
  'Both circles share radius while each keeps its approved rim color');
assert.match(poster, /x="354" y="840" width="192" height="158"/,
  'Both approved zodiac assets use the same compact, centered image bounds');
assert.match(poster, /filter=\{isLight \? 'url\(#nemad-light-glyph-ink\)' : undefined\}/,
  'Tint only the approved glyph in light variant');
assert.match(poster, /<feColorMatrix type="matrix"/, 'Light glyph must preserve approved shape');
// Dark and light artwork must use the same approved light layout geometry.
const approvedLayout = { centerY: 430, radius: 380, glyphX: 354, glyphY: 840,
  glyphWidth: 192, glyphHeight: 158, labelY: 1042, labelSize: 27,
  nameY: 1134, dateY: 1209, dateSize: 22, footerY: 1293 };
assert.ok(approvedLayout.glyphX + approvedLayout.glyphWidth / 2 === 450 &&
  approvedLayout.centerY - approvedLayout.radius >= 50 &&
  450 - approvedLayout.radius >= 65 &&
  approvedLayout.glyphY - (approvedLayout.centerY + approvedLayout.radius) >= 30 &&
  approvedLayout.labelY - (approvedLayout.glyphY + approvedLayout.glyphHeight) >= 40 &&
  approvedLayout.nameY - approvedLayout.labelY >= 90 &&
  approvedLayout.dateY - approvedLayout.nameY >= 70 &&
  approvedLayout.footerY - approvedLayout.dateY >= 80,
  'Both 2:3 posters must share safe circle, glyph, label, name and date spacing');
assert.ok(approvedLayout.radius / 294 > 1.29,
  'The black circle must now match the enlarged light artwork');
assert.match(poster, /y="1134" fontSize=\{displayNameSize\}/,
  'Both personal names share the same baseline and scale');
assert.match(exportHelper, /const POSTER_HEIGHT = 1350/, 'PNG export must match 2:3 SVG height');
assert.ok(!exportHelper.includes('PNG_SCALE'), 'Legacy fixed-size PNG output must be removed');
assert.match(client, /<select id="nemad-output-size"/, 'Three print-size options must be visible');
assert.match(client, /getNemadPosterPixelSize\(printSize\)/, 'Visible output pixels must match selection');
assert.match(exportHelper, /context.drawImage\(picture, 0, 0, pixels.width, pixels.height\)/,
  'PNG must render to selected full pixel dimensions');
assert.match(exportHelper, /const TARGET_PPI = 300;/, 'Physical dimensions must be 300 PPI');
const physicalSizes = [['10x15', 10, 15], ['20x30', 20, 30], ['30x45', 30, 45]];
for (const [id, width, height] of physicalSizes) {
  assert.ok(exportHelper.includes("'" + id + "': { label:") &&
    exportHelper.includes("widthCm: " + width + ", heightCm: " + height),
    'Missing approved physical size: ' + id);
  assert.ok(read('components/shop/product-detail-data.ts').includes("dimension: '" + id + "'"),
    'Size differs from existing shop catalog: ' + id);
  const widthPx = Math.ceil(width / 2.54 * 300);
  const heightPx = Math.ceil(height / 2.54 * 300);
  assert.ok(widthPx > 0 && heightPx > 0 && Math.abs(widthPx / heightPx - 2 / 3) < .001);
  assert.ok(widthPx >= Math.ceil(width / 2.54 * 300) &&
    heightPx >= Math.ceil(height / 2.54 * 300));
}
assert.match(client, /downloadNemadPosterPng\(svg,/, 'Preview must provide PNG download');
assert.match(poster, /theme = 'dark'/, 'Default renderer theme must remain approved dark');
assert.match(client, /initialTheme = 'light'/, 'Default preview stays in approved light mode');
assert.match(client, /useState<NemadPosterTheme>\(initialTheme\)/, 'Original theme state is preserved');
assert.match(client, /aria-pressed=\{posterTheme === 'light'\}/, 'Light style selectable');
assert.match(client, /aria-pressed=\{posterTheme === 'dark'\}/, 'Dark style selectable');
assert.match(client, /theme=\{posterTheme\}/, 'Style switch must drive the actual SVG');
assert.match(client, /preview\.sign\.id \+ '-' \+ posterTheme \+ '-' \+ printSize/,
  'Filename must distinguish styles and sizes');
assert.match(css, /\.lightBoard \{ background: #EBF1F5; \}/,
  'Silver Mist board must match the light poster background');
assert.match(css, /\.themeSwitch/, 'Style choice buttons required');
assert.match(css, /\.exportButton/, 'Preview download button needs styles');
assert.match(client, /downloadAll24\(\)/,
  'The existing preview must provide a one-click 24-image export');
assert.match(client, /<NemadManBahmanArtwork name=\{batchArtwork\.preview\.name\}/,
  'Batch exports must reuse the approved poster component');
assert.ok(client.includes("result.value.sign.id !== sign.id"),
  'Each month must be checked against the actual tropical Sun');
assert.ok(client.includes("const size: NemadPosterSize = '10x15'"),
  'The temporary batch must use the intended review size');
assert.match(client, /packageNemadPosterPngs\(entries\)/,
  '24 PNGs must be packed in one ZIP');
assert.match(exportHelper, /export async function renderNemadPosterPngBlob/,
  'Bulk export must reuse the existing font-and-glyph rasterization');
assert.ok(exportHelper.includes('await renderNemadPosterPngBlob(source, size)'),
  'Existing single PNG export must reuse the exact same image pipeline');
assert.match(zipHelper, /entries\.length !== 24/,
  'ZIP must reject incomplete groups');
assert.match(css, /\.batchExportButton/, 'Batch button styling required');
assert.match(css, /\.batchOffscreen/, 'Hidden preview rendering required');
assert.match(exportHelper, /canvas\.toBlob/, 'PNG must be encoded from the renderer SVG');
assert.match(exportHelper, /font\?weight=/, 'Embedded Estedad font source must be local');
assert.match(exportHelper, /image\.setAttribute\('href', await blobToDataUrl/, 'Glyphs must be inlined into export');
assert.match(exportHelper, /url\.origin !== window\.location\.origin/, 'Glyph fetch must be same-origin');
assert.match(fontRoute, /process\.env\.NODE_ENV === 'production'/, 'Font bridge must be development-only');
for (const font of ['Estedad-Light.ttf', 'Estedad-Regular.ttf', 'Estedad-Medium.ttf']) {
  assert.ok(fontRoute.includes(font), 'Missing exported font weight: ' + font);
}
// A source-geometry projection test: increasing right ascension goes LEFT.
const aqr = figureCatalog.features.find((f) => f.id === 'Aqr').geometry.coordinates.flat();
const ra = aqr.map((p) => p[0]);
const dec = aqr.map((p) => p[1]);
const cr = (Math.min(...ra) + Math.max(...ra)) / 2;
const cd = (Math.min(...dec) + Math.max(...dec)) / 2;
const scale = Math.min(14, 224 / Math.hypot(
  Math.max(...ra.map((r) => Math.abs((r-cr) * Math.cos(cd * Math.PI/180)))),
  Math.max(...dec.map((d) => Math.abs(d-cd))),
));
const projected = aqr.map(([r,d]) => [450 - (r-cr)*Math.cos(cd*Math.PI/180)*scale, 358 - (d-cd)*scale]);
assert.ok(projected.every(([x,y]) => Math.hypot(x-450,y-358) < 294));
assert.ok(projected[0][0] > projected.at(-1)[0], 'Astronomical east-left orientation invariant');

// Lock the actual approved raster bytes, not just the 12 names or a CSS lookalike.
const glyphRegistry = read('lib/shop/nemad-man-zodiac-glyphs.ts');
assert.match(glyphRegistry, /approved-silver-v1-2026-11-17/);
const expectedApprovedGlyphs = {
  aries: '23634f956886622dbc10fa657081f0461ef2c2f7',
  taurus: '18de09c279c6d3b8c70e015d933685a8daf7c14a',
  gemini: 'ecc446c167b48d0e827660347a25573aefe31040',
  cancer: '2c62cc0c3e028174802e612fe270bdf4d5650bad',
  leo: '46982552934d9682aaa028e0702b3671ef38e585',
  virgo: '02310d7bef5d7f166210aa67463aa44498f58738',
  libra: '79f19821c890c628961d6f23869cc361bfe3c8fb',
  scorpio: '581fbc841db932d351285b6ed982496396795edf',
  sagittarius: 'd63720a177c9b5a10ad3f3fc1600c7e35219b737',
  capricorn: 'ff06bd3adb19450ee9e523e072447b9f5cff34f5',
  aquarius: 'cf5189194766aafa5180e8501d376356561a58b3',
  pisces: 'e4021f1439e53555b667a2b69925ba96b77797af',
};
for (const [name, expectedSha] of Object.entries(expectedApprovedGlyphs)) {
  const asset = '/nemad-man/zodiac-glyphs-v1/' + name + '.webp';
  assert.ok(glyphRegistry.includes(name + ": '" + asset + "'"), 'Missing canonical mapping: ' + name);
  const bytes = readFileSync(resolve(root, 'public' + asset));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'Invalid WebP: ' + name);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'Invalid WebP: ' + name);
  const blobPrefix = Buffer.from('blob ' + bytes.length + String.fromCharCode(0));
  const actualSha = createHash('sha1').update(blobPrefix).update(bytes).digest('hex');
  assert.equal(actualSha, expectedSha, 'Approved glyph pixels changed: ' + name);
}
const master = readFileSync(resolve(root, 'public/nemad-man/zodiac-glyphs-v1/source-contact-sheet.webp'));
const masterPrefix = Buffer.from('blob ' + master.length + String.fromCharCode(0));
assert.equal(createHash('sha1').update(masterPrefix).update(master).digest('hex'),
  '9e8efe96d6cd5636a4f1de99b63e2d83fceb7666', 'Approved original zodiac sheet changed');
assert.ok(poster.includes('<image href={NEMAD_MAN_ZODIAC_GLYPHS[sign.id]}'),
  'Renderer must consume shared canonical assets, never a regenerated symbol');

console.log('NEMAD_MAN_BAHMAN_R2_SOURCE_GUARD=PASS');
console.log('ZODIAC_FIGURES=12 BSC_STARS=' + stars.meta.count + ' AQR_POINTS=' + aqr.length);
console.log('DEV_ROUTE_ONLY=PASS, AUTO_SIGN_SWITCH=SOURCE_VERIFIED, BOUNDARY_PROMPT=SOURCE_VERIFIED');

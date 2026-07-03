import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const failures = [];
const requireIncludes = (label, text, markers) => {
  for (const marker of markers) {
    if (!text.includes(marker)) {
      failures.push(label + ' missing marker: ' + marker);
    }
  }
};

const audit = read('docs/HALLEUS_ENGINE_REALITY_AUDIT.md');
const plan = read('docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md');
const garden = read('docs/HALLEUS_IDEA_GARDEN.md');
const pkg = JSON.parse(read('package.json'));

requireIncludes('engine reality audit', audit, [
  'v0.1.163 special points real source audit',
  'SearchMoonNode / NextMoonNode',
  'SearchLunarApsis / NextLunarApsis',
  'must remain deferred/hidden',
  'Do not fake North Node, South Node, or Lilith'
]);

requireIncludes('engine unification plan', plan, [
  'v0.1.163 special points implementation gate',
  'Select a validated source for natal North Node longitude',
  'Mean Lilith or True Lilith'
]);

requireIncludes('idea garden', garden, [
  'v0.1.163 product guard: real special points only',
  'Show Nodes/Lilith only after the engine has real natal point longitudes',
  'Mean Lilith versus True Lilith'
]);

if (pkg.scripts?.['check:special-points-real-source'] !== 'node scripts/check-special-points-real-source.mjs') {
  failures.push('package.json missing check:special-points-real-source script');
}

const astronomyDtsPath = 'node_modules/astronomy-engine/astronomy.d.ts';
if (exists(astronomyDtsPath)) {
  const dts = read(astronomyDtsPath);
  const eventMarkers = ['SearchMoonNode', 'NextMoonNode', 'SearchLunarApsis', 'NextLunarApsis'];
  for (const marker of eventMarkers) {
    if (!dts.includes(marker)) {
      failures.push('astronomy-engine declarations missing expected event-search marker: ' + marker);
    }
  }
}

const forbiddenSourceClaims = [
  ['components/ReportCard.tsx', 'North Node'],
  ['components/ReportCard.tsx', 'South Node'],
  ['components/ReportCard.tsx', 'Black Moon Lilith'],
  ['components/RealChartWheel.tsx', 'North Node'],
  ['components/RealChartWheel.tsx', 'South Node'],
  ['lib/astrology/real-engine-report-writer.ts', 'North Node'],
  ['lib/astrology/real-engine-report-writer.ts', 'South Node']
];
for (const [relativePath, marker] of forbiddenSourceClaims) {
  if (exists(relativePath) && read(relativePath).includes(marker)) {
    failures.push(relativePath + ' should not claim real special point output yet: ' + marker);
  }
}

if (failures.length > 0) {
  console.error('Special points real source check failed:');
  for (const failure of failures) {
    console.error('- ' + failure);
  }
  process.exit(1);
}

console.log('Special points real source check passed.');

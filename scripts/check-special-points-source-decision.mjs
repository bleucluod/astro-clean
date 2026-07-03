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
  'v0.1.164 special points source decision',
  'Keep `astronomy-engine` as the approved runtime astronomy dependency',
  'Do not add Swiss Ephemeris wrapper dependencies',
  'Nodes first, Lilith later',
  'Store South Node only as the exact opposition of a validated North Node longitude'
]);

requireIncludes('engine unification plan', plan, [
  'v0.1.164 special points source decision',
  'The next buildable implementation milestone should be a Node-only hidden source spike',
  'Decide Mean Lilith vs True Lilith before any Lilith implementation'
]);

requireIncludes('idea garden', garden, [
  'v0.1.164 product decision: special points source path',
  'Do not add a heavy ephemeris dependency just to make the report look complete',
  'the complete report can move forward with Nodes first and Lilith later'
]);

if (pkg.scripts?.['check:special-points-source-decision'] !== 'node scripts/check-special-points-source-decision.mjs') {
  failures.push('package.json missing check:special-points-source-decision script');
}

for (const depName of ['swisseph', 'sweph', 'astrologia']) {
  if (pkg.dependencies?.[depName] || pkg.devDependencies?.[depName]) {
    failures.push('unapproved special-points dependency present: ' + depName);
  }
}

const forbiddenClaims = [
  ['components/ReportCard.tsx', 'North Node'],
  ['components/ReportCard.tsx', 'South Node'],
  ['components/ReportCard.tsx', 'Black Moon Lilith'],
  ['components/RealChartWheel.tsx', 'North Node'],
  ['components/RealChartWheel.tsx', 'South Node'],
  ['lib/astrology/real-engine-report-writer.ts', 'North Node'],
  ['lib/astrology/real-engine-report-writer.ts', 'South Node']
];
for (const [relativePath, marker] of forbiddenClaims) {
  if (exists(relativePath) && read(relativePath).includes(marker)) {
    failures.push(relativePath + ' should not claim real special point output yet: ' + marker);
  }
}

if (failures.length > 0) {
  console.error('Special points source decision check failed:');
  for (const failure of failures) {
    console.error('- ' + failure);
  }
  process.exit(1);
}

console.log('Special points source decision check passed.');

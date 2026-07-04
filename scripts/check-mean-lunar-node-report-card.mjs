import fs from 'node:fs';

const reportCard = fs.readFileSync('components/ReportCard.tsx', 'utf8');

const requiredMarkers = [
  'type LunarNodeSummaryRow',
  'const lunarNodeRows = buildLunarNodeRows(report);',
  'report-lunar-node-section',
  'گره‌های ماه Mean Lunar Node',
  'Mean Lunar Node / محاسبه میانگین',
  'Opposition from Mean North Node / گره شمالی + ۱۸۰°',
  'function buildLunarNodeRows(report: AstrologyReport): LunarNodeSummaryRow[]',
  'function isCalculatedLunarNodes(',
  'lunarNodes.status === "calculated"',
  'lunarNodes.nodeType === "mean"',
  'True Node و لیلیت همچنان ادعا نمی‌شوند',
];

const forbiddenMarkers = [
  'True Lunar Node / محاسبه',
  'لیلیت محاسبه‌شده',
  'Black Moon Lilith محاسبه',
  'true-lunar-node',
];

const failures = [];

for (const marker of requiredMarkers) {
  if (!reportCard.includes(marker)) {
    failures.push(`ReportCard is missing required Mean Lunar Node UI marker: ${marker}`);
  }
}

for (const marker of forbiddenMarkers) {
  if (reportCard.includes(marker)) {
    failures.push(`ReportCard contains forbidden special-point claim: ${marker}`);
  }
}

if (!reportCard.includes('RealEngineReportCalculatedLunarNodes') || !reportCard.includes('RealEngineReportLunarNodes')) {
  failures.push('ReportCard must import explicit calculated/deferred lunar node types for structural narrowing.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Mean Lunar Node ReportCard check passed.');

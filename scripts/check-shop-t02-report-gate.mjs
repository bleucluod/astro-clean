import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const path = resolve(import.meta.dirname, '../components/ChartForm.tsx');
const source = readFileSync(path, 'utf8');
const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const chart = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'ChartForm');
const request = chart?.body?.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'requestRealEngineReportData',
);
assert.ok(request, 'The actual ChartForm request function must be tested.');

let response;
let injectedError;
const states = [];
const compiled = ts.transpileModule(request.getText(ast), {
  fileName: 'ChartForm-real-request.ts',
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const send = vm.runInNewContext(`${compiled}\nrequestRealEngineReportData`, {
  setRealEngineRequest: (value) => states.push(value),
  getHalleusCityDisplayName: () => 'تهران',
  fetch: async (_path, init) => {
    assert.equal(_path, '/api/engine/real-chart');
    assert.equal(init.method, 'POST');
    assert.equal(JSON.parse(init.body).birthCity, undefined);
    if (injectedError) throw injectedError;
    return response;
  },
});

const form = {
  name: 'نام نمونه', birthDate: '2001-03-20', birthTime: '12:00',
  birthTimeAccuracy: 'known',
};
const city = { timezone: 'Asia/Tehran', latitude: 35.7, longitude: 51.4 };
const calculated = {
  ok: true, report: { id: 'report-id' },
  realChart: { placements: [], ascendantLongitude: 10, utcIso: '2001-03-20T08:30:00.000Z' },
  fallback: { used: false }, reportGeneration: { status: 'real-chart-ready' },
};
const serve = (payload, ok = true) => {
  response = { ok, json: async () => payload };
};

serve(calculated);
assert.equal((await send(form, city)).report.id, 'report-id');
for (const [payload, ok] of [
  [{ ...calculated }, false],
  [{ ...calculated, ok: false }, true],
  [{ ...calculated, report: null }, true],
  [{ ...calculated, realChart: null }, true],
  [{ ...calculated, fallback: { used: true } }, true],
  [{ ...calculated, reportGeneration: { status: 'fallback-preview' } }, true],
  [null, true],
]) {
  serve(payload, ok);
  await assert.rejects(send(form, city));
  assert.equal(states.at(-1).status, 'error');
}
injectedError = new Error('network unavailable');
await assert.rejects(send(form, city), /network unavailable/);
injectedError = null;

const handler = chart.body.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'handleSubmit',
)?.getText(ast);
assert.ok(handler);
assert.match(handler, /const realEngineResult = await requestRealEngineReportData\(/);
assert.match(handler, /await saveGeneratedReportWithAccountFallback\(/);
assert.match(handler, /if \(!saveResult\.accountRecord\)/);
assert.match(handler, /onComparisonChartSaved\?\.\(saveResult\.accountRecord\.report\)/);
assert.ok(handler.indexOf('if (!saveResult.accountRecord)') < handler.indexOf('if (comparisonMode)'));
for (const forbidden of ['buildLocalFallbackReport', 'saveGeneratedReport(nextReport)', 'createMockReport', 'localRecord.report']) {
  assert.ok(!source.includes(forbidden), `Unexpected client-only natal flow: ${forbidden}`);
}
console.log('T02 chart gate: real server calculation required, network/fallback failure retained, both modes require canonical server receipt.');

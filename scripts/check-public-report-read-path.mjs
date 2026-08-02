import fs, { readFileSync } from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

Module._load = function loadWithDatabaseStub(request, parent, isMain) {
  if (request === "@/lib/database/report-database-driver") {
    return {
      getReportDatabaseDriver() {
        throw new Error("Database access is not expected in the pure guard.");
      },
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ];

  return candidates.find((option) => fs.existsSync(option)) ?? candidate;
}

Module._resolveFilename = function resolveHalleusAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  });

  module._compile(transpiled.outputText, filename);
};

const { createStoredReportPublication } = require(
  "../lib/storage/report-records.ts",
);
const { reportVisibilityForPublication } = require(
  "../lib/storage/database-report-repository.ts",
);
const { projectPublicReportRecord } = require(
  "../lib/storage/server-report-persistence.ts",
);

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const sampleReport = {
  id: "public-read-fixture",
  createdAt: "2026-08-02T00:00:00.000Z",
  input: {
    name: "نام خصوصی",
    birthDate: "2000-01-02",
    birthTime: "12:34",
    birthCity: "تهران",
    birthCountry: "ایران",
    currentResidenceCity: "تبریز",
    currentResidenceCountry: "ایران",
  },
  chart: {
    sunSign: {
      key: "capricorn",
      faName: "جدی",
      enName: "Capricorn",
      element: "زمین",
      quality: "کاردینال",
    },
    moonSign: {
      key: "aries",
      faName: "حمل",
      enName: "Aries",
      element: "آتش",
      quality: "کاردینال",
    },
    risingSign: {
      key: "libra",
      faName: "میزان",
      enName: "Libra",
      element: "هوا",
      quality: "کاردینال",
    },
  },
  summary:
    "نام خصوصی در تهران و در تاریخ 2000-01-02 ساعت 12:34 متولد شده است.",
  interpretations: [],
  safetyNote: "fixture",
  realEngine: {
    cityLabel: "تهران",
    utcIso: "2000-01-02T09:04:00.000Z",
  },
  engineData: {
    personalTransitReportData: {
      currentResidenceCity: "تبریز",
    },
  },
};

function publication(input) {
  return createStoredReportPublication(input);
}

assert(
  reportVisibilityForPublication(
    publication({ ownerKind: "guest", tier: "free" }),
  ) === "public",
  "guest free save must activate public visibility",
);
assert(
  reportVisibilityForPublication(
    publication({ ownerKind: "account", tier: "free" }),
  ) === "public",
  "logged-in free save must activate public visibility",
);
assert(
  reportVisibilityForPublication(
    publication({ ownerKind: "account", tier: "premium" }),
  ) === "private",
  "premium save must remain private by default",
);
assert(
  reportVisibilityForPublication(
    publication({
      ownerKind: "account",
      tier: "premium",
      publicationIntent: "publish",
      publicationConsentState: "granted",
    }),
  ) === "public",
  "premium report may become public only after explicit publication consent",
);
assert(
  reportVisibilityForPublication(
    publication({ ownerKind: "legacy", tier: "free", legacyRecord: true }),
  ) === "private",
  "legacy records must never auto-publish",
);
assert(
  reportVisibilityForPublication(
    publication({
      ownerKind: "account",
      tier: "free",
      publicationIntent: "unpublish",
    }),
  ) === "unpublished",
  "owner unpublish must map to unpublished visibility",
);

function recordFor(publicationInput, visibility = "public") {
  return {
    id: sampleReport.id,
    userId: "private-owner-id",
    report: structuredClone(sampleReport),
    input: structuredClone(sampleReport.input),
    createdAt: sampleReport.createdAt,
    updatedAt: sampleReport.createdAt,
    favorite: true,
    note: "یادداشت خصوصی",
    visibility,
    source: "account",
    publication: publication(publicationInput),
  };
}

const hiddenProjection = projectPublicReportRecord(
  recordFor({
    ownerKind: "guest",
    tier: "free",
    identityConsentState: "withheld",
  }),
);
const hiddenJson = JSON.stringify(hiddenProjection);
assert(hiddenProjection !== null, "eligible guest free record must be readable");
for (const token of [
  "private-owner-id",
  "یادداشت خصوصی",
  "نام خصوصی",
  "2000-01-02",
  "12:34",
  "تهران",
  "تبریز",
]) {
  assert(
    !hiddenJson.includes(token),
    `withheld public projection must not expose ${token}`,
  );
}
assert(
  hiddenProjection?.favorite === false && hiddenProjection?.userId === undefined,
  "public projection must remove owner metadata",
);
assert(
  hiddenProjection?.report.realEngine?.cityLabel === "پنهان در نمایش عمومی" &&
    hiddenProjection?.report.realEngine?.utcIso === "پنهان در نمایش عمومی",
  "public projection must minimize engine location and timestamp details",
);
assert(
  hiddenProjection?.report.engineData?.personalTransitReportData === null,
  "public projection must remove residence-based personal transit data",
);

const namedProjection = projectPublicReportRecord(
  recordFor({
    ownerKind: "account",
    tier: "free",
    identityConsentState: "granted",
  }),
);
const namedJson = JSON.stringify(namedProjection);
assert(
  namedProjection?.report.input.name === "نام خصوصی",
  "identity consent may preserve the approved display name",
);
for (const token of ["2000-01-02", "12:34", "تهران", "تبریز"] ) {
  assert(
    !namedJson.includes(token),
    `identity consent must not expose birth or residence detail ${token}`,
  );
}

for (const [label, record] of [
  [
    "private premium",
    recordFor({ ownerKind: "account", tier: "premium" }, "private"),
  ],
  [
    "legacy",
    recordFor(
      { ownerKind: "legacy", tier: "free", legacyRecord: true },
      "private",
    ),
  ],
  [
    "unpublished",
    recordFor(
      {
        ownerKind: "account",
        tier: "free",
        publicationIntent: "unpublish",
      },
      "unpublished",
    ),
  ],
]) {
  assert(
    projectPublicReportRecord(record) === null,
    `${label} record must not be publicly projected`,
  );
}

const accountRoute = readFileSync("app/api/reports/account/route.ts", "utf8");
const reportPage = readFileSync("app/reports/[reportId]/page.tsx", "utf8");
const chartForm = readFileSync("components/ChartForm.tsx", "utf8");
const reportDetail = readFileSync("components/ReportDetail.tsx", "utf8");

assert(
  accountRoute.includes("getPublicServerStoredReport") &&
    accountRoute.includes('if (reportId && !authorizationHeader)'),
  "unauthenticated report reads must use the public projection path",
);
assert(
  reportPage.includes('rawSource === "public"') &&
    reportPage.includes('return "public"'),
  "report detail page must resolve the public read source explicitly",
);
assert(
  chartForm.includes("?source=public") &&
    chartForm.includes("جزئیات تولد در نسخه عمومی پنهان است"),
  "guest save flow must open the public read source with privacy copy",
);
assert(
  !/if \(reportSource === "public"\)[\s\S]{0,1600}reportRepository\.getReport/u.test(
    reportDetail,
  ),
  "public source must never fall back to a private local report",
);

if (failures.length > 0) {
  throw new Error(
    `Public report read-path failures:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

console.log("Public report read-path check passed.");
console.log("- guest and logged-in free saves align visibility with publication policy");
console.log("- premium, legacy, and unpublished records remain non-public");
console.log("- unauthenticated public reads remove owner metadata and birth/residence details");
console.log("- identity consent preserves only the approved name, not birth details");

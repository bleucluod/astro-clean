import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(fullPath, "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

const helper = read("lib/admin/admin-origin.ts");
const auth = read("lib/admin/admin-auth.ts");
const uploadRoute = read("app/api/admin/wiki/imports/route.ts");
const packageJson = JSON.parse(read("package.json"));
const registry = JSON.parse(read("config/halleus-check-impact.json"));

requireText(
  "admin auth",
  auth,
  'import { isTrustedAdminRequestOrigin } from "@/lib/admin/admin-origin";',
);
requireText(
  "admin auth",
  auth,
  'import { getHalleusRuntimeEnv } from "@/lib/config/env";',
);
requireText("admin auth", auth, "getHalleusRuntimeEnv().siteUrl");
requireText(
  "admin auth",
  auth,
  '"Cross-origin admin mutation was rejected."',
);
requireText(
  "admin auth",
  auth,
  '"Cross-origin admin upload was rejected."',
);
requireText(
  "admin auth",
  auth,
  'contentType.includes("application/json")',
);
requireText(
  "admin auth",
  auth,
  'contentType.includes("multipart/form-data")',
);
forbidText(
  "admin auth",
  auth,
  'origin !== new URL(request.url).origin',
);
forbidText("admin origin helper", helper, "x-forwarded-host");
forbidText("admin origin helper", helper, "x-forwarded-proto");

requireText(
  "Wiki import route",
  uploadRoute,
  "assertAdminUploadRequest(request)",
);
requireText(
  "Wiki import route",
  uploadRoute,
  'requireAdminCapability(request, "wiki.import.write")',
);

if (
  packageJson.scripts?.["check:admin-origin-boundary"] !==
  "node scripts/check-admin-origin-boundary.mjs"
) {
  failures.push("package.json is missing check:admin-origin-boundary");
}

const adminArea = registry.areas?.find(
  (area) => area.id === "auth-admin-account",
);

if (
  !adminArea ||
  !adminArea.guards?.includes("check:admin-origin-boundary")
) {
  failures.push(
    "auth-admin-account does not require check:admin-origin-boundary",
  );
}

const transpiled = ts.transpileModule(helper, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled,
  "utf8",
).toString("base64")}`;

const originModule = await import(moduleUrl);
const checkOrigin = originModule.isTrustedAdminRequestOrigin;

if (typeof checkOrigin !== "function") {
  failures.push(
    "isTrustedAdminRequestOrigin was not exported as a function",
  );
} else {
  const canonical = "https://halleus.ir";

  const cases = [
    {
      label: "canonical production origin behind HTTP upstream",
      requestUrl: "http://127.0.0.1:3000/api/admin/wiki/imports",
      origin: "https://halleus.ir",
      expected: true,
    },
    {
      label: "canonical URL with a path still resolves to its origin",
      requestUrl: "http://127.0.0.1:3000/api/admin/wiki/imports",
      origin: "https://halleus.ir",
      canonical: "https://halleus.ir/configured/path",
      expected: true,
    },
    {
      label: "localhost development origin",
      requestUrl: "http://localhost:3000/api/admin/wiki/imports",
      origin: "http://localhost:3000",
      expected: true,
    },
    {
      label: "external attacker origin",
      requestUrl: "http://127.0.0.1:3000/api/admin/wiki/imports",
      origin: "https://evil.example",
      expected: false,
    },
    {
      label: "lookalike host",
      requestUrl: "http://127.0.0.1:3000/api/admin/wiki/imports",
      origin: "https://halleus.ir.evil.example",
      expected: false,
    },
    {
      label: "malformed origin",
      requestUrl: "https://halleus.ir/api/admin/wiki/imports",
      origin: "not-a-valid-origin",
      expected: false,
    },
    {
      label: "unsafe protocol",
      requestUrl: "https://halleus.ir/api/admin/wiki/imports",
      origin: "javascript:alert(1)",
      expected: false,
    },
    {
      label: "missing Origin",
      requestUrl: "https://halleus.ir/api/admin/wiki/imports",
      origin: null,
      expected: true,
    },
  ];

  for (const testCase of cases) {
    const headers = testCase.origin
      ? { origin: testCase.origin }
      : undefined;
    const request = new Request(testCase.requestUrl, { headers });
    const actual = checkOrigin(
      request,
      testCase.canonical ?? canonical,
    );

    if (actual !== testCase.expected) {
      failures.push(
        `${testCase.label}: expected ${testCase.expected}, received ${actual}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Admin origin boundary check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Admin origin boundary check passed.");
console.log(
  "- canonical production Origin is accepted behind the internal upstream",
);
console.log("- localhost remains available for development");
console.log("- malformed, unsafe, lookalike, and external origins are blocked");
console.log("- JSON mutations and multipart uploads share one boundary");

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const failures = [];
const modulePath = "lib/astrology/report-behavioral-interpretation.ts";
const writerPath = "lib/astrology/real-engine-report-writer.ts";
const componentPath = "components/ReportPlanetPlacementSections.tsx";
const packagePath = "package.json";
const reportTypesPath = "types/report-generation.ts";

const moduleSource = readFileSync(modulePath, "utf8");
const writerSource = readFileSync(writerPath, "utf8");
const componentSource = readFileSync(componentPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const reportTypesBefore = readFileSync(reportTypesPath, "utf8");

const compileDirectory = mkdtempSync(
  join(tmpdir(), "halleus-behavioral-placement-"),
);

try {
  const transpiled = ts.transpileModule(moduleSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
    },
    fileName: modulePath,
    reportDiagnostics: true,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length > 0) {
    failures.push(
      "Behavioral interpretation module did not transpile: " +
        errors
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              " ",
            ),
          )
          .join(" | "),
    );
  } else {
    const compiledPath = join(
      compileDirectory,
      "report-behavioral-interpretation.mjs",
    );
    writeFileSync(compiledPath, transpiled.outputText, "utf8");
    const behavioral = await import(
      pathToFileURL(compiledPath).href + `?v=${Date.now()}`
    );
    const build =
      behavioral.buildPlacementBehavioralInterpretation;

    if (typeof build !== "function") {
      failures.push(
        "Shared placement behavioral builder is not exported.",
      );
    } else {
      const samples = {
        moonTaurus8: build({
          planetId: "moon",
          signId: "taurus",
          houseNumber: 8,
        }),
        moonTaurus2: build({
          planetId: "moon",
          signId: "taurus",
          houseNumber: 2,
        }),
        marsLibra1: build({
          planetId: "mars",
          signId: "libra",
          houseNumber: 1,
          retrograde: true,
        }),
        moonAquarius8: build({
          planetId: "moon",
          signId: "aquarius",
          houseNumber: 8,
        }),
        venusScorpio4: build({
          planetId: "venus",
          signId: "scorpio",
          houseNumber: 4,
        }),
        marsAquarius8: build({
          planetId: "mars",
          signId: "aquarius",
          houseNumber: 8,
        }),
        sunCancer11: build({
          planetId: "sun",
          signId: "cancer",
          houseNumber: 11,
        }),
        moonPisces8: build({
          planetId: "moon",
          signId: "pisces",
          houseNumber: 8,
        }),
      };

      const textOf = (sample) =>
        Object.values(sample).join(" ");

      const requireConcepts = (label, sample, concepts) => {
        const text = textOf(sample);

        for (const alternatives of concepts) {
          if (
            !alternatives.some((concept) =>
              text.includes(concept),
            )
          ) {
            failures.push(
              `${label} is missing behavioral concept: ` +
                alternatives.join(" / "),
            );
          }
        }
      };

      if (
        JSON.stringify(samples.moonTaurus8) ===
        JSON.stringify(samples.moonTaurus2)
      ) {
        failures.push(
          "Moon Taurus must change meaning when its house changes.",
        );
      }

      requireConcepts("Moon Taurus H8", samples.moonTaurus8, [
        ["زمان", "تکرار"],
        ["رفتار ثابت", "رفتار کوچک"],
        ["بدن"],
        ["اعتماد"],
      ]);

      requireConcepts("Mars Libra H1", samples.marsLibra1, [
        ["واکنش طرف مقابل", "واکنش دیگری"],
        ["دلخوری"],
        ["درخواست"],
        ["پس‌رو", "درونی", "بازبینی"],
      ]);

      requireConcepts(
        "Moon Aquarius H8",
        samples.moonAquarius8,
        [
          ["فاصله ذهنی", "فاصله"],
          ["حمایت"],
          ["مکث"],
        ],
      );

      requireConcepts(
        "Venus Scorpio H4",
        samples.venusScorpio4,
        [
          ["وفاداری"],
          ["خانه", "خصوصی"],
          ["آزمودن پنهانی", "آزمون پنهانی"],
        ],
      );

      requireConcepts(
        "Mars Aquarius H8",
        samples.marsAquarius8,
        [
          ["قطع ارتباط", "تغییر ناگهانی"],
          ["احساس"],
          ["درخواست", "می‌خواهم"],
        ],
      );

      requireConcepts(
        "Sun Cancer H11",
        samples.sunCancer11,
        [
          ["جمع"],
          ["مراقبت"],
          ["نظر شخصی"],
        ],
      );

      requireConcepts(
        "Moon Pisces H8",
        samples.moonPisces8,
        [
          ["احساس خود"],
          ["احساس طرف مقابل", "دیگری"],
          ["واقعیت"],
        ],
      );

      const aquariusHouse5 = [
        "sun",
        "mercury",
        "venus",
        "jupiter",
        "uranus",
      ].map((planetId) =>
        build({
          planetId,
          signId: "aquarius",
          houseNumber: 5,
        }),
      );
      const aquariusMeanings = new Set(
        aquariusHouse5.map(
          (sample) =>
            sample.plainMeaning +
            sample.dailyLifeExample +
            sample.smallExperiment,
        ),
      );

      if (aquariusMeanings.size !== aquariusHouse5.length) {
        failures.push(
          "Aquarius house 5 planets must keep distinct behavioral roles.",
        );
      }

      for (const [label, sample] of Object.entries(samples)) {
        for (const field of [
          "plainMeaning",
          "dailyLifeExample",
          "healthyExpression",
          "possibleFriction",
          "smallExperiment",
        ]) {
          if (
            typeof sample[field] !== "string" ||
            sample[field].trim().length < 24
          ) {
            failures.push(
              `${label}.${field} is missing or too generic.`,
            );
          }
        }
      }
    }
  }
} finally {
  rmSync(compileDirectory, { recursive: true, force: true });
}

for (const marker of [
  'from "@/lib/astrology/report-behavioral-interpretation"',
  "buildPlacementBehavioralInterpretation",
  "isBehavioralPlacementInput",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`Writer missing shared-core marker: ${marker}`);
  }

  if (!componentSource.includes(marker)) {
    failures.push(
      `Placement component missing shared-core marker: ${marker}`,
    );
  }
}

for (const duplicateSource of [
  "const PLANET_COPY",
  "const SIGN_COPY",
  "type PlanetCopy",
  "type SignCopy",
]) {
  if (componentSource.includes(duplicateSource)) {
    failures.push(
      `Placement component still owns duplicate semantics: ${duplicateSource}`,
    );
  }
}

if (
  !componentSource.includes(
    'data-halleus-behavioral-placement-core="v0.1.314"',
  )
) {
  failures.push(
    "Placement component is missing the shared behavioral-core marker.",
  );
}

if (
  (componentSource.match(/تشخیص پزشکی نیست/gu) ?? []).length !== 1
) {
  failures.push(
    "The symbolic-anatomy disclaimer must appear once per placement section.",
  );
}

for (const marker of [
  "در زندگی روزمره",
  "ویژگی‌های روشن",
  "چالش‌ها",
  "علایق و کشش‌ها",
  "مثال ساده",
  "آزمایش کوچک",
  "آناتومی نمادین",
]) {
  if (!componentSource.includes(marker)) {
    failures.push(`Placement card missing field: ${marker}`);
  }
}

for (const genericPattern of [
  "موضوعِ {copy.theme}",
  "PLANET_COPY[placement.id]",
  "SIGN_COPY[placement.signId]",
]) {
  if (componentSource.includes(genericPattern)) {
    failures.push(
      `Generic placement-card composition remains: ${genericPattern}`,
    );
  }
}

if (
  !writerSource.includes(
    "const interpretation = buildPlacementInterpretation(",
  ) ||
  !writerSource.includes(
    "return `تمرین این جایگاه: ${interpretation.smallExperiment}.`;",
  )
) {
  failures.push(
    "Writer placement sections and growth language do not use the shared semantic result.",
  );
}

const expectedCommand =
  "node scripts/check-behavioral-placement-interpretation.mjs";

if (
  packageJson.scripts?.[
    "check:behavioral-placement-interpretation"
  ] !== expectedCommand
) {
  failures.push("Missing focused package script.");
}

for (const aggregate of ["check:project", "check:reports"]) {
  if (
    !(packageJson.scripts?.[aggregate] ?? "").includes(
      "pnpm run check:behavioral-placement-interpretation",
    )
  ) {
    failures.push(
      `${aggregate} does not include the focused behavioral guard.`,
    );
  }
}

if (
  reportTypesBefore !==
  readFileSync(reportTypesPath, "utf8")
) {
  failures.push(
    "Persisted report-generation types changed during the guard.",
  );
}

if (failures.length > 0) {
  console.error(
    "Behavioral placement interpretation check failed:",
  );

  for (const failure of failures) {
    console.error("- " + failure);
  }

  process.exit(1);
}

console.log(
  "Behavioral placement interpretation check passed.",
);
console.log(
  "- planet, sign, and house jointly shape placement meaning",
);
console.log(
  "- Arad, Haleh, and Ardalan placement fixtures are chart-specific",
);
console.log(
  "- Aquarius house 5 planets keep distinct roles",
);
console.log(
  "- writer and placement cards share one semantic core",
);
console.log(
  "- persisted report schema remains unchanged",
);

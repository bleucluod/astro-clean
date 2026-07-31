import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const registryPath = path.join(root, "config", "halleus-check-impact.json");

function assertStringArray(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array.`);
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${label} must contain only non-empty strings.`);
    }
  }
}

function validatePolicy(policy, label) {
  if (!policy || typeof policy !== "object") {
    throw new Error(`${label} must be an object.`);
  }

  assertStringArray(policy.guards, `${label}.guards`);

  if (typeof policy.lint !== "boolean" || typeof policy.build !== "boolean") {
    throw new Error(`${label} must declare boolean lint and build values.`);
  }

  if (policy.selfGuard !== undefined && typeof policy.selfGuard !== "boolean") {
    throw new Error(`${label}.selfGuard must be boolean when declared.`);
  }
}

export function loadImpactRegistry(filePath = registryPath) {
  const registry = JSON.parse(readFileSync(filePath, "utf8"));

  if (registry.schemaVersion !== 1) {
    throw new Error("Unsupported Halleus check impact registry schema version.");
  }

  if (!registry.baseline || typeof registry.baseline !== "object") {
    throw new Error("The registry must define a baseline policy.");
  }

  assertStringArray(registry.baseline.guards, "baseline.guards", {
    allowEmpty: false,
  });
  validatePolicy(registry.fallback, "fallback");

  if (!Array.isArray(registry.areas) || registry.areas.length === 0) {
    throw new Error("The registry must define at least one impact area.");
  }

  const areaIds = new Set();
  for (const area of registry.areas) {
    if (typeof area.id !== "string" || !/^[a-z0-9-]+$/.test(area.id)) {
      throw new Error("Every impact area must have a lowercase kebab-case id.");
    }
    if (areaIds.has(area.id)) {
      throw new Error(`Duplicate impact area id: ${area.id}`);
    }
    areaIds.add(area.id);
    assertStringArray(area.patterns, `${area.id}.patterns`, { allowEmpty: false });
    validatePolicy(area, area.id);
    if (area.exclusive !== undefined && typeof area.exclusive !== "boolean") {
      throw new Error(`${area.id}.exclusive must be boolean when declared.`);
    }
    if (area.selfGuard === true && area.exclusive !== true) {
      throw new Error(`${area.id}.selfGuard requires an exclusive impact area.`);
    }
  }

  return registry;
}

export function normalizeRepoPath(filePath) {
  return filePath.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}

export function globToRegExp(glob) {
  let expression = "^";

  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];

    if (character !== "*") {
      expression += escapeRegexCharacter(character);
      continue;
    }

    if (glob[index + 1] !== "*") {
      expression += "[^/]*";
      continue;
    }

    index += 1;
    if (glob[index + 1] === "/") {
      expression += "(?:.*/)?";
      index += 1;
    } else {
      expression += ".*";
    }
  }

  return new RegExp(`${expression}$`);
}

let cachedPackageScripts;

function loadPackageScripts() {
  if (!cachedPackageScripts) {
    const packageJson = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
    cachedPackageScripts = packageJson.scripts ?? {};
  }
  return cachedPackageScripts;
}

export function resolveSelfGuardScript(
  filePath,
  { required = true, packageScripts = loadPackageScripts() } = {},
) {
  const normalizedPath = normalizeRepoPath(filePath);
  const expectedCommand = `node ${normalizedPath}`;
  const matches = Object.entries(packageScripts)
    .filter(
      ([scriptName, command]) =>
        scriptName.startsWith("check:") &&
        typeof command === "string" &&
        command.trim() === expectedCommand,
    )
    .map(([scriptName]) => scriptName);

  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple package scripts invoke focused guard ${normalizedPath}: ${matches.join(", ")}`,
    );
  }
  if (required) {
    throw new Error(
      `Focused guard ${normalizedPath} must have one exact package script: ${expectedCommand}`,
    );
  }
  return null;
}

function matchesArea(filePath, area) {
  const patternMatches = area.patterns.some((pattern) =>
    globToRegExp(pattern).test(filePath),
  );
  if (!patternMatches) {
    return false;
  }
  if (area.selfGuard === true) {
    return resolveSelfGuardScript(filePath, { required: false }) !== null;
  }
  return true;
}

export function createCheckPlan(filePaths, registry = loadImpactRegistry()) {
  const files = [...new Set(filePaths.map(normalizeRepoPath).filter(Boolean))].sort();

  if (files.length === 0) {
    return { files: [], guards: [], lint: false, build: false };
  }

  const guards = new Set(registry.baseline.guards);
  let lint = false;
  let build = false;

  const plannedFiles = files.map((filePath) => {
    const matches = registry.areas.filter((area) => matchesArea(filePath, area));
    const exclusiveMatches = matches.filter((area) => area.exclusive === true);
    const effectiveMatches = exclusiveMatches.length > 0 ? exclusiveMatches : matches;
    const policies = effectiveMatches.length > 0 ? effectiveMatches : [registry.fallback];

    for (const policy of policies) {
      for (const guard of policy.guards) guards.add(guard);
      if (policy.selfGuard === true) {
        guards.add(resolveSelfGuardScript(filePath));
      }
      lint ||= policy.lint;
      build ||= policy.build;
    }

    const effectiveIds = new Set(effectiveMatches.map((area) => area.id));
    return {
      path: filePath,
      areas: effectiveMatches.map((area) => area.id),
      shadowedAreas: matches
        .filter((area) => !effectiveIds.has(area.id))
        .map((area) => area.id),
      exclusive: exclusiveMatches.length > 0,
      unknown: matches.length === 0,
    };
  });

  return {
    files: plannedFiles,
    guards: [...guards],
    lint,
    build,
  };
}

function readGitPaths(argumentsList) {
  const output = execFileSync("git", argumentsList, {
    cwd: root,
    encoding: "utf8",
  });
  return output.split("\0").filter(Boolean);
}

export function parsePlannerArguments(argumentsList) {
  const options = { base: undefined, head: undefined, json: false, help: false, files: [] };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--base" || argument === "--head") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a Git ref.`);
      }
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument.startsWith("--base=") || argument.startsWith("--head=")) {
      const [name, value] = argument.slice(2).split("=", 2);
      if (!value) throw new Error(`--${name} requires a Git ref.`);
      options[name] = value;
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.files.push(argument);
    }
  }

  if (options.files.length > 0 && (options.base || options.head)) {
    throw new Error("Pass either explicit files or a Git base/head range, not both.");
  }
  if (options.head && !options.base) {
    throw new Error("--head requires --base.");
  }

  return options;
}

export function resolveChangedFiles(options) {
  if (options.files.length > 0) {
    return { files: options.files, source: "explicit paths" };
  }

  if (options.base) {
    const head = options.head ?? "HEAD";
    return {
      files: readGitPaths(["diff", "--name-only", "--relative", "-z", `${options.base}...${head}`]),
      source: `${options.base}...${head}`,
    };
  }

  return {
    files: [
      ...readGitPaths(["diff", "--name-only", "--relative", "-z", "HEAD"]),
      ...readGitPaths(["ls-files", "--others", "--exclude-standard", "-z"]),
    ],
    source: "worktree vs HEAD",
  };
}

export function formatCheckPlan(plan, source) {
  const lines = [`Halleus check plan (${source})`];

  if (plan.files.length === 0) {
    lines.push("No changed files; nothing to verify.");
    return lines.join("\n");
  }

  lines.push("Files:");
  for (const file of plan.files) {
    const areas = file.unknown ? "unknown (fail-safe fallback)" : file.areas.join(", ");
    const narrowed =
      file.shadowedAreas?.length > 0
        ? `; exclusive match shadowed: ${file.shadowedAreas.join(", ")}`
        : "";
    lines.push(`- ${file.path}: ${areas}${narrowed}`);
  }

  lines.push("Guards:");
  for (const guard of plan.guards) lines.push(`- ${guard}`);
  lines.push(`Lint: ${plan.lint ? "required" : "not required"}`);
  lines.push(`Production build: ${plan.build ? "required" : "not required"}`);
  return lines.join("\n");
}

function printHelp() {
  console.log("Usage: pnpm run check:plan -- [--json] [--base <ref> --head <ref>] [file ...]");
  console.log("With no arguments, plans tracked and untracked worktree changes against HEAD.");
}

async function main() {
  const options = parsePlannerArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const changeSet = resolveChangedFiles(options);
  const plan = createCheckPlan(changeSet.files);
  if (options.json) {
    console.log(JSON.stringify({ source: changeSet.source, ...plan }, null, 2));
  } else {
    console.log(formatCheckPlan(plan, changeSet.source));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(`Unable to create Halleus check plan: ${error.message}`);
    process.exit(1);
  });
}

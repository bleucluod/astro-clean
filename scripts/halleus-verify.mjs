import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCheckPlan,
  formatCheckPlan,
  parsePlannerArguments,
  resolveChangedFiles,
} from "./halleus-check-plan.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");

export function getPnpmExecutable(platform = process.platform) {
  return platform === "win32" ? "pnpm.cmd" : "pnpm";
}

export function createPnpmInvocation(
  scriptName,
  platform = process.platform,
  environment = process.env,
) {
  const pnpmExecutable = getPnpmExecutable(platform);

  if (platform === "win32") {
    return {
      command: environment.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", `${pnpmExecutable} run ${scriptName}`],
    };
  }

  return {
    command: pnpmExecutable,
    args: ["run", scriptName],
  };
}

function runPackageScript(scriptName) {
  if (!/^[a-z0-9:_-]+$/.test(scriptName)) {
    throw new Error(`Unsafe package script name in check plan: ${scriptName}`);
  }

  console.log(`\n==> pnpm run ${scriptName}`);
  const invocation = createPnpmInvocation(scriptName);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm run ${scriptName} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function printHelp() {
  console.log("Usage: pnpm run verify -- [--base <ref> --head <ref>] [file ...]");
  console.log("Runs the shared plan's guards, then lint and production build when required.");
}

async function main() {
  const options = parsePlannerArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.json) {
    throw new Error("--json is available on check:plan; verify always executes the plan.");
  }

  const changeSet = resolveChangedFiles(options);
  const plan = createCheckPlan(changeSet.files);
  console.log(formatCheckPlan(plan, changeSet.source));

  for (const guard of plan.guards) runPackageScript(guard);
  if (plan.lint) runPackageScript("lint");
  if (plan.build) runPackageScript("build");

  console.log("\nHalleus verification passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(`Halleus verification failed: ${error.message}`);
    process.exit(1);
  });
}

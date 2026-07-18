import { spawnSync } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
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

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new Error("Duration must be a finite non-negative number.");
  }
  if (milliseconds < 1) return "<1 ms";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function runPackageScript(scriptName) {
  if (!/^[a-z0-9:_-]+$/.test(scriptName)) {
    throw new Error(`Unsafe package script name in check plan: ${scriptName}`);
  }

  console.log(`\n==> pnpm run ${scriptName}`);
  const invocation = createPnpmInvocation(scriptName);
  const startedAt = performance.now();
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  const elapsedMilliseconds = performance.now() - startedAt;

  if (result.error) {
    throw new Error(
      `pnpm run ${scriptName} could not start after ${formatDuration(elapsedMilliseconds)}: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `pnpm run ${scriptName} failed after ${formatDuration(elapsedMilliseconds)} with exit code ${result.status ?? "unknown"}.`,
    );
  }

  console.log(`<== PASS ${scriptName} (${formatDuration(elapsedMilliseconds)})`);
  return elapsedMilliseconds;
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

  const verificationStartedAt = performance.now();
  const timings = [];

  for (const guard of plan.guards) {
    timings.push({ scriptName: guard, milliseconds: runPackageScript(guard) });
  }
  if (plan.lint) {
    timings.push({ scriptName: "lint", milliseconds: runPackageScript("lint") });
  }
  if (plan.build) {
    timings.push({ scriptName: "build", milliseconds: runPackageScript("build") });
  }

  if (timings.length > 0) {
    console.log("\nVerification timing:");
    for (const timing of timings) {
      console.log(`- ${timing.scriptName}: ${formatDuration(timing.milliseconds)}`);
    }
  }

  console.log(`Total verification time: ${formatDuration(performance.now() - verificationStartedAt)}`);
  console.log("\nHalleus verification passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(`Halleus verification failed: ${error.message}`);
    process.exit(1);
  });
}

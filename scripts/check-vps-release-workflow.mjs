import { readFileSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function requireMarkers(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`${label} is missing marker: ${marker}`);
    }
  }
}

function forbidMarkers(label, source, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) {
      failures.push(`${label} contains forbidden marker: ${marker}`);
    }
  }
}

const releasePath = "ops/vps/halleus-release.sh";
const servicePath = "ops/vps/halleus.service";
const deploymentNotesPath = "DEPLOYMENT_NOTES.md";
const recoveryNotesPath = "RECOVERY_NOTES.md";
const contextPath = "docs/HALLEUS_PROJECT_CONTEXT.md";
const pnpmWorkspacePath = "pnpm-workspace.yaml";
const pnpmLockPath = "pnpm-lock.yaml";

const approvedDependencyBuilds = new Map([
  ["sharp", "0.34.5"],
  ["unrs-resolver", "1.12.2"],
]);

function parsePnpmAllowBuilds(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const sectionIndexes = lines
    .map((line, index) => (line === "allowBuilds:" ? index : -1))
    .filter((index) => index >= 0);

  if (sectionIndexes.length !== 1) {
    throw new Error(`Expected exactly one root allowBuilds section, found ${sectionIndexes.length}.`);
  }

  const entries = new Map();
  for (let index = sectionIndexes[0] + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0 || line.trimStart().startsWith("#")) continue;
    if (!line.startsWith("  ")) break;

    const match = /^  ([A-Za-z0-9@._/-]+): (true|false)$/.exec(line);
    if (!match) {
      throw new Error(`Unsupported allowBuilds entry: ${line}`);
    }

    const [, dependencyName, booleanValue] = match;
    if (entries.has(dependencyName)) {
      throw new Error(`Duplicate allowBuilds entry: ${dependencyName}`);
    }
    entries.set(dependencyName, booleanValue === "true");
  }

  return entries;
}

function validatePnpmDependencyBuildPolicy(workspaceSource, lockSource) {
  const policyFailures = [];
  let actualAllowBuilds;

  try {
    actualAllowBuilds = parsePnpmAllowBuilds(workspaceSource);
  } catch (error) {
    return [error.message];
  }

  const approvedNames = [...approvedDependencyBuilds.keys()].sort();
  const actualNames = [...actualAllowBuilds.keys()].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(approvedNames)) {
    policyFailures.push(
      `allowBuilds must contain only ${approvedNames.join(", ")}; found ${actualNames.join(", ") || "none"}.`,
    );
  }

  for (const [dependencyName, version] of approvedDependencyBuilds) {
    if (actualAllowBuilds.get(dependencyName) !== true) {
      policyFailures.push(`${dependencyName} must be explicitly approved with true.`);
    }

    const escapedName = dependencyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lockVersions = [
      ...new Set(
        [...lockSource.matchAll(new RegExp(`^  ${escapedName}@([^:]+):$`, "gm"))]
          .map((match) => match[1]),
      ),
    ];
    if (lockVersions.length !== 1 || lockVersions[0] !== version) {
      policyFailures.push(
        `${dependencyName} approval requires the reviewed lock version ${version}; found ${lockVersions.join(", ") || "none"}.`,
      );
    }
  }

  for (const forbiddenKey of ["*", "**"]) {
    if (actualAllowBuilds.has(forbiddenKey)) {
      policyFailures.push(`Wildcard dependency build approval is forbidden: ${forbiddenKey}.`);
    }
  }

  return policyFailures;
}

const releaseSource = read(releasePath);
const serviceSource = read(servicePath);
const deploymentNotes = read(deploymentNotesPath);
const recoveryNotes = read(recoveryNotesPath);
const projectContext = read(contextPath);
const pnpmWorkspace = read(pnpmWorkspacePath);
const pnpmLock = read(pnpmLockPath);
const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};

requireMarkers("release workflow", releaseSource, [
  "#!/usr/bin/env bash",
  "set -Eeuo pipefail",
  'LOCK_FILE="/run/lock/halleus-release.lock"',
  "flock -n 9",
  "deploy --commit <40-char-sha> --tag <tag>",
  'git -C "$SOURCE" fetch --tags --prune origin',
  'worktree add --detach "$release_dir" "$commit"',
  'install --frozen-lockfile --prod=false',
  'DEPLOY_RELEASE_DIR=""',
  "DEPLOY_ACTIVATED=0",
  "DEPLOY_WORKTREE_CREATED=0",
  'worktree remove --force "$DEPLOY_RELEASE_DIR"',
  "run check:encoding",
  "--no-pager diff --check",
  "Building release before activation",
  'atomic_link "$old_current" "$PREVIOUS"',
  'atomic_link "$release_dir" "$CURRENT"',
  "Activation smoke test failed. Restoring previous release",
  "HALLEUS_RELEASE_DEPLOY_OK",
  "HALLEUS_RELEASE_ROLLBACK_OK",
  "https://halleus.ir/api/engine/real-chart",
]);

forbidMarkers("release workflow", releaseSource, [
  "local activated=0",
  "local worktree_created=0",
  '[ "$activated" -eq 0 ]',
  '[ "$worktree_created" -eq 1 ]',
  "git commit",
  "git tag ",
  "git push",
  "git reset --hard",
  'rm -rf "$SOURCE"',
  "BatchMode=yes",
]);

requireMarkers("systemd template", serviceSource, [
  "WorkingDirectory=/srv/halleus/current",
  "EnvironmentFile=/etc/halleus/halleus.env",
  "ExecStart=/usr/local/bin/node /srv/halleus/current/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000",
  "Restart=on-failure",
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "UMask=0027",
]);

forbidMarkers("systemd template", serviceSource, [
  "WorkingDirectory=/srv/halleus/source",
  "/srv/halleus/source/node_modules/next",
]);

requireMarkers("deployment notes", deploymentNotes, [
  "VPS production architecture",
  "/srv/halleus/releases",
  "/srv/halleus/current",
  "/srv/halleus/previous",
  "Do not deploy with git pull plus an in-place build",
  "identify an exact 40-character commit and its exact tag",
  "The release script never commits, tags, pushes",
]);

requireMarkers("recovery notes", recoveryNotes, [
  "Passphrase-protected SSH runner failure",
  "BatchMode=yes",
  "authentication failed before the remote script started",
  "No SSH key was removed, overwritten, or rotated",
  "Windows/WSL Bash capability false positive",
  "Get-Command bash.exe",
  "execvpe(/bin/bash) failed",
  "Only explicit Git Bash paths are accepted",
]);

requireMarkers("project context", projectContext, [
  "### VPS release model",
  "/srv/halleus/releases/<tag>-<short-sha>",
  "/srv/halleus/current",
  "/srv/halleus/previous",
  "verifies the exact commit/tag",
  "A Git commit, GitHub push, active VPS release, database state, and public behavior are separate states",
]);

if (
  scripts["check:vps-release-workflow"] !==
  "node scripts/check-vps-release-workflow.mjs"
) {
  failures.push("Missing package script: check:vps-release-workflow");
}

const checkProject = scripts["check:project"] ?? "";
if (!checkProject.includes("pnpm run check:vps-release-workflow")) {
  failures.push("check:project does not include check:vps-release-workflow");
}

for (const policyFailure of validatePnpmDependencyBuildPolicy(pnpmWorkspace, pnpmLock)) {
  failures.push(`pnpm dependency build policy: ${policyFailure}`);
}

const policySelfTests = [
  {
    label: "rejects unreviewed dependency approvals",
    workspace: `${pnpmWorkspace.trimEnd()}\n  unexpected-package: true\n`,
    lock: pnpmLock,
  },
  {
    label: "rejects disabled required approvals",
    workspace: pnpmWorkspace.replace("  sharp: true", "  sharp: false"),
    lock: pnpmLock,
  },
  {
    label: "rejects unreviewed lock-version changes",
    workspace: pnpmWorkspace,
    lock: pnpmLock.replace("  sharp@0.34.5:", "  sharp@0.34.6:"),
  },
];

for (const selfTest of policySelfTests) {
  if (validatePnpmDependencyBuildPolicy(selfTest.workspace, selfTest.lock).length === 0) {
    failures.push(`pnpm dependency build policy self-test failed: ${selfTest.label}`);
  }
}

if (failures.length > 0) {
  console.error("VPS release workflow check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("VPS release workflow check passed.");
console.log("- exact commit/tag verification is required");
console.log("- build and focused checks happen before activation");
console.log("- current/previous activation is atomic and rollback-aware");
console.log("- systemd template runs only from /srv/halleus/current");
console.log("- authority markers follow the compact live project context");
console.log("- pnpm dependency builds are limited to reviewed sharp and unrs-resolver lock versions");
console.log("- no commit, tag, push, key rotation, or live VPS change is embedded");

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

const releaseSource = read(releasePath);
const serviceSource = read(servicePath);
const deploymentNotes = read(deploymentNotesPath);
const recoveryNotes = read(recoveryNotesPath);
const projectContext = read(contextPath);
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
  "Search Console and indexing remain blocked",
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
  "## v0.1.302 VPS release workflow foundation",
  "release builds must be created outside the active runtime directory",
  "The runner used BatchMode=yes with a passphrase-protected private key",
  "The first v0.1.302 apply runner treated the Windows/WSL bash.exe launcher as a usable Bash installation",
  "Only explicit Git Bash paths are accepted and probed before local bash -n",
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
console.log("- no commit, tag, push, key rotation, or live VPS change is embedded");

# Recovery Notes

Date: 2026-06-24
Project: Astro Clean

## What happened

During the engine/UI batches, several generated PowerShell scripts modified TSX and TypeScript files with unsafe text handling.

The production site showed broken Persian text in two forms:

- Mojibake, for example: Ø®ÙˆØ±Ø´ÛŒØ¯
- Literal unicode escapes, for example: \u0633\u0627\u062E\u062A

The unstable UI changes were rolled back from main. Then the stable Persian engine encoding fixes were reapplied.

## Current stable state

Production is stable again on halleus.ir.

Current stable recovery tag:

- v0.1.5-stable-recovery

The current safe scope includes:

- Public domain is live
- Chart form is usable again
- Local report generation works
- Engine text encoding is fixed again
- UI is back to a stable baseline

## Root causes

1. Large regex-based TSX patches were too risky.
2. PowerShell script encoding caused Persian text corruption.
3. Some unicode escapes were written as literal text instead of decoded strings.
4. Multiple batches were applied out of order during debugging.
5. Reverts also reverted useful UTF-8 fixes, so stable fixes had to be reapplied.

## Rules going forward

1. Do not use large regex patches on TSX files.
2. Do not use Set-Content -Encoding ascii for files containing Persian text.
3. Do not place literal \uXXXX strings directly inside JSX text.
4. Inspect files before every UI patch.
5. Keep each batch to one small goal.
6. Run pnpm lint and pnpm build before every commit.
7. Push only after local build is green.
8. Test production in Incognito after each deploy.
9. Prefer documentation or isolated engine files over UI changes when possible.
10. For UI changes, edit small blocks only and verify with file inspection.


## 2026-07-12 — Passphrase-protected SSH runner failure

During the first Nginx evidence-hardening attempt, the local runner used:

```text
BatchMode=yes
```

with the passphrase-protected replacement private key. The key was not preloaded into `ssh-agent`, so SSH could not display the local passphrase prompt. Authentication failed before the remote script started.

The failure message was:

```text
Permission denied (publickey)
```

That message alone did not prove that the public key had been removed from the VPS.

The local fingerprint was verified as:

```text
SHA256:tQvGhTARzzzYB/B3Wi0gYkuQwg3DV5bdgBH+4n5R4jM
```

A direct interactive connection with `IdentitiesOnly=yes` then succeeded. This proved that the private key, server-side authorized key, deploy user, and SSH permissions were intact.

Recorded root cause:

```text
The runner used BatchMode=yes with a passphrase-protected private key that was not preloaded into ssh-agent. SSH could not prompt for the key passphrase, so authentication failed before the remote script started.
```

Fix and prevention:

- do not use `BatchMode=yes` with this key unless it is deliberately preloaded into `ssh-agent`;
- preserve `IdentitiesOnly=yes`;
- use an interactive terminal for the key passphrase;
- use `ssh -tt` when interactive sudo is required;
- never save the passphrase or sudo password in files, logs, ZIPs, or environment variables;
- do not investigate or rotate server-side keys until a direct interactive test has failed;
- No SSH key was removed, overwritten, or rotated during this incident.


## 2026-07-12 — Windows/WSL Bash capability false positive

During the first local apply attempt for the VPS release workflow foundation, the runner used:

```text
Get-Command bash.exe
```

as its capability check. Windows returned the WSL `bash.exe` launcher, but no usable Linux distribution with `/bin/bash` was available. The optional syntax check then failed with:

```text
WSL ERROR: execvpe(/bin/bash) failed: No such file or directory
```

The batch stopped before its focused guard, encoding check, diff check, or production build. Its automatic rollback restored every project file changed by that attempt. No VPS connection, deploy, restart, reboot, commit, tag, or push occurred.

Recorded root cause:

```text
The local runner treated the Windows/WSL bash.exe launcher as a usable Bash installation. Command discovery succeeded, but the discovered launcher could not execute /bin/bash.
```

Fix and prevention:

- do not treat `Get-Command bash.exe` alone as proof that Bash is usable;
- Only explicit Git Bash paths are accepted:
  - `C:\Program Files\Git\bin\bash.exe`
  - `C:\Program Files\Git\usr\bin\bash.exe`
- probe the selected executable with `--version` before invoking `bash -n`;
- if approved Git Bash is unavailable, skip the optional local shell syntax check with an informational message;
- require `/bin/bash -n` again on the Ubuntu VPS before the later bootstrap changes any live file;
- stop and rollback on any real syntax failure;
- do not install or modify WSL merely to satisfy a local optional check.


## 2026-07-12 — Nginx reload readiness race during first v0.1.303 attempt

The first v0.1.303 cleanup attempt wrote the verified candidate, removed the package default-site symlink, passed `nginx -t`, and successfully requested an Nginx reload. It then tested the unknown HTTP hostname immediately after `systemctl reload nginx.service` and received HTTP 200 instead of the intended HTTP 421.

The remote EXIT trap restored the exact pre-cleanup state. Live diagnosis then confirmed:

- `/etc/nginx/sites-available/halleus` returned to SHA-256 `6c850bfb824237174acd5eb4f709c3b578fffb905f052ed2c9df77ebf033efff`;
- `/etc/nginx/sites-enabled/default` again pointed to `/etc/nginx/sites-available/default`;
- Nginx remained active with `NRestarts=0`;
- the release symlinks and Halleus service remained healthy;
- the apply reload and automatic rollback reload were both recorded at `2026-07-12 12:14:54 UTC`.

Root cause: the runner treated a successful Nginx reload request as if every old worker had already stopped accepting connections. Nginx reload is graceful, so a request issued immediately afterward can still be served by an old worker using the previous configuration.

Fix and prevention:

- preserve the same verified Nginx candidate and rollback scope;
- use bounded polling after reload for both HTTP and HTTPS unknown-host behavior;
- force a fresh connection on each probe with `Connection: close`;
- fail and restore only after the bounded readiness window expires;
- use the same bounded readiness verification after rollback;
- store the successful retry backup under `/var/backups/halleus/v0.1.303a`, leaving the failed-attempt backup evidence untouched.


## v0.1.303 Nginx and operations rollback anchor

The pre-cleanup Nginx and operations backup is stored at:

```text
/var/backups/halleus/v0.1.303a
```

Recovery facts:

- `nginx-halleus.before-v0.1.303` is the exact pre-cleanup Halleus site config;
- `default-site-link-target.txt` records whether the package default-site symlink was enabled and its exact target;
- `halleus.service` is a backup of the active versioned systemd unit;
- `release-status.txt` records `current` and `previous` at cleanup time;
- `env-metadata-redacted.txt` contains only file metadata and variable names, never values;
- `closure-audit.txt` records the verified post-cleanup state.

The release rollback path remains:

```text
sudo bash /srv/halleus/current/ops/vps/halleus-release.sh rollback
```

Do not replace the production environment file from chat output or backup metadata. Do not restore the Ubuntu package default site without also restoring and testing the pre-cleanup Nginx configuration. Always run `nginx -t` before reload.

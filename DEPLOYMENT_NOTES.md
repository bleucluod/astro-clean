# Halleus Deployment Notes

## Current production state

Halleus is served from the VPS at:

```text
https://halleus.ir
```

The production host is currently:

```text
62.220.123.238
Ubuntu 24.04 LTS
```

Nginx terminates TLS and proxies to Next.js on:

```text
127.0.0.1:3000
```

The production environment file remains outside Git:

```text
/etc/halleus/halleus.env
```

Never copy its values into Git, chat logs, ZIP artifacts, or release metadata.

## VPS production architecture

The controlled release layout is:

```text
/srv/halleus/source
/srv/halleus/releases
/srv/halleus/current
/srv/halleus/previous
```

Meanings:

- `source` is the canonical clean Git clone used to fetch and create worktrees.
- `releases` contains immutable, commit-specific worktrees and their builds.
- `current` points to the active release.
- `previous` points to the immediate rollback release.

The versioned systemd template is:

```text
ops/vps/halleus.service
```

It runs the app only from:

```text
/srv/halleus/current
```

The versioned release command is:

```text
ops/vps/halleus-release.sh
```

## Deployment safety rule

Do not deploy with git pull plus an in-place build inside the active runtime directory.

A production deployment must:

1. identify an exact 40-character commit and its exact tag;
2. verify the VPS source clone is clean;
3. fetch origin and tags;
4. create a detached release worktree;
5. run `pnpm install --frozen-lockfile`;
6. run `pnpm run check:encoding`;
7. run `git --no-pager diff --check`;
8. run `pnpm build`;
9. verify `.next/BUILD_ID`;
10. update `previous` and `current` atomically;
11. restart `halleus.service`;
12. run public and localhost smoke tests;
13. restore the prior release automatically if activation fails.

The release script never commits, tags, pushes, rotates SSH keys, edits environment values, or changes Nginx.

## Bootstrap boundary

Adding the workflow files to Git does not change the live VPS.

A separate controlled bootstrap batch must still:

- create `/srv/halleus/releases`;
- create the initial `current` link without deleting `/srv/halleus/source`;
- install the versioned systemd unit;
- run `systemctl daemon-reload`;
- restart and smoke-test Halleus;
- prove rollback readiness;
- preserve the legacy source build as a recovery path.

Do not run the release command before that bootstrap has succeeded.

## Rollback

After bootstrap, rollback is performed with:

```text
sudo bash /srv/halleus/current/ops/vps/halleus-release.sh rollback
```

Rollback swaps `current` and `previous`, restarts Halleus, and restores the original state if the rollback smoke test fails.

## Required local checks before commit/tag/push

Run:

```text
pnpm run check:vps-release-workflow
pnpm run check:encoding
git --no-pager diff --check
pnpm build
```

Before commit, remove runner, ZIP, and temporary artifacts. `git status --short` must show only intended project files.

## Current launch boundary

Search Console and indexing remain blocked until all of these are complete:

- release-layout bootstrap;
- deploy and rollback verification;
- safe Nginx catch-all/default-site cleanup;
- removal of temporary diagnostic headers;
- provider snapshot or equivalent backup confirmation;
- basic external uptime monitoring.

Cloudflare Proxy must remain off during this phase. Render remains only a temporary fallback until VPS deploy and rollback are proven.

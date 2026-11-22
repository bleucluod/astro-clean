# Halleus — isolated PageSpeed A/B preview

Date: 2026-11-22. Scope: only compare the following immutable source commits on `/chart`:

- A (baseline): `cbc39dafbd08e876bf8d977eb3d02849d71f35a4`.
- B (wheel-label optimization): `613b12c18b3bcfcc8a8d16a5c12a9de81d2ecb37`.

The commits have exactly one changed file: `components/ChartMobileBirthPicker.tsx`. Preview worktrees use those source SHAs directly. This tool does **not** merge, tag, alter `main`, modify `/srv/halleus/current`, change production data or call the release engine.

## VPS prerequisites and isolation

- The genuine source checkout must be `/srv/halleus/source`, on `main`, clean, with the known GitHub origin.
- Production `halleus.service` must be active, `/chart` must respond on its existing loopback `3000`, and both production release symlinks must exist.
- Minimum 6 GiB available disk and 2.43 GiB available RAM before building. Build is sequential with cgroup CPU/RAM caps, and each preview has a runtime CPU/RAM cap.
- Builds live at `/srv/halleus/perf-preview-20261122/{a,b}` and never read `/etc/halleus/halleus.env`. Build and runtime environments omit Supabase/Auth/DB/payment credentials. Public preview routing deliberately denies all API, account and admin routes. Only one preview runs at a time.
- Default hostnames proposed: `perf-a.halleus.ir` and `perf-b.halleus.ir`. Create **two public DNS A records** to the VPS before exposure. DNS is **not** created by the script.
- Preview HTTP works only if the parent site does not enforce HSTS `includeSubDomains`. Otherwise supply an already valid certificate/key covering **both** hostnames as `HALLEUS_PREVIEW_CERT` and `HALLEUS_PREVIEW_KEY` to the `sudo` process. The script cannot issue certificates.
- Nginx must load `/etc/nginx/conf.d/*.conf`. The `expose` action validates its existing configuration, adds a distinct limited preview config, runs `nginx -t`, and attempts rollback of newly created config on failure. No production Nginx server block is replaced.
- Previews send `X-Robots-Tag: noindex` and a CSP that prevents production GA4 external script/connection activity. This keeps the preview comparison safer, but **not identical to production's third-party network costs**.

## Operator commands

After DNS records exist and the operator has confirmed the prerequisite gates, run on the VPS:

```bash
set -Eeuo pipefail
cd /srv/halleus/source
git fetch origin perf/20261122-pagespeed-preview-gate
git show FETCH_HEAD:ops/vps/halleus-pagespeed-preview-20261122.sh > /tmp/halleus-pagespeed-preview-20261122.sh
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh inspect
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh prepare
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh expose
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh start-a
```

A: `http://perf-a.halleus.ir/chart` while `start-a` is active.

B: `http://perf-b.halleus.ir/chart` after switching with:

```bash
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh start-b
```

If TLS is configured, the public URLs use `https://` instead. The inactive URL is intentionally unavailable; this prevents loading both Next.js builds into the 4 GB VPS at once. For Lighthouse/Google PageSpeed take at least three mobile measurements per variant, preferably switching A/B between runs. Record each run's final URL, score, LCP, TBT, FCP, CLS and timestamps and compare medians. Google PSI can still fluctuate.

Stop just these two previews without touching production:

```bash
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh stop
sudo bash /tmp/halleus-pagespeed-preview-20261122.sh status
```

If any safety gate fails (no RAM/disk headroom, missing DNS, HSTS, invalid certificate, port conflict, mismatched SHA, unhealthy production service), **do not bypass it**. Report the gate. Logs are preserved at `/srv/halleus/perf-preview-20261122/logs`.

No VPS execution, public PageSpeed run, production verification or release is claimed by preparing this branch. The sitewide optimization roadmap remains open.

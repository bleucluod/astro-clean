# Deploy Ready Checklist

## Goal

Prepare Astro Clean for a public frontend demo deployment.

This checklist is provider-neutral. It does not assume Vercel, Netlify, Cloudflare Pages, GitHub, or any specific hosting provider.

## Current deployment scope

This deployment is for a frontend public demo.

Included:

- Home
- Chart creation flow
- Dashboard
- Reports archive
- Report detail pages
- Local report notes
- Favorite reports
- Local JSON backup/export
- Privacy page
- Roadmap
- Wiki
- Admin demo tools

Not included:

- backend
- database
- authentication
- payment
- real astrology calculations
- AI integration
- public user accounts
- public indexed profile pages
- programmatic SEO pages

## Environment

Required public environment variable for production:

NEXT_PUBLIC_SITE_URL

Local fallback:

http://localhost:3000

Production example:

NEXT_PUBLIC_SITE_URL=https://your-domain.com

This value affects:

- metadata
- Open Graph URLs
- sitemap.xml
- robots.txt

## Required checks before deploy

Run:

pnpm lint
pnpm build
git status

Expected:

- lint passes
- build passes
- working tree is clean

## Production preview check

Run:

pnpm build
pnpm start -- -p 3001

Open:

http://localhost:3001

Check:

- /
- /chart
- /dashboard
- /reports
- /profile
- /privacy
- /admin
- /roadmap
- /wiki
- /sitemap.xml
- /robots.txt
- /wrong-test

Expected:

- all public routes load
- 404 page works
- sitemap loads
- robots loads
- localStorage features work in production preview
- no page claims public SEO profile pages are active yet

Stop preview server with:

Ctrl + C

## Deploy-ready decision

A build is deploy-ready when:

- automated checks pass
- production preview works
- mobile visual QA is acceptable
- public demo scope is clear
- privacy/localStorage limitations are visible
- public indexed user pages are not accidentally exposed

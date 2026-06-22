# Astro Clean Deployment Notes

## Current deployment status

The project is not deployed yet.

The frontend MVP is stable locally and has passed:

- pnpm lint
- pnpm build
- local production preview
- manual route testing

## Environment variables

The app currently supports this public environment variable:

NEXT_PUBLIC_SITE_URL

Local default:

http://localhost:3000

When the project gets a real domain, set it to the production URL.

Example:

NEXT_PUBLIC_SITE_URL=https://your-domain.com

This value is used by:

- metadataBase
- Open Graph URL
- sitemap.xml
- robots.txt

## Before deployment

Run:

pnpm lint
pnpm build
git status

Expected result:

- lint passes
- build passes
- working tree clean

## Important product boundary

Do not add backend, database, authentication, Prisma, Docker, Redis, AI integration, payment, or programmatic SEO before deciding the next product phase.

The current goal is still a clean frontend MVP.

## Suggested deployment checklist

- choose hosting provider later
- set NEXT_PUBLIC_SITE_URL
- run production build
- test Home, Chart, Reports, Dashboard, Profile, Admin, Roadmap, Wiki
- test sitemap.xml
- test robots.txt
- test 404 page
- test mobile navigation
- create a new local Git tag after final deploy-ready checkpoint

#!/usr/bin/env bash
set -Eeuo pipefail

: "${HALLEUS_WIKI_PUBLISHER_SECRET:?HALLEUS_WIKI_PUBLISHER_SECRET is required}"

/usr/bin/curl \
  --fail \
  --silent \
  --show-error \
  --max-time 45 \
  --request POST \
  --header "x-halleus-publisher-secret: ${HALLEUS_WIKI_PUBLISHER_SECRET}" \
  http://127.0.0.1:3000/api/internal/wiki/publish-due

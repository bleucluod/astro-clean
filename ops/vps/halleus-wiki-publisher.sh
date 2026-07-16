#!/usr/bin/env bash
set -Eeuo pipefail

: "${HALLEUS_WIKI_PUBLISHER_SECRET:?HALLEUS_WIKI_PUBLISHER_SECRET is required}"

max_attempts=12
retry_delay_seconds=5
attempt=1

while true; do
  set +e
  response="$(
    /usr/bin/curl \
      --fail \
      --silent \
      --show-error \
      --connect-timeout 2 \
      --max-time 45 \
      --request POST \
      --header "x-halleus-publisher-secret: ${HALLEUS_WIKI_PUBLISHER_SECRET}" \
      http://127.0.0.1:3000/api/internal/wiki/publish-due 2>&1
  )"
  exit_code=$?
  set -e

  if (( exit_code == 0 )); then
    printf '%s\n' "$response"
    exit 0
  fi

  if (( exit_code != 7 || attempt >= max_attempts )); then
    printf '%s\n' "$response" >&2
    exit "$exit_code"
  fi

  printf 'Wiki publisher endpoint is not ready (attempt %d/%d); retrying in %d seconds.\n' \
    "$attempt" "$max_attempts" "$retry_delay_seconds" >&2
  /bin/sleep "$retry_delay_seconds"
  attempt=$((attempt + 1))
done

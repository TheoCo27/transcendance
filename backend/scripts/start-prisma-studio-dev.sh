#!/bin/sh

set -eu

npm run deps:sync

node scripts/prisma-studio-tcp-proxy.mjs &
proxy_pid="$!"

cleanup() {
  kill "$proxy_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

npx prisma studio --browser none --port "${PRISMA_STUDIO_INTERNAL_PORT:-5556}" &
studio_pid="$!"

wait "$studio_pid"
studio_status="$?"

cleanup
wait "$proxy_pid" 2>/dev/null || true

exit "$studio_status"

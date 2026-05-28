#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

exec docker compose exec -T \
  -e WS_BASE_URL="${WS_BASE_URL:-}" \
  -e BACKEND_HOST="${BACKEND_HOST:-}" \
  -e BACKEND_PORT="${BACKEND_PORT:-}" \
  backend \
  sh -lc 'cat > /tmp/ws-impersonation-test.mjs && NODE_EXTRA_CA_CERTS=/certs/dev-localhost-ca.pem node /tmp/ws-impersonation-test.mjs' \
  < for_testing/ws-impersonation-test.mjs

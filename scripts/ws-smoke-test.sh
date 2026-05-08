#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

run_database_query() {
	query="$1"

	run_container_engine exec -i quiz_db sh -lc \
		"PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h 127.0.0.1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -t -A -c \"$query\""
}

cleanup() {
	bash scripts/cleanup-smoke-artifacts.sh --scope=ws >/dev/null 2>&1 || true
}

trap cleanup EXIT

cleanup

if [ -n "${WS_BASE_URL:-}" ]; then
	compose exec -T -e WS_BASE_URL="$WS_BASE_URL" backend sh -lc 'node scripts/ws-smoke-test.mjs'
else
	compose exec -T backend sh -lc 'npm run test:ws-smoke'
fi

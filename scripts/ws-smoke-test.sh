#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

compose() {
	if docker compose version >/dev/null 2>&1; then
		docker compose "$@"
	elif command -v docker-compose >/dev/null 2>&1; then
		docker-compose "$@"
	else
		printf '[KO] Ni docker compose ni docker-compose n'"'"'est disponible\n' >&2
		exit 1
	fi
}

run_database_query() {
	query="$1"

	docker exec -i quiz_db sh -lc \
		"PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h 127.0.0.1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -t -A -c \"$query\""
}

cleanup_ws_smoke_users() {
	run_database_query "DELETE FROM \\\"User\\\" WHERE email LIKE 'ws-smoke-%@test.com';" \
		>/dev/null 2>&1 || true
}

cleanup() {
	cleanup_ws_smoke_users
}

trap cleanup EXIT

cleanup_ws_smoke_users

if [ -n "${WS_BASE_URL:-}" ]; then
	compose exec -T -e WS_BASE_URL="$WS_BASE_URL" backend sh -lc 'node scripts/ws-smoke-test.mjs'
else
	compose exec -T backend sh -lc 'npm run test:ws-smoke'
fi

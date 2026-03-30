#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

pass() {
	printf '[OK] %s\n' "$1"
}

fail() {
	printf '[KO] %s\n' "$1" >&2
	exit 1
}

check_command() {
	command -v "$1" >/dev/null 2>&1 || fail "Commande manquante: $1"
}

compose() {
	if docker compose version >/dev/null 2>&1; then
		docker compose "$@"
	elif command -v docker-compose >/dev/null 2>&1; then
		docker-compose "$@"
	else
		fail "Ni docker compose ni docker-compose n'est disponible"
	fi
}

container_health() {
	docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null
}

check_container() {
	name="$1"
	status="$(container_health "$name")"
	[ "$status" = "healthy" ] || fail "Container $name non healthy (etat: ${status:-inconnu})"
	pass "Container $name healthy"
}

check_http_with_curl() {
	url="$1"
	expected="$2"

	body="$(curl -fsS "$url")" || return 1
	printf '%s' "$body" | grep -q "$expected" || fail "Reponse inattendue sur $url"
	pass "Endpoint $url OK"
}

check_http_inside_container() {
	container="$1"
	url="$2"
	expected="$3"

	body="$(docker exec "$container" sh -lc "wget -qO- '$url'")" || return 1
	printf '%s' "$body" | grep -q "$expected" || fail "Reponse inattendue depuis $container sur $url"
	pass "Endpoint $url OK via $container"
}

printf '== Smoke test ft_transcendance ==\n'
printf 'Frontend : http://localhost:%s\n' "$FRONTEND_PORT"
printf 'Backend  : http://localhost:%s\n' "$BACKEND_PORT"
printf 'Database : localhost:%s\n' "$POSTGRES_PORT"

check_command docker
compose ps >/dev/null 2>&1 || fail "Docker Compose indisponible ou stack non accessible"
pass "Docker Compose accessible"

check_container quiz_db
check_container quiz_backend
check_container quiz_frontend

if command -v curl >/dev/null 2>&1; then
	if check_http_with_curl "http://localhost:${BACKEND_PORT}/health" '"ok":true'; then
		:
	else
		check_http_inside_container quiz_backend "http://127.0.0.1:4000/health" '"ok":true'
	fi

	if check_http_with_curl "http://localhost:${FRONTEND_PORT}/health" '"database":{"configured":true,"ok":true}'; then
		:
	else
		check_http_inside_container quiz_frontend "http://127.0.0.1:3000/health" '"database":{"configured":true,"ok":true}'
	fi

	if check_http_with_curl "http://localhost:${FRONTEND_PORT}/api" 'Backend NestJS accessible'; then
		:
	else
		check_http_inside_container quiz_frontend "http://127.0.0.1:3000/api" 'Backend NestJS accessible'
	fi
else
	check_http_inside_container quiz_backend "http://127.0.0.1:4000/health" '"ok":true'
	check_http_inside_container quiz_frontend "http://127.0.0.1:3000/health" '"database":{"configured":true,"ok":true}'
	check_http_inside_container quiz_frontend "http://127.0.0.1:3000/api" 'Backend NestJS accessible'
fi

pass "Smoke test termine avec succes"

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

check_post_with_curl() {
	url="$1"
	data="$2"
	expected="$3"

	body="$(curl -fsS -X POST "$url" \
		-H "Content-Type: application/json" \
		-d "$data")" || return 1

	printf '%s' "$body" | grep -q "$expected" || fail "Reponse inattendue sur $url"
	pass "POST $url OK"
}

check_login_with_cookie() {
	url="$1"
	data="$2"

	response="$(curl -i -s -X POST "$url" \
		-H "Content-Type: application/json" \
		-d "$data")" || return 1

	echo "$response" | grep -qi "set-cookie: access_token" \
		|| fail "Cookie access_token non trouvé"

	pass "Login OK (cookie present)"
}

cleanup_user() {
	email="$1"

	docker exec -i quiz_db psql -U quizuser -d quizdb \
		-c "DELETE FROM \"User\" WHERE email = '${email}';" >/dev/null 2>&1 || true
}

CLEANUP_NEEDED=0

cleanup() {
	if [ "$CLEANUP_NEEDED" -eq 1 ]; then
		cleanup_user "$TEST_EMAIL"
	fi
}

trap cleanup EXIT

printf '== Smoke test ft_transcendence ==\n'
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

# ---- AUTH TESTS ----

TEST_EMAIL="smoke@test.com"
TEST_PASSWORD="longsecuredpassword123!"

REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","name":"smoke"}' "$TEST_EMAIL" "$TEST_PASSWORD")
LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD")

# Register
check_post_with_curl \
	"http://localhost:${BACKEND_PORT}/auth/register" \
	"$REGISTER_PAYLOAD" \
	"email"

CLEANUP_NEEDED=1

# Login
check_login_with_cookie \
	"http://localhost:${BACKEND_PORT}/auth/login" \
	"$LOGIN_PAYLOAD"


pass "Smoke test termine avec succes"

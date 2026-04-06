#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKEND_BASE_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_BASE_URL="http://localhost:${FRONTEND_PORT}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ft_transcendance_smoke.XXXXXX")"
COOKIE_JAR="${TMP_DIR}/cookies.txt"
LAST_BODY=""
LAST_HEADERS=""
LAST_STATUS=""

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
	printf '%s' "$body" | grep -F -q "$expected" || fail "Reponse inattendue sur $url"
	pass "Endpoint $url OK"
}

check_http_inside_container() {
	container="$1"
	url="$2"
	expected="$3"

	body="$(docker exec "$container" sh -lc "wget -qO- '$url'")" || return 1
	printf '%s' "$body" | grep -F -q "$expected" || fail "Reponse inattendue depuis $container sur $url"
	pass "Endpoint $url OK via $container"
}

request_with_curl() {
	method="$1"
	url="$2"
	data="${3:-}"
	cookie_jar="${4:-}"
	body_file="${TMP_DIR}/body"
	headers_file="${TMP_DIR}/headers"
	curl_args=(-sS -o "$body_file" -D "$headers_file" -w "%{http_code}" -X "$method" "$url")

	if [ -n "$cookie_jar" ]; then
		curl_args+=(-b "$cookie_jar" -c "$cookie_jar")
	fi

	if [ "$method" = "POST" ]; then
		curl_args+=(-H "Content-Type: application/json" -d "$data")
	fi

	LAST_STATUS="$(curl "${curl_args[@]}")" || return 1
	LAST_BODY="$(cat "$body_file")"
	LAST_HEADERS="$(cat "$headers_file")"
}

assert_status() {
	expected="$1"
	[ "$LAST_STATUS" = "$expected" ] || fail "Statut HTTP inattendu: attendu $expected, recu $LAST_STATUS, body: $LAST_BODY"
}

assert_status_any() {
	expected_a="$1"
	expected_b="$2"
	[ "$LAST_STATUS" = "$expected_a" ] || [ "$LAST_STATUS" = "$expected_b" ] \
		|| fail "Statut HTTP inattendu: attendu $expected_a ou $expected_b, recu $LAST_STATUS, body: $LAST_BODY"
}

assert_body_contains() {
	expected="$1"
	printf '%s' "$LAST_BODY" | grep -F -q "$expected" \
		|| fail "Body inattendu. Fragment manquant: $expected. Body: $LAST_BODY"
}

assert_headers_contains() {
	expected="$1"
	printf '%s' "$LAST_HEADERS" | grep -F -q "$expected" \
		|| fail "Headers inattendus. Fragment manquant: $expected. Headers: $LAST_HEADERS"
}

cleanup_user() {
	email="$1"

	docker exec -i quiz_db sh -lc \
		"psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"DELETE FROM \\\"User\\\" WHERE email = '${email}';\"" \
		>/dev/null 2>&1 || true
}

CLEANUP_NEEDED=0

cleanup() {
	if [ "$CLEANUP_NEEDED" -eq 1 ]; then
		cleanup_user "$TEST_EMAIL"
	fi

	rm -rf "$TMP_DIR"
}

trap cleanup EXIT

printf '== Smoke test ft_transcendence ==\n'
printf 'Frontend : http://localhost:%s\n' "$FRONTEND_PORT"
printf 'Backend  : http://localhost:%s\n' "$BACKEND_PORT"
printf 'Database : localhost:%s\n' "$POSTGRES_PORT"

check_command docker
check_command curl
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

TEST_EMAIL="smoke-$(date +%s)@test.com"
TEST_PASSWORD="longsecuredpassword123!"

REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","username":"smoke"}' "$TEST_EMAIL" "$TEST_PASSWORD")
LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD")

cleanup_user "$TEST_EMAIL"
CLEANUP_NEEDED=1

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Authentication required"'
pass "Session refusee sans cookie"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$REGISTER_PAYLOAD"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
pass "Register OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$LOGIN_PAYLOAD" "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_headers_contains 'Set-Cookie: access_token='
pass "Login OK"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
pass "Session courante OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
pass "/users/me OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/logout" '{}' "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"loggedOut":true'
assert_headers_contains 'Set-Cookie: access_token='
pass "Logout OK"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
pass "Session invalidee apres logout"

pass "Smoke test termine avec succes"

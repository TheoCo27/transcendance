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
	extra_header="${5:-}"
	body_file="${TMP_DIR}/body"
	headers_file="${TMP_DIR}/headers"
	curl_args=(-sS -o "$body_file" -D "$headers_file" -w "%{http_code}" -X "$method" "$url")

	if [ -n "$cookie_jar" ]; then
		curl_args+=(-b "$cookie_jar" -c "$cookie_jar")
	fi

	if [ -n "$extra_header" ]; then
		curl_args+=(-H "$extra_header")
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

assert_body_not_contains() {
	unexpected="$1"
	if printf '%s' "$LAST_BODY" | grep -F -q "$unexpected"; then
		fail "Body inattendu. Fragment present: $unexpected. Body: $LAST_BODY"
	fi
}

assert_headers_contains() {
	expected="$1"
	printf '%s' "$LAST_HEADERS" | grep -F -q "$expected" \
		|| fail "Headers inattendus. Fragment manquant: $expected. Headers: $LAST_HEADERS"
}

assert_equals() {
	expected="$1"
	actual="$2"
	[ "$actual" = "$expected" ] || fail "Valeur inattendue: attendu '$expected', recu '$actual'"
}

assert_not_empty() {
	value="$1"
	label="$2"
	[ -n "$value" ] || fail "Valeur vide inattendue pour $label"
}

get_user_field() {
	email="$1"
	field="$2"

	docker exec -i quiz_db sh -lc \
		"psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -t -A -c \"SELECT \\\"${field}\\\" FROM \\\"User\\\" WHERE email = '${email}';\"" \
		| tr -d '\r'
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
		[ -n "${TEST_EMAIL:-}" ] && cleanup_user "$TEST_EMAIL"
		[ -n "${GHOST_EMAIL:-}" ] && cleanup_user "$GHOST_EMAIL"
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
GHOST_EMAIL="smoke-ghost-$(date +%s)@test.com"
GHOST_PASSWORD="longsecuredpassword123!"
GHOST_COOKIE_JAR="${TMP_DIR}/ghost-cookies.txt"

REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","username":"smoke"}' "$TEST_EMAIL" "$TEST_PASSWORD")
LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD")
INVALID_REGISTER_PAYLOAD='{"email":"not-an-email","password":"short","username":"x"}'
DUPLICATE_REGISTER_PAYLOAD="$REGISTER_PAYLOAD"
INVALID_LOGIN_PAYLOAD='{"email":"not-an-email","password":"short"}'
WRONG_PASSWORD_PAYLOAD=$(printf '{"email":"%s","password":"wrongpassword123!"}' "$TEST_EMAIL")
GHOST_REGISTER_PAYLOAD=$(printf '{"email":"%s","password":"%s","username":"ghost"}' "$GHOST_EMAIL" "$GHOST_PASSWORD")
GHOST_LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$GHOST_EMAIL" "$GHOST_PASSWORD")

cleanup_user "$TEST_EMAIL"
cleanup_user "$GHOST_EMAIL"
CLEANUP_NEEDED=1

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Authentication required"'
pass "Session refusee sans cookie"

request_with_curl GET "${BACKEND_BASE_URL}/users/me" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Authentication required"'
pass "/users/me refuse sans cookie"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "" "Cookie: access_token=invalid-token"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Invalid or expired session"'
pass "Session refusee avec cookie invalide"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$INVALID_REGISTER_PAYLOAD"
assert_status 400
assert_body_contains '"success":false'
assert_body_contains '"code":"BAD_REQUEST"'
pass "Register invalide refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$REGISTER_PAYLOAD"
assert_status 201
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains '"username":"smoke"'
assert_body_contains '"status":"offline"'
assert_body_not_contains '"password"'
pass "Register OK"

TEST_USER_ID="$(get_user_field "$TEST_EMAIL" id)"
TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_not_empty "$TEST_USER_ID" "test user id"
assert_equals "offline" "$TEST_USER_STATUS"
pass "User cree en base avec status offline"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$DUPLICATE_REGISTER_PAYLOAD"
assert_status 409
assert_body_contains '"success":false'
assert_body_contains '"code":"CONFLICT"'
assert_body_contains '"message":"Email already exists"'
pass "Register en doublon refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$INVALID_LOGIN_PAYLOAD"
assert_status 400
assert_body_contains '"success":false'
assert_body_contains '"code":"BAD_REQUEST"'
pass "Login invalide refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$WRONG_PASSWORD_PAYLOAD"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
assert_body_contains '"message":"Invalid email or password"'
pass "Login avec mauvais mot de passe refuse"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$LOGIN_PAYLOAD" "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains '"username":"smoke"'
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
assert_headers_contains 'Set-Cookie: access_token='
pass "Login OK"

TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_equals "online" "$TEST_USER_STATUS"
pass "Status online apres login"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
pass "Session courante OK"

request_with_curl GET "${BACKEND_BASE_URL}/users/me" "" "$COOKIE_JAR"
assert_status 200
assert_body_contains '"success":true'
assert_body_contains "\"email\":\"${TEST_EMAIL}\""
assert_body_contains "\"id\":${TEST_USER_ID}"
assert_body_contains '"status":"online"'
assert_body_not_contains '"password"'
pass "/users/me OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/logout" '{}' "$COOKIE_JAR"
assert_status_any 200 201
assert_body_contains '"loggedOut":true'
assert_headers_contains 'Set-Cookie: access_token=;'
pass "Logout OK"

TEST_USER_STATUS="$(get_user_field "$TEST_EMAIL" status)"
assert_equals "offline" "$TEST_USER_STATUS"
pass "Status offline apres logout"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$COOKIE_JAR"
assert_status 401
assert_body_contains '"success":false'
assert_body_contains '"code":"UNAUTHORIZED"'
pass "Session invalidee apres logout"

request_with_curl POST "${BACKEND_BASE_URL}/auth/register" "$GHOST_REGISTER_PAYLOAD"
assert_status 201
pass "Ghost register OK"

request_with_curl POST "${BACKEND_BASE_URL}/auth/login" "$GHOST_LOGIN_PAYLOAD" "$GHOST_COOKIE_JAR"
assert_status_any 200 201
pass "Ghost login OK"

GHOST_USER_ID="$(get_user_field "$GHOST_EMAIL" id)"
assert_not_empty "$GHOST_USER_ID" "ghost user id"
cleanup_user "$GHOST_EMAIL"

request_with_curl GET "${BACKEND_BASE_URL}/auth/session" "" "$GHOST_COOKIE_JAR"
assert_status 404
assert_body_contains '"success":false'
assert_body_contains '"code":"NOT_FOUND"'
assert_body_contains "\"message\":\"User ${GHOST_USER_ID} not found\""
pass "Session renvoie 404 si le user du token n'existe plus"

pass "Smoke test termine avec succes"

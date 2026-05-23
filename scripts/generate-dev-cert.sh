#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. "${ROOT_DIR}/scripts/lib/runtime.sh"
CERT_DIR="${ROOT_DIR}/certs"
CERT_FILE="${CERT_DIR}/dev-localhost.crt"
KEY_FILE="${CERT_DIR}/dev-localhost.key"
CA_FILE="${CERT_DIR}/mkcert-rootCA.pem"

ensure_local_brew_shellenv >/dev/null 2>&1 || true

command -v mkcert >/dev/null 2>&1 || {
	printf '[KO] mkcert est requis. Lance make setup-host ou installe-le avec: brew install mkcert\n' >&2
	exit 1
}

CAROOT="$(mkcert -CAROOT)"
ROOT_CA_SOURCE="${CAROOT}/rootCA.pem"

mkdir -p "$CERT_DIR"

if [ -s "$ROOT_CA_SOURCE" ] && [ -s "$CERT_FILE" ] && [ -s "$KEY_FILE" ] && [ -s "$CA_FILE" ]; then
	if cmp -s "$ROOT_CA_SOURCE" "$CA_FILE" && openssl verify -CAfile "$CA_FILE" "$CERT_FILE" >/dev/null 2>&1; then
		printf '[OK] Certificat TLS de dev present et valide pour cette machine: %s\n' "$CERT_FILE"
		exit 0
	fi

	printf '[INFO] Certificat TLS existant incompatible avec la CA mkcert locale, regeneration...\n'
fi

mkcert \
	-cert-file "$CERT_FILE" \
	-key-file "$KEY_FILE" \
	localhost 127.0.0.1 ::1 frontend backend quiz_frontend quiz_backend \
	>/dev/null 2>&1

[ -s "$ROOT_CA_SOURCE" ] || {
	printf '[KO] CA mkcert introuvable dans %s apres generation\n' "$CAROOT" >&2
	exit 1
}

cp "$ROOT_CA_SOURCE" "$CA_FILE"
chmod 600 "$KEY_FILE"
printf '[OK] Certificat TLS de dev genere: %s\n' "$CERT_FILE"

#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/certs"
CERT_FILE="${CERT_DIR}/dev-localhost.crt"
KEY_FILE="${CERT_DIR}/dev-localhost.key"
CA_FILE="${CERT_DIR}/mkcert-rootCA.pem"

if [ -s "$CERT_FILE" ] && [ -s "$KEY_FILE" ] && [ -s "$CA_FILE" ]; then
	printf '[OK] Certificat TLS de dev present: %s\n' "$CERT_FILE"
	exit 0
fi

command -v mkcert >/dev/null 2>&1 || {
	printf '[KO] mkcert est requis. Installe-le avec: brew install mkcert\n' >&2
	exit 1
}

CAROOT="$(mkcert -CAROOT)"
ROOT_CA_SOURCE="${CAROOT}/rootCA.pem"

[ -s "$ROOT_CA_SOURCE" ] || {
	printf '[KO] CA mkcert introuvable dans %s\n' "$CAROOT" >&2
	printf 'Lance d''abord: mkcert -install\n' >&2
	exit 1
}

mkdir -p "$CERT_DIR"
cp "$ROOT_CA_SOURCE" "$CA_FILE"

mkcert \
	-cert-file "$CERT_FILE" \
	-key-file "$KEY_FILE" \
	localhost 127.0.0.1 ::1 frontend backend quiz_frontend quiz_backend \
	>/dev/null 2>&1

chmod 600 "$KEY_FILE"
printf '[OK] Certificat TLS de dev genere: %s\n' "$CERT_FILE"

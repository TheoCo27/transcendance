#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/certs"
CERT_FILE="${CERT_DIR}/dev-localhost.crt"
KEY_FILE="${CERT_DIR}/dev-localhost.key"
CA_FILE="${CERT_DIR}/dev-localhost-ca.pem"
OPENSSL_CONFIG="$(mktemp "${TMPDIR:-/tmp}/ft_transcendance_openssl.XXXXXX.cnf")"
CERT_MODULUS_FILE="$(mktemp "${TMPDIR:-/tmp}/ft_transcendance_cert_modulus.XXXXXX")"
KEY_MODULUS_FILE="$(mktemp "${TMPDIR:-/tmp}/ft_transcendance_key_modulus.XXXXXX")"

cleanup() {
	rm -f "$OPENSSL_CONFIG" "$CERT_MODULUS_FILE" "$KEY_MODULUS_FILE"
}

trap cleanup EXIT INT TERM

command -v openssl >/dev/null 2>&1 || {
	printf '[KO] openssl est requis pour generer les certificats HTTPS locaux\n' >&2
	exit 1
}

mkdir -p "$CERT_DIR"

has_expected_sans() {
	local cert_text

	cert_text="$(openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null || true)"
	printf '%s' "$cert_text" | grep -Fq 'DNS:localhost' \
		&& printf '%s' "$cert_text" | grep -Fq 'DNS:frontend' \
		&& printf '%s' "$cert_text" | grep -Fq 'DNS:backend' \
		&& printf '%s' "$cert_text" | grep -Fq 'DNS:quiz_frontend' \
		&& printf '%s' "$cert_text" | grep -Fq 'DNS:quiz_backend' \
		&& printf '%s' "$cert_text" | grep -Fq 'IP Address:127.0.0.1' \
		&& printf '%s' "$cert_text" | grep -Fq 'IP Address:0:0:0:0:0:0:0:1'
}

is_existing_certificate_valid() {
	[ -s "$CERT_FILE" ] || return 1
	[ -s "$KEY_FILE" ] || return 1
	[ -s "$CA_FILE" ] || return 1

	openssl x509 -checkend 0 -noout -in "$CERT_FILE" >/dev/null 2>&1 || return 1
	openssl x509 -noout -modulus -in "$CERT_FILE" >"$CERT_MODULUS_FILE" 2>/dev/null || return 1
	openssl rsa -noout -modulus -in "$KEY_FILE" >"$KEY_MODULUS_FILE" 2>/dev/null || return 1

	if ! cmp -s "$CERT_MODULUS_FILE" "$KEY_MODULUS_FILE"; then
		return 1
	fi

	cmp -s "$CERT_FILE" "$CA_FILE" || return 1
	has_expected_sans || return 1
	return 0
}

if is_existing_certificate_valid; then
	printf '[OK] Certificat TLS OpenSSL deja present et valide: %s\n' "$CERT_FILE"
	exit 0
fi

cat > "$OPENSSL_CONFIG" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_req

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, keyEncipherment, keyCertSign
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
DNS.2 = frontend
DNS.3 = backend
DNS.4 = quiz_frontend
DNS.5 = quiz_backend
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

openssl req \
	-x509 \
	-nodes \
	-days 365 \
	-newkey rsa:2048 \
	-keyout "$KEY_FILE" \
	-out "$CERT_FILE" \
	-config "$OPENSSL_CONFIG" \
	>/dev/null 2>&1

cp "$CERT_FILE" "$CA_FILE"
chmod 600 "$KEY_FILE"
printf '[OK] Certificat TLS OpenSSL genere: %s\n' "$CERT_FILE"

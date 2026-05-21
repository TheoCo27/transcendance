#!/bin/sh

set -eu

SCHEMA_FILE="prisma/schema.prisma"
STAMP_FILE="generated/prisma/.schema.sha256"
CLIENT_FILE="generated/prisma/client.ts"

compute_hash() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	else
		shasum -a 256 "$1" | awk '{print $1}'
	fi
}

current_hash="$(compute_hash "$SCHEMA_FILE")"
stored_hash=""

if [ -f "$STAMP_FILE" ]; then
	stored_hash="$(cat "$STAMP_FILE")"
fi

if [ ! -f "$CLIENT_FILE" ] || [ "$current_hash" != "$stored_hash" ]; then
	echo "[prisma] Generation du client Prisma"
	npx prisma generate
	printf '%s' "$current_hash" > "$STAMP_FILE"
else
	echo "[prisma] Client Prisma deja a jour, generation sautee"
fi

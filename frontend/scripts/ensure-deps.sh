#!/bin/sh

set -eu

LOCKFILE="package-lock.json"
STAMP_FILE="node_modules/.package-lock.sha256"

compute_hash() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	else
		shasum -a 256 "$1" | awk '{print $1}'
	fi
}

if [ ! -f "$LOCKFILE" ]; then
	echo "[deps] package-lock.json introuvable, installation via npm install"
	npm install --include=dev --no-package-lock
	exit 0
fi

current_hash="$(compute_hash "$LOCKFILE")"
stored_hash=""

if [ -f "$STAMP_FILE" ]; then
	stored_hash="$(cat "$STAMP_FILE")"
fi

if [ ! -d "node_modules" ] || [ ! -x "node_modules/.bin/webpack" ] || [ "$current_hash" != "$stored_hash" ]; then
	echo "[deps] Installation ou resynchronisation des dependances frontend"
	npm ci
	printf '%s' "$current_hash" > "$STAMP_FILE"
else
	echo "[deps] node_modules deja synchronise, npm ci saute"
fi

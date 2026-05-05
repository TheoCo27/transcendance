#!/usr/bin/env bash

set -eu

url="${1:-}"
browser="${2:-}"

[ -n "$url" ] || {
	printf '[KO] Usage: %s <url> [browser]\n' "$0" >&2
	exit 1
}

if command -v open >/dev/null 2>&1; then
	if [ -n "$browser" ]; then
		exec open -a "$browser" "$url"
	fi

	exec open "$url"
fi

if command -v xdg-open >/dev/null 2>&1; then
	if [ -n "$browser" ] && command -v "$browser" >/dev/null 2>&1; then
		exec "$browser" "$url"
	fi

	exec xdg-open "$url"
fi

printf '[KO] Impossible d ouvrir %s. Installe xdg-open (Linux) ou utilise ton navigateur manuellement.\n' "$url" >&2
exit 1

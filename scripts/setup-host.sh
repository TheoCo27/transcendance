#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

log() {
	printf '[setup] %s\n' "$1"
}

warn() {
	printf '[warn] %s\n' "$1" >&2
}

ok() {
	printf '[ok] %s\n' "$1"
}

fail() {
	printf '[ko] %s\n' "$1" >&2
	exit 1
}

ensure_openssl() {
	command -v openssl >/dev/null 2>&1 || fail "openssl est requis pour generer les certificats HTTPS locaux"
	ok "OpenSSL detecte"
}

ensure_nodocker_marker() {
	if [ -e /etc/containers/nodocker ]; then
		ok "Marker /etc/containers/nodocker deja present"
		return 0
	fi

	if mkdir -p /etc/containers/nodocker 2>/dev/null; then
		ok "Marker /etc/containers/nodocker cree"
		return 0
	fi

	if command -v sudo >/dev/null 2>&1 && sudo -n mkdir -p /etc/containers/nodocker 2>/dev/null; then
		ok "Marker /etc/containers/nodocker cree via sudo"
		return 0
	fi

	warn "Impossible de creer /etc/containers/nodocker sans privileges eleves. Ce warning Podman n'est pas bloquant pour lancer le projet."
}

ensure_compose_runtime() {
	if compose version >/dev/null 2>&1; then
		ok "Runtime conteneur detecte: $(compose_command_label)"
		return 0
	fi

	fail "Aucun runtime compose compatible detecte. Installe Docker Compose ou Podman Compose."
}

main() {
	log "Verification des prerequis hote pour HTTPS local via OpenSSL"
	ensure_openssl
	ensure_nodocker_marker
	ensure_compose_runtime
	warn "Les certificats OpenSSL auto-signes seront generes automatiquement au lancement."
	warn "Le navigateur affichera un avertissement HTTPS local tant que le certificat n'est pas ajoute manuellement au trust store."
}

main "$@"

#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

BREW_ROOT="${HOME}/.linuxbrew/Homebrew"
BREW_BIN_DIR="${HOME}/.linuxbrew/bin"
BREW_BIN="${BREW_BIN_DIR}/brew"
BREW_SHELLENV_LINE='eval "$($HOME/.linuxbrew/bin/brew shellenv)"'
MODE="${1:-setup}"

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

ensure_shellenv_loaded() {
	if [ -x "$BREW_BIN" ]; then
		eval "$("$BREW_BIN" shellenv)"
	fi
}

shellenv_persisted() {
	local rc_file

	for rc_file in "${HOME}/.bashrc" "${HOME}/.zshrc"; do
		if [ -f "$rc_file" ] && grep -Fqs "$BREW_SHELLENV_LINE" "$rc_file"; then
			return 0
		fi
	done

	return 1
}

ensure_linuxbrew() {
	if command -v brew >/dev/null 2>&1; then
		ok "Homebrew deja disponible"
		return 0
	fi

	if [ -x "$BREW_BIN" ]; then
		ensure_shellenv_loaded
		ok "Homebrew local detecte"
		return 0
	fi

	command -v git >/dev/null 2>&1 || fail "git est requis pour installer Homebrew en local"

	log "Installation de Homebrew en local dans ${BREW_ROOT}"
	if [ ! -d "$BREW_ROOT" ]; then
		git clone https://github.com/Homebrew/brew "$BREW_ROOT"
	fi

	mkdir -p "$BREW_BIN_DIR"
	ln -snf "${BREW_ROOT}/bin/brew" "$BREW_BIN"
	ensure_shellenv_loaded
	ok "Homebrew local installe"
}

ensure_mkcert() {
	if command -v mkcert >/dev/null 2>&1; then
		ok "mkcert deja disponible"
		return 0
	fi

	ensure_linuxbrew
	ensure_shellenv_loaded

	log "Installation de mkcert via Homebrew"
	brew install mkcert
	ok "mkcert installe"
}

ensure_mkcert_ca_file() {
	local caroot root_ca
	ensure_mkcert
	caroot="$(mkcert -CAROOT)"
	root_ca="${caroot}/rootCA.pem"

	if [ -s "$root_ca" ]; then
		ok "Autorite locale mkcert disponible"
		return 0
	fi

	log "Generation de l'autorite locale mkcert"
	mkcert -cert-file /dev/null -key-file /dev/null localhost >/dev/null 2>&1 || true
	[ -s "$root_ca" ] || fail "Impossible de generer l'autorite locale mkcert"
	ok "Autorite locale mkcert generee"
}

ensure_mkcert_ca_trusted() {
	ensure_mkcert_ca_file

	log "Installation de l'autorite locale mkcert dans le trust store"
	if ! mkcert -install; then
		fail "mkcert -install a echoue. Sur Fedora, lance manuellement 'mkcert -install' apres avoir charge Homebrew dans le shell."
	fi
	ok "Autorite locale mkcert installee dans le trust store"
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

print_shellenv_hint() {
	if command -v brew >/dev/null 2>&1; then
		if shellenv_persisted; then
			ok "Homebrew shellenv deja configure dans un fichier rc"
			return 0
		fi

		warn "Ajoute Homebrew au PATH pour les prochains terminaux:"
		warn "echo '${BREW_SHELLENV_LINE}' >> ~/.bashrc"
		warn "source ~/.bashrc"
	fi
}

setup_mode() {
	if [ -x "$HOME/.linuxbrew/bin/brew" ]; then
		eval "$("$HOME/.linuxbrew/bin/brew" shellenv)"
	fi

	ensure_mkcert_ca_file
	print_shellenv_hint
	ensure_nodocker_marker
	ensure_compose_runtime

	warn "Le certificat local sera genere automatiquement au lancement."
	warn "Si tu veux supprimer l'alerte navigateur sur Fedora, lance ensuite: make tls-trust"
}

trust_mode() {
	if [ -x "$HOME/.linuxbrew/bin/brew" ]; then
		eval "$("$HOME/.linuxbrew/bin/brew" shellenv)"
	fi

	ensure_mkcert_ca_trusted
}

main() {
	case "$MODE" in
		setup)
			setup_mode
			;;
		--trust-ca|trust-ca)
			trust_mode
			;;
		*)
			fail "Usage: scripts/setup-host.sh [setup|--trust-ca]"
			;;
	esac
}

main "$@"

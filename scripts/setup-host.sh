#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

BREW_ROOT="${HOME}/.linuxbrew/Homebrew"
BREW_BIN_DIR="${HOME}/.linuxbrew/bin"
BREW_BIN="${BREW_BIN_DIR}/brew"
BASHRC_FILE="${HOME}/.bashrc"
ZSHRC_FILE="${HOME}/.zshrc"
BREW_SHELLENV_LINE='eval "$($HOME/.linuxbrew/bin/brew shellenv)"'
COMMENTED_ZSH_BLOCK_START="#if [ -t 1 ]; then"
COMMENTED_ZSH_BLOCK_EXEC="#exec zsh"
COMMENTED_ZSH_BLOCK_END="#fi"

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

append_line_if_missing() {
	local file="$1"
	local line="$2"

	mkdir -p "$(dirname "$file")"
	touch "$file"

	if ! grep -F -x -q "$line" "$file"; then
		printf '\n%s\n' "$line" >>"$file"
		ok "Ajout de Homebrew au PATH dans ${file}"
	fi
}

ensure_school_bashrc_layout() {
	local tmp_file

	mkdir -p "$(dirname "$BASHRC_FILE")"
	touch "$BASHRC_FILE"
	tmp_file="$(mktemp)"

	awk '
		BEGIN {
			in_block = 0
		}
		/^[[:space:]]*if[[:space:]]+\[[[:space:]]+-t[[:space:]]+1[[:space:]]*\][[:space:]]*;[[:space:]]*then[[:space:]]*$/ {
			print "#if [ -t 1 ]; then"
			in_block = 1
			next
		}
		in_block && /^[[:space:]]*exec[[:space:]]+zsh[[:space:]]*$/ {
			print "#exec zsh"
			next
		}
		in_block && /^[[:space:]]*fi[[:space:]]*$/ {
			print "#fi"
			in_block = 0
			next
		}
		{
			print
		}
	' "$BASHRC_FILE" >"$tmp_file"

	mv "$tmp_file" "$BASHRC_FILE"

	append_line_if_missing "$BASHRC_FILE" "$COMMENTED_ZSH_BLOCK_START"
	append_line_if_missing "$BASHRC_FILE" "$COMMENTED_ZSH_BLOCK_EXEC"
	append_line_if_missing "$BASHRC_FILE" "$COMMENTED_ZSH_BLOCK_END"
	append_line_if_missing "$BASHRC_FILE" "$BREW_SHELLENV_LINE"
}

ensure_shellenv_loaded() {
	if [ -x "$BREW_BIN" ]; then
		eval "$("$BREW_BIN" shellenv)"
	fi
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

ensure_brew_shellenv_in_rc() {
	ensure_school_bashrc_layout

	case "${SHELL:-}" in
		*/zsh)
			append_line_if_missing "$ZSHRC_FILE" "$BREW_SHELLENV_LINE"
			;;
	esac
}

ensure_mkcert() {
	if command -v mkcert >/dev/null 2>&1; then
		ok "mkcert deja disponible"
		return 0
	fi

	ensure_linuxbrew
	ensure_brew_shellenv_in_rc
	ensure_shellenv_loaded

	log "Installation de mkcert via Homebrew"
	brew install mkcert
	ok "mkcert installe"
}

ensure_mkcert_ca() {
	local caroot root_ca install_output

	ensure_mkcert
	caroot="$(mkcert -CAROOT)"
	root_ca="${caroot}/rootCA.pem"

	log "Installation ou verification de l'autorite locale mkcert"
	if install_output="$(mkcert -install 2>&1)"; then
		ok "Autorite locale mkcert installee et approuvee"
		return 0
	fi

	if [ -s "$root_ca" ]; then
		warn "Le trust systeme n'a pas pu etre configure automatiquement sur cette machine."
		warn "Le projet continuera avec la CA locale mkcert. Les scripts internes utilisent deja certs/mkcert-rootCA.pem."
		printf '%s\n' "$install_output" >&2
		return 0
	fi

	fail "mkcert n'a pas pu preparer la CA locale. Sortie:\n${install_output}"
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
	ensure_mkcert_ca
}

main_full() {
	ensure_mkcert_ca
	ensure_nodocker_marker
	ensure_compose_runtime
}

case "${1:-}" in
	--tls-only)
		main
		;;
	"")
		main_full
		;;
	*)
		fail "Option inconnue: $1"
		;;
esac

#!/usr/bin/env bash

detect_container_engine() {
	if command -v docker >/dev/null 2>&1; then
		printf '%s\n' "docker"
		return 0
	fi

	if command -v podman >/dev/null 2>&1; then
		printf '%s\n' "podman"
		return 0
	fi

	printf '%s\n' "Ni 'docker' ni 'podman' n'est disponible sur cette machine." >&2
	return 1
}

ensure_local_brew_shellenv() {
	local brew_bin

	brew_bin="${HOME}/.linuxbrew/bin/brew"

	if [ -x "$brew_bin" ]; then
		eval "$("$brew_bin" shellenv)"
		return 0
	fi

	if command -v brew >/dev/null 2>&1; then
		eval "$(brew shellenv)"
		return 0
	fi

	return 1
}

run_container_engine() {
	local engine

	engine="$(detect_container_engine)" || return 1
	"$engine" "$@"
}

compose() {
	if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
		docker compose "$@"
		return 0
	fi

	if command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
		podman compose "$@"
		return 0
	fi

	if command -v docker-compose >/dev/null 2>&1; then
		docker-compose "$@"
		return 0
	fi

	if command -v podman-compose >/dev/null 2>&1; then
		podman-compose "$@"
		return 0
	fi

	printf '%s\n' "Ni 'docker compose', ni 'podman compose', ni 'docker-compose', ni 'podman-compose' n'est disponible." >&2
	return 1
}

compose_command_label() {
	if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
		printf '%s\n' "docker compose"
		return 0
	fi

	if command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
		printf '%s\n' "podman compose"
		return 0
	fi

	if command -v docker-compose >/dev/null 2>&1; then
		printf '%s\n' "docker-compose"
		return 0
	fi

	if command -v podman-compose >/dev/null 2>&1; then
		printf '%s\n' "podman-compose"
		return 0
	fi

	printf '%s\n' "indisponible"
	return 1
}

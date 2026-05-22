#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. "${ROOT_DIR}/scripts/lib/runtime.sh"

max_attempts="${WAIT_FOR_CONTAINERS_ATTEMPTS:-90}"
sleep_seconds="${WAIT_FOR_CONTAINERS_SLEEP_SECONDS:-2}"
services="$*"

log() {
	printf '[wait] %s\n' "$1"
}

fail() {
	printf '[ko] %s\n' "$1" >&2
	exit 1
}

inspect_state() {
	local container_id="$1"

	run_container_engine inspect \
		--format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
		"$container_id" 2>/dev/null
}

inspect_name() {
	local container_id="$1"

	run_container_engine inspect --format '{{.Name}}' "$container_id" 2>/dev/null | sed 's#^/##'
}

wait_for_container() {
	local container_id="$1"
	local container_name state attempts

	container_name="$(inspect_name "$container_id")"
	attempts="$max_attempts"

	while [ "$attempts" -gt 0 ]; do
		state="$(inspect_state "$container_id" || true)"

		case "$state" in
			healthy|running)
				log "${container_name} pret (${state})"
				return 0
				;;
			unhealthy|exited|dead)
				fail "${container_name} a termine dans un etat invalide: ${state}"
				;;
		esac

		sleep "$sleep_seconds"
		attempts=$((attempts - 1))
	done

	fail "${container_name} n'est pas pret apres $((max_attempts * sleep_seconds))s (etat final: ${state:-inconnu})"
}

main() {
	local container_ids

	container_ids="$(compose ps -q)"

	[ -n "$container_ids" ] || fail "Aucun conteneur a attendre. La stack ne semble pas demarree."

	log "Attente des conteneurs (${services:-stack complete})"
	for container_id in $container_ids; do
		wait_for_container "$container_id"
	done
}

main "$@"

#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${1:-.env}"

required_vars="
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_PORT
DATABASE_URL
BACKEND_PORT
FRONTEND_PORT
JWT_SECRET
FRONTEND_ORIGIN
GAME_QUESTION_DURATION_MS
"

get_env_value() {
  var_name="$1"
  grep -E "^${var_name}=.*$" "$ENV_FILE" | head -n 1 | cut -d '=' -f 2-
}

if [ ! -f "$ENV_FILE" ]; then
  printf '[KO] Fichier absent: %s\n' "$ENV_FILE" >&2
  printf 'Cree-le avec: make env-init\n' >&2
  exit 1
fi

invalid=0

for var_name in $required_vars; do
  if grep -Eq "^${var_name}=.+$" "$ENV_FILE"; then
    printf '[OK] %s\n' "$var_name"
  else
    printf '[KO] %s manquant ou vide\n' "$var_name" >&2
    invalid=1
  fi
done

if [ "$invalid" -ne 0 ]; then
  exit 1
fi

POSTGRES_USER_VALUE="$(get_env_value POSTGRES_USER)"
POSTGRES_PASSWORD_VALUE="$(get_env_value POSTGRES_PASSWORD)"
POSTGRES_DB_VALUE="$(get_env_value POSTGRES_DB)"
DATABASE_URL_VALUE="$(get_env_value DATABASE_URL)"
FRONTEND_PORT_VALUE="$(get_env_value FRONTEND_PORT)"
FRONTEND_ORIGIN_VALUE="$(get_env_value FRONTEND_ORIGIN)"
GAME_QUESTION_DURATION_MS_VALUE="$(get_env_value GAME_QUESTION_DURATION_MS)"
JWT_SECRET_VALUE="$(get_env_value JWT_SECRET)"

check_not_placeholder() {
  var_name="$1"
  value="$2"

  case "$value" in
    your_user|your_password|your_db|change_me)
      printf '[KO] %s utilise encore une valeur d''exemple non exploitable: %s\n' "$var_name" "$value" >&2
      invalid=1
      ;;
  esac
}

check_not_placeholder "POSTGRES_USER" "$POSTGRES_USER_VALUE"
check_not_placeholder "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD_VALUE"
check_not_placeholder "POSTGRES_DB" "$POSTGRES_DB_VALUE"
check_not_placeholder "DATABASE_URL" "$DATABASE_URL_VALUE"
check_not_placeholder "JWT_SECRET" "$JWT_SECRET_VALUE"

case "$DATABASE_URL_VALUE" in
  postgresql://*)
    :
    ;;
  *)
    printf '[KO] DATABASE_URL doit commencer par postgresql://\n' >&2
    invalid=1
    ;;
esac

if ! printf '%s' "$DATABASE_URL_VALUE" | grep -F -q "${POSTGRES_USER_VALUE}:"; then
  printf '[KO] DATABASE_URL ne reference pas POSTGRES_USER=%s\n' "$POSTGRES_USER_VALUE" >&2
  invalid=1
fi

if ! printf '%s' "$DATABASE_URL_VALUE" | grep -F -q ":${POSTGRES_PASSWORD_VALUE}@"; then
  printf '[KO] DATABASE_URL ne reference pas POSTGRES_PASSWORD courant\n' >&2
  invalid=1
fi

if ! printf '%s' "$DATABASE_URL_VALUE" | grep -F -q "/${POSTGRES_DB_VALUE}"; then
  printf '[KO] DATABASE_URL ne reference pas POSTGRES_DB=%s\n' "$POSTGRES_DB_VALUE" >&2
  invalid=1
fi

case "$FRONTEND_ORIGIN_VALUE" in
  https://*)
    :
    ;;
  *)
    printf '[KO] FRONTEND_ORIGIN doit commencer par https:// pour la stack TLS locale\n' >&2
    invalid=1
    ;;
esac

if ! printf '%s' "$FRONTEND_ORIGIN_VALUE" | grep -F -q ":${FRONTEND_PORT_VALUE}"; then
  printf '[KO] FRONTEND_ORIGIN ne reference pas FRONTEND_PORT=%s\n' "$FRONTEND_PORT_VALUE" >&2
  invalid=1
fi

case "$GAME_QUESTION_DURATION_MS_VALUE" in
  ''|*[!0-9]*)
    printf '[KO] GAME_QUESTION_DURATION_MS doit etre un entier positif en millisecondes\n' >&2
    invalid=1
    ;;
  0)
    printf '[KO] GAME_QUESTION_DURATION_MS doit etre strictement positif\n' >&2
    invalid=1
    ;;
esac

if [ "$invalid" -ne 0 ]; then
  exit 1
fi

printf '[OK] Configuration %s complete\n' "$ENV_FILE"

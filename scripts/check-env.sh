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
"

if [ ! -f "$ENV_FILE" ]; then
  printf '[KO] Fichier absent: %s\n' "$ENV_FILE" >&2
  printf 'Cree-le avec: make env-init\n' >&2
  exit 1
fi

missing=0

for var_name in $required_vars; do
  if grep -Eq "^${var_name}=.+$" "$ENV_FILE"; then
    printf '[OK] %s\n' "$var_name"
  else
    printf '[KO] %s manquant ou vide\n' "$var_name" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  exit 1
fi

printf '[OK] Configuration %s complete\n' "$ENV_FILE"

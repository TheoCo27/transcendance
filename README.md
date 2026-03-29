# ft_transcendance quickstart

Base minimale pour avoir rapidement des containers fonctionnels et un point de test simple.

## Services

- `frontend`: React + Vite, accessible sur `http://localhost:3000`
- `backend`: Express, accessible sur `http://localhost:4000`
- `db`: PostgreSQL, accessible sur `localhost:5432`

Le frontend proxifie `/api` et `/health` vers le backend. Pour un demarrage local rapide, `nginx` n'est pas necessaire.

## Demarrage

```bash
make up-d
make test-stack
make logs
```

## URLs utiles

- `http://localhost:3000`
- `http://localhost:3000/api`
- `http://localhost:3000/health`
- `http://localhost:4000/health`

## Quand ajouter nginx

Ajoute un service `nginx` plus tard si tu veux :

- un seul point d'entree public
- servir un build frontend statique
- faire du reverse proxy `/api`
- preparer HTTPS / TLS
- te rapprocher d'une architecture de production

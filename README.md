# ft_transcendance quickstart

Base minimale pour avoir rapidement des containers fonctionnels et un point de test simple.

## Services

- `frontend`: React + TypeScript + Webpack Dev Server, accessible sur `http://localhost:3000`
- `backend`: NestJS + TypeScript + Prisma, accessible sur `http://localhost:4000`
- `db`: PostgreSQL, accessible sur `localhost:5432`

Le frontend proxifie `/api` et `/health` vers le backend via Webpack Dev Server. Pour un demarrage local rapide, `nginx` n'est pas necessaire.

Le backend synchronise ses dependances, genere le client Prisma et applique les migrations presentes dans `backend/prisma/migrations` au demarrage du container.

## Demarrage

```bash
make up
make test-stack
make logs
```

## URLs utiles

- Ports par defaut : frontend `3000`, backend `4000`, db `5432`
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

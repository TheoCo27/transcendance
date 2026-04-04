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
make env-init
# edite .env puis verifie la config
make env-check
make up
make test-stack
make logs
```

## Secrets et variables

- Le projet charge ses variables depuis `.env`.
- Le fichier versionne est `.env.example`.
- Ne commit jamais une vraie valeur secrete dans `.env`.

Variables attendues :

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_ORIGIN`

## CI

Le repo peut etre verifie via GitHub Actions avec :

- le build du `backend`
- le build du `frontend`
- un demarrage complet de la stack Docker
- le smoke test `scripts/smoke-test.sh`

Le workflow peut fonctionner de deux facons :

- sans secret GitHub, avec des valeurs CI de secours
- avec des secrets de repo nommes `CI_POSTGRES_USER`, `CI_POSTGRES_PASSWORD`, `CI_POSTGRES_DB`, `CI_POSTGRES_PORT`, `CI_DATABASE_URL`, `CI_BACKEND_PORT`, `CI_FRONTEND_PORT`, `CI_JWT_SECRET`, `CI_FRONTEND_ORIGIN`

## URLs utiles

- Ports par defaut : frontend `3000`, backend `4000`, db `5432`
- `http://localhost:3000`
- `http://localhost:3000/api`
- `http://localhost:3000/health`
- `http://localhost:4000/health`

## API v1 (Dev 3)

Le backend expose maintenant une base d'API pour brancher le front:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /users/me`
- `GET /users/:id`
- `GET /rooms`
- `POST /rooms`
- `GET /rooms/:roomId`
- `POST /rooms/:roomId/join`
- `GET /game/:roomId/state`
- `POST /game/answer`
- `GET /scores/leaderboard?limit=10`
- `GET /scores/users/:userId`

Reponse de succes standard:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Reponse d'erreur standard:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Important pour le front en dev:

- le proxy frontend couvre seulement `/api` et `/health`
- les routes `/auth/*` et `/users/me` doivent etre appelees sur `http://localhost:4000`
- utiliser `credentials: "include"` pour que la session cookie fonctionne

## Quand ajouter nginx

Ajoute un service `nginx` plus tard si tu veux :

- un seul point d'entree public
- servir un build frontend statique
- faire du reverse proxy `/api`
- preparer HTTPS / TLS
- te rapprocher d'une architecture de production

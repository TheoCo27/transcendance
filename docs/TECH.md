# Guide Dev

## Objectif

Ce document donne une reference rapide pour lancer, tester et comprendre l'etat actuel du projet `ft_transcendance`.

## Stack actuelle

### Infrastructure

- Docker Compose pour orchestrer les services
- 3 services principaux:
  - `frontend`
  - `backend`
  - `db`
- `prisma-studio` uniquement via `make dev`
- healthchecks sur `frontend`, `backend` et `db`

### Frontend

- React
- TypeScript
- Webpack Dev Server
- port par defaut: `3000`

Role actuel:

- servir l'application web en HTTPS local
- appeler le backend via le proxy de dev
- exposer les pages accueil, login, register, profil, amis, admin quiz

Routes proxifiees vers le backend:

- `/api`
- `/health`
- `/auth`
- `/users`
- `/scores`
- `/quizzes`

### Backend

- NestJS
- TypeScript
- Prisma ORM
- port par defaut: `4000`

Role actuel:

- exposer les endpoints REST
- gerer auth, users, quizzes et scores
- verifier la disponibilite PostgreSQL via `/health`

### Base de donnees

- PostgreSQL 16
- volume Docker `postgres_volume`

## Architecture de dev

```text
Navigateur
  -> https://localhost:3000
  -> frontend React + Webpack Dev Server
  -> proxy /api /health /auth /users /scores /quizzes
  -> https://backend:4000
  -> backend NestJS + Prisma
  -> postgresql://db:5432
```

## Arborescence utile

- `docker-compose.yml`
- `Makefile`
- `backend/`
- `backend/prisma/`
- `frontend/`
- `scripts/smoke-test.sh`
- `scripts/cleanup-smoke-artifacts.sh`
- `.env`
- `.env.example`

## Variables d'environnement

Variables principales:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `PRISMA_STUDIO_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_ORIGIN`
- `GAME_QUESTION_DURATION_MS`

Regles d'equipe:

- ne jamais commit de vrai secret
- garder `.env.example` a jour
- verifier la config avec `make env-check`

## CI GitHub Actions

Le workflow `.github/workflows/ci.yml`:

- build le backend et le frontend
- demarre la stack Docker
- attend les healthchecks
- lance `scripts/smoke-test.sh`

Secrets optionnels acceptes:

- `CI_POSTGRES_USER`
- `CI_POSTGRES_PASSWORD`
- `CI_POSTGRES_DB`
- `CI_POSTGRES_PORT`
- `CI_DATABASE_URL`
- `CI_BACKEND_PORT`
- `CI_FRONTEND_PORT`
- `CI_JWT_SECRET`

Si ces secrets sont absents, des valeurs par defaut dediees a la CI sont utilisees.

## Commandes utiles

### Lancer le projet

```bash
make up
```

### Mode dev

```bash
make dev
```

### Etat rapide

```bash
make ps
make test-stack
```

### Logs

```bash
make logs
make logs-back
make logs-front
make logs-db
```

### Base PostgreSQL

```bash
make shell-db
```

Exemples `psql` utiles:

```sql
\l
\dt
\d "User"
\d "Quiz"
SELECT current_database();
SELECT current_user;
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Quiz";
```

### Smoke test

```bash
make smoke-test
```

Ce test verifie:

- la disponibilite de Compose
- la sante des 3 containers
- l'acces backend `/health`
- l'acces frontend `/` et `/health`
- le flux auth `register -> session -> /users/me -> logout`
- le login classique et invite
- quelques validations et erreurs API attendues

### Nettoyage

```bash
make down
make clean
make fclean
```

## Endpoints backend utiles

- `/health`
- `/api`
- `/auth/register`
- `/auth/login`
- `/auth/logout`
- `/auth/session`
- `/auth/guest`
- `/users/me`
- `/users/:id`
- `/users/me/friends`
- `/users/me/friends/conversations`
- `/users/me/friends/messages/:friendId`
- `/scores/leaderboard`
- `/scores/users/:userId`
- `/scores/quizzes/:quizId/leaderboard`
- `/quizzes`
- `/quizzes/:id`

## Notes importantes

- Le module `room` a ete retire du depot.
- Le gameplay `wordle` n'est plus supporte dans la base ni dans les docs.
- Le leaderboard global est garde en memoire par le backend.
- Le leaderboard par quiz est persiste en PostgreSQL.

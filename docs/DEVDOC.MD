# DEVDOC

## Objectif

Ce document explique l'architecture actuelle du depot apres la suppression du module `room` et du support `wordle`.

## Etat reel du depot

Le projet contient aujourd'hui:

- une application frontend React
- un backend NestJS REST
- une base PostgreSQL pilotee par Prisma
- des modules `auth`, `users`, `quizzes` et `scores`
- un smoke test HTTP de stack

Le projet ne contient plus:

- de module `rooms`
- de gateway WebSocket
- de boucle de jeu temps reel
- de smoke test WebSocket
- de type de jeu `wordle`

## Schema de communication

```text
Navigateur
  -> https://localhost:3000
  -> frontend
  -> proxy /api /health /auth /users /scores /quizzes
  -> https://backend:4000
  -> backend NestJS
  -> Prisma
  -> PostgreSQL
```

## Modules backend

### `AuthModule`

Responsabilites:

- inscription classique
- connexion classique
- connexion invite
- restauration de session
- deconnexion
- integration optionnelle Google OAuth

Fichiers cles:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/auth/guards/auth.guard.ts`

### `UsersModule`

Responsabilites:

- profil courant
- avatar et statut
- reseau d'amis
- demandes d'amis
- messagerie privee

Fichiers cles:

- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/private-messages.service.ts`
- `backend/src/modules/users/private-message-rate-limit.service.ts`

### `QuizzesModule`

Responsabilites:

- creation de quiz
- lecture des quiz
- bootstrap des quiz par defaut

Fichiers cles:

- `backend/src/modules/quizzes/quizzes.controller.ts`
- `backend/src/modules/quizzes/quizzes.service.ts`
- `backend/src/modules/quizzes/quizzes-bootstrap.service.ts`

### `ScoresModule`

Responsabilites:

- leaderboard global runtime
- leaderboard persistant par quiz

Fichiers cles:

- `backend/src/modules/scores/scores.controller.ts`
- `backend/src/modules/scores/scores.service.ts`

## Frontend

Pages principales:

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/pages/QuizAdminPage.tsx`

Le routage est centralise dans:

- `frontend/src/App.tsx`

Le proxy de dev est configure dans:

- `frontend/webpack.config.cjs`

## Modele de donnees

Schema Prisma principal:

- `backend/prisma/schema.prisma`

Modeles actuellement actifs:

- `User`
- `FriendRequests`
- `PrivateMessage`
- `Quiz`
- `QuizQuestion`
- `QuizLeaderboard`

Points importants:

- `PrivateMessage` est persiste en base
- `QuizLeaderboard` est persiste en base
- le leaderboard global de `ScoresService` est en memoire

## Smoke test

Script principal:

- `scripts/smoke-test.sh`

Ce qu'il valide:

- disponibilite du runtime Compose
- healthchecks des containers
- acces frontend et backend
- acces PostgreSQL
- flux d'authentification anonyme, classique et invite

Nettoyage associe:

- `scripts/cleanup-smoke-artifacts.sh`

## Ordre conseille pour lire le code

1. `backend/src/main.ts`
2. `backend/src/app.module.ts`
3. `backend/prisma/schema.prisma`
4. `backend/src/modules/auth/*`
5. `backend/src/modules/users/*`
6. `backend/src/modules/quizzes/*`
7. `backend/src/modules/scores/*`
8. `frontend/src/App.tsx`
9. `frontend/src/pages/*`
10. `scripts/smoke-test.sh`

## Notes de maintenance

- Si tu modifies le schema Prisma, pense a synchroniser les migrations et la doc.
- Si tu ajoutes un endpoint public, verifie s'il doit etre liste dans `AppService.getApi()`.
- Si tu fais evoluer le flux auth, pense a mettre a jour `scripts/smoke-test.sh` et la CI.

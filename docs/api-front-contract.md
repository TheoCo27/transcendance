# API Front Contract (Dev3)

Version: v1 (etat actuel de `dev` au 2026-04-07)
Scope: contrat front-back MVP pour auth, users, rooms, game, scores

## Etat de persistance (important)

- Branche sur Prisma/PostgreSQL:
  - `auth` (login/register/session/logout via `User`)
  - `users` (`/users/me`, `/users/:id`)
  - `quizzes` (`/quizzes`, `/quizzes/:quizId`)
- Encore en service memoire (pas encore Prisma):
  - `rooms`
  - `game`
  - `scores`

Consequence:
- Les routes `rooms/game/scores` sont valides pour integration front MVP,
  mais les donnees ne sont pas persistantes entre redemarrages pour l'instant.

## Base URL et proxy

- Backend direct: `http://localhost:4000`
- Front dev server: `http://localhost:3000`
- En dev, le front peut appeler directement:
  - `/auth`
  - `/users`
  - `/rooms`
  - `/game`
  - `/scores`
  - `/quizzes`
  - `/api`
  - `/health`

Important:
- Toujours envoyer `credentials: "include"` cote front pour la session cookie.

## Format de reponse (commun)

Succes:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Erreur:

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

Codes d'erreur standards (selon statut HTTP):
- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_SERVER_ERROR` (500)

## Session et cookie

- Cookie de session: `access_token` (JWT).
- Cree au login, supprime au logout.
- Options cookie:
  - `httpOnly: true`
  - `path: /`
  - `sameSite: lax` en local HTTP
  - `sameSite: none` + `secure: true` si `FRONTEND_ORIGIN` est en HTTPS

## Types utilises par le front

`SafeUser` (retour auth/users):

```ts
type SafeUser = {
  id: number;
  email: string;
  username: string;
  avatar_url: string | null;
  status: "online" | "offline";
  createdAt: string;
};
```

`Room` public:

```ts
type Room = {
  id: number;
  name: string;
  rounds: number;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  players: Array<{ userId: number; joinedAt: string }>;
  createdAt: string;
};
```

`GameState`:

```ts
type GameState = {
  roomId: number;
  status: "waiting" | "playing" | "finished";
  currentQuestionId: number | null;
  currentQuestionNumber: number;
  totalQuestions: number;
  questionDurationMs: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  answersForCurrentQuestion: number;
  totalAnswers: number;
  leaderboard: Array<{ userId: number; score: number }>;
  winnerUserId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
};
```

`SubmitAnswerResult`:

```ts
type SubmitAnswerResult = {
  roomId: number;
  userId: number;
  questionId: number;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  scoreDelta: number;
  totalAnswers: number;
};
```

`UserScore`:

```ts
type UserScore = {
  userId: number;
  username: string;
  score: number;
  wins: number;
};
```

`Quiz`:

```ts
type Quiz = {
  id: number;
  title: string;
  createdAt: string;
  questions: Array<{
    id: number;
    questionText: string;
    answers: string[];
    correctAnswer: string;
    position: number;
    points: number;
    createdAt: string;
  }>;
};
```

## Endpoints (contrat)

### Auth

`POST /auth/register`
- Body:

```json
{
  "email": "user@example.com",
  "username": "player1",
  "password": "longsecuredpassword123!"
}
```

- Validation:
  - `email`: email valide
  - `username`: string min 2
  - `password`: string min 12
- Reponse: `201` avec `ApiResponse<SafeUser>` + cookie `access_token`
- Erreurs:
  - `409 CONFLICT` si email deja existant
  - `400 BAD_REQUEST` si body invalide

`POST /auth/login`
- Body:

```json
{
  "email": "user@example.com",
  "password": "longsecuredpassword123!"
}
```

- Reponse: `201` (ou `200` selon config future), `ApiResponse<SafeUser>`, + cookie `access_token`
- Erreurs:
  - `401 UNAUTHORIZED` si credentials invalides
  - `400 BAD_REQUEST` si body invalide

`POST /auth/logout`
- Body: vide (ou `{}` tolere)
- Reponse: `201` (ou `200` selon config future), `ApiResponse<{ loggedOut: true }>`
- Effet: suppression cookie `access_token`

`GET /auth/session`
- Auth: cookie `access_token` requis
- Reponse: `200`, `ApiResponse<SafeUser>`
- Erreurs:
  - `401 UNAUTHORIZED` si pas de cookie
  - `401 UNAUTHORIZED` si token invalide/expire
  - `404 NOT_FOUND` si user du token introuvable

### Users

`GET /users/me`
- Auth: cookie `access_token` requis
- Reponse: `200`, `ApiResponse<SafeUser>`
- Erreurs:
  - `401 UNAUTHORIZED`
  - `404 NOT_FOUND`

`GET /users/:id`
- Reponse: `200`, `ApiResponse<SafeUser>`
- Erreurs:
  - `400 BAD_REQUEST` si `id` non numerique
  - `404 NOT_FOUND` si user absent

### Rooms

`GET /rooms`
- Reponse: `200`, `ApiResponse<Room[]>`

`GET /rooms/:roomId`
- Reponse: `200`, `ApiResponse<Room>`
- Erreurs:
  - `400 BAD_REQUEST` si `roomId` non numerique
  - `404 NOT_FOUND` si room absente

`POST /rooms`
- Body:

```json
{
  "name": "Lobby #1",
  "rounds": 5,
  "isPrivate": false
}
```

- Variante room privee:

```json
{
  "name": "Private room",
  "rounds": 3,
  "isPrivate": true,
  "password": "room1234"
}
```

- Validation:
  - `name`: string 2..40
  - `rounds`: int 1..20
  - `isPrivate`: boolean optionnel
  - `password`: requis si `isPrivate=true`, string 4..64
- Reponse: `201`, `ApiResponse<Room>`
- Note MVP:
  - `rounds`, `isPrivate`, `password` sont des champs API temporaires cote service memoire.
  - Le schema Prisma `Room` ne les inclut pas encore dans l'etat actuel.

`POST /rooms/:roomId/join`
- Body:

```json
{
  "userId": 1,
  "password": "room1234"
}
```

- `password` est optionnel pour room publique
- Reponse: `201`, `ApiResponse<Room>`
- Erreurs:
  - `400 BAD_REQUEST`
  - `401 UNAUTHORIZED` si mauvais mot de passe
  - `404 NOT_FOUND` si room absente

### Game

`GET /game/:roomId/state`
- Reponse: `200`, `ApiResponse<GameState>`
- Erreurs:
  - `400 BAD_REQUEST`
  - `404 NOT_FOUND` si room absente

`POST /game/answer`
- Body:

```json
{
  "roomId": 1,
  "userId": 1,
  "questionId": 101,
  "answerIndex": 1
}
```

- Validation:
  - `roomId`: int >= 1
  - `userId`: int >= 1
  - `questionId`: int >= 1
  - `answerIndex`: int 0..3
- Reponse: `201`, `ApiResponse<SubmitAnswerResult>`
- Erreurs:
  - `400 BAD_REQUEST`
  - `404 NOT_FOUND` si room absente

### Scores

`GET /scores/leaderboard?limit=10`
- `limit` par defaut: `10`
- Reponse: `200`, `ApiResponse<UserScore[]>`
- Erreurs:
  - `400 BAD_REQUEST` si `limit` non numerique

`GET /scores/users/:userId`
- Reponse: `200`, `ApiResponse<UserScore>`
- Erreurs:
  - `400 BAD_REQUEST`
  - `404 NOT_FOUND` si score absent

### Quizzes

`GET /quizzes`
- Reponse: `200`, `ApiResponse<Quiz[]>`

`GET /quizzes/:quizId`
- Reponse: `200`, `ApiResponse<Quiz>`
- Erreurs:
  - `400 BAD_REQUEST`
  - `404 NOT_FOUND` si quiz absent

`POST /quizzes`
- Body:

```json
{
  "title": "Culture generale",
  "questions": [
    {
      "questionText": "Capitale de la France ?",
      "answers": ["Berlin", "Paris", "Rome", "Madrid"],
      "correctAnswerIndex": 1,
      "points": 2
    }
  ]
}
```

- Validation:
  - `title`: string 2..120
  - `questions`: array 1..50
  - `questionText`: string 1..500
  - `answers`: array 2..4 de strings non vides
  - `correctAnswerIndex`: int 0..3 et inferieur a `answers.length`
  - `points`: int 1..1000 optionnel
- Reponse: `201`, `ApiResponse<Quiz>`

## Notes de stabilite

- Ce contrat est la reference front pour cloturer Dev3 semaine 1.
- Tant qu'il n'y a pas de RFC d'equipe, on ne change pas:
  - enveloppe `success/data/error`
  - noms des routes ci-dessus
  - champs `email/username/password` pour register

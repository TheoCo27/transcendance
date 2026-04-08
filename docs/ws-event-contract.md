# WebSocket Event Contract (Back 3)

Version: `v1` (etat actuel de `feature/realtime`)  
Namespace: `/ws`  
Transport: `socket.io`

## Authentification WS

- Le socket doit etre authentifie via cookie `access_token` (JWT) envoye au handshake.
- Si la session est invalide, le serveur emet `ws:auth:error` puis ferme le socket.

## Envelope commun

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
    "code": "CONFLICT",
    "message": "Question is not active"
  }
}
```

## Types de base

`Room`:

```json
{
  "id": 1,
  "name": "Lobby #1",
  "ownerUserId": 1,
  "rounds": 5,
  "isPrivate": false,
  "status": "waiting",
  "players": [{ "userId": 1, "joinedAt": "2026-04-08T10:00:00.000Z" }],
  "createdAt": "2026-04-08T10:00:00.000Z"
}
```

`GameState`:

```json
{
  "roomId": 1,
  "currentQuestionId": 101,
  "totalAnswers": 3,
  "updatedAt": "2026-04-08T10:00:00.000Z"
}
```

`LeaderboardEntry`:

```json
{
  "userId": 2,
  "score": 200
}
```

## Client -> Server (inbound)

### `room:list`

Payload: none

### `room:create`

```json
{
  "name": "Lobby #1",
  "rounds": 5,
  "isPrivate": false,
  "password": "room1234",
  "userId": 1
}
```

Notes:
- `password` requis seulement si `isPrivate=true`.
- `userId` optionnel (si fourni, le createur rejoint la room).

### `room:join`

```json
{
  "roomId": 1,
  "userId": 2,
  "password": "room1234"
}
```

### `room:leave`

```json
{
  "roomId": 1,
  "userId": 2
}
```

### `room:start`

```json
{
  "roomId": 1,
  "userId": 2
}
```

Notes:
- `userId` peut etre omis si le socket est deja lie a un user via `room:create`, `room:join`, `game:answer` ou `chat:message`.
- Seul le owner de la room peut demarrer la partie.

### `game:answer`

```json
{
  "roomId": 1,
  "userId": 2,
  "questionId": 101,
  "answerIndex": 1
}
```

### `chat:message`

```json
{
  "roomId": 1,
  "userId": 2,
  "content": "Hello team"
}
```

## Server -> Client (outbound)

### Session

- `ws:connected`  
  Data:

```json
{
  "socketId": "socket-id",
  "userId": 2,
  "timestamp": "2026-04-08T10:00:00.000Z"
}
```

- `ws:auth:error`:

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

### Rooms

- `room:list`: `Room[]`
- `room:list-updated`: `Room[]`
- `room:created`: `Room`
- `room:joined`: `Room`
- `room:left`:

```json
{
  "roomId": 1,
  "userId": 2
}
```

- `room:state`: `Room`
- `room:started`: `Room`
- `room:closed`:

```json
{
  "roomId": 1,
  "reason": "room_empty"
}
```

### Game

- `game:started`:

```json
{
  "roomId": 1,
  "totalQuestions": 5,
  "questionDurationMs": 10000
}
```

- `game:question:started`:

```json
{
  "roomId": 1,
  "questionId": 101,
  "question": {
    "id": 101,
    "text": "Quel event WebSocket diffuse le compte a rebours ?",
    "options": ["game:start", "game:timer", "question:tick", "room:timer"]
  },
  "questionNumber": 1,
  "totalQuestions": 5,
  "durationMs": 10000,
  "startsAt": "2026-04-08T10:00:00.000Z",
  "endsAt": "2026-04-08T10:00:10.000Z"
}
```

Note:
- Le backend n'expose pas la bonne reponse dans ce payload.

- `game:timer`:

```json
{
  "roomId": 1,
  "questionId": 101,
  "questionNumber": 1,
  "totalQuestions": 5,
  "remainingMs": 7000,
  "endsAt": "2026-04-08T10:00:10.000Z"
}
```

- `game:question:timeout`:

```json
{
  "roomId": 1,
  "questionId": 101,
  "questionNumber": 1,
  "totalQuestions": 5
}
```

- `game:state`: `GameState`

- `game:answer:result`:

```json
{
  "roomId": 1,
  "userId": 2,
  "questionId": 101,
  "selectedAnswerIndex": 1,
  "isCorrect": true,
  "scoreDelta": 100,
  "userTotalScore": 200,
  "totalAnswers": 4
}
```

- `game:leaderboard`: `LeaderboardEntry[]`

- `game:ended`:

```json
{
  "roomId": 1,
  "reason": "timer_completed",
  "winnerUserId": 2,
  "leaderboard": [
    { "userId": 2, "score": 300 },
    { "userId": 1, "score": 100 }
  ]
}
```

### Chat

- `chat:message`:

```json
{
  "roomId": 1,
  "userId": 2,
  "content": "Hello team",
  "sentAt": "2026-04-08T10:00:00.000Z"
}
```

## Error events

- `room:create:error`
- `room:join:error`
- `room:leave:error`
- `room:start:error`
- `game:answer:error`
- `chat:message:error`
- `ws:auth:error`

Codes d'erreur possibles:
- `BAD_REQUEST`
- `UNAUTHORIZED`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_SERVER_ERROR`

## Regles metier MVP

- `room:join` autorise seulement en `waiting`.
- `room:start` autorise seulement en `waiting` avec au moins 1 joueur.
- `game:answer` autorise seulement en `playing`.
- Un user ne peut repondre qu'une seule fois par question.
- Un socket est lie au `userId` du JWT pour toute sa duree de vie.
- `room:leave`, `game:answer` et `chat:message` refusent un `userId` qui n'appartient pas a la room cible.
- `room:start` est reserve au owner de la room.
- Score cumule par user publie via `game:leaderboard`.
- Timer serveur par question (defaut 10s via `GAME_QUESTION_DURATION_MS`).
- Timeout auto d'une question puis question suivante.
- Fin auto de partie a la fin du cycle de questions.
- Fermeture auto de room quand elle devient vide.
- Si un user se deconnecte (plus aucun socket actif pour ce user), il est retire automatiquement des rooms.

## Notes scope

- Cette version repose sur les services memoire actuels (`rooms/game/scores`).
- Le branchement Prisma des modules jeu sera traite dans le scope DB/data dedie.

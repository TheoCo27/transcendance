# WebSocket Event Contract (Back 3 - Step 1)

Namespace: `/ws`  
Transport: `socket.io`

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
    "code": "BAD_REQUEST",
    "message": "Message content is required"
  }
}
```

## Events client -> server

`room:list`
- payload: none

`room:create`
- payload:

```json
{
  "name": "Lobby #1",
  "rounds": 5,
  "isPrivate": false,
  "userId": 1
}
```

`room:join`
- payload:

```json
{
  "roomId": 1,
  "userId": 2,
  "password": "room1234"
}
```

`room:leave`
- payload:

```json
{
  "roomId": 1,
  "userId": 2
}
```

`room:start`
- payload:

```json
{
  "roomId": 1
}
```

`game:answer`
- payload:

```json
{
  "roomId": 1,
  "userId": 2,
  "questionId": 101,
  "answerIndex": 1
}
```

`chat:message`
- payload:

```json
{
  "roomId": 1,
  "userId": 2,
  "content": "Hello team"
}
```

## Events server -> client

Connexion:
- `ws:connected`

Rooms:
- `room:list`
- `room:list-updated`
- `room:created`
- `room:joined`
- `room:left`
- `room:state`
- `room:started`

Game:
- `game:state`
- `game:answer:result`

Chat:
- `chat:message`

Erreurs:
- `room:create:error`
- `room:join:error`
- `room:leave:error`
- `room:start:error`
- `game:answer:error`
- `chat:message:error`

## Notes MVP

- Cette version repose sur les services memoire actuels (`rooms/game/scores`).
- Le branchement Prisma des modules jeu sera traite dans le scope DB/data dedie.


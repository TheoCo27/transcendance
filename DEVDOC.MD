# DEVDOC

## Objectif

Ce document explique comment les modules majeurs du projet ont ete developpes.

## Schema De Communication Des Containers

Le projet tourne autour de 4 services:

- `frontend`
- `backend`
- `db`
- `prisma-studio` en mode dev uniquement

### Schema logique

```text
                         Navigateur
                              |
                              | HTTPS
                              v
                 https://localhost:3000
                     port hote -> frontend
                              |
                              | webpack dev server
                              | proxy /api /health /auth /users
                              | proxy /rooms /game /scores /quizzes
                              | proxy WebSocket /ws
                              v
                    https://backend:4000
                         service backend
                              |
                              | Prisma
                              v
                    postgresql://db:5432
                           service db


       Prisma Studio (dev only)
       http://127.0.0.1:5555
              |
              | proxy TCP local
              v
      prisma studio interne :5556
              |
              v
             db
```

### Ce que montre ce schema

- le navigateur parle au `frontend`, pas directement au `backend`;
- le `frontend` sert aussi de reverse proxy de dev;
- le `backend` parle a PostgreSQL via Prisma;
- les services communiquent dans le reseau Compose `quiz_network`;
- `prisma-studio` n'existe que dans la stack de dev;
- `prisma-studio` est volontairement borne a `127.0.0.1`.

### Fichiers a citer

- `docker-compose.yml`
- `frontend/webpack.config.cjs`
- `backend/src/main.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/scripts/start-prisma-studio-dev.sh`
- `backend/scripts/prisma-studio-tcp-proxy.mjs`


## Important: etat reel du depot

Avant de rentrer module par module, il faut etre tres clair sur ce qui est **complet**, **partiellement persiste**, ou **encore principalement runtime**.

### Ce qui est effectivement implemente et utilisable

- authentification classique par email/mot de passe,
- session JWT en cookie HTTP-only,
- login invite,
- OAuth Google,
- profil utilisateur, avatar, statut,
- systeme d'amis,
- messages prives entre amis,
- rooms partageables publiques/privees,
- chat de room persistant,
- quiz CRUD minimal cote creation/lecture,
- jeu quiz multijoueur en temps reel,
- synchronisation websocket,
- classement par quiz persistant,
- smoke tests HTTP et WebSocket.

### Ce qui existe en architecture mais pas encore totalement persiste dans le code courant

- le moteur de partie quiz fonctionne surtout avec des structures en memoire dans `GameService`,
- le classement global de `ScoresService` est garde en memoire,
- le schema Prisma contient `Game`, `GameQuestion`, `PlayerAnswer` et `Leaderboard`,
  mais ces tables ne sont pas encore alimentees par les services actuels,
- l'architecture multi-jeux existe avec `gameType = quiz | wordle | memory`,
  mais **le gameplay complet observe dans ce depot est celui du quiz**.


## Vue d'ensemble de l'architecture

### Backend

- `backend/src/main.ts`
  - demarre NestJS,
  - active HTTPS local si les certificats existent,
  - active `cookie-parser`,
  - active `ValidationPipe`,
  - expose Swagger en dev.
- `backend/src/app.module.ts`
  - assemble `AuthModule`, `UsersModule`, `RoomsModule`, `GameModule`, `QuizzesModule`, `ScoresModule`, `RealtimeModule`, `PrismaModule`.
- `backend/src/prisma/prisma.service.ts`
  - instancie Prisma avec `@prisma/adapter-pg`,
  - gere `connect` / `disconnect`.

### Frontend

- `frontend/src/App.tsx`
  - route les pages principales.
- `frontend/src/services/*.ts`
  - centralisent les appels HTTP et WebSocket.
- `frontend/src/hooks/useAuthSession.ts`
  - rehydrate la session courante.
- `frontend/src/hooks/useRoomPage.ts`
  - orchestre la logique la plus dense du projet cote front:
    room, chat, timer, question active, soumission de reponse, classement.

### Base de donnees

Fichier principal:

- `backend/prisma/schema.prisma`

Tables centrales:

- `User`
- `FriendRequests`
- `Room`
- `RoomPlayer`
- `Messages`
- `Quiz`
- `QuizQuestion`
- `QuizLeaderboard`

Tables prevues pour une persistence de match plus complete:

- `Game`
- `GameQuestion`
- `PlayerAnswer`
- `Leaderboard`

## Ordre conseille pour lire le code

Si tu debutes sur le projet, lis dans cet ordre:

1. `backend/src/main.ts`
2. `backend/src/app.module.ts`
3. `backend/prisma/schema.prisma`
4. `backend/src/modules/auth/*`
5. `backend/src/modules/users/*`
6. `backend/src/modules/rooms/*`
7. `backend/src/modules/game/*`
8. `backend/src/modules/realtime/*`
9. `frontend/src/services/*`
10. `frontend/src/hooks/useRoomPage.ts`

---

## 1. Real-Time Features

### But du module

Permettre a plusieurs clients connectes en meme temps de voir:

- la liste des rooms se mettre a jour,
- les entrees/sorties de joueurs,
- le chat de room en direct,
- le lancement de partie,
- la question courante,
- le compte a rebours,
- les reponses et le classement.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/src/modules/realtime/realtime.module.ts`
- `backend/src/modules/realtime/realtime.gateway.ts`
- `backend/src/modules/realtime/realtime.types.ts`
- `backend/src/modules/realtime/dto/chat-message.dto.ts`
- `backend/src/modules/realtime/dto/room-create-event.dto.ts`
- `backend/src/modules/realtime/dto/room-join-event.dto.ts`
- `backend/src/modules/realtime/dto/room-leave.dto.ts`
- `backend/src/modules/realtime/dto/room-start.dto.ts`
- `backend/src/modules/realtime/services/realtime-auth.service.ts`
- `backend/src/modules/realtime/services/realtime-presence.service.ts`
- `backend/src/modules/realtime/services/realtime-validation.service.ts`
- `backend/src/modules/realtime/services/realtime-response.service.ts`
- `backend/src/modules/realtime/services/realtime-room-events.service.ts`
- `backend/src/modules/realtime/services/realtime-game-events.service.ts`
- `backend/src/modules/realtime/services/realtime-game-runtime.service.ts`
- `backend/src/modules/realtime/services/realtime-runtime-utils.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/game/game.service.ts`
- `backend/src/modules/scores/scores.service.ts`

Frontend:

- `frontend/src/services/ws.ts`
- `frontend/src/hooks/useRoomPage.ts`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/QuizRoomPage.tsx`
- `frontend/src/pages/RoomPage.tsx`

Docs et tests:

- `docs/ws-event-contract.md`
- `docs/front2-realtime-integration.md`
- `backend/scripts/ws-smoke-test.mjs`
- `scripts/ws-smoke-test.sh`

#### Elements de base de donnees concernes

- `Room`
- `RoomPlayer`
- `Messages`
- `Quiz`
- `QuizQuestion`
- `QuizLeaderboard` a la fin d'une partie

#### Types et structures de donnees importants

- `WsResponse<T>` cote front
- `RoomTimerRuntime`
- `Map<string, number>` dans `RealtimePresenceService`
- `Map<number, Set<string>>` dans `RealtimePresenceService`
- `Map<number, RoomTimerRuntime>` dans `RealtimeGameRuntimeService`
- `Room`
- `RoomMessage`
- `GameState`
- `PublicQuestion`

#### Librairies et outils utilises

- `socket.io`
- `socket.io-client`
- `@nestjs/websockets`
- `class-validator`
- `class-transformer`
- `JWT`
- smoke tests Node.js

### Etapes logiques d'implementation

1. Ouvrir un namespace dedie `/ws` avec CORS et cookies.
2. Authentifier le socket des la connexion avec le cookie `access_token`.
3. Memoriser le lien `socketId -> userId` pour securiser tous les evenements.
4. Faire rejoindre automatiquement les channels `room:{id}` aux sockets deja rattaches a des rooms.
5. Valider tous les payloads entrants via des DTOs.
6. Separer les evenements room et les evenements game dans deux services distincts.
7. Creer une boucle de jeu temps reel basee sur:
   - `setInterval` pour le timer,
   - `setTimeout` pour la fin de question.
8. Emettre des evenements de diffusion:
   - `room:list-updated`,
   - `room:state`,
   - `chat:message`,
   - `game:question:started`,
   - `game:timer`,
   - `game:state`,
   - `game:ended`.
9. Gerer la reconnexion propre en reassignant les rooms au socket.
10. Ajouter un delai de grace a la deconnexion pour eviter qu'une micro-coupure ejecte immediatement un joueur.

### Fichiers et fonctions importants

- `backend/src/modules/realtime/realtime.gateway.ts`
  - point d'entree Socket.IO.
  - `handleConnection()` authentifie le socket.
  - `runSafely()` transforme les exceptions en erreurs WS standardisees.

- `backend/src/modules/realtime/services/realtime-auth.service.ts`
  - `authenticateSocket()` lit le JWT dans les cookies du handshake.
  - indispensable pour garder la meme logique d'identite entre HTTP et WS.

- `backend/src/modules/realtime/services/realtime-presence.service.ts`
  - `bindSocketToUser()`, `resolveSocketUser()`, `unregisterSocket()`.
  - sert a empecher qu'un client envoie un `userId` arbitraire.

- `backend/src/modules/realtime/services/realtime-room-events.service.ts`
  - `handleRoomCreate()`, `handleRoomJoin()`, `handleRoomLeave()`, `handleRoomStart()`, `handleChatMessage()`.
  - c'est le chef d'orchestre de la vie d'une room.
  - `syncSocketRoomMembership()` est cle pour les reconnexions.
  - `runDisconnectCleanup()` applique la strategie de nettoyage apres grace period.

- `backend/src/modules/realtime/services/realtime-game-events.service.ts`
  - `handleGameAnswer()`.
  - valide la reponse, diffuse le resultat et declenche la fermeture de question si tout le monde a repondu.

- `backend/src/modules/realtime/services/realtime-game-runtime.service.ts`
  - `startGameLoop()` lance une partie.
  - `startQuestionTimer()` ouvre une question et son timer.
  - `emitTimerTick()` diffuse le temps restant.
  - `completeActiveQuestion()` gere timeout ou fin anticipee.
  - `endGame()` cloture la partie et pousse les scores.

- `frontend/src/services/ws.ts`
  - encapsule la connexion Socket.IO,
  - gere `connectWs()`,
  - attend explicitement l'evenement `ws:connected`.

- `frontend/src/hooks/useRoomPage.ts`
  - recoit toutes les emissions WS importantes,
  - mappe l'etat temps reel dans le state React.
  - c'est le fichier frontend le plus important pour comprendre le temps reel.

### Ce qu'il faut savoir

- le backend ne fait pas "juste du broadcast global", il broadcast soit globalement, soit par channel `room:{id}`;
- l'authentification du socket reutilise le JWT HTTP, donc pas de double systeme d'identite;
- la presence est traquee en memoire pour securiser les evenements;
- le timer est autoritaire cote serveur, pas cote client;
- le client ne decide jamais si une reponse est valide ou si une question est terminee.

---

## 2. Allow Users To Interact With Other Users

### But du module

Permettre aux utilisateurs de:

- voir leur reseau social,
- envoyer des demandes d'ami,
- accepter ou refuser,
- discuter dans une room,
- s'envoyer des messages prives.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/private-messages.service.ts`
- `backend/src/modules/users/dto/send-friend-request.dto.ts`
- `backend/src/modules/users/dto/friend-request-action.dto.ts`
- `backend/src/modules/users/dto/send-private-message.dto.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/realtime/services/realtime-room-events.service.ts`

Frontend:

- `frontend/src/services/users.ts`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/components/Friends/FriendNetworkPanel.tsx`
- `frontend/src/components/Friends/PrivateMessagesPanel.tsx`
- `frontend/src/hooks/useRoomPage.ts`

#### Elements de base de donnees concernes

- `FriendRequests`
- `User`
- `Messages` pour le chat de room

Hors base relationnelle:

- `.runtime/private-messages-store.json`
  - stockage local des messages prives

#### Types et structures de donnees importants

- `FriendOverview`
- `FriendUserSummary`
- `FriendRequestSummary`
- `FriendActionResult`
- `PrivateMessage`
- `PrivateConversationSummary`
- `RoomMessage`

#### Librairies et outils utilises

- NestJS controllers/services
- Prisma
- `node:fs` pour le stockage JSON des MP
- React state/hooks

### Etapes logiques d'implementation

1. Creer la relation sociale minimale avec `FriendRequests`.
2. Decider qu'une amitie acceptee reste representee par une ligne avec `status = accepted`.
3. Construire une vue agregee `FriendOverview` qui retourne:
   - amis,
   - demandes recues,
   - demandes envoyees.
4. Bloquer les comptes invites sur les features sociales privees.
5. Ajouter la messagerie privee seulement entre amis acceptes.
6. Choisir un stockage simple sur fichier JSON pour les MP au lieu d'une table SQL.
7. Brancher en parallele le chat de room persistant sur la table `Messages`.
8. Cote frontend, construire une page `FriendsPage` qui fait du polling:
   - toutes les 12 secondes pour le reseau d'amis,
   - toutes les 5 secondes pour la conversation ouverte.

### Fichiers et fonctions importants

- `backend/src/modules/users/users.service.ts`
  - `getFriendOverview()` construit la vue sociale complete.
  - `sendFriendRequest()` gere trois cas:
    - nouvelle demande,
    - conflit si deja pending,
    - acceptation automatique si la demande inverse existe deja.
  - `respondToFriendRequest()` securise l'acceptation/refus.
  - `areUsersFriends()` sert ensuite aux MP.

- `backend/src/modules/users/private-messages.service.ts`
  - `listConversationSummaries()` calcule previews et unread count.
  - `listConversation()` marque les messages lus.
  - `sendMessage()` cree un MP.
  - `assertMessagingAllowed()` interdit les MP hors amitie acceptee.
  - `loadStore()` / `persistStore()` gerent la persistence disque.

- `backend/src/modules/rooms/rooms.service.ts`
  - `listMessages()` et `createMessage()` couvrent le chat de room.

- `backend/src/modules/realtime/services/realtime-room-events.service.ts`
  - `handleChatMessage()` enregistre puis diffuse le message a tous les membres de la room.

- `frontend/src/pages/FriendsPage.tsx`
  - page centrale pour comprendre la feature sociale hors room.

### Ce qu'il faut savoir

- les amis sont persistants en base via `FriendRequests`;
- les messages prives sont **persistes localement sur fichier JSON**, pas encore en table SQL;
- le chat de room, lui, est persiste en base dans `Messages`;
- la messagerie privee est volontairement reservee aux amis acceptes pour simplifier les abus et la moderation.

---

## 3. Use An ORM

### But du module

Centraliser le modele de donnees, typer les acces DB et faire evoluer le schema proprement.

### Prerequis

#### Fichiers concernes

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/prisma.config.ts`
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`
- tous les services backend qui appellent `this.prisma.client.*`

#### Elements de base de donnees concernes

Tous les enums et modeles Prisma:

- `UserStatus`
- `FriendshipStatus`
- `RoomStatus`
- `RoomGameType`
- `GameStatus`
- `User`
- `FriendRequests`
- `Room`
- `Quiz`
- `QuizQuestion`
- `Game`
- `GameQuestion`
- `PlayerAnswer`
- `Leaderboard`
- `QuizLeaderboard`
- `RoomPlayer`
- `Messages`

#### Types et structures de donnees importants

- types Prisma generes
- `Prisma.UserCreateInput`
- `Prisma.UserUpdateInput`
- `Prisma.JsonValue`
- `Prisma.InputJsonValue`

#### Librairies et outils utilises

- `prisma`
- `@prisma/adapter-pg`
- PostgreSQL
- migrations SQL versionnees dans Git

### Etapes logiques d'implementation

1. Poser un schema minimal `User`.
2. Etendre ensuite le schema autour du coeur produit:
   - rooms,
   - quiz,
   - social,
   - leaderboard.
3. Creer les enums metier pour eviter les statuts "magiques" en string libre.
4. Generer les migrations SQL au fur et a mesure.
5. Encapsuler Prisma dans `PrismaService`.
6. Injecter `PrismaService` dans tous les modules backend.
7. Utiliser les relations Prisma pour eviter du SQL manuel partout.

### Fichiers et fonctions importants

- `backend/prisma/schema.prisma`
  - source de verite du modele de donnees.

- `backend/src/prisma/prisma.service.ts`
  - `client` expose le client Prisma.
  - `ping()` sert aux checks de sante.
  - `onModuleInit()` / `onModuleDestroy()` gerent le cycle de vie.

- `backend/prisma/migrations/20260406165453_add_quiz_tables/migration.sql`
  - migration la plus structurante:
    introduit la plupart des tables metier.

- `backend/prisma/migrations/20260412152000_add_quiz_leaderboard/migration.sql`
  - ajoute la persistence du leaderboard par quiz.

### Ce qu'il faut savoir .

- Prisma a ete choisi pour la lisibilite du schema et le typage TypeScript;
- les relations `include` dans les services permettent de reconstruire directement les objets utiles a l'API;
- les migrations versionnees permettent de raconter l'evolution du produit.

---

## 4. Standard User Management

### But du module

Gerer le cycle de vie standard d'un utilisateur:

- inscription,
- connexion,
- session,
- logout,
- profil,
- avatar,
- statut,
- gestion des comptes invites.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/guards/auth.guard.ts`
- `backend/src/modules/auth/decorators/current-user.decorator.ts`
- `backend/src/modules/auth/types/auth-payload.type.ts`
- `backend/src/modules/auth/types/authenticated-request.type.ts`
- `backend/src/modules/auth/types/safe-user.type.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/dto/register.dto.ts`
- `backend/src/modules/users/dto/login.dto.ts`
- `backend/src/modules/users/dto/guest-login.dto.ts`
- `backend/src/modules/users/dto/update-profile.dto.ts`
- `backend/src/modules/users/dto/update-profile-payload.dto.ts`
- `backend/src/modules/users/dto/update-avatar.dto.ts`

Frontend:

- `frontend/src/services/auth.ts`
- `frontend/src/services/users.ts`
- `frontend/src/hooks/useAuthSession.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/components/Navbar.tsx`

#### Elements de base de donnees concernes

- `User`
  - `email`
  - `username`
  - `password`
  - `isGuest`
  - `googleId`
  - `avatar_url`
  - `status`
  - `createdAt`

#### Types et structures de donnees importants

- `SafeUser`
- `AuthPayload`
- cookie `access_token`
- event frontend `auth-changed`

#### Librairies et outils utilises

- `@nestjs/jwt`
- `bcrypt`
- `cookie-parser`
- React hooks

### Etapes logiques d'implementation

1. Creer le schema `User`.
2. Ajouter le hash de mot de passe avec `bcrypt`.
3. Signer une session JWT cote backend.
4. Stocker le JWT dans un cookie HTTP-only.
5. Construire un `AuthGuard` qui lit le cookie sur chaque route protegee.
6. Ajouter `SafeUser` pour ne jamais exposer `password` ou `googleId`.
7. Ajouter le mode invite avec `isGuest`.
8. Gerer le statut `online/offline`.
9. Ajouter la mise a jour de profil et d'avatar.
10. Cote frontend, centraliser la rehydratation de session via `useAuthSession()`.

### Fichiers et fonctions importants

- `backend/src/modules/auth/auth.service.ts`
  - `validateUser()` verifie email + mot de passe.
  - `login()` signe le JWT et pose le cookie.
  - `register()` cree un compte classique.
  - `loginAsGuest()` cree un compte invite temporaire.
  - `logout()` nettoie la session et repasse le statut a `offline`.
  - `archiveGuestIdentity()` evite la collision de pseudos invites apres logout.

- `backend/src/modules/auth/guards/auth.guard.ts`
  - verifie le cookie et injecte le payload JWT dans la requete.

- `backend/src/modules/users/users.service.ts`
  - `updateAvatar()` valide le format data URL, le type MIME et la taille.
  - `updateProfile()` verifie l'unicite du pseudo et permet de changer le statut.

- `frontend/src/hooks/useAuthSession.ts`
  - recharge la session au mount,
  - ecoute l'evenement `auth-changed`.

- `frontend/src/pages/ProfilePage.tsx`
  - bon point d'entree pour comprendre comment l'avatar et le statut sont modifies.

### Ce qu'il faut savoir .

- l'auth est basee sur cookie HTTP-only, pas sur `localStorage`;
- `SafeUser` est un garde-fou architectural important;
- le mode invite n'est pas juste une "session anonyme", c'est un vrai `User` avec `isGuest = true`;
- les avatars sont stockes en `data URL` directement dans `avatar_url`.

---

## 5. Game Statistics And Match History

### But du module

Conserver un sens aux parties jouees:

- scores,
- gagnants,
- leaderboard,
- statistique cumulee par quiz.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/src/modules/scores/scores.module.ts`
- `backend/src/modules/scores/scores.controller.ts`
- `backend/src/modules/scores/scores.service.ts`
- `backend/src/modules/realtime/services/realtime-game-runtime.service.ts`
- `backend/src/modules/game/game.service.ts`
- `backend/prisma/schema.prisma`

Frontend:

- `frontend/src/services/scores.ts`
- `frontend/src/pages/QuizRoomPage.tsx`
- `frontend/src/components/room/RoomLeaderboardSection.tsx`
- `frontend/src/hooks/useRoomPage.ts`

#### Elements de base de donnees concernes

Utilises actuellement:

- `QuizLeaderboard`
- `User`
- `Quiz`

Prevus par le schema mais non branches completement aujourd'hui:

- `Game`
- `GameQuestion`
- `PlayerAnswer`
- `Leaderboard`

#### Types et structures de donnees importants

- `UserScore`
- `QuizUserScore`
- `ScoreSnapshot`
- `GameLeaderboardEntry`
- `GameState["leaderboard"]`
- `Map<number, ScoreSnapshot>` dans `ScoresService`

#### Librairies et outils utilises

- Prisma
- NestJS
- React fetch services

### Etapes logiques d'implementation

1. Ajouter dans le schema les tables necessaires pour penser l'historique.
2. Construire un service simple pour agreger les scores en memoire.
3. Ajouter une persistence stable du classement par quiz via `QuizLeaderboard`.
4. Appeler ce service automatiquement a la fin d'une partie temps reel.
5. Exposer des endpoints REST de consultation.
6. Afficher le leaderboard par quiz sur la page de quiz et dans la room.

### Fichiers et fonctions importants

- `backend/src/modules/scores/scores.service.ts`
  - `recordGameResult()` est la fonction cle:
    - incremente le leaderboard global en memoire,
    - fait un `upsert` sur `QuizLeaderboard`.
  - `getQuizLeaderboard()` lit les stats persistantes du quiz.
  - `getLeaderboard()` lit le classement global en memoire.

- `backend/src/modules/realtime/services/realtime-game-runtime.service.ts`
  - `endGame()` appelle `scoresService.recordGameResult()`.
  - c'est le point de jonction entre gameplay et statistiques.

- `frontend/src/pages/QuizRoomPage.tsx`
  - charge `getQuizLeaderboard(quizId)`.

### Ce qu'il faut savoir .

- il y a deux niveaux de stats:
  - global en memoire,
  - par quiz en base;
- le vrai historique detaille de chaque manche est anticipe dans le schema Prisma;
- dans l'etat actuel, la brique la plus solide pour la soutenance est `QuizLeaderboard`.

### Limite actuelle a annoncer si on te questionne

- les tables `Game`, `GameQuestion`, `PlayerAnswer`, `Leaderboard` existent,
  mais les services actuels ne les alimentent pas encore.

---

## 6. Remote Authentication

### But du module

Permettre une connexion OAuth 2.0 / OpenID Connect avec Google, tout en reutilisant le meme systeme de session que pour le login classique.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `.env`
- `.env.example`

Frontend:

- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/services/auth.ts`

#### Elements de base de donnees concernes

- `User.googleId`
- `User.email`
- `User.avatar_url`
- `User.username`

#### Types et structures de donnees importants

- `GoogleConfig`
- `GoogleOidcConfiguration`
- `GoogleJwk`
- `GoogleIdTokenPayload`
- `VerifiedGoogleIdTokenPayload`
- `GoogleStateCookiePayload`
- cookie `google_oauth_state`

#### Librairies et outils utilises

- `fetch`
- `crypto`
- JWT interne applicatif
- Google OpenID endpoints

### Etapes logiques d'implementation

1. Ajouter `googleId` sur `User`.
2. Ajouter une route `/auth/google/start`.
3. Generer une URL d'autorisation Google avec `state`.
4. Stocker ce `state` dans un cookie temporaire.
5. Recevoir le callback Google.
6. Verifier l'integrite du `state`.
7. Echanger le `code` contre un `id_token`.
8. Charger les JWKS Google.
9. Verifier manuellement la signature du token et ses claims.
10. Trouver ou creer l'utilisateur applicatif.
11. Reutiliser `login()` pour poser le meme cookie JWT applicatif.
12. Rediriger vers le frontend.

### Fichiers et fonctions importants

- `backend/src/modules/auth/auth.controller.ts`
  - `startGoogleAuth()`
  - `handleGoogleCallback()`

- `backend/src/modules/auth/auth.service.ts`
  - `buildGoogleAuthorizationUrl()`
  - `handleGoogleCallback()`
  - `exchangeGoogleCodeForTokens()`
  - `verifyGoogleIdToken()`
  - `getGoogleOidcConfiguration()`
  - `getGoogleJwks()`
  - `findOrCreateGoogleUser()`
  - `generateAvailableUsername()`

- `frontend/src/pages/LoginPage.tsx`
  - construit `googleAuthUrl`,
  - gere le retour utilisateur en cas d'erreur OAuth.

### Ce qu'il faut savoir .

- le projet ne depend pas d'un SDK Google magique pour toute la logique;
- la verification du token est faite explicitement:
  - signature,
  - issuer,
  - audience,
  - expiration,
  - email verifie;
- une fois Google valide, on retombe sur le **meme** mecanisme de session JWT que le login classique.

---

## 7. Web-Based Game

### But du module

Faire jouer plusieurs utilisateurs a un quiz en direct dans le navigateur, sans logiciel externe.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/src/modules/quizzes/*`
- `backend/src/modules/game/*`
- `backend/src/modules/rooms/*`
- `backend/src/modules/realtime/*`

Frontend:

- `frontend/src/pages/QuizAdminPage.tsx`
- `frontend/src/pages/QuizRoomPage.tsx`
- `frontend/src/pages/RoomPage.tsx`
- `frontend/src/hooks/useRoomPage.ts`
- `frontend/src/services/quizzes.ts`
- `frontend/src/services/game.ts`
- `frontend/src/services/rooms.ts`
- `frontend/src/services/ws.ts`
- `frontend/src/components/QuizBuilder/*`
- `frontend/src/components/room/*`

#### Elements de base de donnees concernes

- `Quiz`
- `QuizQuestion`
- `Room`
- `RoomPlayer`
- `QuizLeaderboard`

#### Types et structures de donnees importants

- `CreateQuizDto`
- `QuizResponse`
- `QuestionEntry`
- `RoomQuestionBank`
- `RoomRuntime`
- `GameState`
- `SubmitAnswerResult`

#### Librairies et outils utilises

- React
- React Router
- NestJS
- Socket.IO
- Prisma

### Etapes logiques d'implementation

1. Construire un mini back-office de creation de quiz.
2. Stocker les questions et leurs reponses en base.
3. Permettre de creer une room rattachee a un quiz.
4. Lancer une partie a partir de cette room.
5. Charger les questions du quiz dans un cache runtime par room.
6. Diffuser une question publique sans reveler la bonne reponse.
7. Autoriser chaque joueur a repondre une seule fois.
8. Calculer les points.
9. Diffuser l'etat courant et le classement.
10. Cloturer la partie et pousser les stats.

### Fichiers et fonctions importants

- `backend/src/modules/quizzes/quizzes.service.ts`
  - `createQuiz()` cree quiz + questions.
  - `toQuizResponse()` convertit le modele Prisma vers le contrat API.

- `backend/src/modules/game/game.service.ts`
  - coeur du gameplay quiz.
  - `ensureRoomQuestions()` charge les questions d'un quiz dans le cache de room.
  - `getQuestionIdForTurn()` mappe le numero de tour a une question.
  - `getPublicQuestion()` cache la reponse correcte.
  - `submitAnswer()` gere l'unicite de reponse, le calcul de score et l'etat.

- `frontend/src/pages/QuizAdminPage.tsx`
  - montre comment le quiz est prepare avant d'etre joue.

- `frontend/src/pages/QuizRoomPage.tsx`
  - page catalogue d'un quiz:
    creation de rooms, rooms live, leaderboard.

- `frontend/src/hooks/useRoomPage.ts`
  - page de jeu en direct.

### Ce qu'il faut savoir .

- le "jeu web" n'est pas un canvas ou un moteur physique, c'est ici un quiz temps reel navigateur;
- le serveur garde l'autorite sur:
  - question active,
  - score,
  - timer,
  - fin de manche;
- le frontend n'est qu'un client de rendu et d'interaction.

---

## 8. Remote Players

### But du module

Permettre a des joueurs sur des machines differentes de participer a la meme room.

### Prerequis

#### Fichiers concernes

- `docker-compose.yml`
- `scripts/generate-dev-cert.sh`
- `backend/src/main.ts`
- `frontend/webpack.config.cjs`
- `backend/src/modules/auth/*`
- `backend/src/modules/realtime/*`
- `frontend/src/services/ws.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/hooks/useRoomPage.ts`
- `scripts/smoke-test.sh`
- `scripts/ws-smoke-test.sh`

#### Elements de base de donnees concernes

- `User`
- `Room`
- `RoomPlayer`

#### Types et structures de donnees importants

- cookie `access_token`
- `ws:connected`
- `room:joined`
- `room:state`

#### Librairies et outils utilises

- HTTPS local via `mkcert`
- cookies cross-origin avec credentials
- Socket.IO transports `websocket` + `polling`
- Docker Compose

### Etapes logiques d'implementation

1. Servir frontend et backend en HTTPS local.
2. Autoriser CORS avec `credentials: true`.
3. Utiliser des cookies de session adaptes:
   - `sameSite: none` si origine HTTPS,
   - `secure: true` en HTTPS.
4. Ouvrir le socket avec `withCredentials: true`.
5. Synchroniser la room par WS au lieu de dependances locales navigateur.
6. Utiliser des URLs de room partageables.
7. Gerer la reconnexion et l'auto-rattachement aux rooms.

### Fichiers et fonctions importants

- `backend/src/main.ts`
  - active HTTPS et CORS.

- `backend/src/modules/auth/auth.service.ts`
  - `getAuthCookieOptions()` adapte les cookies a l'origine front.

- `frontend/src/services/ws.ts`
  - active `withCredentials: true`.

- `frontend/src/pages/LoginPage.tsx`
  - gere le retour vers une room apres authentification via `joinRoom`.

- `frontend/src/hooks/useRoomPage.ts`
  - `copyRoomLink()` permet de partager l'URL d'acces.

### Ce qu'il faut savoir .

- la vraie difficulte n'etait pas "ouvrir un socket", mais faire cohabiter:
  - HTTPS local,
  - cookies JWT,
  - WebSocket authentifie,
  - partage d'URL entre machines;
- le projet a ete pense pour un usage multi-client, pas pour une seule fenetre locale.

---

## 9. Multiplayer (>2 Players)

### But du module

Faire fonctionner une partie avec plusieurs joueurs simultanement, et pas uniquement un duel.

### Prerequis

#### Fichiers concernes

- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/game/game.service.ts`
- `backend/src/modules/realtime/services/realtime-game-events.service.ts`
- `backend/src/modules/realtime/services/realtime-game-runtime.service.ts`
- `frontend/src/hooks/useRoomPage.ts`
- `frontend/src/components/room/RoomPlayersSection.tsx`
- `frontend/src/components/room/RoomLeaderboardSection.tsx`

#### Elements de base de donnees concernes

- `RoomPlayer`
- `Room`
- `QuizLeaderboard`

#### Types et structures de donnees importants

- `Room.players: RoomPlayer[]`
- `GameLeaderboardEntry[]`
- `Map<number, Set<number>> answeredByQuestion`
- `Map<number, number> scoresByUser`

#### Librairies et outils utilises

- Socket.IO
- React state collections
- Prisma relation `Room` <-> `RoomPlayer`

### Etapes logiques d'implementation

1. Representer l'appartenance a une room par une table de jointure `RoomPlayer`.
2. Faire du classement une liste, pas une paire fixe de joueurs.
3. Stocker les scores dans une `Map<userId, score>`.
4. Stocker les reponses deja donnees dans une `Map<questionId, Set<userId>>`.
5. Considerer une question comme terminee quand:
   - le timer expire, ou
   - `answeredUsers.size >= room.players.length`.
6. Trier dynamiquement le leaderboard.

### Fichiers et fonctions importants

- `backend/src/modules/rooms/rooms.service.ts`
  - `join()` ajoute un joueur sans limite "2 joueurs".
  - `leave()` reattribue le owner si besoin.

- `backend/src/modules/game/game.service.ts`
  - `syncScoresWithPlayers()` maintient la map de scores coherente avec les joueurs presents.
  - `hasEveryPlayerAnsweredCurrentQuestion()` est la cle du multijoueur.
  - `buildLeaderboard()` trie tous les joueurs.

- `backend/src/modules/realtime/services/realtime-game-events.service.ts`
  - apres chaque reponse, verifie si toute la room a repondu.

### Ce qu'il faut savoir .

- le multijoueur n'est pas un "cas special 3 joueurs";
- toute la logique est deja pensee pour une collection arbitraire de joueurs;
- le point technique cle est la combinaison:
  - `RoomPlayer[]`
  - `Map<userId, score>`
  - `Set<userId>` par question.

---

## 10. Add Another Game

### But du module

Transformer le projet en hub de mini-jeux plutot qu'en application mono-jeu.

### Prerequis

#### Fichiers concernes

Backend:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260415153229_add_room_configuration_fields/migration.sql`
- `backend/prisma/migrations/20260417144432_add_quiz_game_type_room/migration.sql`
- `backend/src/modules/rooms/dto/update-room.dto.ts`
- `backend/src/modules/rooms/rooms.service.ts`

Frontend:

- `frontend/src/hooks/useRoomPage.ts`
- `frontend/src/components/room/RoomConfigSection.tsx`
- `frontend/src/components/room/RoomGameSection.tsx`
- `frontend/src/components/room/room-types.ts`

#### Elements de base de donnees concernes

- enum `RoomGameType`
- `Room.gameType`
- `Room.gameConfig`

#### Types et structures de donnees importants

- `gameType: "wordle" | "memory" | "quiz"`
- `gameConfig: Record<string, unknown> | null`
- `RoomConfigForm`
- config Wordle:
  - `wordLength`
  - `maxAttempts`
- config Memory:
  - `pairsCount`

#### Librairies et outils utilises

- Prisma JSON fields
- class-validator
- React forms

### Etapes logiques d'implementation

1. Rendre la room configurable par type de jeu.
2. Ajouter `gameType` et `gameConfig` au schema.
3. Construire un formulaire front capable de changer de type de jeu.
4. Valider la configuration cote backend avant `start()`.
5. Garder `quiz` comme branche gameplay complete.
6. Prevoir des schemas de config differents pour `wordle` et `memory`.

### Fichiers et fonctions importants

- `backend/src/modules/rooms/rooms.service.ts`
  - `update()` accepte `gameType` et `gameConfig`.
  - `assertStartConfiguration()` valide les prerequis avant lancement:
    - `quiz` exige un `quizId`,
    - `wordle` exige `wordLength` et `maxAttempts`,
    - `memory` exige `pairsCount`.

- `frontend/src/hooks/useRoomPage.ts`
  - `buildFormFromRoom()` rehydrate le formulaire a partir de `gameType` et `gameConfig`.
  - `saveCurrentForm()` envoie une config differente selon le type choisi.

### Ce qu'il faut savoir .

- dans ce depot, le vrai module "add another game" est surtout une **architecture extensible de room multi-jeux**;
- `quiz` est complet;
- `wordle` et `memory` sont deja modeles dans:
  - le schema,
  - la validation,
  - la configuration UI;
- si on te pousse, ne dis pas que `wordle` ou `memory` ont deja un moteur de partie aussi complet que le quiz: ce n'est pas ce que montre le code actuel.

---

## DevOps

### Objectif

La couche DevOps du projet sert a garantir:

1. un lancement reproductible sur toutes les machines;
2. une vraie difference entre stack standard et stack developpement;
3. une verification automatique via la CI;
4. une exposition limitee des outils de debug.

### Fichiers principaux

- `Makefile`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `scripts/setup-host.sh`
- `scripts/check-env.sh`
- `scripts/generate-dev-cert.sh`
- `scripts/wait-for-containers.sh`
- `scripts/smoke-test.sh`
- `scripts/ws-smoke-test.sh`
- `scripts/compose.sh`
- `scripts/container-engine.sh`
- `scripts/lib/runtime.sh`
- `backend/scripts/start-prisma-studio-dev.sh`
- `backend/scripts/prisma-studio-tcp-proxy.mjs`

### Separation des environnements

Le projet ne lance pas exactement la meme stack selon la commande utilisee.

#### `make up`

But:

- lancer la stack standard,
- front + back + db,
- sans outils de debug supplementaires.

Comportement:

- appelle `env-check`,
- appelle `setup-host`,
- appelle `compose-check`,
- appelle `ensure-public-stack`,
- genere les certificats TLS locaux,
- lance `frontend`, `backend`, `db`.

#### `make dev`

But:

- lancer la stack de developpement complete.

Comportement:

- appelle `env-check`,
- appelle `setup-host`,
- appelle `compose-check`,
- genere les certificats TLS locaux,
- force `NODE_ENV=development`,
- active le profil Compose `dev`,
- lance `db`, `backend`, `frontend`, `prisma-studio`,
- attend tous les healthchecks avant d'annoncer les URLs utiles.

### Comment `make dev` cree un environnement specifique

Il combine trois mecanismes.

#### 1. Un profil Compose dedie

Dans le `Makefile`:

- `COMPOSE_DEV := $(COMPOSE) --profile dev`

Dans `docker-compose.yml`:

- `prisma-studio` est declare avec `profiles: [dev]`

Consequence:

- `prisma-studio` n'est pas present dans la stack standard,
- il n'apparait que quand on active explicitement le profil dev.

#### 2. Une variable d'environnement differente

La commande `make dev` lance:

- `NODE_ENV=development $(COMPOSE_DEV) up ...`

Consequence:

- le backend sait qu'il est en mode developpement;
- certaines routes et outils peuvent etre montes seulement dans ce mode.

#### 3. Une surface locale supplementaire

`make dev` affiche et rend disponibles:

- frontend: `https://localhost:3000`
- Swagger: `https://localhost:4000/docs`
- Prisma Studio: `http://127.0.0.1:5555`

### Comment on a fait pour que certaines routes ne soient pas accessibles sur la version main

Il y a plusieurs garde-fous complementaires.

#### 1. Swagger n'est monte qu'en developpement

Dans `backend/src/main.ts`:

- `const isDevelopment = process.env.NODE_ENV === "development"`
- Swagger est configure seulement si `isDevelopment` est vrai.

Consequence:

- avec `make dev`, la route `/docs` existe;
- avec `make up`, elle n'est pas montee.

#### 2. La route `/api` est bloquee hors dev

Dans `backend/src/app.controller.ts`:

- `getApi()` renvoie `NotFoundException` si `NODE_ENV !== "development"`.

Consequence:

- `/api` sert de route de debug/information en dev;
- hors dev, elle devient un `404`.

#### 3. Prisma Studio est reserve au profil `dev`

Dans `docker-compose.yml`:

- `prisma-studio` est dans `profiles: [dev]`

Dans le `Makefile`:

- `make up` n'active pas ce profil;
- `make dev` l'active.

Consequence:

- Prisma Studio n'est pas accessible sur la stack standard.

#### 4. Prisma Studio est borne a `127.0.0.1`

Dans `docker-compose.yml`:

- `127.0.0.1:${PRISMA_STUDIO_PORT:-5555}:5555`

Consequence:

- meme en dev, l'outil reste local a la machine hote;
- il n'est pas expose a tout le reseau.

#### 5. La stack standard nettoie les restes de la stack dev

La cible `ensure-public-stack` fait:

- `$(COMPOSE_DEV) rm -s -f prisma-studio`

Consequence:

- si quelqu'un a lance le profil dev avant,
- la stack standard retire explicitement `prisma-studio`.

### Pourquoi cette separation est defendable

L'idee est de distinguer:

- les routes utiles a l'application,
- les routes utiles au developpement.

Les outils de dev sont tres pratiques pour l'equipe:

- Swagger pour valider les endpoints,
- `/api` pour observer la surface backend,
- Prisma Studio pour inspecter la base.

Mais ils ne sont pas necessaires dans la version standard et augmenteraient inutilement la surface exposee.

### Communication entre services dans Compose

#### `frontend`

Role:

- sert l'application React;
- agit comme reverse proxy de dev vers le backend.

Points importants:

- port hote `FRONTEND_PORT -> 3000`
- variable `BACKEND_TARGET=https://backend:4000`
- certificats montes depuis `./certs`
- healthcheck sur l'origine frontend

#### `backend`

Role:

- sert l'API NestJS;
- sert le namespace WebSocket;
- dialogue avec PostgreSQL via Prisma.

Points importants:

- port hote `BACKEND_PORT -> 4000`
- `FRONTEND_ORIGIN` sert a CORS et aux cookies
- `NODE_ENV` change selon la commande `make`
- healthcheck sur `/health`

#### `db`

Role:

- service PostgreSQL persistant.

Points importants:

- port hote `POSTGRES_PORT -> 5432`
- volume `postgres_volume`
- healthcheck `pg_isready`

#### `prisma-studio`

Role:

- console locale de lecture/edition de base pour le dev.

Points importants:

- active seulement en profil `dev`
- `NODE_ENV=development`
- port local `127.0.0.1:5555`
- lancement via `backend/scripts/start-prisma-studio-dev.sh`

### Reverse proxy frontend

Dans `frontend/webpack.config.cjs`, le frontend proxifie:

- `/api`
- `/health`
- `/auth`
- `/users`
- `/rooms`
- `/game`
- `/scores`
- `/quizzes`
- `/socket.io`

Pourquoi c'est important:

- le navigateur reste branche sur `https://localhost:3000`;
- le front relaie vers `https://backend:4000`;
- cela simplifie les cookies, les appels REST et les WebSockets.

Le proxy contient aussi une exception pour ne pas casser le routing SPA sur certaines URLs `/rooms/...` quand le navigateur demande du HTML.

### Gestion TLS locale

Le projet a ete concu pour tourner en HTTPS local.

#### `scripts/setup-host.sh`

Ce script:

- verifie ou installe `mkcert`,
- prepare Homebrew si necessaire,
- installe la CA locale,
- verifie qu'un runtime Compose compatible existe.

#### `scripts/generate-dev-cert.sh`

Ce script:

- cree `certs/dev-localhost.crt`
- cree `certs/dev-localhost.key`
- copie la CA dans `certs/mkcert-rootCA.pem`
- genere un certificat valide pour:
  - `localhost`
  - `127.0.0.1`
  - `::1`
  - `frontend`
  - `backend`
  - `quiz_frontend`
  - `quiz_backend`

Pourquoi c'est important:

- la stack peut tester des cookies `secure`;
- le websocket tourne dans un contexte HTTPS realiste;
- l'equipe travaille dans un environnement proche d'une vraie exposition reseau.

### Validation du `.env`

Le script `scripts/check-env.sh` verifie:

- presence des variables essentielles;
- absence de placeholders trop evidents;
- format de `DATABASE_URL`;
- coherence de `DATABASE_URL` avec les identifiants PostgreSQL;
- format HTTPS de `FRONTEND_ORIGIN`;
- coherence entre `FRONTEND_ORIGIN` et `FRONTEND_PORT`;
- validite de `GAME_QUESTION_DURATION_MS`.

Interet:

- eviter des lancements incomplets;
- detecter les erreurs de configuration avant Compose.

### Abstraction Docker / Podman

Le projet n'est pas accroche a un seul moteur de conteneurs.

#### `scripts/lib/runtime.sh`

Contient la logique commune pour:

- detecter `docker` ou `podman`,
- detecter `docker compose`, `podman compose`, `docker-compose` ou `podman-compose`,
- normaliser les commandes.

#### `scripts/compose.sh`

- appelle le helper `compose`

#### `scripts/container-engine.sh`

- appelle le helper `run_container_engine`

Interet:

- le meme `Makefile` marche sur plusieurs postes;
- l'equipe n'a pas besoin de reecrire toutes les commandes selon le moteur disponible.

### Scripts a connaitre

#### Scripts de bootstrap

- `scripts/setup-host.sh`
- `scripts/check-env.sh`
- `scripts/generate-dev-cert.sh`

#### Scripts d'orchestration

- `scripts/compose.sh`
- `scripts/container-engine.sh`
- `scripts/wait-for-containers.sh`

#### Scripts de test

- `scripts/smoke-test.sh`
- `scripts/ws-smoke-test.sh`
- `backend/scripts/ws-smoke-test.mjs`

#### Scripts Prisma Studio

- `backend/scripts/start-prisma-studio-dev.sh`
- `backend/scripts/prisma-studio-tcp-proxy.mjs`

### Healthchecks et readiness

Le projet ne considere pas qu'un conteneur est pret juste parce qu'il "tourne".

Chaque service a un healthcheck:

- `frontend`: requete HTTP sur l'origine frontend
- `backend`: requete sur `/health`
- `db`: `pg_isready`
- `prisma-studio`: requete HTTP locale

Ensuite `scripts/wait-for-containers.sh`:

- recupere les IDs des conteneurs;
- inspecte leur etat ou leur etat de healthcheck;
- attend jusqu'a `healthy` ou `running`;
- echoue explicitement si un service passe en `unhealthy`, `exited` ou `dead`.

### Smoke tests

#### `scripts/smoke-test.sh`

Ce script verifie la coherence globale de la stack:

- etat des conteneurs,
- endpoints HTTP,
- configuration DB,
- authentification,
- proxy frontend.

Il utilise:

- `curl`
- le certificat CA local
- des requetes SQL dans le conteneur `db`

#### `scripts/ws-smoke-test.sh`

Ce wrapper lance le smoke test WebSocket.

#### `backend/scripts/ws-smoke-test.mjs`

Ce script teste des cas reels:

- auth WebSocket,
- cycle de vie d'une room,
- lancement de partie,
- reponse a une question,
- fin de timer,
- coherence entre WS et REST,
- persistance de room.

### CI

La CI est definie dans `.github/workflows/ci.yml`.

#### Job `build`

Matrix:

- `backend` avec Node 22
- `frontend` avec Node 20

Ce job:

- checkout le repo,
- installe les dependances,
- build chaque application.

But:

- attraper les erreurs de compilation tres tot.

#### Job `docker-smoke-test`

Ce job:

1. prepare un `.env` dedie a la CI;
2. installe `mkcert`;
3. truste la CA locale;
4. genere les certificats partages;
5. lance `docker compose up --build -d --wait`;
6. execute `scripts/smoke-test.sh`;
7. execute le smoke test WebSocket dans `quiz_backend`;
8. affiche les logs en cas d'echec;
9. detruit completement la stack.

But:

- verifier non seulement que ca build,
- mais surtout que la stack complete fonctionne ensemble.

### Comment presenter la difference entre version dev et version main

La formulation la plus juste est:

- la difference ne repose pas seulement sur Git;
- elle repose surtout sur le **mode de lancement**.

En pratique:

- `make dev`
  - active `NODE_ENV=development`
  - active le profil Compose `dev`
  - monte Swagger
  - monte Prisma Studio
  - laisse les surfaces de debug disponibles

- `make up`
  - ne force pas `NODE_ENV=development`
  - ne monte pas Swagger
  - rend `/api` indisponible
  - retire Prisma Studio si besoin

### Resume defendable

Si on te demande "comment avez-vous gere la partie DevOps ?", la reponse courte la plus solide est:

- "On a unifie le lancement avec Make + Compose."
- "On a rendu la stack portable entre Docker et Podman."
- "On a force un HTTPS local propre avec mkcert."
- "On a separe une stack standard et une stack de developpement grace a un profil Compose et `NODE_ENV=development`."
- "On a reserve Swagger, `/api` et Prisma Studio au mode dev."
- "Et on a automatise la verification complete avec une CI qui build puis joue des smoke tests HTTP et WebSocket."

## Synthese par fichiers les plus importants

Si tu ne dois retenir que 12 fichiers pour "comprendre tout le projet", prends ceux-la:

1. `backend/prisma/schema.prisma`
2. `backend/src/main.ts`
3. `backend/src/modules/auth/auth.service.ts`
4. `backend/src/modules/users/users.service.ts`
5. `backend/src/modules/users/private-messages.service.ts`
6. `backend/src/modules/rooms/rooms.service.ts`
7. `backend/src/modules/game/game.service.ts`
8. `backend/src/modules/scores/scores.service.ts`
9. `backend/src/modules/realtime/realtime.gateway.ts`
10. `backend/src/modules/realtime/services/realtime-game-runtime.service.ts`
11. `frontend/src/services/ws.ts`
12. `frontend/src/hooks/useRoomPage.ts`

## Questions types

### "Pourquoi avoir separe `rooms`, `game` et `realtime` ?"

Parce que:

- `rooms` gere la persistance et les regles de vie d'une room,
- `game` gere l'etat metier d'une partie,
- `realtime` gere le transport WebSocket et l'orchestration des diffusions.

### "Ou est l'autorite metier du jeu ?"

Sur le backend:

- timer serveur,
- validation des reponses,
- calcul des scores,
- fin de question,
- fin de partie.

### "Pourquoi certaines choses sont en memoire et d'autres en base ?"

Parce que:

- le temps reel a besoin d'un runtime tres reactif,
- l'historique/stats doit etre persiste quand il a de la valeur long terme,
- le projet montre une transition progressive entre prototype runtime et persistence durable.

### "Comment securisez-vous le WebSocket ?"

- authentification JWT par cookie au handshake,
- association `socketId -> userId`,
- verification que le `userId` du payload correspond bien au socket authentifie,
- controle d'appartenance a la room avant action.

### "Pourquoi le front n'est-il pas responsable du timer ?"

Parce que sinon deux clients pourraient voir des etats differents.
Le serveur impose la verite, le client affiche seulement le temps restant.

## Conclusion

Le coeur du projet repose sur trois idees:

- une base relationnelle claire autour de `User`, `Room`, `Quiz` et des relations sociales,
- un runtime temps reel en memoire pour les parties et la presence,
- un frontend React qui agrege REST + WebSocket dans des hooks de page.

La partie la plus complete et la plus defendable aujourd'hui est:

- auth/session,
- social,
- rooms,
- chat,
- quiz en temps reel,
- leaderboard par quiz.

La partie a presenter avec nuance est:

- historique detaille des matchs,
- deuxieme jeu complet au meme niveau que le quiz.

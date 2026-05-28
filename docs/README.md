*This project has been created as part of the 42 curriculum by tcohen, mduchauf, smgassa, hucherea, lscheupl.*

# ft_transcendence

`ft_transcendence` is a full-stack multiplayer web application built during the 42 curriculum. The project combines account management, social features, real-time communication, and browser-based mini-game sessions inside a single platform.

## Description

### Project Name

**ft_transcendence**

### Goal

The goal of the project is to build a modern web platform where users can:

- create an account or log in as a guest,
- manage a public profile,
- add friends and exchange private messages,
- create or join public and private game rooms,
- play real-time multiplayer quiz sessions in the browser,
- track scores and quiz leaderboards.

### Key Features

- Full-stack architecture with a React frontend and a NestJS backend.
- PostgreSQL database accessed through Prisma ORM.
- Real-time room, chat, and game events with Socket.IO.
- Standard authentication, guest sessions, and Google OAuth 2.0 login.
- User profile management with avatar and status updates.
- Friends system with private messaging between accepted friends.
- Quiz creation workflow and room-based quiz gameplay.
- Dockerized development stack with HTTPS enabled locally through `mkcert`.
- Smoke tests, WebSocket smoke tests, and GitHub Actions CI.

## Team Information

| Login | Role | Main Responsibilities |
| --- | --- | --- |
| `tcohen` | PM | Social and user management: profile, avatar, status, friends/friend requests, private messages |
| `mduchauf` | Tech Lead | Real-time architecture: WebSocket gateway, presence, live sync, event broadcasting, remote players |
| `smgassa` | PO | Gameplay and persistence: quiz flow, scoring, leaderboards, match history, additional game |
| `hucherea` | Developer | Core technical base: Prisma schema/migrations, classic auth + Google OAuth, session security, dev/CI scripts |
| `lscheupl` | Developer | Rooms and multiplayer: room logic, player management, match lifecycle, multiplayer coordination |

## Presentation Task Distribution

This table reflects the current split used by the team to present the implemented modules. It is separate from the implementation contributor tables documented later in this README.

| Person | Login | Modules to Explain |
| --- | --- | --- |
| 1 | `hucherea` | Use an ORM, Remote authentication, devops scripts and CI |
| 2 | `tcohen` | Allow users to interact with other users, Standard user management |
| 3 | `mduchauf` | Implement real-time features, Remote players |
| 4 | `lscheupl` | Web-based game, Multiplayer for more than two players |
| 5 | `smgassa` | Game statistics and match history, Add another game |

## Project Management

The team organized the work around a simple but regular delivery process:

- Weekly meetings were used to review progress, unblock pending topics, and reprioritize work.
- A personal weekly to-do list helped each member keep ownership of short-term objectives.
- Work was split into feature branches and reviewed through pull requests before merging.
- Integration was tracked continuously on the shared `dev` branch.

### Tools Used

- **GitHub Issues** for task tracking
- **Pull Requests** for review and integration
- **Git** branching for parallel feature development

### Communication Channels

- **Discord** for day-to-day communication
- Weekly sync meetings for planning and review

## Technical Stack

### Frontend

- **React 18**
- **TypeScript**
- **React Router**
- **Webpack Dev Server**
- **Tailwind CSS 4**
- **Socket.IO Client**

### Backend

- **NestJS**
- **TypeScript**
- **Socket.IO**
- **JWT authentication in HTTP-only cookies**
- **Swagger** for development-time API documentation

### Database

- **PostgreSQL 16**
- **Prisma ORM**

### Other Significant Tools

- **Docker / Docker Compose or Podman Compose**
- **mkcert** for locally trusted HTTPS certificates
- **GitHub Actions** for CI
- Custom smoke-test scripts for HTTP, database, and WebSocket checks

### Justification for Major Technical Choices

- **React** was chosen to build a component-based SPA with reusable UI blocks and a smooth client-side room/game experience.
- **NestJS** was chosen for its modular architecture, clear controller/service separation, DTO validation, and built-in WebSocket support.
- **PostgreSQL** was chosen because the project is strongly relational: users, friendships, rooms, games, questions, answers, and leaderboards all have explicit links.
- **Prisma** was chosen for typed database access, schema-driven migrations, and simpler maintenance of a growing relational model.
- **Socket.IO** was chosen because the application depends on real-time synchronization for room presence, chat messages, timers, answer submission, and leaderboard updates.
- **Dockerized local development** was chosen to reduce setup friction and keep frontend, backend, and database environments consistent across machines.

## Database Schema

### Overview

The database is centered around users, rooms, quiz content, gameplay history, and rankings.

```text
User
 ├─< FriendRequests >─ User
 ├─< RoomPlayer >─ Room
 ├─< Messages >─ Room
 ├─< PlayerAnswer >─ GameQuestion >─ Game >─ Room
 ├─< Leaderboard >─ Game
 └─< QuizLeaderboard >─ Quiz >─< QuizQuestion
```

### Main Tables and Relationships

| Table | Purpose | Key Relationships |
| --- | --- | --- |
| `User` | Stores registered and guest accounts | linked to rooms, messages, answers, leaderboards, and friendships |
| `FriendRequests` | Stores pending/accepted/declined friend relations | `senderId -> User`, `receiverId -> User` |
| `Room` | Stores game rooms and room configuration | owned by one user, contains players, messages, and games |
| `RoomPlayer` | Join table between users and rooms | composite key `userId + roomId` |
| `Messages` | Stores room chat messages | linked to one sender and one room |
| `Quiz` | Stores quiz metadata | linked to quiz questions, games, and quiz leaderboard entries |
| `QuizQuestion` | Stores questions and answer sets | linked to one quiz |
| `Game` | Stores one played match in one room | linked to one room, one quiz, answers, and leaderboard entries |
| `GameQuestion` | Stores per-game question order and timing | linked to one game and one quiz question |
| `PlayerAnswer` | Stores a player answer for one game question | linked to one user, one game, and one game question |
| `Leaderboard` | Stores per-game final results | linked to one game and one user |
| `QuizLeaderboard` | Stores cumulative statistics for one quiz | linked to one quiz and one user |

### Key Fields and Data Types

- `User.id`: `Int`
- `User.email`: `String`, unique
- `User.username`: `String`
- `User.isGuest`: `Boolean`
- `User.googleId`: `String?`, unique
- `User.status`: enum `online | offline`
- `Room.status`: enum `waiting | playing | finished`
- `Room.gameType`: enum `wordle | memory | quiz`
- `Room.gameConfig`: `Json?`
- `QuizQuestion.answers`: `Json`
- `PlayerAnswer.pointsEarned`: `Int`
- `QuizLeaderboard.totalScore`: `Int`
- Timestamps such as `createdAt`, `startedAt`, and `finishedAt`: `DateTime`

## Features List

| Feature | What It Does | Main Contributors |
| --- | --- | --- |
| Classic authentication | Register, log in, log out, restore session with JWT cookie | `hucherea` |
| Guest access | Lets a user enter the platform quickly with a temporary guest account | `tcohen` |
| Google OAuth 2.0 | Lets users authenticate through Google when credentials are configured | `hucherea` |
| Profile management | Update username, avatar, and online/offline status | `tcohen` |
| Friends system | Send requests, accept or decline, and browse friend state | `tcohen` |
| Private messaging | Exchange direct messages between accepted friends | `tcohen` |
| Room management | Create, configure, join, leave, and secure public/private rooms | `lscheupl` |
| Real-time room chat | Broadcast room messages live to connected players | `mduchauf` |
| Quiz creation | Build quizzes with multiple questions and configurable answer timing | `smgassa` |
| Real-time multiplayer quiz | Synchronize question start, timer, answers, and leaderboard updates | `mduchauf`, `lscheupl` |
| Score tracking | Keep global score snapshots and persistent quiz leaderboards | `smgassa` |
| CI and smoke testing | Verify builds, Docker startup, HTTP flows, DB access, and WebSocket flows | `hucherea` |

## Modules

Total module score: **22 points**

| Module | Type | Points | Why We Chose It | Implementation Summary | Main Contributors |
| --- | --- | ---: | --- | --- | --- |
| Use a framework for both frontend and backend | Major | 2 | To keep the project structured end to end | React frontend and NestJS backend, both written in TypeScript and containerized | `mduchauf`, `smgassa` |
| Use a frontend framework | Minor | 1 | To build a maintainable SPA | React components, routing, stateful room/game pages, reusable UI blocks | `smgassa` |
| Use a backend framework | Minor | 1 | To organize APIs and real-time logic clearly | NestJS modules, controllers, services, guards, DTO validation, Swagger | `mduchauf` |
| Implement real-time features | Major | 2 | Real-time interaction is core to the project | Socket.IO namespace `/ws`, live room state, chat, timers, answer events, leaderboard broadcasts | `mduchauf` |
| Allow users to interact with other users | Major | 2 | The platform is social, not only game-driven | Friends, room chat, private messages, room sharing | `tcohen` |
| Use an ORM | Minor | 1 | To manage a growing relational schema safely | Prisma schema, migrations, typed client, generated models | `hucherea` |
| Support for additional browsers | Minor | 1 | To keep the web app usable beyond a single browser | Standard web APIs, HTTPS local setup, cookie-based auth, Socket.IO transport fallback (`websocket` and `polling`) | `hucherea` |
| Standard user management | Major | 2 | Identity and profile flows are essential | Register/login/logout, guest mode, session recovery, avatar, status, friends | `tcohen` |
| Game statistics and match history | Minor | 1 | To make the game state meaningful over time | `Game`, `Leaderboard`, and `QuizLeaderboard` data with score aggregation | `smgassa` |
| Remote authentication | Minor | 1 | To improve login UX and cover OAuth requirements | Google OAuth 2.0/OpenID Connect login flow with callback handling | `hucherea` |
| Web-based game | Major | 2 | The project must be playable in the browser | Multiplayer quiz sessions run directly in the web app | `lscheupl` |
| Remote players | Major | 2 | Players must be able to join from separate machines | HTTPS local stack, cookie auth, Socket.IO synchronization, room joins over the network | `mduchauf` |
| Multiplayer for more than two players | Major | 2 | The project targets group play, not only duels | Room player lists, answer aggregation, live ranking for multiple participants | `lscheupl` |
| Add another game | Major | 2 | To design the platform as a mini-game hub and not a single-use app | Room configuration supports several mini-game presets (`quiz`, `wordle`), with quiz mode being the most complete gameplay path at the moment | `smgassa` |

## Instructions

### Prerequisites

To run the project as documented here, you need:

- `make`
- a compatible container runtime with Compose support:
  - Docker + Docker Compose, or
  - Podman + Podman Compose
- `mkcert` for trusted local HTTPS certificates
- Bash-compatible shell

For contributors who want to build apps outside containers:

- **Node.js 20** for the frontend
- **Node.js 22** for the backend
- **PostgreSQL 16** if running the database manually

### Environment Configuration

The project reads its configuration from the root `.env` file.

1. Create the file:

```bash
make env-init
```

2. Review and adjust the values copied from `.env.example`.

Main variables:

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_USER` | Yes | PostgreSQL user |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | PostgreSQL database name |
| `POSTGRES_PORT` | Yes | PostgreSQL exposed port |
| `DATABASE_URL` | Yes | Prisma connection string |
| `BACKEND_PORT` | Yes | Backend exposed port |
| `FRONTEND_PORT` | Yes | Frontend exposed port |
| `JWT_SECRET` | Yes | Secret used to sign session tokens |
| `JWT_EXPIRES_IN` | Yes | JWT lifetime |
| `FRONTEND_ORIGIN` | Yes | Allowed frontend origin for CORS/cookies |
| `GAME_QUESTION_DURATION_MS` | Yes | Default question timer |
| `PRISMA_STUDIO_PORT` | Optional | Local Prisma Studio port |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional | Google OAuth callback URL |

### Step-by-Step Startup

1. Initialize the environment file:

```bash
make env-init
```

2. Trust the local certificate authority once on your machine:

```bash
make tls-trust
```

3. Check that the `.env` file is complete:

```bash
make env-check
```

4. Start the full stack:

```bash
make up
```

5. Open the application:

- Frontend: `https://localhost:3000`
- Backend health endpoint: `https://localhost:4000/health`

### Development Mode

To run the stack with development extras such as Swagger and Prisma Studio:

```bash
make dev
```

Useful development URLs:

- Frontend: `https://localhost:3000`
- Swagger: `https://localhost:4000/docs`
- Prisma Studio: `http://127.0.0.1:5555`

### Testing

Smoke tests:

```bash
make smoke-test
```

WebSocket smoke test:

```bash
make smoke-test-ws
```

Quick stack status:

```bash
make test-stack
```

### Important Notes

- If you change PostgreSQL credentials after the first startup, clean the existing volume before restarting:

```bash
make fclean
```

- Google login remains optional. The classic and guest flows work without Google OAuth credentials.
- The Makefile automatically checks the host environment and generates the local development certificate before startup.

## Individual Contributions

The breakdown below reflects the current role split used for the project presentation and core module ownership.

### `tcohen` (PM)

- Scope: Allow users to interact with other users + Standard user management.
- Coverage: profile, avatar, status, friends/friend requests, and chat/private messages.

### `mduchauf` (Tech Lead)

- Scope: Implement real-time features + Remote players.
- Coverage: WebSocket gateway, presence, live synchronization, event broadcasting, and cross-machine updates.

### `smgassa` (PO)

- Scope: Game statistics and match history + Add another game.
- Coverage: gameplay/persistence, quiz flow, scoring, leaderboards, and match history.

### `hucherea` (Developer)

- Scope: Use an ORM + Remote authentication (OAuth 2.0) + devops scripts/CI.
- Coverage: Prisma schema/migrations, classic auth plus Google OAuth, session security, and dev/CI pipeline.

### `lscheupl` (Developer)

- Scope: Web-based game + Real-time multiplayer + Multiplayer (>2 players).
- Coverage: room logic, player management, match start, waiting/playing/finished cycle, and multiplayer coordination.

## Known Limitations

- The most complete gameplay path currently centers on the **quiz mode**.
- The room configuration already supports multiple game presets (`quiz`, `wordle`, `memory`), but the production-ready real-time loop is currently strongest on the quiz path.
- Room chat is persisted in PostgreSQL, but **private direct messages** are currently stored in a local runtime JSON store: `.runtime/private-messages-store.json`.
- The **global leaderboard** is kept in memory during runtime, while **per-quiz leaderboards** are persisted in PostgreSQL.

## Resources

### Official Documentation

- React: <https://react.dev/>
- NestJS: <https://docs.nestjs.com/>
- Prisma ORM: <https://www.prisma.io/docs>
- Socket.IO: <https://socket.io/docs/v4/>
- PostgreSQL: <https://www.postgresql.org/docs/>
- Docker Compose: <https://docs.docker.com/compose/>
- `mkcert`: <https://github.com/FiloSottile/mkcert>
- Google OpenID Connect: <https://developers.google.com/identity/openid-connect/openid-connect>

### Project-Specific Documentation

- [API front/back contract](docs/api-front-contract.md)
- [WebSocket event contract](docs/ws-event-contract.md)
- [Realtime frontend integration notes](docs/front2-realtime-integration.md)

### Tutorials and Video References

- <https://www.youtube.com/watch?v=yL1f1gt0ZbE&list=PLNEpbO9HTVNQVPu4uUOqGVVKiHoIl4_xR&index=8>
- <https://www.youtube.com/watch?v=-pbT0uKRWX8>

### AI Usage

AI was used as an **assistant**, not as an unquestioned source of truth.

It helped the team mainly with:

- reducing repetitive work such as documentation drafting, wording cleanup, and command/syntax checks,
- exploring implementation options for authentication, WebSocket behavior, testing strategies, and configuration details,
- generating explanations, debugging hypotheses, and validation ideas during development.

Rules followed by the team:

- AI-generated suggestions were reviewed, tested, and discussed with teammates before being kept.
- The team did not treat AI output as authoritative documentation.
- Only code and explanations that the team understood and could defend were integrated.
- Peer review remained mandatory for important decisions and complex changes.

This README itself was also improved with AI assistance for structure and English phrasing, then aligned with the repository content and project requirements.

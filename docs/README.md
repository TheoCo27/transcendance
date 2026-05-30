*This project has been created as part of the 42 curriculum by tcohen, hucherea, lscheupl.*

# ft_transcendence

`ft_transcendence` is a full-stack web application built during the 42 curriculum. The current repository centers on account management, social interactions, quiz authoring, and leaderboard APIs inside a Dockerized local HTTPS stack.

## Goal

The platform currently allows users to:

- create an account, log in, or start as a guest,
- manage their public profile and avatar,
- add friends and exchange private messages,
- create and browse quizzes,
- consult quiz leaderboards and global score snapshots.

## Current Feature Set

- React frontend with client-side routing
- NestJS backend with REST APIs
- PostgreSQL 16 accessed through Prisma ORM
- JWT authentication stored in HTTP-only cookies
- Optional Google OAuth 2.0 login
- Guest sessions
- Friend requests and private messaging
- Quiz creation and quiz retrieval APIs
- Global score snapshots in memory and persistent quiz leaderboards in PostgreSQL
- Docker Compose local stack with HTTPS certificates
- HTTP smoke test and GitHub Actions CI

## Team Information

| Login | Role | Main Responsibilities |
| --- | --- | --- |
| `tcohen` | PM | Profiles, social flows, friends, private messages |
| `hucherea` | Developer | Prisma schema, authentication, OAuth, CI/dev tooling |
| `lscheupl` | Developer | Quiz experience, frontend pages, gameplay-facing flows |

## Project Management

The team organized delivery around:

- feature branches and pull requests,
- regular sync points for prioritization and unblockers,
- shared validation through smoke tests and CI.

Main tools:

- GitHub Issues
- Pull Requests
- Git
- Discord

## Technical Stack

### Frontend

- React 18
- TypeScript
- React Router
- Webpack Dev Server
- Tailwind CSS 4

### Backend

- NestJS
- TypeScript
- JWT authentication in HTTP-only cookies
- Swagger in development

### Database

- PostgreSQL 16
- Prisma ORM

### Tooling

- Docker / Docker Compose or Podman Compose
- OpenSSL for local HTTPS certificates
- GitHub Actions
- Bash smoke-test scripts

## Architecture Overview

The current application is built around users, friendships, quizzes, private messages, and scoreboards.

```text
Browser
  -> https://localhost:3000
  -> frontend React app
  -> proxy /api /health /auth /users /scores /quizzes
  -> https://backend:4000
  -> NestJS + Prisma
  -> postgresql://db:5432
```

## Database Overview

### Main Models

| Model | Purpose |
| --- | --- |
| `User` | Registered and guest accounts |
| `FriendRequests` | Pending and accepted social relationships |
| `PrivateMessage` | Direct messages between accepted friends |
| `Quiz` | Quiz metadata |
| `QuizQuestion` | Ordered questions and answers for one quiz |
| `QuizLeaderboard` | Persistent per-quiz ranking data |

### Important Notes

- `QuizLeaderboard` is stored in PostgreSQL.
- The global leaderboard exposed by `ScoresService` is stored in memory at runtime.
- The room/game/WebSocket stack has been removed from the current codebase.

## Main APIs

The backend currently exposes endpoints around:

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

## Modules

| Module | Type | Points | Implementation Summary |
| --- | --- | ---: | --- |
| Use a framework for both frontend and backend | Major | 2 | React frontend and NestJS backend in TypeScript |
| Use a frontend framework | Minor | 1 | SPA routing and reusable UI components |
| Use a backend framework | Minor | 1 | Modular REST API, DTO validation, guards, Swagger |
| Allow users to interact with other users | Major | 2 | Friends, requests, and private messaging |
| Use an ORM | Minor | 1 | Prisma schema, generated client, migrations |
| Support for additional browsers | Minor | 1 | Standard browser APIs and cookie-based auth |
| Standard user management | Major | 2 | Register, login, logout, guest mode, profile updates |
| Game statistics and match history | Minor | 1 | Quiz leaderboard persistence and score aggregation |
| Remote authentication | Minor | 1 | Optional Google OAuth 2.0 login |
| Web-based game | Major | 2 | Browser-based quiz authoring and quiz consumption |

## Setup

### Prerequisites

- `make`
- Docker + Docker Compose, or Podman + Podman Compose
- `openssl`
- Bash-compatible shell

Optional local app builds:

- Node.js 20 for the frontend
- Node.js 22 for the backend
- PostgreSQL 16 if running the database manually

### Environment

Create the root `.env` file:

```bash
make env-init
```

Check host prerequisites and configuration:

```bash
make setup-host
make env-check
```

Important variables:

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_USER` | Yes | PostgreSQL user |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | PostgreSQL database name |
| `POSTGRES_PORT` | Yes | PostgreSQL exposed port |
| `DATABASE_URL` | Yes | Prisma connection string |
| `BACKEND_PORT` | Yes | Backend exposed port |
| `FRONTEND_PORT` | Yes | Frontend exposed port |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | Yes | JWT lifetime |
| `FRONTEND_ORIGIN` | Yes | Allowed frontend origin |
| `GAME_QUESTION_DURATION_MS` | Yes | Default quiz question duration |
| `PRISMA_STUDIO_PORT` | Optional | Prisma Studio port in dev mode |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional | Google OAuth callback URL |

## Run The Project

Start the standard stack:

```bash
make up
```

Development mode with Swagger and Prisma Studio:

```bash
make dev
```

Useful URLs:

- Frontend: `https://localhost:3000`
- Backend health: `https://localhost:4000/health`
- Swagger in dev: `https://localhost:4000/docs`
- Prisma Studio in dev: `http://127.0.0.1:5555`

## Testing

Smoke test:

```bash
make smoke-test
```

Quick stack status:

```bash
make test-stack
```

## Known Limitations

- There is no room, matchmaking, or WebSocket gameplay stack in the current repository state.
- The global leaderboard is runtime-only and resets when the backend restarts.
- Private messaging is available only between accepted non-guest friends.
- Google login is optional and depends on local credential configuration.

## Project Documentation

- [TECH](./TECH.md)
- [DEVDOC](./DEVDOC.MD)

## AI Usage

AI was used as an assistant for drafting, wording cleanup, debugging ideas, and validation support.

Rules followed by the team:

- generated suggestions were reviewed before being kept,
- no AI output was treated as authoritative without verification,
- only code and explanations the team could explain were integrated.

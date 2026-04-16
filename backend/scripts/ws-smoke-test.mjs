#!/usr/bin/env node
import {
  connectAuthenticatedSocket,
  createAuthenticatedSession,
  createSocket,
  fail,
  pass,
  safeDisconnect,
  waitForEvent,
} from "./ws-smoke-helpers.mjs";

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000);
const BACKEND_HOST = process.env.BACKEND_HOST || "localhost";
const WS_BASE_URL =
  process.env.WS_BASE_URL || `https://${BACKEND_HOST}:${BACKEND_PORT}`;
const WS_NAMESPACE_URL = `${WS_BASE_URL}/ws`;

function section(title) {
  console.log(`\n== ${title} ==`);
}

function printTestCatalog() {
  console.log("\nTypologies de test executees:");
  console.log(" - test websocket auth");
  console.log(" - test websocket room lifecycle");
  console.log(" - test websocket game flow");
  console.log(" - test websocket rest coherence");
  console.log(" - test websocket room persistence");
}

async function run() {
  console.log("== WS smoke test Back 3 ==");
  console.log(`Namespace: ${WS_NAMESPACE_URL}`);
  printTestCatalog();
  const sockets = [];
  try {
    section("test websocket auth");
    const anonymous = createSocket(WS_NAMESPACE_URL);
    try {
      const authErrorPromise = waitForEvent(
        anonymous,
        "ws:auth:error",
        (payload) =>
          payload?.success === false && payload?.error?.code === "UNAUTHORIZED",
      );
      anonymous.connect();
      await authErrorPromise;
      pass("Connexion anonyme refusee");
    } finally {
      safeDisconnect(anonymous);
    }
    const ownerSession = await createAuthenticatedSession(WS_BASE_URL, "owner");
    const guestSession = await createAuthenticatedSession(WS_BASE_URL, "guest");
    const outsiderSession = await createAuthenticatedSession(WS_BASE_URL, "outsider");
    const owner = await connectAuthenticatedSocket(WS_NAMESPACE_URL, ownerSession.cookieHeader);
    pass(`Connexion WS OK (owner, userId=${owner.userId})`);
    const guest = await connectAuthenticatedSocket(WS_NAMESPACE_URL, guestSession.cookieHeader);
    pass(`Connexion WS OK (guest, userId=${guest.userId})`);
    const outsider = await connectAuthenticatedSocket(
      WS_NAMESPACE_URL,
      outsiderSession.cookieHeader,
    );
    pass(`Connexion WS OK (outsider, userId=${outsider.userId})`);
    const quizId = await createSmokeQuiz(WS_BASE_URL);

    section("test websocket room lifecycle");
    sockets.push(owner.socket, guest.socket, outsider.socket);
    const roomId = await createRoomWithOwner(owner, ownerSession.cookieHeader, quizId);
    await assertOutsiderCannotChat(outsider, roomId);
    await joinRoomAsGuest(guest, roomId);
    const ownerMirror = await connectAuthenticatedSocket(
      WS_NAMESPACE_URL,
      ownerSession.cookieHeader,
    );
    sockets.push(ownerMirror.socket);
    await assertSocketAutoRejoinsRoomChannel(ownerMirror, guest, roomId);
    safeDisconnect(ownerMirror.socket);
    await assertGuestCannotStartRoom(guest, roomId);

    section("test websocket game flow");
    const questionId = await startRoomAsOwnerAndGetQuestion(owner, roomId);
    await submitAndValidateAnswer(guest, roomId, questionId);
    await assertDuplicateAnswerConflict(guest, roomId, questionId);
    await assertTimerCompletesGame(guest, roomId);

    section("test websocket rest coherence");
    await assertScoresLeaderboard(WS_BASE_URL, guest.userId, quizId);

    section("test websocket room persistence");
    await assertDisconnectUpdatesRoomState(owner, guest, roomId);
    const waitingRoomId = await createRoomWithOwner(
      guest,
      guestSession.cookieHeader,
      quizId,
    );
    await assertWaitingRoomPersistsAfterLastDisconnect(
      WS_BASE_URL,
      guest,
      outsider,
      waitingRoomId,
    );
    pass("WS smoke test termine avec succes");
  } finally {
    for (const socket of sockets) safeDisconnect(socket);
  }
}

async function createSmokeQuiz(baseUrl) {
  const response = await fetch(`${baseUrl}/quizzes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `WS Smoke Quiz ${Date.now()}`,
      questionDurationSec: 10,
      questions: [
        {
          questionText: "Quelle est la couleur du ciel par temps clair ?",
          answers: ["Bleu", "Rouge", "Vert", "Jaune"],
          correctAnswerIndex: 0,
          points: 100,
        },
      ],
    }),
  });
  const payload = await assertHealthyJsonResponse(response, "Quiz creation endpoint");
  const quizId = payload?.data?.id;
  if (typeof quizId !== "number") fail("Quiz creation payload missing quiz id");
  pass(`Quiz smoke cree (id=${quizId})`);
  return quizId;
}

async function createRoomWithOwner(owner, ownerCookieHeader, quizId) {
  const roomCreatedPromise = waitForEvent(
    owner.socket,
    "room:created",
    (payload) => payload?.success === true && typeof payload?.data?.id === "number",
  );
  owner.socket.emit("room:create", {
    name: `WS Smoke ${Date.now()}`,
    rounds: 1,
    quizId,
    isPrivate: false,
  });
  const roomCreated = await roomCreatedPromise;
  const roomId = roomCreated?.data?.id;
  if (typeof roomId !== "number") fail("room:created payload missing room id");
  if (roomCreated?.data?.ownerUserId !== owner.userId) fail("room owner mismatch");
  if (roomCreated?.data?.quizId !== quizId) fail("room quiz mismatch");
  await configureRoomForStart(WS_BASE_URL, roomId, ownerCookieHeader);
  pass(`Room creee par owner (id=${roomId})`);
  return roomId;
}

async function configureRoomForStart(baseUrl, roomId, cookieHeader) {
  const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      gameType: "wordle",
      gameConfig: {
        wordLength: 5,
        maxAttempts: 6,
      },
    }),
  });

  const payload = await assertHealthyJsonResponse(
    response,
    "Room configuration endpoint",
  );

  if (
    payload?.data?.gameType !== "wordle" ||
    payload?.data?.gameConfig?.wordLength !== 5 ||
    payload?.data?.gameConfig?.maxAttempts !== 6
  ) {
    fail("Room configuration payload is malformed");
  }
}

async function assertOutsiderCannotChat(outsider, roomId) {
  const chatErrorPromise = waitForEvent(
    outsider.socket,
    "chat:message:error",
    (payload) => payload?.success === false && payload?.error?.code === "UNAUTHORIZED",
  );
  outsider.socket.emit("chat:message", {
    roomId,
    userId: outsider.userId,
    content: "intrusion",
  });
  await chatErrorPromise;
  pass("Membership chat protege (outsider refuse)");
}

async function joinRoomAsGuest(guest, roomId) {
  const joinPromise = waitForEvent(
    guest.socket,
    "room:joined",
    (payload) => payload?.success === true && payload?.data?.id === roomId,
  );
  guest.socket.emit("room:join", { roomId, userId: guest.userId });
  await joinPromise;
  pass("Guest rejoint la room");
}

async function assertGuestCannotStartRoom(guest, roomId) {
  const startErrorPromise = waitForEvent(
    guest.socket,
    "room:start:error",
    (payload) => payload?.success === false && payload?.error?.code === "UNAUTHORIZED",
  );
  guest.socket.emit("room:start", { roomId, userId: guest.userId });
  await startErrorPromise;
  pass("Droit owner sur room:start valide");
}

async function assertSocketAutoRejoinsRoomChannel(ownerMirror, guest, roomId) {
  const chatPromise = waitForEvent(
    ownerMirror.socket,
    "chat:message",
    (payload) =>
      payload?.success === true &&
      payload?.data?.roomId === roomId &&
      payload?.data?.userId === guest.userId &&
      payload?.data?.content === "mirror-check",
  );

  guest.socket.emit("chat:message", {
    roomId,
    userId: guest.userId,
    content: "mirror-check",
  });

  await chatPromise;
  pass("Socket reconnecte auto-rattache aux rooms existantes");
}

async function startRoomAsOwnerAndGetQuestion(owner, roomId) {
  const roomStartedPromise = waitForEvent(
    owner.socket,
    "room:started",
    (payload) => payload?.success === true && payload?.data?.id === roomId,
  );
  const questionPromise = waitForEvent(
    owner.socket,
    "game:question:started",
    (payload) => payload?.success === true && payload?.data?.roomId === roomId,
  );
  const timerPromise = waitForEvent(
    owner.socket,
    "game:timer",
    (payload) =>
      payload?.success === true &&
      payload?.data?.roomId === roomId &&
      typeof payload?.data?.remainingMs === "number",
  );
  owner.socket.emit("room:start", { roomId, userId: owner.userId });
  await roomStartedPromise;
  const question = await questionPromise;
  const timer = await timerPromise;
  if (typeof question?.data?.question?.text !== "string") fail("Missing question text");
  if (!Array.isArray(question?.data?.question?.options)) fail("Missing question options");
  if (typeof timer?.data?.remainingMs !== "number" || timer.data.remainingMs <= 0) {
    fail("Missing first timer tick");
  }
  pass("Start + question payload front-ready OK");
  return question.data.questionId;
}

async function submitAndValidateAnswer(guest, roomId, questionId) {
  const answerPromise = waitForEvent(
    guest.socket,
    "game:answer:result",
    (payload) => payload?.success === true && payload?.data?.userId === guest.userId,
  );
  guest.socket.emit("game:answer", { roomId, userId: guest.userId, questionId, answerIndex: 0 });
  const answer = await answerPromise;
  if (typeof answer?.data?.userTotalScore !== "number") fail("Missing userTotalScore");
  pass("Reponse + scoring OK");
}

async function assertDuplicateAnswerConflict(guest, roomId, questionId) {
  const duplicateErrorPromise = waitForEvent(
    guest.socket,
    "game:answer:error",
    (payload) => payload?.success === false && payload?.error?.code === "CONFLICT",
  );
  guest.socket.emit("game:answer", { roomId, userId: guest.userId, questionId, answerIndex: 0 });
  await duplicateErrorPromise;
  pass("Anti double-reponse OK");
}

async function assertTimerCompletesGame(guest, roomId) {
  const timeoutPromise = waitForEvent(
    guest.socket,
    "game:question:timeout",
    (payload) => payload?.success === true && payload?.data?.roomId === roomId,
    15000,
  );
  const endedPromise = waitForEvent(
    guest.socket,
    "game:ended",
    (payload) =>
      payload?.success === true &&
      payload?.data?.roomId === roomId &&
      Array.isArray(payload?.data?.leaderboard),
    15000,
  );
  const statePromise = waitForEvent(
    guest.socket,
    "game:state",
    (payload) =>
      payload?.success === true &&
      payload?.data?.roomId === roomId &&
      payload?.data?.status === "finished",
    15000,
  );

  await timeoutPromise;
  const ended = await endedPromise;
  await statePromise;

  if (ended?.data?.winnerUserId !== guest.userId) {
    fail("Unexpected winner after timer completion");
  }

  pass("Timer + fin de partie OK");
}

async function assertScoresLeaderboard(baseUrl, userId, quizId) {
  const leaderboardPayload = await fetchHealthyJson(
    `${baseUrl}/scores/leaderboard?limit=5`,
    "Leaderboard endpoint",
  );
  if (!Array.isArray(leaderboardPayload?.data)) {
    fail("Scores leaderboard payload is malformed");
  }

  const userScorePayload = await fetchHealthyJson(
    `${baseUrl}/scores/users/${userId}`,
    "User score endpoint",
  );
  const entry = userScorePayload?.data;
  if (!entry || entry.userId !== userId) {
    fail("Missing finished game result in user score endpoint");
  }

  if (entry.score < 100 || entry.wins < 1) {
    fail("Scores REST endpoints did not aggregate game result");
  }

  const quizLeaderboardPayload = await fetchHealthyJson(
    `${baseUrl}/scores/quizzes/${quizId}/leaderboard?limit=5`,
    "Quiz leaderboard endpoint",
  );
  if (!Array.isArray(quizLeaderboardPayload?.data)) {
    fail("Quiz leaderboard payload is malformed");
  }

  const quizEntry = quizLeaderboardPayload.data.find((item) => item?.userId === userId);
  if (!quizEntry) {
    fail("Missing finished game result in quiz leaderboard");
  }

  if (quizEntry.score < 100 || quizEntry.wins < 1 || quizEntry.gamesPlayed < 1) {
    fail("Quiz leaderboard did not aggregate finished game result");
  }

  pass("Scores REST coherent avec la fin de partie WS");
}

async function fetchHealthyJson(url, label) {
  const response = await fetch(url);
  return assertHealthyJsonResponse(response, label);
}

async function assertHealthyJsonResponse(response, label) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status >= 500) {
    fail(`${label} failed with server error (${response.status})`);
  }

  if (
    payload?.error?.code === "INTERNAL_SERVER_ERROR" ||
    payload?.error?.message === "Internal server error"
  ) {
    fail(`${label} returned an internal server error payload`);
  }

  if (!response.ok) {
    fail(`${label} failed (${response.status})`);
  }

  return payload;
}

async function assertDisconnectUpdatesRoomState(owner, guest, roomId) {
  const roomStatePromise = waitForEvent(
    guest.socket,
    "room:state",
    (payload) =>
      payload?.success === true &&
      payload?.data?.id === roomId &&
      !payload?.data?.players?.some((p) => p.userId === owner.userId),
  );
  safeDisconnect(owner.socket);
  await roomStatePromise;
  pass("Disconnect owner -> room mise a jour");
}

async function assertWaitingRoomPersistsAfterLastDisconnect(
  baseUrl,
  guest,
  outsider,
  roomId,
) {
  const roomListPromise = waitForEvent(
    outsider.socket,
    "room:list-updated",
    (payload) =>
      payload?.success === true &&
      Array.isArray(payload?.data) &&
      payload.data.some(
        (room) => room.id === roomId && Array.isArray(room.players) && room.players.length === 0,
      ),
  );
  safeDisconnect(guest.socket);
  await roomListPromise;

  const roomPayload = await fetchHealthyJson(
    `${baseUrl}/rooms/${roomId}`,
    "Room endpoint after last disconnect",
  );
  if (roomPayload?.data?.id !== roomId) {
    fail("Room endpoint did not return the expected room after last disconnect");
  }

  if (
    roomPayload?.data?.status !== "waiting" ||
    !Array.isArray(roomPayload?.data?.players) ||
    roomPayload.data.players.length !== 0
  ) {
    fail("Waiting room should stay available and empty after the last disconnect");
  }

  pass("Disconnect dernier joueur d'une waiting room -> room conservee");
}

run().catch((error) => {
  console.error(`[KO] ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exit(1);
});

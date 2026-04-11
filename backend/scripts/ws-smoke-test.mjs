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
  console.log(" - test websocket disconnect cleanup");
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

    section("test websocket room lifecycle");
    sockets.push(owner.socket, guest.socket, outsider.socket);
    const roomId = await createRoomWithOwner(owner);
    await assertOutsiderCannotChat(outsider, roomId);
    await joinRoomAsGuest(guest, roomId);
    await assertGuestCannotStartRoom(guest, roomId);

    section("test websocket game flow");
    const questionId = await startRoomAsOwnerAndGetQuestion(owner, roomId);
    await submitAndValidateAnswer(guest, roomId, questionId);
    await assertDuplicateAnswerConflict(guest, roomId, questionId);
    await assertTimerCompletesGame(guest, roomId);

    section("test websocket rest coherence");
    await assertScoresLeaderboard(WS_BASE_URL, guest.userId);

    section("test websocket disconnect cleanup");
    await assertDisconnectUpdatesRoomState(owner, guest, roomId);
    await assertRoomClosedAfterLastDisconnect(guest, outsider, roomId);
    pass("WS smoke test termine avec succes");
  } finally {
    for (const socket of sockets) safeDisconnect(socket);
  }
}

async function createRoomWithOwner(owner) {
  const roomCreatedPromise = waitForEvent(
    owner.socket,
    "room:created",
    (payload) => payload?.success === true && typeof payload?.data?.id === "number",
  );
  owner.socket.emit("room:create", {
    name: `WS Smoke ${Date.now()}`,
    rounds: 1,
    isPrivate: false,
  });
  const roomCreated = await roomCreatedPromise;
  const roomId = roomCreated?.data?.id;
  if (typeof roomId !== "number") fail("room:created payload missing room id");
  if (roomCreated?.data?.ownerUserId !== owner.userId) fail("room owner mismatch");
  pass(`Room creee par owner (id=${roomId})`);
  return roomId;
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
  guest.socket.emit("game:answer", { roomId, userId: guest.userId, questionId, answerIndex: 1 });
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
  guest.socket.emit("game:answer", { roomId, userId: guest.userId, questionId, answerIndex: 1 });
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

async function assertScoresLeaderboard(baseUrl, userId) {
  const response = await fetch(`${baseUrl}/scores/leaderboard?limit=5`);
  if (!response.ok) {
    fail(`Leaderboard endpoint failed (${response.status})`);
  }

  const payload = await response.json();
  const entry = payload?.data?.find?.((item) => item.userId === userId);
  if (!entry) {
    fail("Missing finished game result in scores leaderboard");
  }

  if (entry.score < 100 || entry.wins < 1) {
    fail("Scores leaderboard did not aggregate game result");
  }

  pass("Scores REST coherent avec la fin de partie WS");
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

async function assertRoomClosedAfterLastDisconnect(guest, outsider, roomId) {
  const roomRemovedPromise = waitForEvent(
    outsider.socket,
    "room:list-updated",
    (payload) =>
      payload?.success === true &&
      Array.isArray(payload?.data) &&
      !payload.data.some((room) => room.id === roomId),
  );
  safeDisconnect(guest.socket);
  await roomRemovedPromise;
  pass("Disconnect dernier joueur -> room fermee");
}

run().catch((error) => {
  console.error(`[KO] ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exit(1);
});

#!/usr/bin/env node

const {
  connectAuthenticatedSocket,
  createAuthenticatedSession,
  fail,
  pass,
  safeDisconnect,
  waitForEvent,
} = await loadHelpers();

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000);
const BACKEND_HOST = process.env.BACKEND_HOST || "localhost";
const WS_BASE_URL =
  process.env.WS_BASE_URL || `https://${BACKEND_HOST}:${BACKEND_PORT}`;
const WS_NAMESPACE_URL = `${WS_BASE_URL}/ws`;

async function loadHelpers() {
  try {
    return await import(
      new URL("../backend/scripts/ws-smoke-helpers.mjs", import.meta.url).href,
    );
  } catch {
    return import("/app/scripts/ws-smoke-helpers.mjs");
  }
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

async function run() {
  console.log("== Test WS usurpation d'identite ==");
  console.log(`Namespace: ${WS_NAMESPACE_URL}`);
  console.log(
    "But: verifier qu'un socket ne peut pas envoyer un userId appartenant a un autre joueur.",
  );

  const sockets = [];

  try {
    section("preparation");
    const ownerSession = await createAuthenticatedSession(WS_BASE_URL, "owner");
    const attackerSession = await createAuthenticatedSession(
      WS_BASE_URL,
      "attacker",
    );

    const owner = await connectAuthenticatedSocket(
      WS_NAMESPACE_URL,
      ownerSession.cookieHeader,
    );
    const attacker = await connectAuthenticatedSocket(
      WS_NAMESPACE_URL,
      attackerSession.cookieHeader,
    );

    sockets.push(owner.socket, attacker.socket);

    pass(`Owner connecte (userId=${owner.userId})`);
    pass(`Attacker connecte (userId=${attacker.userId})`);

    const quizId = await createSmokeQuiz();
    const roomId = await createRoomWithOwner(
      owner,
      ownerSession.cookieHeader,
      quizId,
    );
    await joinRoom(attacker, roomId);

    section("test usurpation chat");
    await assertChatImpersonationRejected(attacker, roomId, owner.userId);

    section("test usurpation game");
    const questionId = await startRoomAsOwnerAndGetQuestion(owner, roomId);
    await assertGameAnswerImpersonationRejected(
      attacker,
      roomId,
      questionId,
      owner.userId,
    );
    await assertLegitimateAnswerStillWorks(attacker, roomId, questionId);

    pass("Le backend refuse bien les payloads avec un userId usurpe.");
  } finally {
    for (const socket of sockets) {
      safeDisconnect(socket);
    }
  }
}

async function createSmokeQuiz() {
  const response = await fetch(`${WS_BASE_URL}/quizzes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `WS Impersonation ${Date.now()}`,
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

  const payload = await assertHealthyJsonResponse(response, "Quiz creation");
  const quizId = payload?.data?.id;

  if (typeof quizId !== "number") {
    fail("Quiz creation payload missing quiz id");
  }

  pass(`Quiz cree (id=${quizId})`);
  return quizId;
}

async function createRoomWithOwner(owner, ownerCookieHeader, quizId) {
  const roomCreatedPromise = waitForEvent(
    owner.socket,
    "room:created",
    (payload) => payload?.success === true && typeof payload?.data?.id === "number",
  );

  owner.socket.emit("room:create", {
    name: `WS Impersonation ${Date.now()}`,
    rounds: 1,
    quizId,
    isPrivate: false,
  });

  const roomCreated = await roomCreatedPromise;
  const roomId = roomCreated?.data?.id;

  if (typeof roomId !== "number") {
    fail("room:created payload missing room id");
  }

  await configureRoomForStart(roomId, ownerCookieHeader, quizId);
  pass(`Room creee (id=${roomId})`);
  return roomId;
}

async function configureRoomForStart(roomId, cookieHeader, quizId) {
  const response = await fetch(`${WS_BASE_URL}/rooms/${roomId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      gameType: "quiz",
      quizId,
    }),
  });

  const payload = await assertHealthyJsonResponse(response, "Room configuration");

  if (payload?.data?.gameType !== "quiz" || payload?.data?.quizId !== quizId) {
    fail("Room configuration payload is malformed");
  }
}

async function joinRoom(player, roomId) {
  const joinPromise = waitForEvent(
    player.socket,
    "room:joined",
    (payload) => payload?.success === true && payload?.data?.id === roomId,
  );

  player.socket.emit("room:join", { roomId, userId: player.userId });
  await joinPromise;
  pass(`Le joueur ${player.userId} a rejoint la room`);
}

async function assertChatImpersonationRejected(attacker, roomId, victimUserId) {
  const errorPromise = waitForEvent(
    attacker.socket,
    "chat:message:error",
    (payload) =>
      payload?.success === false &&
      payload?.error?.code === "UNAUTHORIZED",
  );

  attacker.socket.emit("chat:message", {
    roomId,
    userId: victimUserId,
    content: "Je parle a la place de quelqu'un d'autre",
  });

  const errorPayload = await errorPromise;
  if (errorPayload?.error?.message !== "Socket user mismatch") {
    fail(
      `Unexpected chat impersonation error message: ${errorPayload?.error?.message}`,
    );
  }

  pass("Usurpation rejetee sur chat:message");
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

  owner.socket.emit("room:start", { roomId, userId: owner.userId });

  await roomStartedPromise;
  const questionPayload = await questionPromise;
  const questionId = questionPayload?.data?.questionId;

  if (typeof questionId !== "number") {
    fail("Missing questionId after room:start");
  }

  pass(`Partie demarree, question active=${questionId}`);
  return questionId;
}

async function assertGameAnswerImpersonationRejected(
  attacker,
  roomId,
  questionId,
  victimUserId,
) {
  const errorPromise = waitForEvent(
    attacker.socket,
    "game:answer:error",
    (payload) =>
      payload?.success === false &&
      payload?.error?.code === "UNAUTHORIZED",
  );

  attacker.socket.emit("game:answer", {
    roomId,
    userId: victimUserId,
    questionId,
    answerIndex: 0,
  });

  const errorPayload = await errorPromise;
  if (errorPayload?.error?.message !== "Socket user mismatch") {
    fail(
      `Unexpected game impersonation error message: ${errorPayload?.error?.message}`,
    );
  }

  pass("Usurpation rejetee sur game:answer");
}

async function assertLegitimateAnswerStillWorks(player, roomId, questionId) {
  const answerPromise = waitForEvent(
    player.socket,
    "game:answer:result",
    (payload) =>
      payload?.success === true && payload?.data?.userId === player.userId,
  );

  player.socket.emit("game:answer", {
    roomId,
    userId: player.userId,
    questionId,
    answerIndex: 0,
  });

  const answerPayload = await answerPromise;
  if (typeof answerPayload?.data?.userTotalScore !== "number") {
    fail("Legitimate answer did not return a valid score");
  }

  pass("Le meme socket reste autorise avec son vrai userId");
}

async function assertHealthyJsonResponse(response, label) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    fail(`${label} failed (${response.status})`);
  }

  if (!payload || payload.success !== true) {
    fail(`${label} returned an unexpected payload`);
  }

  return payload;
}

run().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

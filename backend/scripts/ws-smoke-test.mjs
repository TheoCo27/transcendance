#!/usr/bin/env node

import { io } from "socket.io-client";

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000);
const BACKEND_HOST = process.env.BACKEND_HOST || "localhost";
const WS_BASE_URL =
  process.env.WS_BASE_URL || `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const WS_NAMESPACE_URL = `${WS_BASE_URL}/ws`;
const TEST_USER_ID = Number(process.env.WS_SMOKE_USER_ID || 91001);
const EVENT_TIMEOUT_MS = Number(process.env.WS_SMOKE_TIMEOUT_MS || 12000);

function pass(message) {
  console.log(`[OK] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function waitForEvent(socket, eventName, predicate, timeoutMs = EVENT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const onEvent = (payload) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timer);
      socket.off(eventName, onEvent);
      resolve(payload);
    };

    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(
        new Error(
          `Timeout waiting for event "${eventName}" after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    socket.on(eventName, onEvent);
  });
}

async function run() {
  console.log("== WS smoke test Back 3 ==");
  console.log(`Namespace: ${WS_NAMESPACE_URL}`);

  const socket = io(WS_NAMESPACE_URL, {
    autoConnect: false,
    reconnection: false,
    timeout: EVENT_TIMEOUT_MS,
    transports: ["websocket", "polling"],
  });

  socket.connect();

  try {
    await waitForEvent(
      socket,
      "ws:connected",
      (payload) => payload?.success === true,
    );
    pass("Connexion WS OK");

    const roomName = `WS Smoke ${Date.now()}`;
    const roomCreatedPromise = waitForEvent(
      socket,
      "room:created",
      (payload) => payload?.success === true,
    );

    socket.emit("room:create", {
      name: roomName,
      rounds: 2,
      isPrivate: false,
      userId: TEST_USER_ID,
    });

    const roomCreated = await roomCreatedPromise;
    const roomId = roomCreated?.data?.id;

    if (typeof roomId !== "number") {
      fail("room:created payload missing room id");
    }
    pass(`Room creee (id=${roomId})`);

    const roomStartedPromise = waitForEvent(
      socket,
      "room:started",
      (payload) => payload?.success === true && payload?.data?.id === roomId,
    );
    const gameStartedPromise = waitForEvent(
      socket,
      "game:started",
      (payload) => payload?.success === true && payload?.data?.roomId === roomId,
    );
    const questionStartedPromise = waitForEvent(
      socket,
      "game:question:started",
      (payload) => payload?.success === true && payload?.data?.roomId === roomId,
    );
    const timerPromise = waitForEvent(
      socket,
      "game:timer",
      (payload) => payload?.success === true && payload?.data?.roomId === roomId,
    );

    socket.emit("room:start", { roomId });

    await roomStartedPromise;
    await gameStartedPromise;
    const questionStarted = await questionStartedPromise;
    await timerPromise;
    pass("Start + question + timer OK");

    const questionId = questionStarted?.data?.questionId;
    if (typeof questionId !== "number") {
      fail("game:question:started payload missing questionId");
    }

    const answerResultPromise = waitForEvent(
      socket,
      "game:answer:result",
      (payload) =>
        payload?.success === true &&
        payload?.data?.roomId === roomId &&
        payload?.data?.userId === TEST_USER_ID,
    );
    const leaderboardPromise = waitForEvent(
      socket,
      "game:leaderboard",
      (payload) => payload?.success === true && Array.isArray(payload?.data),
    );

    socket.emit("game:answer", {
      roomId,
      userId: TEST_USER_ID,
      questionId,
      answerIndex: 1,
    });

    const answerResult = await answerResultPromise;
    await leaderboardPromise;
    if (typeof answerResult?.data?.userTotalScore !== "number") {
      fail("game:answer:result payload missing userTotalScore");
    }
    pass("Reponse + leaderboard OK");

    const duplicateAnswerErrorPromise = waitForEvent(
      socket,
      "game:answer:error",
      (payload) => payload?.success === false,
    );

    socket.emit("game:answer", {
      roomId,
      userId: TEST_USER_ID,
      questionId,
      answerIndex: 1,
    });

    const duplicateAnswerError = await duplicateAnswerErrorPromise;
    if (duplicateAnswerError?.error?.code !== "CONFLICT") {
      fail("Expected CONFLICT for duplicate answer");
    }
    pass("Anti double-reponse OK");

    const roomClosedPromise = waitForEvent(
      socket,
      "room:closed",
      (payload) => payload?.success === true && payload?.data?.roomId === roomId,
    );

    socket.emit("room:leave", { roomId, userId: TEST_USER_ID });

    await roomClosedPromise;
    pass("Fermeture room sur room vide OK");

    pass("WS smoke test termine avec succes");
  } finally {
    socket.disconnect();
  }
}

run().catch((error) => {
  console.error(`[KO] ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exit(1);
});


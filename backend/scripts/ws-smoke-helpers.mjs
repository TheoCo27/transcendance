import { io } from "socket.io-client";

export const EVENT_TIMEOUT_MS = Number(process.env.WS_SMOKE_TIMEOUT_MS || 12000);

export function pass(message) {
  console.log(`[OK] ${message}`);
}

export function fail(message) {
  throw new Error(message);
}

export function createSocket(namespaceUrl, cookieHeader) {
  return io(namespaceUrl, {
    autoConnect: false,
    reconnection: false,
    timeout: EVENT_TIMEOUT_MS,
    transports: ["websocket", "polling"],
    ...(cookieHeader
      ? {
          extraHeaders: {
            Cookie: cookieHeader,
          },
        }
      : {}),
  });
}

export function safeDisconnect(socket) {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export function waitForEvent(
  socket,
  eventName,
  predicate,
  timeoutMs = EVENT_TIMEOUT_MS,
) {
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

export async function connectAuthenticatedSocket(namespaceUrl, cookieHeader) {
  const socket = createSocket(namespaceUrl, cookieHeader);
  const connectedPromise = waitForEvent(
    socket,
    "ws:connected",
    (payload) =>
      payload?.success === true && typeof payload?.data?.userId === "number",
  );

  socket.connect();
  const connected = await connectedPromise;
  const userId = connected?.data?.userId;
  if (typeof userId !== "number") {
    fail("Missing userId in ws:connected");
  }

  return { socket, userId };
}

export async function createAuthenticatedSession(baseUrl, label) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `ws-smoke-${label}-${suffix}@test.com`;
  const password = "longsecuredpassword123!";

  const registerResponse = await requestJson(
    baseUrl,
    "/auth/register",
    {
      email,
      username: `ws_${label}_${Math.floor(Math.random() * 1000)}`,
      password,
    },
  );
  if (registerResponse.status < 200 || registerResponse.status >= 300) {
    fail(`Register failed for ${label} (${registerResponse.status})`);
  }

  const loginResponse = await requestJson(baseUrl, "/auth/login", {
    email,
    password,
  });
  if (loginResponse.status < 200 || loginResponse.status >= 300) {
    fail(`Login failed for ${label} (${loginResponse.status})`);
  }

  const cookieHeader = extractAccessTokenCookie(loginResponse);
  if (!cookieHeader) {
    fail(`Missing access_token cookie for ${label}`);
  }

  return { email, cookieHeader };
}

async function requestJson(baseUrl, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return {
    status: response.status,
    json,
    headers: response.headers,
  };
}

function extractAccessTokenCookie(response) {
  if (typeof response.headers.getSetCookie === "function") {
    const tokenCookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .find((value) => value.startsWith("access_token="));

    if (tokenCookie) return tokenCookie;
  }

  const singleHeader = response.headers.get("set-cookie");
  if (!singleHeader) {
    return null;
  }

  const tokenCookie = singleHeader
    .split(/,(?=\s*[A-Za-z0-9_\-]+=)/)
    .map((value) => value.trim().split(";")[0])
    .find((value) => value.startsWith("access_token="));

  return tokenCookie || null;
}

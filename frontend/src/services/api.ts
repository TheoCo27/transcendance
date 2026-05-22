export type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
};

const INTERNAL_SERVER_ERROR_PATTERN = /^internal serv(?:e|o)r error\.?$/i;
const ROOM_NOT_FOUND_PATTERN = /^room\s+.+\s+not found\.?$/i;
const QUIZ_NOT_FOUND_PATTERN = /^quiz\s+\d+\s+not found\.?$/i;
const REQUEST_FAILED_PATTERN = /^request failed \((\d+)\)$/i;

function normalizeUserFacingMessage(message: string): string {
  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    return trimmedMessage;
  }

  if (ROOM_NOT_FOUND_PATTERN.test(trimmedMessage)) {
    return "Room introuvable.";
  }

  if (QUIZ_NOT_FOUND_PATTERN.test(trimmedMessage)) {
    return "Quiz introuvable.";
  }

  if (/^authentication required\.?$/i.test(trimmedMessage)) {
    return "Authentification requise.";
  }

  if (/^invalid session payload\.?$/i.test(trimmedMessage)) {
    return "Session invalide.";
  }

  if (/^websocket authentication failed\.?$/i.test(trimmedMessage)) {
    return "Authentification temps réel impossible.";
  }

  if (/^websocket connection timeout\.?$/i.test(trimmedMessage)) {
    return "Le délai de connexion au temps réel a été dépassé.";
  }

  if (/^websocket disconnected\.?$/i.test(trimmedMessage)) {
    return "La connexion temps réel a été interrompue.";
  }

  if (/^socket user mismatch\.?$/i.test(trimmedMessage)) {
    return "La session temps réel ne correspond pas à cet utilisateur.";
  }

  if (/^owneruserid is required to create a room\.?$/i.test(trimmedMessage)) {
    return "Impossible de créer la room sans utilisateur propriétaire.";
  }

  if (/^user is not in this room\.?$/i.test(trimmedMessage)) {
    return "Vous n'êtes pas dans cette room.";
  }

  if (/^game is not running for this room\.?$/i.test(trimmedMessage)) {
    return "La partie n'est pas en cours dans cette room.";
  }

  if (/^question is not active\.?$/i.test(trimmedMessage)) {
    return "Cette question n'est plus active.";
  }

  if (/^answer index is out of range\.?$/i.test(trimmedMessage)) {
    return "La réponse sélectionnée est invalide.";
  }

  if (/^user already answered this question\.?$/i.test(trimmedMessage)) {
    return "Vous avez déjà répondu à cette question.";
  }

  if (/^no questions configured\.?$/i.test(trimmedMessage)) {
    return "Aucune question n'est configurée pour cette partie.";
  }

  if (/^message content is required\.?$/i.test(trimmedMessage)) {
    return "Le message ne peut pas être vide.";
  }

  const requestFailedMatch = trimmedMessage.match(REQUEST_FAILED_PATTERN);
  if (requestFailedMatch) {
    return `La requête a échoué (${requestFailedMatch[1]}).`;
  }

  if (/^invalid server response\.?$/i.test(trimmedMessage)) {
    return "La réponse du serveur est invalide.";
  }

  return trimmedMessage;
}

export function getUserFacingServerMessage(
  message: string | null | undefined,
  fallback?: string,
): string | null {
  if (typeof message === "string" && message.trim().length > 0) {
    if (INTERNAL_SERVER_ERROR_PATTERN.test(message.trim())) {
      return null;
    }

    return normalizeUserFacingMessage(message);
  }

  return fallback ?? null;
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback?: string,
): string | null {
  if (error instanceof Error) {
    if (INTERNAL_SERVER_ERROR_PATTERN.test(error.message.trim())) {
      return null;
    }

    return error.message.trim().length > 0
      ? normalizeUserFacingMessage(error.message)
      : (fallback ?? null);
  }

  return fallback ?? null;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { response, json } = await performApiRequest<T>(path, init);

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${response.status})`);
  }

  if (!json || !json.success || json.data === null) {
    throw new Error("Invalid server response");
  }

  return json.data;
}

export async function apiRequestNullable<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const { response, json } = await performApiRequest<T>(path, init);

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${response.status})`);
  }

  if (!json || !json.success) {
    throw new Error("Invalid server response");
  }

  return json.data;
}

async function performApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{
  response: Response;
  json: ApiResponse<T> | null;
}> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }

  return {
    response,
    json,
  };
}

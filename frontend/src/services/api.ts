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

export function getUserFacingServerMessage(
  message: string | null | undefined,
  fallback?: string,
): string | null {
  if (typeof message === "string" && message.trim().length > 0) {
    if (INTERNAL_SERVER_ERROR_PATTERN.test(message.trim())) {
      console.error("Suppressed backend error message:", message);
      return null;
    }

    return message;
  }

  return fallback ?? null;
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback?: string,
): string | null {
  if (error instanceof Error) {
    if (INTERNAL_SERVER_ERROR_PATTERN.test(error.message.trim())) {
      console.error("Suppressed backend error:", error);
      return null;
    }

    return error.message.trim().length > 0 ? error.message : (fallback ?? null);
  }

  return fallback ?? null;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${response.status})`);
  }

  if (!json || !json.success || json.data === null) {
    throw new Error("Invalid server response");
  }

  return json.data;
}

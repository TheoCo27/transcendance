import { HttpException, HttpStatus } from "@nestjs/common";
import { type ApiErrorPayload } from "./api-response";

export function getExceptionStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

export function getErrorCode(status: number): string {
  const maybeCode = HttpStatus[status];
  return typeof maybeCode === "string"
    ? maybeCode
    : "INTERNAL_SERVER_ERROR";
}

export function getExceptionMessage(exception: unknown): string {
  if (!(exception instanceof HttpException)) {
    return "Internal server error";
  }

  const response = exception.getResponse();
  if (typeof response === "string") {
    return response;
  }

  if (typeof response === "object" && response !== null) {
    const value = (response as { message?: unknown }).message;
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return exception.message;
}

export function buildErrorPayload(exception: unknown): ApiErrorPayload {
  const status = getExceptionStatus(exception);

  return {
    code: getErrorCode(status),
    message: getExceptionMessage(exception),
  };
}

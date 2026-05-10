// Ce fichier regroupe les helpers qui convertissent une exception
// en payload d'erreur exploitable par le frontend.
import { HttpException, HttpStatus } from "@nestjs/common";
import { type ApiErrorPayload } from "./api-response";

// Retourne le statut HTTP a renvoyer pour une exception donnee.
export function getExceptionStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

// Convertit un code HTTP en code d'erreur textuel stable pour le frontend.
export function getErrorCode(status: number): string {
  const maybeCode = HttpStatus[status];
  return typeof maybeCode === "string"
    ? maybeCode
    : "INTERNAL_SERVER_ERROR";
}

// Extrait le meilleur message lisible possible depuis une exception NestJS.
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

// Assemble le payload d'erreur final renvoye dans les reponses API.
export function buildErrorPayload(exception: unknown): ApiErrorPayload {
  const status = getExceptionStatus(exception);

  return {
    code: getErrorCode(status),
    message: getExceptionMessage(exception),
  };
}

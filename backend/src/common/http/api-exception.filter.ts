import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { type ApiErrorPayload } from "./api-response";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = this.getStatus(exception);
    const error = this.buildErrorPayload(exception, status);

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : "Unhandled exception",
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      data: null,
      error,
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildErrorPayload(
    exception: unknown,
    status: number,
  ): ApiErrorPayload {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === "string") {
        return {
          code: this.getErrorCode(status),
          message: response,
        };
      }

      if (this.isExceptionResponse(response)) {
        return {
          code: this.getErrorCode(status),
          message: this.extractMessage(response.message, exception.message),
        };
      }

      return {
        code: this.getErrorCode(status),
        message: exception.message,
      };
    }

    return {
      code: this.getErrorCode(status),
      message: "Internal server error",
    };
  }

  private extractMessage(message: unknown, fallback: string): string {
    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    return fallback;
  }

  private getErrorCode(status: number): string {
    return HttpStatus[status] ?? "INTERNAL_SERVER_ERROR";
  }

  private isExceptionResponse(
    response: unknown,
  ): response is { message?: unknown } {
    return typeof response === "object" && response !== null;
  }
}

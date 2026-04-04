import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = this.extractMessage(exceptionResponse, exception);

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: `HTTP_${status}`,
        message,
      },
    });
  }

  private extractMessage(exceptionResponse: unknown, exception: unknown): string {
    if (typeof exceptionResponse === "string") {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === "object" &&
      "message" in exceptionResponse
    ) {
      const messageValue = (exceptionResponse as { message: unknown }).message;

      if (Array.isArray(messageValue)) {
        return messageValue.join(", ");
      }

      if (typeof messageValue === "string") {
        return messageValue;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return "Unexpected error";
  }
}


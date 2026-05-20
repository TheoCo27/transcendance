import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import {
  buildErrorPayload,
  getExceptionStatus,
} from "./error-response.util";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = getExceptionStatus(exception);
    const error = buildErrorPayload(exception);

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
}

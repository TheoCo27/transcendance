// Ce fichier definit le filtre global qui transforme les exceptions NestJS
// en reponses API homogenes du projet.
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
  // Logger dedie au filtre pour tracer les erreurs non gerees explicitement.
  private readonly logger = new Logger(ApiExceptionFilter.name);

  // Intercepte une exception HTTP ou non-HTTP et renvoie le format API standard.
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

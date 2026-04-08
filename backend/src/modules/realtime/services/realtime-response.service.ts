import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Socket } from "socket.io";
import { WsResponse } from "../realtime.types";

@Injectable()
export class RealtimeResponseService {
  private readonly logger = new Logger(RealtimeResponseService.name);

  ok<T>(data: T): WsResponse<T> {
    return {
      success: true,
      data,
      error: null,
    };
  }

  fail(code: string, message: string): WsResponse<never> {
    return {
      success: false,
      data: null,
      error: { code, message },
    };
  }

  emitError(client: Socket, event: string, exception: unknown): void {
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : "Unhandled exception",
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const status = this.getStatus(exception);
    const code = this.getErrorCode(status);
    const message = this.getErrorMessage(exception);

    client.emit(event, this.fail(code, message));
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorCode(status: number): string {
    const maybeCode = HttpStatus[status];
    return typeof maybeCode === "string"
      ? maybeCode
      : "INTERNAL_SERVER_ERROR";
  }

  private getErrorMessage(exception: unknown): string {
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
}


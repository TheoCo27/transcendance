import { HttpException, Injectable, Logger } from "@nestjs/common";
import { Socket } from "socket.io";
import { buildErrorPayload } from "@/common/http/error-response.util";
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

    const { code, message } = buildErrorPayload(exception);

    client.emit(event, this.fail(code, message));
  }
}

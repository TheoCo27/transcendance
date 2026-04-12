export type WsErrorPayload = {
  code: string;
  message: string;
};

export type WsResponse<T> =
  | {
      success: true;
      data: T;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: WsErrorPayload;
    };

export type RoomTimerRuntime = {
  roomId: number;
  questionId: number;
  questionNumber: number;
  totalQuestions: number;
  endsAtMs: number | null;
  tickInterval: NodeJS.Timeout | null;
  endTimeout: NodeJS.Timeout | null;
};

// Ce fichier centralise les types generiques utilises dans la couche WebSocket.
export type WsErrorPayload = {
  code: string;
  message: string;
};

// Reponse WebSocket standard, alignee sur la forme de reponse HTTP du projet.
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

// Structure runtime qui suit le timer actuellement actif pour une room.
export type RoomTimerRuntime = {
  roomId: number;
  questionId: number;
  questionNumber: number;
  totalQuestions: number;
  endsAtMs: number;
  tickInterval: NodeJS.Timeout;
  endTimeout: NodeJS.Timeout;
};

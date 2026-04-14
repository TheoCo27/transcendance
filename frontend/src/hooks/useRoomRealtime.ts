import { useEffect } from "react";
import type { Room } from "../services/quiz";
import type { PublicQuestion } from "../types/game";
import {
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";

type LeaderboardEntry = {
  userId: number;
  score: number;
};

type UseRoomRealtimeOptions = {
  requestedRoomId: number | null;
  currentRoomId: number | null;
  userId: number | null;
  syncCurrentRoom: (room: Room) => void;
  clearCurrentRoom: () => void;
  onRoomClosed: () => void;
  onRoomJoined: () => void;
  onLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  onQuestionStarted: (question: PublicQuestion) => void;
  onGameEnded: () => void;
};

export function useRoomRealtime({
  requestedRoomId,
  currentRoomId,
  userId,
  syncCurrentRoom,
  clearCurrentRoom,
  onRoomClosed,
  onRoomJoined,
  onLeaderboard,
  onQuestionStarted,
  onGameEnded,
}: UseRoomRealtimeOptions): void {
  useEffect(() => {
    const handleRoomState = (response: WsResponse<Room>) => {
      if (!response.success || !response.data) {
        return;
      }

      if (requestedRoomId !== response.data.id) {
        return;
      }

      syncCurrentRoom(response.data);
    };

    const handleRoomClosed = (
      response: WsResponse<{ roomId: number; reason: string }>,
    ) => {
      if (!response.success || !response.data) {
        return;
      }

      if (requestedRoomId !== response.data.roomId) {
        return;
      }

      clearCurrentRoom();
      onRoomClosed();
    };

    onWs("room:state", handleRoomState);
    onWs("room:started", handleRoomState);
    onWs("room:closed", handleRoomClosed);

    return () => {
      offWs("room:state", handleRoomState);
      offWs("room:started", handleRoomState);
      offWs("room:closed", handleRoomClosed);
    };
  }, [clearCurrentRoom, onRoomClosed, requestedRoomId, syncCurrentRoom]);

  useEffect(() => {
    const handleLeaderboard = (response: WsResponse<LeaderboardEntry[]>) => {
      if (!response.success || !response.data || requestedRoomId === null) {
        return;
      }

      onLeaderboard(response.data);
    };

    onWs("game:leaderboard", handleLeaderboard);

    return () => {
      offWs("game:leaderboard", handleLeaderboard);
    };
  }, [onLeaderboard, requestedRoomId]);

  useEffect(() => {
    const handleQuestionStarted = (
      response: WsResponse<{ roomId: number; question: PublicQuestion }>,
    ) => {
      if (!response.success || !response.data || requestedRoomId === null) {
        return;
      }

      if (response.data.roomId !== requestedRoomId) {
        return;
      }

      onQuestionStarted(response.data.question);
    };

    const handleGameEnded = (response: WsResponse<{ roomId: number }>) => {
      if (!response.success || !response.data || requestedRoomId === null) {
        return;
      }

      if (response.data.roomId !== requestedRoomId) {
        return;
      }

      onGameEnded();
    };

    onWs("game:question:started", handleQuestionStarted);
    onWs("game:ended", handleGameEnded);

    return () => {
      offWs("game:question:started", handleQuestionStarted);
      offWs("game:ended", handleGameEnded);
    };
  }, [onGameEnded, onQuestionStarted, requestedRoomId]);

  useEffect(() => {
    if (currentRoomId === null || userId === null) {
      return;
    }

    emitWs("room:join", {
      roomId: currentRoomId,
      userId,
    });
    onRoomJoined();
  }, [currentRoomId, onRoomJoined, userId]);
}

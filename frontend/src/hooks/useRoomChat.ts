import { useEffect, useState } from "react";
import {
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";

export type ChatMessageData = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

type UseRoomChatOptions = {
  roomId: number | null;
  userId: number | null;
};

type UseRoomChatResult = {
  chatMessages: ChatMessageData[];
  chatError: string | null;
  resetChat: () => void;
  sendChatMessage: (content: string) => void;
};

export function useRoomChat({
  roomId,
  userId,
}: UseRoomChatOptions): UseRoomChatResult {
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (roomId === null) {
      setChatMessages([]);
      setChatError(null);
    }
  }, [roomId]);

  useEffect(() => {
    const handleChatMessage = (response: WsResponse<ChatMessageData>) => {
      if (!response.success || !response.data || roomId === null) {
        return;
      }

      const message = response.data;

      if (message.roomId !== roomId) {
        return;
      }

      setChatMessages((previous) => [...previous, message]);
    };

    const handleChatError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setChatError(response.error?.message ?? "Erreur chat");
    };

    onWs("chat:message", handleChatMessage);
    onWs("chat:message:error", handleChatError);

    return () => {
      offWs("chat:message", handleChatMessage);
      offWs("chat:message:error", handleChatError);
    };
  }, [roomId]);

  const resetChat = () => {
    setChatMessages([]);
    setChatError(null);
  };

  const sendChatMessage = (content: string) => {
    if (roomId === null || userId === null) {
      return;
    }

    setChatError(null);
    emitWs("chat:message", {
      roomId,
      userId,
      content,
    });
  };

  return {
    chatMessages,
    chatError,
    resetChat,
    sendChatMessage,
  };
}

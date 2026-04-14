import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuizLobby } from "../../hooks/useQuizLobby";
import { useRoomChat } from "../../hooks/useRoomChat";
import { useRoomParticipants } from "../../hooks/useRoomParticipants";
import { useRoomRealtime } from "../../hooks/useRoomRealtime";
import { useAuth } from "../../providers/AuthProvider";
import type { PublicQuestion } from "../../types/game";
import { emitWs } from "../../services/ws";
import GamePanel from "./GamePanel";
import RulesPanel from "./RulesPanel";

type RoomScreenProps = {
  requestedRoomId: number | null;
};

export default function RoomScreen({ requestedRoomId }: RoomScreenProps) {
  const navigate = useNavigate();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const { user: sessionUser } = useAuth();
  const {
    currentRoom,
    loadCurrentRoom,
    clearCurrentRoom,
    syncCurrentRoom,
  } = useQuizLobby({ userId: sessionUser?.id ?? null });
  const currentRoomId = currentRoom?.id ?? null;
  const { chatMessages, chatError, resetChat, sendChatMessage } = useRoomChat({
    roomId: currentRoomId,
    userId: sessionUser?.id ?? null,
  });
  const { scoreEntries, applyLeaderboard } = useRoomParticipants(currentRoom);

  useEffect(() => {
    if (requestedRoomId === null || !Number.isInteger(requestedRoomId) || requestedRoomId < 1) {
      navigate("/", { replace: true });
      return;
    }

    const restoreRoom = async () => {
      try {
        await loadCurrentRoom(requestedRoomId);
        setIsRulesOpen(false);
      } catch {
        clearCurrentRoom();
        navigate("/", { replace: true });
      }
    };

    void restoreRoom();
  }, [clearCurrentRoom, loadCurrentRoom, navigate, requestedRoomId]);

  useRoomRealtime({
    requestedRoomId,
    currentRoomId,
    userId: sessionUser?.id ?? null,
    syncCurrentRoom,
    clearCurrentRoom,
    onRoomClosed: () => {
      navigate("/", { replace: true });
    },
    onRoomJoined: resetChat,
    onLeaderboard: applyLeaderboard,
    onQuestionStarted: (question) => {
      setCurrentQuestion(question);
      setSelectedAnswer(null);
    },
    onGameEnded: () => {
      setCurrentQuestion(null);
      setSelectedAnswer(null);
    },
  });

  const chatEntries = chatMessages.map((message) => ({
    ...message,
    username:
      scoreEntries.find((entry) => entry.userId === message.userId)?.username ??
      `Joueur #${message.userId}`,
    isSelf: sessionUser?.id === message.userId,
  }));

  if (isRulesOpen) {
    return (
      <div className="min-h-[80vh] w-full">
        <RulesPanel onClose={() => setIsRulesOpen(false)} />
      </div>
    );
  }

  return (
    <GamePanel
      onToggleRules={() => setIsRulesOpen((currentValue) => !currentValue)}
      canStartRoom={currentRoom?.status === "waiting"}
      onStartRoom={() => {
        if (currentRoom && sessionUser) {
          emitWs("room:start", {
            roomId: currentRoom.id,
            userId: sessionUser.id,
          });
        }
      }}
      onLeaveRoom={() => {
        if (currentRoom && sessionUser) {
          emitWs("room:leave", {
            roomId: currentRoom.id,
            userId: sessionUser.id,
          });
        }
        clearCurrentRoom();
        setSelectedAnswer(null);
        navigate("/");
      }}
      selectedAnswer={selectedAnswer}
      onSelectAnswer={(answerIndex) => {
        setSelectedAnswer(answerIndex);
        if (currentRoom && sessionUser && currentQuestion) {
          emitWs("game:answer", {
            roomId: currentRoom.id,
            userId: sessionUser.id,
            questionId: currentQuestion.id,
            answerIndex,
          });
        }
      }}
      currentQuestion={currentQuestion}
      scoreEntries={scoreEntries}
      chatMessages={chatEntries}
      chatError={chatError}
      onSendChatMessage={sendChatMessage}
    />
  );
}

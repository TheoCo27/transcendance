import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GamePanel from "../components/Quiz/GamePanel";
import LobbyPanel from "../components/Quiz/LobbyPanel";
import PasswordModal from "../components/Quiz/PasswordModal";
import { useAuthSession } from "../hooks/useAuthSession";
import RulesPanel from "../components/Quiz/RulesPanel";
import { useQuizLobby } from "../hooks/useQuizLobby";
import { getUserById } from "../services/users";
import {
  connectWs,
  disconnectWs,
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";

type ActivePanel = "lobby" | "game";
type ChatMessageData = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

export default function HomePage() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<ActivePanel>("lobby");
  const [isRulesOpen, setIsRulesOpen] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [scoreEntries, setScoreEntries] = useState<
    Array<{ userId: number; username: string; score: number }>
  >([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const { user: sessionUser, isLoading: isSessionLoading } = useAuthSession();
  const {
    rooms,
    roomsLoading,
    roomsError,
    currentRoom,
    roomToJoin,
    isJoinModalOpen,
    joinPassword,
    joinError,
    isJoining,
    setJoinPassword,
    closeJoinModal,
    requestJoinRoom,
    confirmJoinRoom,
    createRoomAndJoin,
  } = useQuizLobby({ userId: sessionUser?.id ?? null });

  useEffect(() => {
    if (sessionUser) {
      connectWs();
      return;
    }

    disconnectWs();
  }, [sessionUser]);

  useEffect(() => {
    if (!currentRoom) {
      setScoreEntries([]);
      setChatMessages([]);
      setChatError(null);
      return;
    }

    const loadRoomUsers = async () => {
      const entries = await Promise.all(
        currentRoom.players.map(async (player) => {
          const userId = player.userId;
          try {
            const user = await getUserById(userId);
            return { userId, username: user.username, score: 0 };
          } catch {
            return { userId, username: `Joueur #${userId}`, score: 0 };
          }
        }),
      );

      setScoreEntries(entries);
    };

    void loadRoomUsers();
  }, [currentRoom]);

  useEffect(() => {
    const handleChatMessage = (response: WsResponse<ChatMessageData>) => {
      if (!response.success || !response.data || !currentRoom) {
        return;
      }

      if (response.data.roomId !== currentRoom.id) {
        return;
      }

      setChatMessages((previous) => [...previous, response.data as ChatMessageData]);
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
  }, [currentRoom]);

  useEffect(() => {
    if (!currentRoom || !sessionUser) {
      return;
    }

    emitWs("room:join", {
      roomId: currentRoom.id,
      userId: sessionUser.id,
    });
    setChatMessages([]);
    setChatError(null);
  }, [currentRoom, sessionUser]);

  const handleSendChatMessage = (content: string) => {
    if (!currentRoom || !sessionUser) {
      return;
    }

    setChatError(null);
    emitWs("chat:message", {
      roomId: currentRoom.id,
      userId: sessionUser.id,
      content,
    });
  };

  const chatEntries = chatMessages.map((message) => ({
    ...message,
    username:
      scoreEntries.find((entry) => entry.userId === message.userId)?.username ??
      `Joueur #${message.userId}`,
    isSelf: sessionUser?.id === message.userId,
  }));

  return (
    <main className="flex flex-1 px-[10%] py-6">
      {isRulesOpen ? (
        <div className="min-h-[80vh] w-full">
          <RulesPanel onClose={() => setIsRulesOpen(false)} />
        </div>
      ) : null}

      {!isRulesOpen && activePanel === "lobby" ? (
        <LobbyPanel
          onToggleRules={() => setIsRulesOpen((currentValue) => !currentValue)}
          onRequireAuth={() => navigate("/login")}
          rooms={rooms}
          roomsLoading={roomsLoading}
          roomsError={roomsError}
          actionsDisabled={isSessionLoading || sessionUser === null}
          onCreateRoom={async (payload) => {
            await createRoomAndJoin(payload);
            setActivePanel("game");
            setIsRulesOpen(false);
          }}
          onJoinRoom={async (room) => {
            await requestJoinRoom(room);
            if (!room.isPrivate) {
              setActivePanel("game");
              setIsRulesOpen(false);
            }
          }}
        />
      ) : null}

      {!isRulesOpen && activePanel === "game" ? (
        <GamePanel
          onToggleRules={() => setIsRulesOpen((currentValue) => !currentValue)}
          onLeaveRoom={() => {
            if (currentRoom && sessionUser) {
              emitWs("room:leave", {
                roomId: currentRoom.id,
                userId: sessionUser.id,
              });
            }
            setActivePanel("lobby");
            setSelectedAnswer(null);
            setIsRulesOpen(false);
          }}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
          scoreEntries={scoreEntries}
          chatMessages={chatEntries}
          chatError={chatError}
          onSendChatMessage={handleSendChatMessage}
        />
      ) : null}

      <PasswordModal
        isOpen={isJoinModalOpen}
        roomName={roomToJoin?.name ?? null}
        password={joinPassword}
        joinError={joinError}
        isJoining={isJoining}
        onPasswordChange={setJoinPassword}
        onClose={closeJoinModal}
        onConfirm={() => {
          void (async () => {
            await confirmJoinRoom();
            setActivePanel("game");
            setIsRulesOpen(false);
          })();
        }}
      />
    </main>
  );
}

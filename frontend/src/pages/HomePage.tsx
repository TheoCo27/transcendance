import { useState } from "react";
import GamePanel from "../components/Quiz/GamePanel";
import LobbyPanel from "../components/Quiz/LobbyPanel";
import PasswordModal from "../components/Quiz/PasswordModal";
import RulesPanel from "../components/Quiz/RulesPanel";
import { useQuizLobby } from "../hooks/useQuizLobby";

type ActivePanel = "lobby" | "game";

export default function HomePage() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("lobby");
  const [isRulesOpen, setIsRulesOpen] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
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
  } = useQuizLobby({ userId: 1 });

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
          rooms={rooms}
          roomsLoading={roomsLoading}
          roomsError={roomsError}
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
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
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

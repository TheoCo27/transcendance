import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuizLibrary } from "../../hooks/useQuizLibrary";
import { useQuizLobby } from "../../hooks/useQuizLobby";
import { useAuth } from "../../providers/AuthProvider";
import type { Quiz } from "../../services/quizzes";
import LobbyOverviewPanel from "./LobbyOverviewPanel";
import PasswordModal from "./PasswordModal";
import QuizCreatePanel from "./QuizCreatePanel";
import RoomCreateFromQuizPanel from "./RoomCreateFromQuizPanel";

export default function LobbyScreen() {
  const navigate = useNavigate();
  const [isQuizCreateOpen, setIsQuizCreateOpen] = useState(false);
  const [selectedRoomQuiz, setSelectedRoomQuiz] = useState<Quiz | null>(null);
  const { user: sessionUser, isLoading: isSessionLoading } = useAuth();
  const {
    quizzes,
    quizzesLoading,
    quizzesError,
    isCreatingQuiz,
    createQuizAndRefresh,
  } = useQuizLibrary();
  const {
    rooms,
    roomsLoading,
    roomsError,
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
  const actionsDisabled = isSessionLoading || sessionUser === null;

  const requireAuth = () => {
    navigate("/login");
  };

  return (
    <>
      {selectedRoomQuiz ? (
        <RoomCreateFromQuizPanel
          quiz={selectedRoomQuiz}
          onBack={() => setSelectedRoomQuiz(null)}
          onCreateRoom={async (payload) => {
            const room = await createRoomAndJoin(payload);
            setSelectedRoomQuiz(null);
            navigate(`/room/${room.id}`);
          }}
        />
      ) : isQuizCreateOpen ? (
        <QuizCreatePanel
          isCreatingQuiz={isCreatingQuiz}
          actionsDisabled={actionsDisabled}
          onBack={() => setIsQuizCreateOpen(false)}
          onCreateQuiz={createQuizAndRefresh}
          onRequireAuth={requireAuth}
        />
      ) : (
        <LobbyOverviewPanel
          rooms={rooms}
          roomsLoading={roomsLoading}
          roomsError={roomsError}
          quizzes={quizzes}
          quizzesLoading={quizzesLoading}
          quizzesError={quizzesError}
          actionsDisabled={actionsDisabled}
          onCreateQuiz={() => setIsQuizCreateOpen(true)}
          onCreateRoomFromQuiz={setSelectedRoomQuiz}
          onJoinRoom={async (room) => {
            await requestJoinRoom(room);
            if (!room.isPrivate) {
              navigate(`/room/${room.id}`);
            }
          }}
          onRequireAuth={requireAuth}
        />
      )}

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
            const room = await confirmJoinRoom();
            if (room) {
              navigate(`/room/${room.id}`);
            }
          })();
        }}
      />
    </>
  );
}

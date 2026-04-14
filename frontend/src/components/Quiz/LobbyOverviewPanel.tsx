import Panel from "../Panel";
import PrimaryButton from "../PrimaryButton";
import type { Room } from "../../services/quiz";
import type { Quiz } from "../../services/quizzes";

type LobbyOverviewPanelProps = {
  rooms: Room[];
  roomsLoading: boolean;
  roomsError: string | null;
  quizzes: Quiz[];
  quizzesLoading: boolean;
  quizzesError: string | null;
  actionsDisabled: boolean;
  onCreateQuiz: () => void;
  onCreateRoomFromQuiz: (quiz: Quiz) => void;
  onJoinRoom: (room: Room) => Promise<void>;
  onRequireAuth: () => void;
};

export default function LobbyOverviewPanel({
  rooms,
  roomsLoading,
  roomsError,
  quizzes,
  quizzesLoading,
  quizzesError,
  actionsDisabled,
  onCreateQuiz,
  onCreateRoomFromQuiz,
  onJoinRoom,
  onRequireAuth,
}: LobbyOverviewPanelProps) {
  const roomsMessage = roomsLoading
    ? "Chargement des parties..."
    : roomsError ?? null;
  const quizzesMessage = quizzesLoading
    ? "Chargement des quiz..."
    : quizzesError ?? null;
  const hasRooms = rooms.length > 0;

  return (
    <div className="flex w-full gap-6">
      {hasRooms ? (
        <Panel className="min-h-[80vh] flex-1 px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text">Parties en cours</h1>
          </div>
          <div className="space-y-3">
            {roomsMessage ? (
              <p className="m-0 rounded-xl border border-white/10 bg-background px-4 py-4 text-sm text-text/70">
                {roomsMessage}
              </p>
            ) : null}
            {rooms.map((room) => (
              <div
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-4"
                key={room.id}
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-text">{room.name}</p>
                  <p className="m-0 mt-1 text-sm text-text/60">
                    {room.players.length} joueurs • {room.rounds} manches
                  </p>
                </div>
                <PrimaryButton
                  className="shrink-0 px-4 py-2 text-sm"
                  onClick={() => {
                    if (actionsDisabled) {
                      onRequireAuth();
                      return;
                    }
                    void onJoinRoom(room);
                  }}
                >
                  Rejoindre
                </PrimaryButton>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel className="min-h-[80vh] flex-1 px-6 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-text">Quiz existants</h2>
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={() => {
              if (actionsDisabled) {
                onRequireAuth();
                return;
              }
              onCreateQuiz();
            }}
          >
            Créer un quiz
          </button>
        </div>
        <div className="flex flex-1 flex-col space-y-3">
          {quizzesMessage ? (
            <p className="m-0 rounded-xl border border-white/10 bg-background px-4 py-4 text-sm text-text/70">
              {quizzesMessage}
            </p>
          ) : null}
          {!quizzesLoading && !quizzesError && quizzes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="m-0 text-2xl font-semibold text-text">
                Aucun quiz créé.
              </p>
              <p className="m-0 mt-2 text-base text-text/75">
                Crée le premier quiz pour pouvoir lancer une room ensuite.
              </p>
            </div>
          ) : null}
          {quizzes.map((quiz) => (
            <div
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-4"
              key={quiz.id}
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-text">{quiz.title}</p>
                <p className="m-0 mt-1 text-sm text-text/60">
                  {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}
                </p>
              </div>
              <PrimaryButton
                className="shrink-0 px-4 py-2 text-sm"
                onClick={() => {
                  if (actionsDisabled) {
                    onRequireAuth();
                    return;
                  }
                  onCreateRoomFromQuiz(quiz);
                }}
              >
                Créer une room
              </PrimaryButton>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

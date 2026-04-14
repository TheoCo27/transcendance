import { useEffect, useState } from "react";
import Panel from "../Panel";
import PrimaryButton from "../PrimaryButton";
import {
  QUIZ_ROOM_NAME_MIN_LENGTH,
  QUIZ_ROOM_PASSWORD_MIN_LENGTH,
  type CreateRoomPayload,
} from "../../services/quiz";
import type { Quiz } from "../../services/quizzes";

type QuestionDurationSeconds = 5 | 10 | 15 | 20 | 25 | 30;

type RoomCreateFromQuizPanelProps = {
  quiz: Quiz;
  onBack: () => void;
  onCreateRoom: (payload: CreateRoomPayload) => Promise<void>;
};

const questionDurations: QuestionDurationSeconds[] = [5, 10, 15, 20, 25, 30];

export default function RoomCreateFromQuizPanel({
  quiz,
  onBack,
  onCreateRoom,
}: RoomCreateFromQuizPanelProps) {
  const [roomName, setRoomName] = useState(quiz.title);
  const [questionDurationSeconds, setQuestionDurationSeconds] =
    useState<QuestionDurationSeconds>(10);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    setRoomName(quiz.title);
    setQuestionDurationSeconds(10);
    setIsPrivateRoom(false);
    setPassword("");
    setCreateError(null);
  }, [quiz]);

  const handleCreateRoom = async () => {
    setCreateError(null);

    if (roomName.trim().length < QUIZ_ROOM_NAME_MIN_LENGTH) {
      setCreateError(
        `Le nom doit contenir au moins ${QUIZ_ROOM_NAME_MIN_LENGTH} caractères.`,
      );
      return;
    }

    if (isPrivateRoom && password.length < QUIZ_ROOM_PASSWORD_MIN_LENGTH) {
      setCreateError(
        `Le mot de passe doit contenir au moins ${QUIZ_ROOM_PASSWORD_MIN_LENGTH} caractères.`,
      );
      return;
    }

    if (quiz.questions.length < 1) {
      setCreateError("Impossible de créer une room avec un quiz vide.");
      return;
    }

    setIsCreatingRoom(true);

    try {
      await onCreateRoom({
        name: roomName.trim(),
        rounds: quiz.questions.length,
        isPrivate: isPrivateRoom,
        ...(isPrivateRoom ? { password } : {}),
      });
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Erreur de création de room.",
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <Panel className="min-h-[80vh] w-full px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="m-0 text-3xl font-semibold text-text">Créer une room</h1>
        <button
          className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
          type="button"
          onClick={onBack}
        >
          Retour aux quiz
        </button>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] gap-6">
        <div className="space-y-6">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-text/70"
              htmlFor="room-quiz"
            >
              Quiz sélectionné
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text/70 outline-none"
              id="room-quiz"
              readOnly
              type="text"
              value={quiz.title}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-text/70"
              htmlFor="room-name"
            >
              Nom de la room
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
              id="room-name"
              type="text"
              placeholder="Nom de la room"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-text/70"
              htmlFor="room-rounds"
            >
              Nombre de questions
            </label>
            <input
              className="h-12 w-full rounded-xl border border-white/10 bg-background px-4 text-text/70 outline-none"
              id="room-rounds"
              readOnly
              type="text"
              value={`${quiz.questions.length} question${quiz.questions.length > 1 ? "s" : ""}`}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-text/70"
              htmlFor="question-duration"
            >
              Temps par question
            </label>
            <select
              className="h-12 w-full rounded-xl border border-white/10 bg-background px-4 text-text outline-none"
              id="question-duration"
              value={questionDurationSeconds}
              onChange={(event) =>
                setQuestionDurationSeconds(Number(event.target.value) as QuestionDurationSeconds)
              }
            >
              {questionDurations.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} secondes
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text/70" id="room-privacy-label">
              Salon privé
            </p>
            <div className="inline-flex rounded-lg border border-white/10 bg-background p-1">
              <button
                aria-pressed={!isPrivateRoom}
                aria-describedby="room-privacy-label"
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isPrivateRoom ? "text-text/70" : "bg-primary text-text",
                ].join(" ")}
                type="button"
                onClick={() => setIsPrivateRoom(false)}
              >
                Non
              </button>
              <button
                aria-pressed={isPrivateRoom}
                aria-describedby="room-privacy-label"
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isPrivateRoom ? "bg-primary text-text" : "text-text/70",
                ].join(" ")}
                type="button"
                onClick={() => setIsPrivateRoom(true)}
              >
                Oui
              </button>
            </div>
          </div>

          {isPrivateRoom ? (
            <div>
              <label
                className="mb-2 block text-sm font-medium text-text/70"
                htmlFor="room-password"
              >
                Mot de passe
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
                id="room-password"
                placeholder="Mot de passe"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          ) : null}

          {createError ? (
            <p className="m-0 text-sm text-red-300" role="alert">
              {createError}
            </p>
          ) : null}

          <PrimaryButton
            className="px-6 py-3 text-base"
            disabled={isCreatingRoom}
            onClick={() => {
              void handleCreateRoom();
            }}
          >
            {isCreatingRoom ? "Création..." : "Créer et jouer"}
          </PrimaryButton>
        </div>

        <div className="rounded-2xl border border-white/10 bg-background px-5 py-5">
          <p className="m-0 text-lg font-semibold text-text">Questions du quiz</p>
          <p className="m-0 mt-1 text-sm text-text/60">
            {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}
          </p>
          <ol className="mt-5 space-y-3 pl-5 text-sm text-text/70">
            {quiz.questions.map((question) => (
              <li key={question.id}>{question.questionText}</li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}

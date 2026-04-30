import type { GameState } from "../../services/game";
import type { Room } from "../../services/rooms";
import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import PrimaryButton from "../ui/PrimaryButton";

type PublicQuestion = {
  id: number;
  text: string;
  options: string[];
};

type RoomGameSectionProps = {
  roomStatus: Room["status"];
  gameState: GameState | null;
  currentQuestion: PublicQuestion | null;
  remainingMs: number | null;
  isUserInRoom: boolean;
  selectedAnswer: number | null;
  hasAnsweredCurrentQuestion: boolean;
  onSelectAnswer: (index: number) => void;
  onSubmitAnswer: () => void;
};

function formatRemainingTime(
  remainingMs: number | null,
  fallbackMs: number | null,
) {
  if (remainingMs === null && fallbackMs === null) {
    return "Illimite";
  }

  const source = remainingMs ?? fallbackMs ?? 0;
  return `${Math.max(0, Math.ceil(source / 1000))} sec`;
}

export default function RoomGameSection({
  roomStatus,
  gameState,
  currentQuestion,
  remainingMs,
  isUserInRoom,
  selectedAnswer,
  hasAnsweredCurrentQuestion,
  onSelectAnswer,
  onSubmitAnswer,
}: RoomGameSectionProps) {
  return (
    <>
      {gameState?.status === "playing" && currentQuestion ? (
        <section className="rounded-4xl bg-slate-950 p-6 text-text shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                Manche {gameState.currentQuestionNumber}/
                {gameState.totalQuestions}
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                {currentQuestion.text}
              </h2>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
              {formatRemainingTime(remainingMs, gameState.questionDurationMs)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {currentQuestion.options.map((option, index) => (
              <button
                key={`answer-${currentQuestion.id}-${index + 1}`}
                className={[
                  "rounded-3xl border px-5 py-5 text-left transition",
                  selectedAnswer === index
                    ? "border-amber-400 bg-amber-400/16"
                    : "border-white/12 bg-white/5 hover:bg-white/10",
                ].join(" ")}
                type="button"
                disabled={!isUserInRoom || hasAnsweredCurrentQuestion}
                onClick={() => onSelectAnswer(index)}
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  Option {index + 1}
                </span>
                <span className="mt-3 block text-base font-medium text-white">
                  {option}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryButton
              disabled={
                !isUserInRoom ||
                selectedAnswer === null ||
                hasAnsweredCurrentQuestion
              }
              onClick={onSubmitAnswer}
            >
              {hasAnsweredCurrentQuestion
                ? "Réponse envoyée"
                : "Valider ma réponse"}
            </PrimaryButton>
            <p className="text-sm text-white/68">
              {isUserInRoom
                ? "Bonne réponse à trouver avant la fin du timer."
                : "Tu dois être dans la room pour répondre au mini-jeu."}
            </p>
          </div>
        </section>
      ) : (
        <Section>
          <SectionLabel className="text-slate-400">Zone de jeu</SectionLabel>
          <SectionHeader>Le plateau s'affiche ici</SectionHeader>
          <p className="mt-4 text-sm leading-7">
            {roomStatus === "waiting"
              ? "Dès que le propriétaire lance la room, la question en cours apparaît ici."
              : roomStatus === "finished"
                ? "La partie est terminée. Le classement final reste visible à gauche."
                : "Connexion au flux de jeu en cours..."}
          </p>
        </Section>
      )}

      {roomStatus === "finished" ? (
        <section className="rounded-4xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Partie terminee
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            La room a termine sa partie.
          </h2>
          <p className="mt-3 text-sm leading-7 text-emerald-800/85">
            Le classement final reste visible ici. Tu peux revenir a l'accueil
            pour ouvrir une nouvelle room partageable.
          </p>
        </section>
      ) : null}
    </>
  );
}

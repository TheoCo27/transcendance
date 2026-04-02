import RulesPanel from "./RulesPanel";

type GamePanelProps = {
  isRulesOpen: boolean;
  onToggleRules: () => void;
  selectedAnswer: number | null;
  onSelectAnswer: (answerIndex: number) => void;
};

export default function GamePanel({
  isRulesOpen,
  onToggleRules,
  selectedAnswer,
  onSelectAnswer,
}: GamePanelProps) {
  if (isRulesOpen) {
    return (
      <div className="min-h-[80vh] w-full">
        <RulesPanel onClose={onToggleRules} />
      </div>
    );
  }

  return (
    <div className="flex w-full gap-6">
      <div className="flex min-h-[80vh] min-w-[300px] w-[25%] flex-col rounded-2xl border border-white/10 bg-surface px-6 py-6">
        <p className="mb-4 text-2xl font-semibold text-text">Chat</p>
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="max-w-[75%] rounded-2xl bg-background px-4 py-3">
            <p className="m-0 text-sm text-text/70">Pseudo 1</p>
            <p className="m-0 text-base text-text">Discussion par message</p>
          </div>
          <div className="self-end rounded-2xl bg-primary px-4 py-3">
            <p className="m-0 text-base text-text">Discussion par message</p>
          </div>
          <div className="max-w-[75%] rounded-2xl bg-background px-4 py-3">
            <p className="m-0 text-sm text-text/70">Pseudo 2</p>
            <p className="m-0 text-base text-text">
              Discussion par message
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
          <input
            className="flex-1 bg-transparent text-text outline-none placeholder:text-text/50"
            type="text"
            placeholder="Écrire un message..."
          />
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-text"
            type="button"
          >
            Envoyer
          </button>
        </div>
      </div>
      <div className="flex min-h-[80vh] min-w-[500px] flex-1 flex-col rounded-2xl border border-white/10 bg-surface px-8 py-6">
        <div className="mb-6 flex items-center justify-end">
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onToggleRules}
          >
            Règles
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-around">
          <p className="text-center text-3xl font-semibold text-text">
            Question ?
          </p>
          <div className="flex w-full max-w-[560px] flex-col gap-4">
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 0
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(0)}
            >
              Réponse 1
            </button>
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 1
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(1)}
            >
              Réponse 2
            </button>
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 2
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(2)}
            >
              Réponse 3
            </button>
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 3
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(3)}
            >
              Réponse 4
            </button>
          </div>
        </div>
      </div>
      <aside className="min-h-[80vh] min-w-[200px] w-[25%] rounded-2xl border border-white/10 bg-surface px-6 py-6">
        <p className="mb-5 text-xl font-semibold text-text">Points</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
            <span className="min-w-0 truncate">Pseudo 1</span>
            <span>100</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

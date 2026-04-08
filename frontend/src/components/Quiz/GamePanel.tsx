import Card from "../Card";
import PrimaryButton from "../PrimaryButton";

type GamePanelProps = {
  onToggleRules: () => void;
  selectedAnswer: number | null;
  onSelectAnswer: (answerIndex: number) => void;
};

export default function GamePanel({
  onToggleRules,
  selectedAnswer,
  onSelectAnswer,
}: GamePanelProps) {
  return (
    <div className="flex w-full gap-6">
      <Card className="min-h-[80vh] min-w-75 w-[25%] px-6 py-6">
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
            className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text/50"
            type="text"
            placeholder="Écrire un message..."
          />
          <PrimaryButton className="shrink-0 px-4 py-2 text-sm">
            Envoyer
          </PrimaryButton>
        </div>
      </Card>
      <Card className="min-h-[80vh] min-w-125 flex-1 px-8 py-6">
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
          <div className="flex w-full max-w-140 flex-col gap-4">
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
      </Card>
      <Card className="min-h-[80vh] min-w-50 w-[25%] px-6 py-6">
        <p className="mb-5 text-xl font-semibold text-text">Points</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
            <span className="min-w-0 truncate">Pseudo 1</span>
            <span>100</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

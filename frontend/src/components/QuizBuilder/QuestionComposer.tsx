import PrimaryButton from "../PrimaryButton";
import SecondaryButton from "../SecondaryButton";

type QuestionComposerProps = {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  error: string | null;
  onQuestionTextChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onCorrectAnswerChange: (index: number) => void;
  onValidateQuestion: () => void;
  onValidateAndAddQuestion: () => void;
};

export default function QuestionComposer({
  questionText,
  options,
  correctAnswerIndex,
  error,
  onQuestionTextChange,
  onOptionChange,
  onCorrectAnswerChange,
  onValidateQuestion,
  onValidateAndAddQuestion,
}: QuestionComposerProps) {
  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        Creer une question
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">
        Composer la manche
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Ecris la question, remplis les 4 options puis choisis la bonne reponse.
      </p>

      <label
        className="mt-6 block text-sm font-medium text-slate-700"
        htmlFor="question-text"
      >
        Question
      </label>
      <textarea
        id="question-text"
        className="mt-2 min-h-30 w-full rounded-[1.25rem] border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-amber-500"
        placeholder="Quel studio a cree Journey ?"
        value={questionText}
        onChange={(event) => onQuestionTextChange(event.target.value)}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {options.map((option, index) => {
          const isCorrect = correctAnswerIndex === index;

          return (
            <div
              key={`option-${index + 1}`}
              className={[
                "rounded-[1.5rem] border px-4 py-4 transition",
                isCorrect
                  ? "border-emerald-500/40 bg-emerald-50"
                  : "border-slate-900/10 bg-slate-50/80",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor={`option-${index + 1}`}
                >
                  Option {index + 1}
                </label>
                <button
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                    isCorrect
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900/6 text-slate-700",
                  ].join(" ")}
                  type="button"
                  onClick={() => onCorrectAnswerChange(index)}
                >
                  {isCorrect ? "Bonne" : "Choisir"}
                </button>
              </div>
              <input
                id={`option-${index + 1}`}
                className="mt-3 w-full rounded-[1rem] border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-amber-500"
                placeholder={`Reponse ${index + 1}`}
                value={option}
                onChange={(event) => onOptionChange(index, event.target.value)}
              />
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton className="w-full sm:w-auto" onClick={onValidateQuestion}>
          Valider la question
        </SecondaryButton>
        <PrimaryButton
          className="w-full sm:w-auto"
          onClick={onValidateAndAddQuestion}
        >
          Valider et ajouter une question
        </PrimaryButton>
      </div>
    </section>
  );
}

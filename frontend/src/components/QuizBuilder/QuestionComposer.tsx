import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";

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
    <Section>
      <SectionLabel className="text-slate-400">Créer une question</SectionLabel>
      <SectionHeader>Composer la manche</SectionHeader>
      <p className="mt-2 text-sm ">
        Écris la question, remplis les 4 options puis choisis la bonne réponse.
      </p>

      <label className="flex flex-col gap-1 mt-8" htmlFor="question-text">
        <span className="text-sm font-medium">Question</span>
        <textarea
          id="question-text"
          className="mt-2 min-h-24 max-h-96 w-full rounded-xl border border-white/10 bg-bg px-4 py-3 placeholder:text-text/40 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          placeholder="Quel studio a crée Journey ?"
          value={questionText}
          onChange={(event) => onQuestionTextChange(event.target.value)}
        />
      </label>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {options.map((option, index) => {
          const isCorrect = correctAnswerIndex === index;

          return (
            <div
              key={`option-${index + 1}`}
              className={[
                "rounded-3xl border px-4 py-4 transition",
                isCorrect
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-white/10 bg-bg/50 text-text-muted",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <label
                  className={[
                    "text-sm font-semibold",
                    isCorrect ? "text-success" : "text-text-muted",
                  ].join(" ")}
                  htmlFor={`option-${index + 1}`}
                >
                  Option {index + 1}
                </label>
                <button
                  className={[
                    "rounded-full px-3 py-1 text-xs font-bold uppercase transition-colors",
                    isCorrect
                      ? "bg-success text-white border border-success"
                      : "bg-white/10 text-text-muted border border-white/10 hover:bg-border/10 hover:text-text",
                  ].join(" ")}
                  type="button"
                  onClick={() => onCorrectAnswerChange(index)}
                >
                  {isCorrect ? "Bonne" : "Choisir"}
                </button>
              </div>
              <Input
                id={`option-${index + 1}`}
                className={`mt-3 w-full ${isCorrect ? "focus:ring-success focus:border-success" : ""}`}
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
        <SecondaryButton
          className="w-full sm:w-auto"
          onClick={onValidateQuestion}
          disabled={
            !questionText.trim() ||
            options.length !== 4 ||
            options.some((opt) => !opt.trim())
          }
        >
          Valider la question
        </SecondaryButton>
        <PrimaryButton
          className="w-full sm:w-auto"
          onClick={onValidateAndAddQuestion}
          disabled={
            !questionText.trim() ||
            options.length !== 4 ||
            options.some((opt) => !opt.trim())
          }
        >
          Valider et ajouter une question
        </PrimaryButton>
      </div>
    </Section>
  );
}

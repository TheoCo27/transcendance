type QuizRulesCardProps = {
  value: 10 | 30 | "unlimited";
  onChange: (value: 10 | 30 | "unlimited") => void;
};

export default function QuizRulesCard({
  value,
  onChange,
}: QuizRulesCardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        Regles du quiz
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">
        Temps par question
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Ce choix sera repris automatiquement sur la room de jeu liee au quiz.
      </p>

      <label
        className="mt-6 block text-sm font-medium text-slate-700"
        htmlFor="quiz-duration"
      >
        Temps
      </label>
      <select
        id="quiz-duration"
        className="mt-2 w-full rounded-[1.25rem] border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-amber-500"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === "10" || nextValue === "30") {
            onChange(Number(nextValue) as 10 | 30);
            return;
          }
          onChange("unlimited");
        }}
      >
        <option value="10">10 sec</option>
        <option value="30">30 sec</option>
        <option value="unlimited">Illimite</option>
      </select>
    </section>
  );
}

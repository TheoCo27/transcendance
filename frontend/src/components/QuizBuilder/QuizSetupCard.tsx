type QuizSetupCardProps = {
  title: string;
  onTitleChange: (value: string) => void;
};

export default function QuizSetupCard({
  title,
  onTitleChange,
}: QuizSetupCardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        Setup Quiz
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">
        Nom du quiz
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Donne une identite claire a la room. Ce titre servira aussi de repere
        sur la page de jeu.
      </p>

      <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="quiz-title">
        Quiz name
      </label>
      <input
        id="quiz-title"
        className="mt-2 w-full rounded-[1.25rem] border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-amber-500"
        placeholder="Ex: Histoire du jeu video"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />
    </section>
  );
}

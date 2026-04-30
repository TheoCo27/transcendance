import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";

type QuizRulesCardProps = {
  value: 10 | 30 | "unlimited";
  onChange: (value: 10 | 30 | "unlimited") => void;
};

export default function QuizRulesCard({ value, onChange }: QuizRulesCardProps) {
  return (
    <Section>
      <SectionLabel className="text-slate-400">Règles du quiz</SectionLabel>
      <SectionHeader>Temps par question</SectionHeader>
      <p className="mt-2 text-sm ">
        Ce choix sera repris automatiquement sur la room de jeu liée au quiz.
      </p>

      <label className="mt-6 block text-sm font-medium" htmlFor="quiz-duration">
        Temps
      </label>
      <select
        id="quiz-duration"
        className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-4 py-3 placeholder:text-text/40 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
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
    </Section>
  );
}

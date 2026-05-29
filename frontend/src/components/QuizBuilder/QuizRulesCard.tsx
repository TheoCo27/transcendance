import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";

type QuizRulesCardProps = {
  value: 10 | 30 ;
  onChange: (value: 10 | 30) => void;
};

export default function QuizRulesCard({ value, onChange }: QuizRulesCardProps) {
  return (
    <Section>
      <SectionLabel className="text-slate-400">Regles du quiz</SectionLabel>
      <SectionHeader>Temps par question</SectionHeader>
      <p className="mt-2 text-sm">
        Choisis le temps dont les joueurs disposeront pour répondre à chaque
        question.
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
        }}
      >
        <option value="10">10 sec</option>
        <option value="30">30 sec</option>
      </select>
    </Section>
  );
}

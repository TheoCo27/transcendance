import Section from "../ui/section";
import SectionHeader from "../ui/section-header";
import SectionLabel from "../ui/section-label";

export default function QuizRulesCard() {
  return (
    <Section>
      <SectionLabel className="text-slate-400">Regles du quiz</SectionLabel>
      <SectionHeader>Temps par question</SectionHeader>
      <p className="mt-2 text-sm">
        Le temps par question est désormais fixé automatiquement à 10 secondes.
      </p>
      <p className="mt-6 rounded-xl border border-white/10 bg-bg px-4 py-3 text-sm font-medium text-text">
        10 sec / question
      </p>
    </Section>
  );
}

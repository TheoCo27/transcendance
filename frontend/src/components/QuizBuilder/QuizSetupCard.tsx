import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import Input from "../ui/input";

type QuizSetupCardProps = {
  title: string;
  onTitleChange: (value: string) => void;
};

export default function QuizSetupCard({
  title,
  onTitleChange,
}: QuizSetupCardProps) {
  return (
    <Section>
      <SectionLabel className="text-slate-400">Setup Quiz</SectionLabel>
      <SectionHeader>Nom du quiz</SectionHeader>
      <p className="mt-2 max-w-2xl text-sm">
        Donne un titre claire avec un minimum de 6 charactères
      </p>
      <Input
        id="quiz-title"
        className="mt-8 w-full"
        placeholder="Ex: Histoire du jeu video"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />
    </Section>
  );
}

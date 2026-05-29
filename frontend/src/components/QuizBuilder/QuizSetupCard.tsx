import Section from "../ui/section";
import SectionHeader from "../ui/section-header";
import SectionLabel from "../ui/section-label";
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
      <p className="mt-2 max-w-2xl text-sm ">
        Donne une identité claire à la room. Ce titre servira aussi de repère
        sur la page de jeu.
      </p>

      <label className="flex flex-col gap-2 mt-11" htmlFor="quiz-title">
        <span className="text-sm font-medium">Nom du quiz</span>
        <Input
          id="quiz-title"
          className="w-full"
          placeholder="Ex: Histoire du jeu video"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
    </Section>
  );
}

import Panel from "../Panel";

type RulesPanelProps = {
  onClose: () => void;
};

export default function RulesPanel({ onClose }: RulesPanelProps) {
  return (
    <Panel className="h-full w-full px-8 py-6">
      <div className="mb-6 flex items-center justify-end">
        <button
          className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
          type="button"
          onClick={onClose}
        >
          Fermer les règles
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-3xl text-center">
          <h1 className="mb-6 text-3xl font-semibold text-text">Règles</h1>
          <p className="m-0 text-lg leading-8 text-text/80">
            Une question s'affiche avec quatre choix de réponse. Le but est
            de sélectionner la bonne réponse pour marquer des points. À la fin
            de la partie, le joueur qui a obtenu le plus de points remporte le
            quiz.
          </p>
        </div>
      </div>
    </Panel>
  );
}

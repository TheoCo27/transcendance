import PrimaryButton from "../PrimaryButton";

type HomeHeaderProps = {
  isCreatingRoom: boolean;
  createRoom: () => void;
};

export default function HomeHeader({
  isCreatingRoom,
  createRoom,
}: HomeHeaderProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface p-6 md:p-8">
      <p className="mb-3 inline-flex rounded-full border border-border/60 bg-bg/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        Mini-jeux multijoueur
      </p>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Joue a des mini-jeux en solo ou multijoueur avec tes amis
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-muted md:text-lg">
        Lance une partie de Wordle, participe a des jeux de mots rapides,
        discute avec les autres joueurs via le chat de room et grimpe dans le
        leaderboard en temps reel.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <PrimaryButton
          className="px-5 py-3 text-lg font-semibold tracking-wide"
          disabled={isCreatingRoom}
          onClick={createRoom}
        >
          {isCreatingRoom ? "Création..." : "Créer une room"}
        </PrimaryButton>
        <button
          className="rounded-md border border-border bg-transparent px-5 py-3 text-lg font-semibold tracking-wide text-text transition hover:bg-bg/40"
          type="button"
        >
          Rejoindre une room existante
        </button>
      </div>
    </section>
  );
}

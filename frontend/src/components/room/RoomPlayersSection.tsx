import type { Room } from "../../services/rooms";

type RoomPlayersSectionProps = {
  players: Room["players"];
  ownerUserId: number;
  playerNames: Record<number, string>;
};

export default function RoomPlayersSection({
  players,
  ownerUserId,
  playerNames,
}: RoomPlayersSectionProps) {
  return (
    <section className="rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Joueurs de la room
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-text-muted">
        Roster en direct
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <div
            key={`player-${player.userId}`}
            className="rounded-[1.25rem] border border-white/10 bg-bg px-4 py-4"
          >
            <p className="text-sm font-semibold text-text-muted">
              {playerNames[player.userId] ?? `Joueur #${player.userId}`}
            </p>
            <p className="mt-1 text-xs uppercase text-slate-500">
              {ownerUserId === player.userId ? "Owner" : "Player"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

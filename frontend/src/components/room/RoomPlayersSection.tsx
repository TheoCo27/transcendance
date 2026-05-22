import type { Room } from "../../services/rooms";
import RoomSectionHeader from "./room-section-header";
import RoomSectionLabel from "./room-section-label";
import RoomSection from "./RoomSection";

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
    <RoomSection>
      <RoomSectionLabel className="text-slate-400">
        Joueurs de la room
      </RoomSectionLabel>
      <RoomSectionHeader>Roster en direct</RoomSectionHeader>
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
    </RoomSection>
  );
}

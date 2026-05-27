import { Room } from "../../services/rooms";
import PrimaryButton from "../ui/PrimaryButton";

type RoomListProps = {
  rooms: Room[];
  onJoin: (roomId: number) => void;
  joiningRoomId: number | null;
};

function formatRoomStatus(status: string): string {
  if (status === "waiting") return "En attente";
  else if (status === "playing") return "Partie en cours";
  else return "Terminee";
}

function getRoomStatusBadgeClass(status: string): string {
  if (status === "waiting") {
    return "border-amber-300/30 bg-amber-400/15 text-amber-200";
  }

  if (status === "playing") {
    return "border-emerald-300/30 bg-emerald-400/15 text-emerald-200";
  }

  return "border-slate-300/20 bg-slate-200/10 text-slate-200";
}

export default function RoomsList({
  rooms,
  onJoin,
  joiningRoomId,
}: RoomListProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold md:text-2xl">Rooms ouvertes</h2>
        <span className="text-sm text-text-muted">
          {rooms.length === 0
            ? "Aucune room disponible"
            : `${rooms.length} disponible${rooms.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <article
            className="rounded-2xl border border-white/10 bg-surface p-5"
            key={room.id}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{room.name}</h3>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoomStatusBadgeClass(room.status)}`}
              >
                {formatRoomStatus(room.status)}
              </span>
            </div>

            <p className="mb-4 text-sm text-text-muted">
              Joueurs: {room.players.length}
            </p>

            <PrimaryButton
              className="w-full px-4 py-2.5 text-sm font-semibold"
              disabled={joiningRoomId === room.id}
              onClick={() => onJoin(room.id)}
            >
              {joiningRoomId === room.id ? "Connexion..." : "Rejoindre"}
            </PrimaryButton>
          </article>
        ))}
      </div>
    </section>
  );
}

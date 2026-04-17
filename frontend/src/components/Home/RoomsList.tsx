import { Room } from "../../services/rooms";
import PrimaryButton from "../ui/PrimaryButton";

type RoomListProps = {
  rooms: Room[];
  onJoin: (roomId: number) => void;
  joiningRoomId: number | null;
};

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
          {rooms.length} disponibles
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
                {/* <p className="text-sm text-text-muted">{room.gameType}</p> */}
              </div>
              <span className="rounded-full border border-success/60 bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                {room.status}
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

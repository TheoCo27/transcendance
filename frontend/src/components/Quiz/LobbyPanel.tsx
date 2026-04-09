import { useState } from "react";
import Panel from "../Panel";
import PrimaryButton from "../PrimaryButton";
import {
  QUIZ_ROOM_NAME_MIN_LENGTH,
  QUIZ_ROOM_PASSWORD_MIN_LENGTH,
  QUIZ_ROOM_ROUNDS_DEFAULT,
  type CreateRoomPayload,
  type Room,
} from "../../services/quiz";

type LobbyPanelProps = {
  onToggleRules: () => void;
  rooms: Room[];
  roomsLoading: boolean;
  roomsError: string | null;
  onCreateRoom: (payload: CreateRoomPayload) => Promise<void>;
  onJoinRoom: (room: Room) => Promise<void>;
};

export default function LobbyPanel({
  onToggleRules,
  rooms,
  roomsLoading,
  roomsError,
  onCreateRoom,
  onJoinRoom,
}: LobbyPanelProps) {
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [rounds, setRounds] = useState(QUIZ_ROOM_ROUNDS_DEFAULT);
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const roomsMessage = roomsLoading
    ? "Chargement des parties..."
    : roomsError ?? null;

  const handleCreateRoom = async () => {
    setCreateError(null);

    if (roomName.trim().length < QUIZ_ROOM_NAME_MIN_LENGTH) {
      setCreateError(
        `Le nom doit contenir au moins ${QUIZ_ROOM_NAME_MIN_LENGTH} caractères.`,
      );
      return;
    }

    if (isPrivateRoom && password.length < QUIZ_ROOM_PASSWORD_MIN_LENGTH) {
      setCreateError(
        `Le mot de passe doit contenir au moins ${QUIZ_ROOM_PASSWORD_MIN_LENGTH} caractères.`,
      );
      return;
    }

    const payload: CreateRoomPayload = {
      name: roomName.trim(),
      rounds,
      isPrivate: isPrivateRoom,
      ...(isPrivateRoom ? { password } : {}),
    };

    setIsCreating(true);

    try {
      await onCreateRoom(payload);
      setRoomName("");
      setRounds(QUIZ_ROOM_ROUNDS_DEFAULT);
      setPassword("");
      setIsPrivateRoom(false);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Erreur de création de room.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex w-full gap-6">
      <Panel className="min-h-[80vh] flex-1 px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Parties en cours</h1>
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onToggleRules}
          >
            Règles
          </button>
        </div>
        <div className="space-y-3">
          {roomsMessage ? (
            <p className="m-0 rounded-xl border border-white/10 bg-background px-4 py-4 text-sm text-text/70">
              {roomsMessage}
            </p>
          ) : null}
          {!roomsLoading && rooms.length === 0 ? (
            <p className="m-0 rounded-xl border border-white/10 bg-background px-4 py-4 text-sm text-text/70">
              Aucune room pour le moment.
            </p>
          ) : null}
          {rooms.map((room) => (
            <div
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-4"
              key={room.id}
            >
              <div>
                <p className="m-0 flex items-center gap-2 text-text">
                  <span>{room.name}</span>
                  {room.isPrivate ? (
                    <svg
                      aria-label="Room privée"
                      className="h-4 w-4 text-text/70"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 10V7a5 5 0 1 1 10 0v3"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                      <rect
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        x="5"
                        y="10"
                      />
                    </svg>
                  ) : null}
                </p>
                <p className="m-0 mt-1 text-sm text-text/60">
                  {room.players.length} joueurs • {room.rounds} manches
                </p>
              </div>
              <PrimaryButton
                className="px-4 py-2 text-sm"
                onClick={() => {
                  void onJoinRoom(room);
                }}
              >
                Rejoindre
              </PrimaryButton>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="min-h-[80vh] w-[30%] min-w-50 px-6 py-6">
        <h2 className="mb-5 text-2xl font-semibold text-text">
          Créer une partie
        </h2>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-text/70">Nom de la partie</p>
            <input
              className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
              type="text"
              placeholder="Nom de la partie"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text/70">Nombre de manches</p>
            <select
              className="h-12 w-full rounded-xl border border-white/10 bg-background px-4 text-text outline-none"
              value={rounds}
              onChange={(event) => setRounds(Number(event.target.value))}
            >
              <option value={3}>3 manches</option>
              <option value={4}>4 manches</option>
              <option value={5}>5 manches</option>
              <option value={6}>6 manches</option>
              <option value={7}>7 manches</option>
              <option value={8}>8 manches</option>
              <option value={9}>9 manches</option>
              <option value={10}>10 manches</option>
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text/70">Salon privé</p>
            <div className="inline-flex rounded-lg border border-white/10 bg-background p-1">
              <button
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isPrivateRoom
                    ? "text-text/70"
                    : "bg-primary text-text",
                ].join(" ")}
                type="button"
                onClick={() => setIsPrivateRoom(false)}
              >
                Non
              </button>
              <button
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isPrivateRoom
                    ? "bg-primary text-text"
                    : "text-text/70",
                ].join(" ")}
                type="button"
                onClick={() => setIsPrivateRoom(true)}
              >
                Oui
              </button>
            </div>
          </div>
          {isPrivateRoom ? (
            <div>
              <p className="mb-2 text-sm font-medium text-text/70">Mot de passe</p>
              <input
                className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          ) : null}
          {createError ? (
            <p className="m-0 text-sm text-red-300">{createError}</p>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-center pt-6">
          <PrimaryButton
            className="px-6 py-3 text-base"
            onClick={() => {
              void handleCreateRoom();
            }}
          >
            {isCreating ? "Création..." : "Créer et jouer"}
          </PrimaryButton>
        </div>
      </Panel>
    </div>
  );
}

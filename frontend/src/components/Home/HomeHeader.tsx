import { useState } from "react";
import { getRoomByName } from "../../services/rooms";
import { connectWs, emitWs } from "../../services/ws";
import { connectRoomErrorMsg } from "../../utils/err-msg";
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import { useToast } from "../ui/toast";

type HomeHeaderProps = {
  isCreatingRoom: boolean;
  createRoom: () => void;
  userId?: number;
};

export default function HomeHeader({
  isCreatingRoom,
  createRoom,
  userId,
}: HomeHeaderProps) {
  const [inputOpen, setInputOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const toast = useToast();

  async function onRoomJoined(inputValue: string) {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    if (!userId) {
      toast.error(connectRoomErrorMsg["auth_required"]);
      setInputValue("");
      setInputOpen(false);
      return;
    }
    try {
      let roomId: number;

      const resolveAsRoomLink = () => {
        const roomUrl = new URL(trimmedInput);
        const roomIdFromLink = Number(
          roomUrl.pathname.split("/").filter(Boolean).slice(-1)[0],
        );

        if (
          !roomUrl.pathname.includes("/rooms/") ||
          !Number.isInteger(roomIdFromLink) ||
          roomIdFromLink <= 0
        ) {
          throw new Error("invalid-room-link");
        }

        return roomIdFromLink;
      };

      try {
        roomId = resolveAsRoomLink();
      } catch (error) {
        if (error instanceof Error && error.message === "invalid-room-link") {
          toast.error(connectRoomErrorMsg["invalid_link"]);
          return;
        }

        try {
          const room = await getRoomByName(trimmedInput);
          roomId = room.id;
        } catch (nameLookupError) {
          toast.error(
            nameLookupError instanceof Error
              ? nameLookupError.message
              : connectRoomErrorMsg["unknown_error"],
          );
          return;
        }
      }

      setInputValue("");
      setInputOpen(false);
      await connectWs();
      emitWs("room:join", {
        roomId,
        userId,
      });
    } catch {
      toast.error(connectRoomErrorMsg["invalid_link"]);
    }
  }

  function toggleInput() {
    setInputOpen((prev) => !prev);
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

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
        <form
          action="submit"
          className={`flex items-center gap-2 ${inputOpen ? "w-full max-w-lg" : "hidden"}`}
          onSubmit={(e) => {
            e.preventDefault();
            onRoomJoined(inputValue);
          }}
        >
          <Input
            type="text"
            value={inputValue}
            onChange={onInputChange}
            placeholder="Entrez le lien ou le nom de la room que vous souhaitez rejoindre..."
            className={`w-full max-w-lg placeholder:truncate ${inputOpen ? "" : "hidden"}`}
          />
          {/* <button
            className={`${inputOpen ? "" : "hidden"} rounded-md border border-border bg-transparent px-5 py-3 text-lg font-semibold tracking-wide text-text transition hover:bg-bg/40`}
            type="submit"
          >
            Rejoindre
          </button> */}
        </form>
        <button
          className={`${inputOpen ? "hidden" : ""} rounded-md border border-border bg-transparent px-5 py-3 text-lg font-semibold tracking-wide text-text transition hover:bg-bg/40`}
          type="button"
          onClick={toggleInput}
        >
          Rejoindre une room existante
        </button>
      </div>
    </section>
  );
}

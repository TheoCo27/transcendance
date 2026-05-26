import { useEffect, useRef, useState } from "react";
import { getUserFacingErrorMessage } from "../../services/api";
import { getRoomByName } from "../../services/rooms";
import { connectWs, emitWs } from "../../services/ws";
import { connectRoomErrorMsg, createRoomErrorMsg } from "../../utils/err-msg";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import { useToast } from "../ui/toast";

type HomeHeaderProps = {
  isCreatingRoom: boolean;
  createRoom: (roomName: string) => void;
  userName?: string;
  userId?: number;
};

export default function HomeHeader({
  isCreatingRoom,
  createRoom,
  userName,
  userId,
}: HomeHeaderProps) {
  const [inputOpen, setInputOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roomNameValue, setRoomNameValue] = useState("");
  const roomNameInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (inputOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [inputOpen]);

  useEffect(() => {
    if (createDialogOpen && roomNameInputRef.current) {
      setTimeout(() => roomNameInputRef.current?.focus(), 0);
    }
  }, [createDialogOpen]);

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
          const message = getUserFacingErrorMessage(
            nameLookupError,
            connectRoomErrorMsg["unknown_error"],
          );
          if (message) {
            toast.error(message);
          }
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

  function openCreateDialog() {
    if (!userId) {
      toast.error(createRoomErrorMsg["auth_required"]);
      return;
    }

    const defaultRoomName = userName
      ? userName.startsWith("guest-archived-")
        ? "Room invité"
        : `Room de ${userName}`
      : "Ma nouvelle room";
    setRoomNameValue(defaultRoomName);
    setCreateDialogOpen(true);
  }

  function handleCreateRoomSubmit() {
    const trimmedRoomName = roomNameValue.trim();
    if (!trimmedRoomName) {
      toast.error("Le nom de la room est obligatoire.");
      return;
    }

    setCreateDialogOpen(false);
    createRoom(trimmedRoomName);
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
      <p className="mt-4 max-w-3xl leading-relaxed text-text-muted">
        Lance une partie de Wordle ou de quiz, participe à des jeux de mots
        rapides, discute avec les autres joueurs via le chat de room et grimpe
        dans le classement.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <PrimaryButton
          className="px-5 py-3 text-lg font-semibold tracking-wide"
          disabled={isCreatingRoom}
          onClick={openCreateDialog}
        >
          {isCreatingRoom ? "Création..." : "Créer une room"}
        </PrimaryButton>
        <form
          action="submit"
          className={`flex items-center gap-2 transition-all duration-300 ease-out ${
            inputOpen
              ? "w-full max-w-lg opacity-100 translate-x-0"
              : "w-0 opacity-0 -translate-x-4 overflow-hidden pointer-events-none"
          }`}
          onSubmit={(e) => {
            e.preventDefault();
            onRoomJoined(inputValue);
          }}
        >
          <Input
            type="text"
            ref={inputRef}
            value={inputValue}
            onChange={onInputChange}
            placeholder="Entrez le lien ou le nom de la room que vous souhaitez rejoindre..."
            className="w-full max-w-lg placeholder:truncate"
          />
        </form>
        <button
          className={`rounded-md border border-border bg-transparent px-5 py-3 text-lg font-semibold tracking-wide text-text transition hover:bg-bg/40 ${
            inputOpen ? "hidden" : ""
          }`}
          type="button"
          onClick={toggleInput}
        >
          Rejoindre une room existante
        </button>
      </div>

      <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nom de la room</AlertDialogTitle>
            <AlertDialogDescription>
              Choisis un nom avant de lancer la création. Tu pourras ensuite
              retrouver ta room depuis la liste.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-6 space-y-3">
            <label className="flex flex-col space-y-2">
              <span className="text-sm font-semibold text-white/55">
                Nom de la room
              </span>
              <Input
                ref={roomNameInputRef}
                value={roomNameValue}
                onChange={(event) => setRoomNameValue(event.target.value)}
                placeholder="Ex: Room de Maxime"
              />
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateRoomSubmit}>
              Créer la room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

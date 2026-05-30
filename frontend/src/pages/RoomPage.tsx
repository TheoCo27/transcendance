import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RoomSectionLabel from "../components/room/room-section-label";
import type { ChatEntry } from "../components/room/room-types";
import RoomChatSection from "../components/room/RoomChatSection";
import RoomConfigSection from "../components/room/RoomConfigSection";
import RoomLeaderboardSection from "../components/room/RoomLeaderboardSection";
import RoomPlayersSection from "../components/room/RoomPlayersSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useRoomPage } from "../hooks/useRoomPage";
import type { Room } from "../services/rooms";

function formatRemainingTime(
  remainingMs: number | null,
  fallbackMs: number | null,
) {
  if (remainingMs === null && fallbackMs === null) {
    return "Illimite";
  }

  const source = remainingMs ?? fallbackMs ?? 0;
  return `${Math.max(0, Math.ceil(source / 1000))} sec`;
}

function formatRoomStatus(status: Room["status"]) {
  if (status === "waiting") {
    return "En attente";
  }

  if (status === "playing") {
    return "En cours";
  }

  return "Terminee";
}

export default function RoomPage() {
  const { roomId: roomIdParam } = useParams();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {
    room,
    form,
    setForm,
    gameState,
    currentQuestion,
    remainingMs,
    selectedAnswer,
    setSelectedAnswer,
    hasAnsweredCurrentQuestion,
    playerNames,
    playerAvatars,
    chatMessages,
    chatInput,
    setChatInput,
    chatError,
    pageError,
    roomActionError,
    roomClosedReason,
    isLoadingPage,
    isSaving,
    isStarting,
    isLeaving,
    isDeletingRoom,
    isRoomLinkCopied,
    availableQuizzes,
    isLoadingQuizzes,
    user,
    isSessionLoading,
    refreshRoom,
    handleSave,
    joinRoom,
    leaveRoom,
    deleteRoom,
    startRoom,
    submitAnswer,
    sendChatMessage,
    copyRoomLink,
  } = useRoomPage({ roomIdParam });

  const isOwner = Boolean(user && room && room.ownerUserId === user.id);
  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

  const canStart = useMemo(() => {
    if (
      !room ||
      !user ||
      room.ownerUserId !== user.id ||
      room.status !== "waiting"
    ) {
      return false;
    }

    if (form.gameType === "quiz") {
      return typeof form.quizId === "number" && form.quizId > 0;
    }

    return false;
  }, [form, room, user]);

  const isQuizSelectionSaved = useMemo(() => {
    if (!room || form.gameType !== "quiz") {
      return false;
    }

    return (
      room.gameType === "quiz" &&
      typeof room.quizId === "number" &&
      room.quizId > 0 &&
      form.quizId === room.quizId
    );
  }, [form.gameType, form.quizId, room]);

  const scoreboard = useMemo(() => {
    const baseEntries =
      gameState?.leaderboard.length && gameState.leaderboard.length > 0
        ? gameState.leaderboard
        : (room?.players.map((player) => ({
            userId: player.userId,
            score: 0,
          })) ?? []);

    return [...baseEntries]
      .sort(
        (left, right) => right.score - left.score || left.userId - right.userId,
      )
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        username: playerNames[entry.userId] ?? `Joueur #${entry.userId}`,
        avatarUrl: playerAvatars[entry.userId] ?? null,
      }));
  }, [gameState, playerAvatars, playerNames, room]);

  const chatEntries = useMemo<ChatEntry[]>(
    () =>
      chatMessages.map((message) => ({
        ...message,
        username: playerNames[message.userId] ?? `Joueur #${message.userId}`,
        avatarUrl: playerAvatars[message.userId] ?? null,
        isSelf: message.userId === user?.id,
      })),
    [chatMessages, playerAvatars, playerNames, user?.id],
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      {isLoadingPage ? (
        <div className="rounded-4xl border border-white/10 bg-bg p-8 text-text">
          Chargement de la room...
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-danger">
          {pageError}
        </div>
      ) : null}

      {roomClosedReason ? (
        <section className="mt-8 rounded-4xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-2xl font-semibold">Room fermée</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900/80">
            {roomClosedReason}
          </p>
          <div className="mt-5">
            <Link to="/">
              <PrimaryButton>Retour à l'accueil</PrimaryButton>
            </Link>
          </div>
        </section>
      ) : null}

      {!isLoadingPage && !pageError && room ? (
        <>
          <section className="grid gap-8 rounded-[2.75rem] border border-white/10 bg-surface text-text px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
                {room.gameType === "quiz" ? "quiz" : "mini-game"}
              </span>

              <h1 className="mt-6 text-4xl font-semibold md:text-5xl text-text-muted">
                {room.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8">
                Ici, tu configures la room, lances la partie, joues en direct et
                suis le classement des joueurs en temps reel.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-amber-900">
                  {formatRoomStatus(room.status)}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.players.length} joueur
                  {room.players.length > 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.gameType === "quiz" ? "Quiz" : "A configurer"}
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <PrimaryButton
                  className="inline-flex items-center justify-center gap-2"
                  onClick={() => copyRoomLink()}
                >
                  {isRoomLinkCopied
                    ? "Lien copié"
                    : "Copier le lien de la room"}
                  {isRoomLinkCopied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4 rotate-180" />
                  )}
                </PrimaryButton>
                {/* <SecondaryButton onClick={() => void refreshRoom()}>
                  Rafraichir
                </SecondaryButton> */}
              </div>
            </div>

            <aside className="rounded-4xl bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <RoomSectionLabel className="text-white/55">
                Contrôle de room
              </RoomSectionLabel>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase font-medium tracking-wide text-amber-200">
                    Propriétaire
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {playerNames[room.ownerUserId] ??
                      `Joueur #${room.ownerUserId}`}
                  </p>
                </div>

                {/* <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                    Timer
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {formatRemainingTime(
                      gameState?.questionDurationMs ?? null,
                      null,
                    )}
                  </p>
                </div> */}

                {!user && !isSessionLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm leading-7 text-white/72">
                      Connecte-toi pour rejoindre cette room, chatter et jouer
                      en direct.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Link to="/login">
                        <PrimaryButton>Se connecter</PrimaryButton>
                      </Link>
                      <Link to="/register">
                        <SecondaryButton>Créer un compte</SecondaryButton>
                      </Link>
                    </div>
                  </div>
                ) : null}

                {user && !isUserInRoom && room.status === "waiting" ? (
                  <PrimaryButton
                    className="w-full justify-center"
                    onClick={joinRoom}
                  >
                    Rejoindre cette room
                  </PrimaryButton>
                ) : null}

                {user && isUserInRoom ? (
                  <div className="flex flex-col gap-3">
                    {room.status === "waiting" && isOwner ? (
                      <PrimaryButton
                        className="w-full justify-center"
                        disabled={isStarting || !canStart}
                        onClick={startRoom}
                      >
                        {isStarting ? "Demarrage..." : "Lancer la partie"}
                      </PrimaryButton>
                    ) : null}
                    <div className="w-full flex gap-2">
                      <SecondaryButton
                        className="w-full justify-center"
                        disabled={isLeaving || isDeletingRoom}
                        onClick={leaveRoom}
                      >
                        {isLeaving ? "Sortie..." : "Quitter la room"}
                      </SecondaryButton>
                      {isOwner ? (
                        <AlertDialog
                          open={isDeleteDialogOpen}
                          onOpenChange={setIsDeleteDialogOpen}
                        >
                          <AlertDialogTrigger asChild>
                            <PrimaryButton
                              className="w-full justify-center bg-danger hover:bg-danger/85"
                              disabled={isDeletingRoom}
                            >
                              {isDeletingRoom
                                ? "Suppression..."
                                : "Supprimer la room"}
                            </PrimaryButton>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Supprimer cette room ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action ferme la room pour tous les joueurs
                                et supprime son contenu en cours.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeletingRoom}>
                                Annuler
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="inline-flex items-center justify-center rounded-md bg-danger px-4 py-2 font-semibold text-white transition hover:bg-danger/85 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isDeletingRoom}
                                onClick={() => {
                                  setIsDeleteDialogOpen(false);
                                  void deleteRoom();
                                }}
                                type="button"
                              >
                                {isDeletingRoom
                                  ? "Suppression..."
                                  : "Oui, supprimer"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {user && !isUserInRoom && room.status !== "waiting" ? (
                  <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
                    Cette room a déja démarrée. Les nouveaux joueurs ne peuvent
                    plus la rejoindre.
                  </div>
                ) : null}
              </div>
            </aside>
          </section>

          {isOwner && room.status === "waiting" ? (
            <RoomConfigSection
              roomId={room.id}
              form={form}
              setForm={setForm}
              availableQuizzes={availableQuizzes}
              isLoadingQuizzes={isLoadingQuizzes}
              isQuizSelectionSaved={isQuizSelectionSaved}
              isSaving={isSaving}
              onSave={() => {
                void handleSave();
              }}
            />
          ) : null}

          {roomActionError ? (
            <section className="mt-8 rounded-4xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {roomActionError}
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] xl:grid-cols-[0.8fr_1.2fr] xl:items-stretch min-h-125 xl:min-h-150">
            <div className="flex flex-col gap-6 xl:min-h-full">
              <RoomPlayersSection
                players={room.players}
                ownerUserId={room.ownerUserId}
                playerNames={playerNames}
              />

              <RoomLeaderboardSection entries={scoreboard} />
            </div>

            <div className="h-full">
              <RoomChatSection
                entries={chatEntries}
                chatInput={chatInput}
                chatError={chatError}
                isUserInRoom={isUserInRoom}
                onChatInputChange={setChatInput}
                onSendMessage={() => {
                  void sendChatMessage();
                }}
              />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

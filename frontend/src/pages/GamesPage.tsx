import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import QuizGameSection from "../components/room/QuizGameSection";
import Section from "../components/ui/section";
import SectionHeader from "../components/ui/section-header";
import SectionLabel from "../components/ui/section-label";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import Guess from "../components/Wordle/Guess";
import Keyboard from "../components/Wordle/Keyboard";
import ProgressBar from "../components/Wordle/ProgressBar";
import RulesPanel from "../components/Wordle/RulesPanel";
import { useGamesPage } from "../hooks/useGamesPage";

export default observer(GamesPage);

function GamesPage() {
  const {
    user,
    isSessionLoading,
    room,
    gameState,
    currentQuestion,
    remainingMs,
    selectedAnswer,
    hasAnsweredCurrentQuestion,
    pageError,
    isLoadingPage,
    roomClosedReason,
    isRulesOpen,
    setRulesOpen,
    roomGameConfig,
    wordleState,
    sharedWord,
    store,
    isUserInRoom,
    handleSelectAnswer,
    handleSubmitAnswer,
    handleSetReady,
    formatGameType,
    getWordleMissingPlayers,
    getWinnerName,
  } = useGamesPage();

  if (isLoadingPage || isSessionLoading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <div className="rounded-4xl border border-white/10 bg-bg p-8 text-text">
          Chargement de la partie...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-danger">
          Vous devez être connecté pour accéder à une partie en cours.
        </div>
      </main>
    );
  }

  if (room && !isUserInRoom) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-danger">
          Impossible de rejoindre via un lien direct : la partie est déjà en
          cours et vous n'y participez pas.
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-danger">
          {pageError}
        </div>
      </main>
    );
  }

  if (roomClosedReason) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <section className="rounded-4xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-2xl font-semibold">Partie fermée</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900/80">
            {roomClosedReason}
          </p>
          <div className="mt-5">
            <Link to="/">
              <PrimaryButton>Retour à l'accueil</PrimaryButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (gameState?.status === "finished") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <Section className="overflow-hidden border-white/12 bg-surface/95 p-0">
          <div className="border-b border-white/10 px-6 py-5 md:px-8">
            <SectionLabel className="text-slate-400">
              Partie terminée
            </SectionLabel>
            <SectionHeader className="text-3xl">
              {gameState.winnerUserId
                ? `Le gagnant est ${getWinnerName(gameState.winnerUserId)}`
                : room?.gameType === "wordle"
                  ? "Aucun Gagnant"
                  : "La partie est terminée"}
            </SectionHeader>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
              Voici le classement final. Tu peux revenir à la room pour relancer
              une nouvelle partie ou repartir à l'accueil.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 md:px-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Résultat
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg/70 px-4 py-3">
                  <span className="text-sm text-white/65">
                    Nombre de joueurs
                  </span>
                  <span className="text-lg font-semibold text-white">
                    {gameState.leaderboard.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg/70 px-4 py-3">
                  <span className="text-sm text-white/65">Mode</span>
                  <span className="text-sm font-semibold text-white">
                    {room?.gameType === "wordle" ? "Wordle" : formatGameType()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Classement
                </p>
                <span className="rounded-full border border-white/10 bg-bg/80 px-3 py-1 text-xs font-semibold text-white/70">
                  {gameState.leaderboard.length} joueur
                  {gameState.leaderboard.length !== 1 ? "s" : ""}
                </span>
              </div>

              <ol className="mt-4 space-y-3">
                {gameState.leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const rankTone = isCurrentUser
                    ? "border-amber-300/50 bg-amber-400/10"
                    : "border-slate-200/15 bg-white/6";

                  return (
                    <li
                      key={entry.userId}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${rankTone}`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-bg/80 text-sm font-semibold text-white">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {getWinnerName(entry.userId)}
                        </p>
                        <p className="text-xs text-white/55">
                          {index === 0 ? "Premier" : `${index + 1}eme`}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-bg/70 px-3 py-1 text-sm font-semibold text-white/80">
                        {entry.score} point{entry.score > 1 ? "s" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-white/10 px-6 py-5 md:px-8">
            <Link to={room ? `/rooms/${room.id}` : "/"}>
              <PrimaryButton>Revenir à la room</PrimaryButton>
            </Link>
            <Link to="/">
              <SecondaryButton>Retour à l'accueil</SecondaryButton>
            </Link>
          </div>
        </Section>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="mx-auto flex flex-col w-full max-w-7xl flex-1 px-6 py-8 md:px-10 md:py-12 justify-center">
      {room.gameType === "quiz" ? (
        <QuizGameSection
          roomStatus={room.status}
          gameState={gameState}
          currentQuestion={currentQuestion}
          remainingMs={remainingMs}
          isUserInRoom={isUserInRoom}
          selectedAnswer={selectedAnswer}
          hasAnsweredCurrentQuestion={hasAnsweredCurrentQuestion}
          onSelectAnswer={handleSelectAnswer}
          onSubmitAnswer={handleSubmitAnswer}
        />
      ) : room.gameType === "wordle" ? (
        !sharedWord ? (
          <section className="flex flex-1 flex-col rounded-4xl border border-white/10 bg-surface p-6 text-text shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
            <SectionLabel className="text-slate-400">Wordle</SectionLabel>
            <SectionHeader>Synchronisation en cours</SectionHeader>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Le mot partagé de la partie est en cours de chargement.
            </p>
          </section>
        ) : isRulesOpen ? (
          <div className="flex items-center justify-center">
            <RulesPanel
              onClose={() => setRulesOpen(false)}
              store={store}
              totalPlayers={
                wordleState?.totalPlayers ?? room?.players.length ?? 1
              }
              readyPlayers={wordleState?.playersReady ?? 0}
              missingPlayers={getWordleMissingPlayers()}
              setReady={handleSetReady}
              readyFlag={Boolean(
                room?.players.find((player) => player.userId === user?.id)
                  ?.isReady,
              )}
            />
          </div>
        ) : (
          <section className="flex flex-1 flex-col py-1 items-center justify-center">
            <div className="mb-4 rounded-full border border-white/10 bg-surface px-4 py-2 text-sm text-white/75">
              {wordleState
                ? `${wordleState.playersCompleted}/${room?.players.length ?? wordleState.totalPlayers} joueurs ont terminé`
                : "Partie Wordle en cours"}
            </div>

            {store.won || store.lost ? (
              <div className="mb-4 text-center">
                <p className="text-sm text-white/70">
                  Ta manche est terminée. Tu restes connecté jusqu'à ce que tous
                  les joueurs aient fini.
                </p>
                {store.lost && store.endedByTimeout ? (
                  <p className="mt-2 text-base font-semibold uppercase tracking-[0.14em] text-amber-300">
                    Le mot à trouver était {store.word}
                  </p>
                ) : null}
              </div>
            ) : null}

            <ProgressBar start_time={store.start_time} store={store} />

            <div>
              {store.guesses.map((_, i) => (
                <Guess
                  key={i}
                  checkerValidWord={store.all_words_array_json}
                  lettersCount={roomGameConfig?.wordLength ?? 5}
                  flag={store.validWord}
                  word={store.word}
                  guess={store.guesses[i] ?? ""}
                  isGuessed={i < store.currentGuess}
                />
              ))}
            </div>

            <div className="mt-3">
              <Keyboard store={store} />
            </div>
          </section>
        )
      ) : (
        <section className="flex flex-1 flex-col rounded-4xl border border-white/10 bg-surface p-6 text-text shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <SectionLabel className="text-slate-400">Jeux</SectionLabel>
          <SectionHeader>Jeu indisponible</SectionHeader>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Cette room utilise un mode qui n'est plus pris en charge.
          </p>
        </section>
      )}
    </main>
  );
}

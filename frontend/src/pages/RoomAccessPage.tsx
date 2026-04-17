import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getQuizById, type Quiz } from "../services/quizzes";
import { getRoomById, type Room } from "../services/rooms";

function formatRoomStatus(status: Room["status"]) {
  if (status === "waiting") {
    return "En attente";
  }

  if (status === "playing") {
    return "En cours";
  }

  return "Terminee";
}

export default function RoomAccessPage() {
  const { roomId: roomIdParam } = useParams();
  const roomId = Number(roomIdParam);
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(roomId) || roomId <= 0) {
        setPageError("URL de room invalide.");
        setIsLoadingPage(false);
        return;
      }

      setIsLoadingPage(true);
      setPageError(null);

      try {
        const fetchedRoom = await getRoomById(roomId);
        setRoom(fetchedRoom);

        if (typeof fetchedRoom.quizId === "number") {
          setQuiz(await getQuizById(fetchedRoom.quizId));
        } else {
          setQuiz(null);
        }
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "Impossible de charger cette invitation.",
        );
      } finally {
        setIsLoadingPage(false);
      }
    };

    void load();
  }, [roomId]);

  useEffect(() => {
    if (
      isSessionLoading ||
      isLoadingPage ||
      pageError ||
      user ||
      !Number.isFinite(roomId) ||
      roomId <= 0
    ) {
      return;
    }

    navigate(`/login?joinRoom=${roomId}`, { replace: true });
  }, [isLoadingPage, isSessionLoading, navigate, pageError, roomId, user]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 md:px-10">
      {isLoadingPage ? (
        <section className="rounded-[2rem] border border-slate-900/10 bg-white/70 p-8 text-slate-600">
          Chargement de l'invitation...
        </section>
      ) : null}

      {pageError ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-700">
          {pageError}
        </section>
      ) : null}

      {!isLoadingPage && !pageError && room ? (
        <section className="rounded-[2.5rem] border border-slate-900/10 bg-white/78 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Invitation room
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950">
            {quiz?.title ?? `Room #${room.id}`}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Cette page sert d'entree simple vers la room partagee. Si ta session
            est deja ouverte, tu peux rejoindre directement la room ici.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
              {formatRoomStatus(room.status)}
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              Room #{room.id}
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {room.players.length} joueur{room.players.length > 1 ? "s" : ""}
            </span>
          </div>

          {user ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton
                onClick={() => {
                  navigate(`/rooms/${room.id}?join=1`);
                }}
              >
                Rejoindre la room
              </PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  navigate(`/rooms/${room.id}`);
                }}
              >
                Voir la room sans rejoindre
              </SecondaryButton>
            </div>
          ) : (
            <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
              Redirection vers la connexion pour rejoindre la room...
            </div>
          )}

          {quiz ? (
            <div className="mt-8">
              <Link
                className="text-sm font-semibold text-slate-700 underline"
                to={`/quiz/${quiz.id}`}
              >
                Voir aussi le hub du quiz
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { AUTH_USERNAME_MIN_LENGTH } from "../services/auth";
import {
  getMyFriendOverview,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendOverview,
} from "../services/users";

function formatJoinedDate(createdAt: string) {
  try {
    return new Date(createdAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return createdAt;
  }
}

function formatIdentityLabel(user: { email: string; isGuest: boolean }) {
  if (user.isGuest) {
    return "Compte invite";
  }

  return user.email;
}

function formatStatus(status: "online" | "offline") {
  return status === "online" ? "En ligne" : "Hors ligne";
}

export default function ProfilePage() {
  const { user, isLoading } = useAuthSession();
  const [friendOverview, setFriendOverview] = useState<FriendOverview | null>(
    null,
  );
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendNotice, setFriendNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.isGuest) {
      setFriendOverview(null);
      setFriendsError(null);
      return;
    }

    let cancelled = false;

    const loadFriendOverview = async () => {
      setIsFriendsLoading(true);

      try {
        const overview = await getMyFriendOverview();

        if (!cancelled) {
          setFriendOverview(overview);
          setFriendsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setFriendsError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les amis",
          );
        }
      } finally {
        if (!cancelled) {
          setIsFriendsLoading(false);
        }
      }
    };

    void loadFriendOverview();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <div className="w-full rounded-[2rem] border border-slate-900/10 bg-white/70 p-8 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          Chargement du profil...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <section className="w-full rounded-[2.5rem] border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
            Profil
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Connexion requise</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-amber-900/80">
            Connecte-toi pour acceder a ta page profil et retrouver tes
            informations de session.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <PrimaryButton>Se connecter</PrimaryButton>
            </Link>
            <Link to="/register">
              <SecondaryButton>S'inscrire</SecondaryButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const refreshFriendOverview = async () => {
    const overview = await getMyFriendOverview();
    setFriendOverview(overview);
    setFriendsError(null);
  };

  const handleFriendSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFriendNotice(null);
    setIsSendingRequest(true);

    try {
      const result = await sendFriendRequest(friendUsername.trim());
      setFriendUsername("");
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendOverview();
    } catch (error) {
      setFriendNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Impossible d'ajouter cet ami",
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleFriendRequestAction = async (
    requestId: number,
    action: "accepted" | "declined",
  ) => {
    setFriendNotice(null);
    setPendingActionId(requestId);

    try {
      const result = await respondToFriendRequest(requestId, action);
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendOverview();
    } catch (error) {
      setFriendNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre a jour la demande",
      });
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
      <section className="grid w-full gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Profil joueur
          </p>
          <div className="mt-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#f59e0b)] text-3xl font-semibold text-white">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="mt-6 text-3xl font-semibold">{user.username}</h1>
          <p className="mt-2 text-sm text-white/70">{formatIdentityLabel(user)}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">
              Statut: {user.status}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              {user.isGuest ? "Mode invite" : "Compte classique"}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              Membre depuis {formatJoinedDate(user.createdAt)}
            </span>
          </div>
        </article>

        <article className="rounded-[2.5rem] border border-slate-900/10 bg-white/80 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Informations
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">
            Ton espace personnel
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Cette page rassemble les informations de la session courante. Elle
            sert de point d'entree simple depuis la navbar, avec ton pseudo
            toujours accessible.
          </p>

          <dl className="mt-8 grid gap-4">
            <div className="rounded-[1.5rem] bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pseudo
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.username}
              </dd>
            </div>
            <div className="rounded-[1.5rem] bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {user.isGuest ? "Type de compte" : "Email"}
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.isGuest ? "Invite" : user.email}
              </dd>
            </div>
            <div className="rounded-[1.5rem] bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Statut
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.status}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/admin">
              <PrimaryButton>Creer un quiz</PrimaryButton>
            </Link>
            <Link to="/join">
              <SecondaryButton>Rejoindre une room</SecondaryButton>
            </Link>
          </div>
        </article>

        <article className="rounded-[2.5rem] border border-slate-900/10 bg-white/80 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)] md:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Reseau
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                Ton systeme d'amis
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Ajoute un joueur depuis son pseudo, consulte ta liste d'amis et
                gere les demandes recues sans quitter la page profil.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-4 py-2">
                {friendOverview?.friends.length ?? 0} ami
                {(friendOverview?.friends.length ?? 0) > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-amber-100 px-4 py-2 text-amber-900">
                {friendOverview?.receivedRequests.length ?? 0} demande
                {(friendOverview?.receivedRequests.length ?? 0) > 1 ? "s" : ""} recue
                {(friendOverview?.receivedRequests.length ?? 0) > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {user.isGuest ? (
            <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950">
              <p className="text-sm font-semibold">Compte invite detecte</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-900/85">
                Le systeme d'amis est reserve aux comptes classiques pour eviter
                de perdre tes relations quand un pseudo invite est archive a la
                deconnexion.
              </p>
              <div className="mt-4">
                <Link to="/register">
                  <PrimaryButton>Creer un compte classique</PrimaryButton>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[2rem] bg-slate-100/80 p-6">
                <h3 className="text-xl font-semibold text-slate-950">
                  Ajouter un ami
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Saisis un pseudo exact. Si ce joueur t'a deja envoye une
                  demande, elle sera acceptee automatiquement.
                </p>

                <form
                  className="mt-5"
                  aria-busy={isSendingRequest}
                  onSubmit={(event) => void handleFriendSubmit(event)}
                >
                  <label
                    className="mb-2 block text-sm font-medium text-slate-600"
                    htmlFor="friend-username"
                  >
                    Pseudo du joueur
                  </label>
                  <input
                    className="w-full rounded-[1.25rem] border border-slate-900/10 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400"
                    id="friend-username"
                    type="text"
                    placeholder="Exemple: theo42"
                    value={friendUsername}
                    onChange={(event) => setFriendUsername(event.target.value)}
                    disabled={isSendingRequest}
                    minLength={AUTH_USERNAME_MIN_LENGTH}
                    required
                  />
                  <PrimaryButton
                    className="mt-4 w-full justify-center"
                    disabled={isSendingRequest}
                    type="submit"
                  >
                    {isSendingRequest ? "Envoi..." : "Ajouter par pseudo"}
                  </PrimaryButton>
                </form>

                {friendNotice ? (
                  <p
                    className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
                      friendNotice.kind === "success"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-700"
                    }`}
                    role="alert"
                  >
                    {friendNotice.message}
                  </p>
                ) : null}

                <div className="mt-6 rounded-[1.5rem] bg-white px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Demandes recues
                    </h4>
                    {isFriendsLoading ? (
                      <span className="text-xs text-slate-500">Chargement...</span>
                    ) : null}
                  </div>

                  {friendsError ? (
                    <p className="mt-4 text-sm text-rose-700">{friendsError}</p>
                  ) : null}

                  {!friendsError &&
                  !isFriendsLoading &&
                  (friendOverview?.receivedRequests.length ?? 0) === 0 ? (
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      Aucune demande en attente pour le moment.
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {friendOverview?.receivedRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-[1.25rem] border border-slate-900/10 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-950">
                              {request.user.username}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Recue le {formatJoinedDate(request.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <PrimaryButton
                              className="justify-center px-5 py-2.5"
                              disabled={pendingActionId === request.id}
                              onClick={() =>
                                void handleFriendRequestAction(request.id, "accepted")
                              }
                            >
                              {pendingActionId === request.id
                                ? "Traitement..."
                                : "Accepter"}
                            </PrimaryButton>
                            <SecondaryButton
                              className="px-5 py-2.5"
                              disabled={pendingActionId === request.id}
                              onClick={() =>
                                void handleFriendRequestAction(request.id, "declined")
                              }
                            >
                              Refuser
                            </SecondaryButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[1.5rem] bg-white px-5 py-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Demandes envoyees
                  </h4>

                  {!isFriendsLoading &&
                  (friendOverview?.sentRequests.length ?? 0) === 0 ? (
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      Aucune demande envoyee en attente.
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {friendOverview?.sentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-[1.25rem] border border-slate-900/10 bg-slate-50 px-4 py-4"
                      >
                        <p className="text-base font-semibold text-slate-950">
                          {request.user.username}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          En attente depuis le {formatJoinedDate(request.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] bg-slate-950 p-6 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Liste d'amis</h3>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Les joueurs acceptes apparaissent ici avec leur statut de
                      connexion.
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                    {friendOverview?.friends.length ?? 0} contact
                    {(friendOverview?.friends.length ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>

                {friendsError ? (
                  <div className="mt-5 rounded-[1.5rem] bg-rose-500/15 px-5 py-4 text-sm text-rose-100">
                    {friendsError}
                  </div>
                ) : null}

                {isFriendsLoading && !friendOverview ? (
                  <div className="mt-5 rounded-[1.5rem] bg-white/10 px-5 py-5 text-sm text-white/75">
                    Chargement de ta liste d'amis...
                  </div>
                ) : null}

                {!friendsError &&
                !isFriendsLoading &&
                (friendOverview?.friends.length ?? 0) === 0 ? (
                  <div className="mt-5 rounded-[1.5rem] bg-white/10 px-5 py-5 text-sm leading-7 text-white/75">
                    Aucun ami pour l'instant. Commence par rechercher un joueur
                    avec son pseudo.
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {friendOverview?.friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex flex-col gap-4 rounded-[1.5rem] bg-white/8 px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#f59e0b)] text-lg font-semibold text-white">
                          {friend.username.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {friend.username}
                          </p>
                          <p className="mt-1 text-sm text-white/65">
                            {formatStatus(friend.status)} • inscrit le{" "}
                            {formatJoinedDate(friend.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium ${
                          friend.status === "online"
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-white/10 text-white/75"
                        }`}
                      >
                        {formatStatus(friend.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

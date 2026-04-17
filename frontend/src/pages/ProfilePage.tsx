import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { updateMyAvatar } from "../services/users";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Impossible de lire cette image"));
    };

    reader.onerror = () => {
      reject(new Error("Impossible de lire cette image"));
    };

    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, isLoading, refreshSession } = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <div className="w-full rounded-4xl border border-slate-900/10 bg-white/70 p-8 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
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

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarNotice(null);

    if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
      setAvatarNotice({
        kind: "error",
        message: "Formats acceptes: JPG, PNG ou WEBP.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarNotice({
        kind: "error",
        message: "L'image doit faire 2 Mo maximum.",
      });
      event.target.value = "";
      return;
    }

    setIsAvatarSubmitting(true);

    try {
      const avatarDataUrl = await readFileAsDataUrl(file);
      await updateMyAvatar(avatarDataUrl);
      await refreshSession();
      setAvatarNotice({
        kind: "success",
        message: "Photo de profil mise a jour.",
      });
    } catch (error) {
      setAvatarNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre a jour la photo de profil.",
      });
    } finally {
      setIsAvatarSubmitting(false);
      event.target.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarNotice(null);
    setIsAvatarSubmitting(true);

    try {
      await updateMyAvatar(null);
      await refreshSession();
      setAvatarNotice({
        kind: "success",
        message: "Photo de profil supprimee.",
      });
    } catch (error) {
      setAvatarNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer la photo de profil.",
      });
    } finally {
      setIsAvatarSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
      <section className="grid w-full gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Profil joueur
          </p>
          <Avatar
            alt={`Photo de profil de ${user.username}`}
            avatarUrl={user.avatar_url}
            className="mt-6 h-24 w-24 ring-4 ring-white/10"
            fallbackClassName="text-3xl"
            username={user.username}
          />
          <h1 className="mt-6 text-3xl font-semibold">{user.username}</h1>
          <p className="mt-2 text-sm text-white/70">
            {formatIdentityLabel(user)}
          </p>
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
            <div className="rounded-3xl bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Photo de profil
              </dt>
              <dd className="mt-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar
                    alt={`Photo de profil de ${user.username}`}
                    avatarUrl={user.avatar_url}
                    className="h-20 w-20 ring-2 ring-slate-900/10"
                    fallbackClassName="text-2xl"
                    username={user.username}
                  />
                  <div className="flex-1">
                    <p className="text-sm leading-7 text-slate-600">
                      Ajoute une image JPG, PNG ou WEBP jusqu'a 2 Mo.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        id="profile-avatar-upload"
                        onChange={(event) => void handleAvatarFileChange(event)}
                        type="file"
                      />
                      <PrimaryButton
                        disabled={isAvatarSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        {isAvatarSubmitting
                          ? "Mise a jour..."
                          : "Changer la photo"}
                      </PrimaryButton>
                      <SecondaryButton
                        disabled={isAvatarSubmitting || !user.avatar_url}
                        onClick={() => void handleAvatarRemove()}
                        type="button"
                      >
                        Supprimer
                      </SecondaryButton>
                    </div>
                    {avatarNotice ? (
                      <p
                        className={`mt-4 text-sm ${
                          avatarNotice.kind === "success"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                        role="alert"
                      >
                        {avatarNotice.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </dd>
            </div>
            <div className="rounded-3xl bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pseudo
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.username}
              </dd>
            </div>
            <div className="rounded-3xl bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {user.isGuest ? "Type de compte" : "Email"}
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.isGuest ? "Invite" : user.email}
              </dd>
            </div>
            <div className="rounded-3xl bg-slate-100/80 px-5 py-4">
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
            <Link to="/friends">
              <SecondaryButton>Voir mes amis</SecondaryButton>
            </Link>
          </div>
        </article>
        <article className="rounded-[2.5rem] border border-slate-900/10 bg-white/80 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)] md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Social
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">
            Amis et messages prives
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Le reseau joueur dispose maintenant de sa propre page. Tu peux y
            ajouter des amis par pseudo, traiter les demandes recues et discuter
            en prive avec les relations acceptees.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/friends">
              <PrimaryButton>Ouvrir la page amis</PrimaryButton>
            </Link>
            <Link to="/join">
              <SecondaryButton>Retourner aux rooms</SecondaryButton>
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

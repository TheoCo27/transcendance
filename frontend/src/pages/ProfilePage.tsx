import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import Section from "../components/ui/section";
import SectionHeader from "../components/ui/section-header";
import SectionLabel from "../components/ui/section-label";
import Input from "../components/ui/input";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import { AUTH_USERNAME_MIN_LENGTH } from "../services/auth";
import { updateMyAvatar, updateMyProfile } from "../services/users";

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
  const [profileUsername, setProfileUsername] = useState("");
  const [profileStatus, setProfileStatus] = useState<"online" | "offline">(
    "online",
  );
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [profileNotice, setProfileNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileUsername(user.username);
    setProfileStatus(user.status);
  }, [user]);

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
            Connecte-toi pour accéder à ta page profil et retrouver tes
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
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de mettre a jour la photo de profil.",
      );
      if (message) {
        setAvatarNotice({
          kind: "error",
          message,
        });
      }
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
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de supprimer la photo de profil.",
      );
      if (message) {
        setAvatarNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsAvatarSubmitting(false);
    }
  };

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedUsername = profileUsername.trim();
    setProfileNotice(null);

    if (trimmedUsername.length < AUTH_USERNAME_MIN_LENGTH) {
      setProfileNotice({
        kind: "error",
        message: `Le pseudo doit contenir au moins ${AUTH_USERNAME_MIN_LENGTH} caracteres.`,
      });
      return;
    }

    setIsProfileSubmitting(true);

    try {
      await updateMyProfile({
        username: trimmedUsername,
        status: profileStatus,
      });
      await refreshSession();
      setProfileNotice({
        kind: "success",
        message: "Profil mis a jour.",
      });
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de mettre a jour le profil.",
      );
      if (message) {
        setProfileNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handleProfileReset = () => {
    if (!user) {
      return;
    }

    setProfileUsername(user.username);
    setProfileStatus(user.status);
    setProfileNotice(null);
  };

  const hasProfileChanges =
    profileUsername.trim() !== user.username || profileStatus !== user.status;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
      <section className="grid w-full gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <Section className="bg-slate-950 text-white flex flex-col items-start">
          <SectionLabel className="text-white/55">Profil joueur</SectionLabel>
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
        </Section>

        <Section>
          <SectionLabel className="text-slate-400">Informations</SectionLabel>
          <SectionHeader>Ton espace personnel</SectionHeader>
          <p className="mt-4 max-w-2xl text-sm text-white/70">
            Cette page rassemble les informations de la session courante. Elle
            sert de point d'entree simple depuis la navbar, avec ton pseudo
            toujours accessible.
          </p>

          <dl className="mt-8 grid gap-4">
            <div className="rounded-3xl bg-white/5 px-5 py-4 border border-white/10">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Photo de profil
              </dt>
              <dd className="mt-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar
                    alt={`Photo de profil de ${user.username}`}
                    avatarUrl={user.avatar_url}
                    className="h-20 w-20 ring-2 ring-white/10"
                    fallbackClassName="text-2xl"
                    username={user.username}
                  />
                  <div className="flex-1">
                    <p className="text-sm leading-7 text-white/70">
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
                            ? "text-emerald-400"
                            : "text-rose-400"
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
            <div className="rounded-3xl bg-white/5 px-5 py-4 border border-white/10">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                {user.isGuest ? "Type de compte" : "Email"}
              </dt>
              <dd className="mt-2 text-lg font-semibold text-white">
                {user.isGuest ? "Invite" : user.email}
              </dd>
            </div>
            <Section className="bg-white/5">
              <SectionLabel className="text-slate-400">
                Pseudo et statut
              </SectionLabel>
              <dd className="mt-4">
                <form
                  className="space-y-4"
                  onSubmit={(event) => void handleProfileSubmit(event)}
                >
                  <label className="block">
                    <span className="text-sm font-medium">Pseudo</span>
                    <Input
                      className="mt-2 w-full"
                      type="text"
                      maxLength={20}
                      minLength={AUTH_USERNAME_MIN_LENGTH}
                      onChange={(event) =>
                        setProfileUsername(event.target.value)
                      }
                      placeholder="Nouveau pseudo"
                      value={profileUsername}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Statut</span>
                    <div className="relative w-full mt-2">
                      <select
                        className="w-full appearance-none rounded-xl border border-white/10 bg-bg px-4 py-3 pr-11 placeholder:text-text/40 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        onChange={(event) =>
                          setProfileStatus(
                            event.target.value as "online" | "offline",
                          )
                        }
                        value={profileStatus}
                      >
                        <option value="online">online</option>
                        <option value="offline">offline</option>
                      </select>
                      <ChevronDown
                        aria-hidden="true"
                        strokeWidth={2}
                        className="pointer-events-none absolute right-4 top-1/2 size-4  -translate-y-1/2 text-white"
                      />
                    </div>
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <PrimaryButton
                      disabled={isProfileSubmitting || !hasProfileChanges}
                      type="submit"
                    >
                      {isProfileSubmitting
                        ? "Enregistrement..."
                        : "Enregistrer"}
                    </PrimaryButton>
                    <SecondaryButton
                      disabled={isProfileSubmitting || !hasProfileChanges}
                      onClick={handleProfileReset}
                      type="button"
                    >
                      Annuler
                    </SecondaryButton>
                  </div>

                  {profileNotice ? (
                    <p
                      className={`text-sm ${
                        profileNotice.kind === "success"
                          ? "text-emerald-600"
                          : "text-rose-700"
                      }`}
                      role="alert"
                    >
                      {profileNotice.message}
                    </p>
                  ) : null}
                </form>
              </dd>
            </Section>
          </dl>
        </Section>
        <Section className="md:col-span-2">
          <SectionLabel className="text-slate-400">Social</SectionLabel>
          <SectionHeader>Amis et messages prives</SectionHeader>
          <p className="mt-4 max-w-3xl text-base">
            Tu peux ajouter des amis pour discuter en privé ou voir quand ils
            sont en ligne.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/friends">
              <PrimaryButton>Ouvrir la page amis</PrimaryButton>
            </Link>
            <Link to="/">
              <SecondaryButton>Retourner aux rooms</SecondaryButton>
            </Link>
          </div>
        </Section>
      </section>
    </main>
  );
}

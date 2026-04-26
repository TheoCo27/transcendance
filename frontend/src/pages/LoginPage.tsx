import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useToast } from "../components/ui/toast";
import {
  AUTH_USERNAME_MIN_LENGTH,
  login,
  loginAsGuest,
} from "../services/auth";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_access_denied: "La connexion Google a ete annulee.",
  google_callback_failed:
    "Impossible de finaliser la connexion Google. Verifie la configuration OAuth.",
  google_not_configured:
    "La connexion Google n'est pas encore configuree sur le backend.",
  google_state_mismatch:
    "La tentative de connexion Google a expire. Reessaie depuis cette page.",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const joinRoomParam = searchParams.get("joinRoom");
  const oauthErrorParam = searchParams.get("oauthError");
  const joinRoomId = Number(joinRoomParam);
  const shouldJoinRoomAfterAuth = Number.isFinite(joinRoomId) && joinRoomId > 0;
  const oauthError =
    oauthErrorParam && OAUTH_ERROR_MESSAGES[oauthErrorParam]
      ? OAUTH_ERROR_MESSAGES[oauthErrorParam]
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestUsername, setGuestUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  const navigateAfterAuth = () => {
    navigate(shouldJoinRoomAfterAuth ? `/rooms/${joinRoomId}?join=1` : "/");
  };

  const googleAuthUrl = shouldJoinRoomAfterAuth
    ? `/auth/google/start?returnTo=${encodeURIComponent(`/rooms/${joinRoomId}?join=1`)}`
    : "/auth/google/start?returnTo=%2F";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });
      toast.success("Connecte avec succes");
      navigateAfterAuth();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Echec de connexion",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsGuestSubmitting(true);

    try {
      await loginAsGuest({
        username: guestUsername.trim(),
      });
      toast.success("Connexion invite reussie");
      navigateAfterAuth();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Echec de connexion invite",
      );
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-[10%] py-6">
      <Card className="w-full px-8 py-8">
        <h1 className="mb-3 text-3xl font-semibold text-text">
          {shouldJoinRoomAfterAuth ? "Rejoindre la room" : "Se connecter"}
        </h1>
        <p className="mb-6 text-sm leading-7 text-text/70">
          {shouldJoinRoomAfterAuth
            ? `Connecte-toi ou continue en invite pour rejoindre directement la room #${joinRoomId}.`
            : "Connecte-toi avec ton compte ou entre rapidement en invite avec un pseudo unique."}
        </p>
        {oauthError ? (
          <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {oauthError}
          </p>
        ) : null}
        <form aria-busy={isSubmitting} onSubmit={(event) => void handleSubmit(event)}>
          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="login-email"
          >
            Email
          </label>
          <input
            className="mb-4 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="login-email"
            type="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />

          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="login-password"
          >
            Mot de passe
          </label>
          <input
            className="mb-6 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="login-password"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? "true" : "false"}
            disabled={isSubmitting}
            required
          />

          {error ? (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <PrimaryButton className="w-full py-3 text-base" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Connexion..."
              : shouldJoinRoomAfterAuth
                ? "Se connecter et rejoindre la room"
                : "Se connecter"}
          </PrimaryButton>
        </form>

        <a
          className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-slate-900/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-900/30 hover:bg-slate-50"
          href={googleAuthUrl}
        >
          Continuer avec Google
        </a>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text/45">
            ou
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form aria-busy={isGuestSubmitting} onSubmit={(event) => void handleGuestSubmit(event)}>
          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="guest-username"
          >
            Entrer comme invite
          </label>
          <input
            className="mb-4 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="guest-username"
            type="text"
            placeholder="Pseudo unique"
            value={guestUsername}
            onChange={(event) => setGuestUsername(event.target.value)}
            disabled={isGuestSubmitting}
            minLength={AUTH_USERNAME_MIN_LENGTH}
            required
          />

          <SecondaryButton
            className="w-full justify-center py-3 text-base"
            disabled={isGuestSubmitting}
            type="submit"
          >
            {isGuestSubmitting
              ? "Connexion invite..."
              : shouldJoinRoomAfterAuth
                ? "Continuer en invite et rejoindre la room"
                : "Continuer en invite"}
          </SecondaryButton>
        </form>

        <p className="mt-5 text-center text-sm text-text/70">
          Pas de compte ?{" "}
          <Link className="font-semibold underline" to="/register">
            S'inscrire
          </Link>
        </p>
      </Card>
    </main>
  );
}

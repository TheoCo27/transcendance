import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/ui/input";
import PrimaryButton from "../components/ui/PrimaryButton";
import { getUserFacingErrorMessage } from "../services/api";
import { useAuthSession } from "../hooks/useAuthSession";
import {
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  register,
} from "../services/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedUsername = username.trim();

      await register({
        email: trimmedEmail,
        username: trimmedUsername,
        password,
      });
      navigate("/");
    } catch (submitError) {
      setError(
        getUserFacingErrorMessage(submitError, "Échec de l'inscription"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-[10%] py-6">
      <Card className="w-full px-8 py-8">
        <h1 className="mb-6 text-3xl font-semibold text-text">S'inscrire</h1>
        <form
          aria-busy={isSubmitting}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="register-email"
          >
            Email
          </label>
          <Input
            className="mb-4 w-full"
            id="register-email"
            type="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            autoComplete="email"
            required
          />

          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="register-username"
          >
            Pseudo
          </label>
          <Input
            className="mb-4 w-full"
            id="register-username"
            type="text"
            placeholder="Ton pseudo"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
            minLength={AUTH_USERNAME_MIN_LENGTH}
            autoComplete="username"
            required
          />

          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="register-password"
          >
            Mot de passe
          </label>
          <Input
            className="mb-6 w-full"
            id="register-password"
            type="password"
            placeholder={`Minimum ${AUTH_PASSWORD_MIN_LENGTH} caractères`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? "true" : "false"}
            disabled={isSubmitting}
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            required
          />

          {error ? (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <PrimaryButton
            className="w-full py-3 text-base"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Inscription..." : "Créer mon compte"}
          </PrimaryButton>
        </form>

        <p className="mt-5 text-center text-sm text-text/70">
          Déjà inscrit ?{" "}
          <Link className="font-semibold underline" to="/login">
            Se connecter
          </Link>
        </p>

        <p className="mt-4 text-center text-xs leading-6 text-text/60">
          En creant un compte, vous acceptez nos{" "}
          <Link
            className="font-semibold underline underline-offset-4"
            to="/conditions-utilisation"
          >
            conditions d'utilisation
          </Link>{" "}
          et notre{" "}
          <Link
            className="font-semibold underline underline-offset-4"
            to="/politique-confidentialite"
          >
            politique de confidentialite
          </Link>
          .
        </p>
      </Card>
    </main>
  );
}

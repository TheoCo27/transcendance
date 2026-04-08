import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import {
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  login,
  register,
} from "../services/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
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
      await login({
        email: trimmedEmail,
        password,
      });
      navigate("/");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Échec de l'inscription",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-[10%] py-6">
      <Card className="w-full px-8 py-8">
        <h1 className="mb-6 text-3xl font-semibold text-text">S'inscrire</h1>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label
            className="mb-2 text-sm font-medium text-text/70"
            htmlFor="register-email"
          >
            Email
          </label>
          <input
            className="mb-4 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="register-email"
            type="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label
            className="mb-2 text-sm font-medium text-text/70"
            htmlFor="register-username"
          >
            Pseudo
          </label>
          <input
            className="mb-4 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="register-username"
            type="text"
            placeholder="Ton pseudo"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={AUTH_USERNAME_MIN_LENGTH}
            required
          />

          <label
            className="mb-2 text-sm font-medium text-text/70"
            htmlFor="register-password"
          >
            Mot de passe
          </label>
          <input
            className="mb-6 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="register-password"
            type="password"
            placeholder={`Minimum ${AUTH_PASSWORD_MIN_LENGTH} caractères`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            required
          />

          {error ? (
            <p className="mb-4 text-sm text-red-300">{error}</p>
          ) : null}

          <PrimaryButton className="w-full py-3 text-base" type="submit">
            {isSubmitting ? "Inscription..." : "Créer mon compte"}
          </PrimaryButton>
        </form>

        <p className="mt-5 text-center text-sm text-text/70">
          Déjà inscrit ?{" "}
          <Link className="font-semibold underline" to="/login">
            Se connecter
          </Link>
        </p>
      </Card>
    </main>
  );
}

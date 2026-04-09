import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { login } from "../services/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });
      navigate("/");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Échec de connexion",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-[10%] py-6">
      <Card className="w-full px-8 py-8">
        <h1 className="mb-6 text-3xl font-semibold text-text">Se connecter</h1>
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
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </PrimaryButton>
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

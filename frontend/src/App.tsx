import { useEffect, useState } from "react";

type HealthPayload = {
  ok: boolean;
  database?: {
    configured: boolean;
    ok: boolean;
    error?: string;
  };
  [key: string]: unknown;
};

type HealthState = {
  status: "loading" | "success" | "warning" | "error";
  title: string;
  detail: string;
  payload?: HealthPayload;
};

const loadingState: HealthState = {
  status: "loading",
  title: "Connexion en cours",
  detail: "Le frontend verifie que le backend et PostgreSQL repondent.",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erreur reseau inconnue";
}

export default function App() {
  const [health, setHealth] = useState<HealthState>(loadingState);

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        const response = await fetch("/health");
        const data = (await response.json()) as HealthPayload;

        if (cancelled) {
          return;
        }

        setHealth({
          status: data.ok ? "success" : "warning",
          title: data.ok ? "Stack disponible" : "Backend disponible, DB a verifier",
          detail: data.database?.ok
            ? "Le backend NestJS parle bien a PostgreSQL."
            : "Le backend tourne, mais la base ne repond pas encore correctement.",
          payload: data,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setHealth({
          status: "error",
          title: "Backend indisponible",
          detail: getErrorMessage(error),
        });
      }
    }

    void checkBackend();
    const timer = window.setInterval(() => {
      void checkBackend();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="page">
      <section className={`card card--${health.status}`}>
        <p className="eyebrow">ft_transcendance quickstart</p>
        <h1>Containers de dev prets a tester</h1>
        <h2>{health.title}</h2>
        <p>{health.detail}</p>
        <div className="actions">
          <a href="/api" target="_blank" rel="noreferrer">
            Ouvrir /api
          </a>
          <a href="/health" target="_blank" rel="noreferrer">
            Ouvrir /health
          </a>
        </div>
        {health.payload ? <pre>{JSON.stringify(health.payload, null, 2)}</pre> : null}
      </section>
    </main>
  );
}

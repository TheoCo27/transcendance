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

export default function StatusPage() {
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
    <section
      id="status"
      className="flex flex-1 items-center justify-center px-6 pb-16 pt-4"
    >
      <div
        className={[
          "w-full max-w-[760px] rounded-3xl border border-white/8 bg-[rgba(9,19,27,0.72)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-[12px]",
          health.status === "success"
            ? "shadow-[0_20px_60px_rgba(46,196,182,0.2)]"
            : "",
          health.status === "warning"
            ? "shadow-[0_20px_60px_rgba(231,111,81,0.25)]"
            : "",
          health.status === "error"
            ? "shadow-[0_20px_60px_rgba(214,40,40,0.25)]"
            : "",
        ].join(" ")}
      >
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#f4a261]">
          ft_transcendance quickstart
        </p>
        <h1 className="mb-4 text-[clamp(2rem,5vw,3.4rem)] leading-none">
          Containers de dev prets a tester
        </h1>
        <h2 className="mb-3 text-[#f4a261]">{health.title}</h2>
        <p className="max-w-[52ch] leading-[1.6]">{health.detail}</p>
        <div className="my-6 flex flex-wrap gap-3">
          <a
            className="rounded-full border border-[rgba(244,162,97,0.4)] bg-[rgba(244,162,97,0.16)] px-[18px] py-3"
            href="/api"
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir /api
          </a>
          <a
            className="rounded-full border border-[rgba(244,162,97,0.4)] bg-[rgba(244,162,97,0.16)] px-[18px] py-3"
            href="/health"
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir /health
          </a>
        </div>
        {health.payload ? (
          <pre className="m-0 overflow-auto rounded-[18px] bg-black/28 p-[18px]">
            {JSON.stringify(health.payload, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}

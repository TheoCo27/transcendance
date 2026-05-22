import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LegalSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: string;
  children: ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border border-white/10 bg-surface/80 px-6 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
    >
      <h2 id={id} className="text-2xl font-semibold text-text">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-text/80 md:text-base">
        {children}
      </div>
    </section>
  );
}

export default function LegalPageLayout({
  eyebrow,
  title,
  updatedAt,
  intro,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="flex flex-1 px-6 py-8 md:px-10 md:py-12">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <nav
          aria-label="Navigation juridique"
          className="text-sm text-text/70"
        >
          <Link
            className="underline decoration-white/30 underline-offset-4 transition hover:text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            to="/"
          >
            Retour a l'accueil
          </Link>
        </nav>

        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-surface via-surface to-bg px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-text md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text/80 md:text-base">
            {intro}
          </p>
          <p className="mt-4 text-sm text-text/65">
            Derniere mise a jour : {updatedAt}
          </p>
        </header>

        <div className="space-y-6">{children}</div>
      </article>
    </main>
  );
}

import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-surface" role="contentinfo">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm md:px-10">
        <p className="m-0 font-medium">Quiz Room (c) 2026</p>
        <nav
          aria-label="Liens du pied de page"
          className="flex flex-wrap items-center gap-4"
        >
          <Link
            className="underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            to="/"
          >
            Accueil
          </Link>

          <Link
            className="underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            to="/politique-confidentialite"
          >
            Politique de confidentialite
          </Link>
          <Link
            className="underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            to="/conditions-utilisation"
          >
            Conditions d'utilisation
          </Link>
        </nav>
      </div>
    </footer>
  );
}

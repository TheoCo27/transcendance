import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-surface" role="contentinfo">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm md:px-10">
        <p className="m-0 font-medium">Quiz Room (c) 2026</p>
        <div aria-label="Liens du pied de page" className="flex flex-wrap items-center gap-4">
          <a href="/">
            Accueil
          </a>

          <a href="/politique-confidentialite">
            Politique de confidentialite
          </a>

          <a href="/conditions-utilisation">
            Conditions d'utilisation
          </a>

        </div>
      </div>
    </footer>
  );
}

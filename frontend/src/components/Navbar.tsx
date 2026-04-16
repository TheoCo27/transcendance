import { Link, useNavigate } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";
import { logout } from "../services/auth";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

export default function Navbar() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthSession();

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-900/8 bg-[rgba(248,244,236,0.82)] text-slate-950 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <Link className="flex items-center gap-3" to="/">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold uppercase tracking-[0.18em] text-white">
            QZ
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-700">
            Quiz Room
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link to="/admin">Creer</Link>
          <Link to="/join">Rejoindre</Link>
          <Link to="/friends">Amis</Link>
        </div>

        <div className="flex items-center gap-3">
          {currentUser !== null ? (
            <>
              <Link
                className="hidden text-sm font-medium text-slate-600 sm:block"
                to="/friends"
              >
                Amis
              </Link>
              <Link
                className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                to="/profile"
              >
                {currentUser.username}
              </Link>
              <Link className="hidden text-sm font-medium text-slate-600 sm:block" to="/admin">
                Nouveau quiz
              </Link>
              <SecondaryButton
                onClick={() => {
                  void (async () => {
                    await logout();
                  })();
                }}
              >
                Se deconnecter
              </SecondaryButton>
            </>
          ) : (
            <>
              <Link className="text-sm font-medium text-slate-700" to="/login">
                Se connecter
              </Link>
              <PrimaryButton
                onClick={() => {
                  navigate("/register");
                }}
              >
                S'inscrire
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

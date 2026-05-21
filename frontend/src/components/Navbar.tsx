import {
  ChevronDown,
  CirclePlus,
  LogOut,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";
import { logout } from "../services/auth";
import PrimaryButton from "./ui/PrimaryButton";

export default function Navbar() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthSession();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-900/8 bg-surface text-text backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link className="flex items-center gap-3" to="/">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold uppercase tracking-[0.18em] text-white">
            QZ
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-700">
            Quiz Room
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/admin">Créer</Link>
          <Link to="/friends">Amis</Link>
        </div>

        <div className="flex items-center gap-3">
          {currentUser !== null ? (
            <div className="flex items-center gap-3">
              <div className="relative" ref={userMenuRef}>
                <button
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-bg px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10"
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen((current) => !current);
                  }}
                >
                  {currentUser.username}
                  {isUserMenuOpen ? (
                    <ChevronDown className="size-4 rotate-180 mt-0.5 transition duration-200 ease-linear" />
                  ) : (
                    <ChevronDown className="size-4 mt-0.5 transition duration-200 ease-linear" />
                  )}
                </button>

                {isUserMenuOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-48 rounded-lg border border-white/10 bg-surface p-2 shadow-[0_14px_40px_rgba(15,23,42,0.28)]">
                    <Link
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-text transition hover:bg-white/10"
                      role="menuitem"
                      to="/profile"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <UserRound className="size-5" />
                      Profil
                    </Link>
                    <Link
                      className="mt-1 flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-text transition hover:bg-white/10"
                      role="menuitem"
                      to="/friends"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <UsersRound className="size-5" />
                      Amis
                    </Link>
                    <Link
                      className="mt-1 flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-text transition hover:bg-white/10"
                      role="menuitem"
                      to="/admin"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <CirclePlus className="size-5" />
                      Nouveau quiz
                    </Link>
                    <button
                      className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm! font-semibold text-rose-300 transition hover:bg-rose-500/12 hover:text-rose-200"
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        void logout();
                      }}
                    >
                      <LogOut className="size-5 text-rose-300" />
                      Se déconnecter
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 md:gap-4 w-full">
              <Link className="text-sm font-medium text-slate-700" to="/login">
                Se connecter
              </Link>
              <PrimaryButton
                className="px-2 py-1 md:px-4 md:py-2 text-sm! md:text-base!"
                onClick={() => {
                  navigate("/register");
                }}
              >
                S'inscrire
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { logout } from "../services/auth";
import PrimaryButton from "./PrimaryButton";

export default function Navbar() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  return (
    <nav className="bg-surface text-text">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          className="text-sm font-medium uppercase tracking-[0.18em]"
          to="/"
        >
          Transcendance
        </Link>
        <div className="flex items-center gap-5">
          {currentUser !== null ? (
            <PrimaryButton
              className="px-4 py-2 text-sm"
              onClick={() => {
                void (async () => {
                  await logout();
                })();
              }}
            >
              Se déconnecter
            </PrimaryButton>
          ) : (
            <>
              <Link className="text-sm font-medium text-text" to="/login">
                Se connecter
              </Link>
              <PrimaryButton
                className="px-4 py-2 text-sm"
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

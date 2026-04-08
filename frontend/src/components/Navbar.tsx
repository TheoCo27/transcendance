import PrimaryButton from "./PrimaryButton";

export default function Navbar() {
  const isAuthenticated = false;

  return (
    <nav className="bg-surface text-text">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <a
          className="text-sm font-medium uppercase tracking-[0.18em]"
          href="/"
        >
          Transcendance
        </a>
        <div className="flex items-center gap-5">
          {isAuthenticated ? (
            <PrimaryButton className="px-4 py-2 text-sm">
              Se déconnecter
            </PrimaryButton>
          ) : (
            <>
              <a className="text-sm font-medium text-text" href="/login">
                Se connecter
              </a>
              <a
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-text"
                href="/register"
              >
                S'inscrire
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

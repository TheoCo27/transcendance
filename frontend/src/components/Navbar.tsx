export default function Navbar() {
  return (
    <nav className="bg-surface text-text">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-sm font-medium uppercase tracking-[0.18em]">
          Transcendance
        </div>
        <div className="flex items-center gap-5">
          <a className="text-sm font-medium text-text" href="/">
            Se connecter
          </a>
          <a
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-text"
            href="/"
          >
            S'identifier
          </a>
        </div>
      </div>
    </nav>
  );
}

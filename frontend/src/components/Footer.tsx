export default function Footer() {
  return (
    <footer className="bg-surface text-text">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3 text-sm">
        <p className="m-0">Transcendance © 2026</p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="/">Mentions legales</a>
          <a href="/">Politique de confidentialite</a>
          <a href="/">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

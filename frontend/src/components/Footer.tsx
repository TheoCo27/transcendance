export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm md:px-10">
        <p className="m-0 font-medium">Quiz Room (c) 2026</p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="/admin">Creer un quiz</a>
          <a href="/join">Rejoindre une room</a>
          <a href="/">Home</a>
        </div>
      </div>
    </footer>
  );
}

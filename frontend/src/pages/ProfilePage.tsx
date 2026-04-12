import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";

function formatJoinedDate(createdAt: string) {
  try {
    return new Date(createdAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return createdAt;
  }
}

function formatIdentityLabel(user: { email: string; isGuest: boolean }) {
  if (user.isGuest) {
    return "Compte invite";
  }

  return user.email;
}

export default function ProfilePage() {
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <div className="w-full rounded-[2rem] border border-slate-900/10 bg-white/70 p-8 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          Chargement du profil...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <section className="w-full rounded-[2.5rem] border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
            Profil
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Connexion requise</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-amber-900/80">
            Connecte-toi pour acceder a ta page profil et retrouver tes
            informations de session.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <PrimaryButton>Se connecter</PrimaryButton>
            </Link>
            <Link to="/register">
              <SecondaryButton>S'inscrire</SecondaryButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
      <section className="grid w-full gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Profil joueur
          </p>
          <div className="mt-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#f59e0b)] text-3xl font-semibold text-white">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="mt-6 text-3xl font-semibold">{user.username}</h1>
          <p className="mt-2 text-sm text-white/70">{formatIdentityLabel(user)}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">
              Statut: {user.status}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              {user.isGuest ? "Mode invite" : "Compte classique"}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              Membre depuis {formatJoinedDate(user.createdAt)}
            </span>
          </div>
        </article>

        <article className="rounded-[2.5rem] border border-slate-900/10 bg-white/80 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Informations
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">
            Ton espace personnel
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Cette page rassemble les informations de la session courante. Elle
            sert de point d'entree simple depuis la navbar, avec ton pseudo
            toujours accessible.
          </p>

          <dl className="mt-8 grid gap-4">
            <div className="rounded-[1.5rem] bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pseudo
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.username}
              </dd>
            </div>
            <div className="rounded-[1.5rem] bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {user.isGuest ? "Type de compte" : "Email"}
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.isGuest ? "Invite" : user.email}
              </dd>
            </div>
            <div className="rounded-[1.5rem] bg-slate-100/80 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Statut
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">
                {user.status}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/admin">
              <PrimaryButton>Creer un quiz</PrimaryButton>
            </Link>
            <Link to="/join">
              <SecondaryButton>Rejoindre une room</SecondaryButton>
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

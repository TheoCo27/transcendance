import { Link } from "react-router-dom";
import Section from "../components/section";
import SectionHeader from "../components/section-header";
import SectionLabel from "../components/section-label";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";

export default function HomePage() {
  const { user, isLoading: isSessionLoading } = useAuthSession();
  return (
    <main className="flex flex-1 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Section className="border border-white/10 bg-surface px-6 py-8 md:px-8 md:py-10">
          <SectionLabel className="text-slate-400">
            ft_transcendence
          </SectionLabel>
          <SectionHeader>
            Le lobby multijoueur a été retiré, on repart sur une base propre.
          </SectionHeader>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
            L’accueil n’expose plus le lobby multijoueur. Tu peux continuer à
            gérer les comptes, les amis, la messagerie privée et la création de
            quiz pendant qu’on refond entièrement cette partie de l’application.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/admin">
              <PrimaryButton>Créer un quiz</PrimaryButton>
            </Link>
            <Link to={user ? "/profile" : "/login"}>
              <SecondaryButton>
                {isSessionLoading
                  ? "Chargement..."
                  : user
                    ? "Voir mon profil"
                    : "Se connecter"}
              </SecondaryButton>
            </Link>
          </div>
        </Section>
      </div>
    </main>
  );
}

import LegalPageLayout, {
  LegalSection,
} from "../components/legal/LegalPageLayout";

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      eyebrow="Cadre d'utilisation"
      title="Conditions d'utilisation"
      updatedAt="22 mai 2026"
      intro="Ces conditions d'utilisation encadrent l'acces et l'usage de Quiz Room. En creant un compte, en vous connectant ou en utilisant l'application en mode invite, vous acceptez les regles ci-dessous."
    >
      <LegalSection id="tos-eligibility" title="1. Acces au service">
        <p>
          Quiz Room est un service de jeu et d'interaction autour de quizzes,
          de scores et de fonctionnalites sociales. Vous pouvez y acceder avec
          un compte classique, un compte relie a Google lorsqu'il est
          disponible, ou un profil invite si cette option est proposee.
        </p>
      </LegalSection>

      <LegalSection id="tos-account" title="2. Compte et identifiants">
        <p>
          Vous etes responsable des informations que vous fournissez lors de la
          creation du compte ainsi que de la confidentialite de vos identifiants.
          Vous vous engagez a utiliser une adresse email valide lorsque le
          service l'exige et a ne pas usurper l'identite d'un tiers.
        </p>
      </LegalSection>

      <LegalSection id="tos-acceptable-use" title="3. Usage acceptable">
        <p>Vous vous engagez a ne pas :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>perturber le fonctionnement du service, du chat ou des parties ;</li>
          <li>
            publier des contenus illicites, haineux, diffamatoires, violents ou
            manifestement contraires au respect des autres utilisateurs ;
          </li>
          <li>
            tenter de contourner l'authentification, les protections
            techniques, les limites de debit ou les regles du jeu ;
          </li>
          <li>
            utiliser le service pour spammer, harceler ou collecter des donnees
            sur d'autres utilisateurs sans autorisation.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="tos-content" title="4. Contenus et responsabilites">
        <p>
          Vous restez responsable des quizzes, messages, pseudos, avatars et
          autres contenus que vous publiez. Vous garantissez disposer des droits
          necessaires sur les contenus que vous ajoutez et vous acceptez qu'ils
          soient affiches, stockes et utilises dans le cadre normal du service.
        </p>
      </LegalSection>

      <LegalSection id="tos-gameplay" title="5. Fonctionnement des parties">
        <p>
          Les scores, classements, reponses et resultats de parties sont
          generes automatiquement a partir des regles du jeu et des donnees
          disponibles au moment de la partie. Des erreurs techniques, des
          coupures reseau ou des interruptions peuvent affecter une partie sans
          ouvrir droit a une garantie de resultat.
        </p>
      </LegalSection>

      <LegalSection id="tos-moderation" title="6. Suspension et moderation">
        <p>
          En cas d'abus, de triche, de non-respect des presentes conditions ou
          de risque pour la securite du service, l'acces a tout ou partie de
          Quiz Room peut etre suspendu, limite ou supprime sans preavis.
        </p>
      </LegalSection>

      <LegalSection id="tos-availability" title="7. Disponibilite du service">
        <p>
          Le service est fourni en l'etat. Il peut etre modifie, interrompu ou
          retire a tout moment, notamment dans le cadre d'un projet pedagogique,
          de maintenance, de correction ou d'evolution technique.
        </p>
      </LegalSection>

      <LegalSection id="tos-privacy" title="8. Donnees personnelles">
        <p>
          L'utilisation du service implique le traitement de certaines donnees
          personnelles. Pour plus de details, consultez la politique de
          confidentialite accessible depuis l'application.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

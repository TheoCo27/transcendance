import LegalPageLayout, {
  LegalSection,
} from "../components/legal/LegalPageLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Protection des donnees"
      title="Politique de confidentialite"
      updatedAt="22 mai 2026"
      intro="Cette politique de confidentialite explique quelles donnees sont traitees par Quiz Room, dans quel but et avec quelles garanties. Elle s'applique aux comptes utilisateurs, aux parties, aux rooms, aux quizzes, aux interactions sociales et aux mecanismes de connexion proposes dans l'application."
    >
      <LegalSection id="privacy-data" title="1. Donnees traitees">
        <p>
          Selon votre usage du service, nous pouvons traiter les donnees
          suivantes :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            donnees de compte : email, pseudo, mot de passe chiffre et statut
            du compte invite ou non ;
          </li>
          <li>
            donnees de profil : avatar, statut de presence, date de creation du
            compte ;
          </li>
          <li>
            donnees de connexion : cookie de session, identifiant OAuth Google
            si vous utilisez cette methode, journaux techniques necessaires au
            fonctionnement ;
          </li>
          <li>
            donnees d'usage : rooms creees ou rejointes, quiz, scores,
            reponses, classements, dates de debut et de fin des parties ;
          </li>
          <li>
            donnees de communication : messages de room, messages prives et
            relations d'amitie.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="privacy-purposes" title="2. Finalites du traitement">
        <p>Ces donnees sont utilisees pour :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>creer et securiser votre compte ;</li>
          <li>vous authentifier et maintenir votre session active ;</li>
          <li>vous permettre de creer, rejoindre et gerer des rooms ;</li>
          <li>
            enregistrer le deroulement des parties, calculer les scores et
            afficher les classements ;
          </li>
          <li>
            assurer les fonctionnalites sociales comme les amis et les messages
            prives ;
          </li>
          <li>
            detecter les abus, corriger les incidents et ameliorer la
            stabilite du service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="privacy-legal-basis" title="3. Base du traitement">
        <p>
          Le traitement repose principalement sur l'execution du service que
          vous demandez en utilisant l'application, sur l'interet legitime a
          securiser la plateforme et, lorsque cela est necessaire, sur votre
          choix explicite, par exemple pour une connexion via Google.
        </p>
      </LegalSection>

      <LegalSection id="privacy-retention" title="4. Conservation des donnees">
        <p>
          Les donnees sont conservees pendant la duree utile au fonctionnement
          du projet et a son suivi technique. Les donnees de compte, de quiz,
          de scores, de rooms et de messagerie peuvent donc rester stockees
          tant que le projet est actif ou jusqu'a suppression manuelle du
          compte ou des contenus concernes lorsque cela est possible.
        </p>
        <p>
          Les journaux techniques et traces de diagnostic sont conserves pour
          une duree limitee et proportionnee aux besoins de maintenance et de
          securite.
        </p>
      </LegalSection>

      <LegalSection id="privacy-sharing" title="5. Destinataires des donnees">
        <p>
          Les donnees sont destinees aux responsables du projet et aux services
          techniques strictement necessaires a son fonctionnement. Certaines
          informations sont naturellement visibles par d'autres utilisateurs,
          par exemple votre pseudo, votre avatar, votre statut, votre presence
          dans une room, vos scores et vos messages dans les espaces ou vous
          choisissez d'interagir.
        </p>
      </LegalSection>

      <LegalSection id="privacy-security" title="6. Securite">
        <p>
          Des mesures raisonnables sont mises en oeuvre pour proteger les
          donnees, notamment la gestion de session, le chiffrement du mot de
          passe, des controles d'acces et des mecanismes de limitation contre
          certains abus. Aucune mesure n'offre toutefois une securite absolue,
          et vous devez aussi proteger vos identifiants de connexion.
        </p>
      </LegalSection>

      <LegalSection id="privacy-rights" title="7. Vos droits">
        <p>
          Vous pouvez demander l'acces, la rectification ou la suppression de
          vos donnees lorsqu'une telle demande est compatible avec les
          contraintes du projet et ses obligations techniques. Vous pouvez aussi
          demander des explications sur les traitements effectues.
        </p>
        <p>
          Si vous souhaitez exercer un droit relatif a vos donnees, adressez
          votre demande a l'equipe responsable du projet via le canal de contact
          mis a votre disposition pour cette instance de Quiz Room.
        </p>
      </LegalSection>

      <LegalSection id="privacy-cookies" title="8. Cookies et session">
        <p>
          L'application utilise principalement un cookie de session pour vous
          authentifier et maintenir votre connexion. Sans ce cookie, certaines
          fonctionnalites comme l'acces au compte, aux rooms privees ou aux
          interactions sociales peuvent ne pas fonctionner correctement.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

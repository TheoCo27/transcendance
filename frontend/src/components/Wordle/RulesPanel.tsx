import type { PuzzleStoreType } from "./PuzzleStore";

type RulesPanelProps = {
  onClose: () => void;
  store: PuzzleStoreType;
  setReady: () => void;
  readyFlag: boolean
};

export default function RulesPanel({ onClose, store, setReady, readyFlag }: RulesPanelProps) {

  const renderWordExample = (
    word: string,
    highlightedLetter: string,
    highlightedColor: string,
    defaultColor: string,
  ) => (
    <div className="grid grid-cols-5 gap-1.25 mt-3">
      {word.split("").map((letter, i) => (
        <div
          key={`${word}-${i}`}
          className={[
            "h-7 w-7 rounded font-bold text-2xl uppercase flex items-center justify-center",
            letter === highlightedLetter ? highlightedColor : defaultColor,
          ].join(" ")}
        >
          {letter}
        </div>
      ))}
    </div>
  );

  //pull dans le back TEMPORAIRE
  let playersReady = 0;
  let numberOfPlayers = 0;

  if (readyFlag === true)
  {
    if (numberOfPlayers === playersReady)
    {
      onClose()
      store.start_time = Math.floor(Date.now() / 1000)
    }
    else 
    {
      return (
              <div className="h-[40vw] w-[60vw] flex flex-col rounded-2xl border border-white/10 bg-surface">
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-3xl text-center">
                <p className="m-0 text-lg leading-8 text-text/80">
                  EN ATTENTE QUE TOUT LES JOUEURS SOIENT PRÊTS

                  {/*pull dans le back TEMPORAIRE*/} 
                  <div>Joueurs manquants : (pull dans le back leur noms) (afficher en rouge) </div>
                        
                </p>
              </div>
            </div>
          </div>
      );
    }
  }
  else 
  {
    return (
      <div className="h-[40vw] w-[60vw] flex flex-col rounded-2xl border border-white/10 bg-surface">
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-3xl text-center">
            <h1 className="mb-6 text-3xl font-semibold text-text">Règles</h1>
            <p className="m-0 text-lg leading-8 text-text/80 ">

            <div> Un mot de (5 à 7) lettres est choisi aléatoirement. Vous devez le deviner en 6 essais.</div>
            <div> À chaque essai, les lettres du mot que vous avez proposé changeront de couleur</div>
            <div>  en fonction de à quel point vous êtes proche de le trouver.</div>


            <div className="mt-2 flex flex-col items-center justify-center">

            {renderWordExample("FRUIT", "F", "bg-green-500", "bg-gray-500")}
            La lettre F est dans le mot, à la bonne place.

            {renderWordExample("SOEUR", "E", "bg-yellow-400", "bg-gray-500")}
            La lettre E est dans le mot, mais pas à la bonne place.

            {renderWordExample("PRATE", "R", "bg-gray-500", "bg-green-500")}
            La lettre R n'est pas dans le mot

            </div>
            </p>
        <button
            className="mt-3 rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={() => {
              setReady()
            }}
          >
            Fermer les règles
          </button>
          </div>
        </div>
      </div>
    );
  }
}

//import type { ReactNode } from "react";

// type PanelProps = {
//   children: ReactNode;
//   className?: string;
// };

// function Panel({ children, className = "" }: PanelProps) {
//   return (
//     <div
//       className={`flex flex-col rounded-2xl border border-white/10 bg-surface ${className}`}
//     >
//       {children}
//     </div>
//   );
// }

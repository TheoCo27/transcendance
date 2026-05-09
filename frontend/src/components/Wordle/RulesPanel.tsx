import type { ReactNode } from "react";
import type { PuzzleStoreType } from "./PuzzleStore";
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

type RulesPanelProps = {
  onClose: () => void;
  store: PuzzleStoreType;
  setReady: () => void;
  readyFlag: boolean
};

export default function RulesPanel({ onClose, store, setReady, readyFlag }: RulesPanelProps) {

  if (readyFlag === true)
  {
    return (
             <div className="h-[40vw] w-[60vw] flex flex-col rounded-2xl border border-white/10 bg-surface">
        <div className="">

        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-3xl text-center">
            <p className="m-0 text-lg leading-8 text-text/80">
              WAITING SCREEN OTHER PLAYERS            
            </p>
          </div>
        </div>
      </div>
    );

  }
  else 
  {
    return (
      <div className="h-[40vw] w-[60vw] flex flex-col rounded-2xl border border-white/10 bg-surface">
        <div className="">

        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-3xl text-center">
            <h1 className="mb-6 text-3xl font-semibold text-text">Règles</h1>
            <p className="m-0 text-lg leading-8 text-text/80">

            <div> Chaque jour, un mot de 5 lettres est choisi aléatoirement. Vous devez le deviner en 6 essais.</div>
            <div> À chaque essai, les lettres du mot que vous avez proposé changeront de couleur en fonction de à quel point vous êtes proche de le trouver.</div>

            <div>
            F R U I T
            La lettre F est dans le mot, à la bonne place.
            </div>

            <div>P O C H E        
            La lettre C est dans le mot, mais pas à la bonne place.
            </div>

            <div>
            S O E U R
            La lettre R n'est pas dans le mot
            </div>
            
            </p>
        <button
            className="mt-3 rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={() => {
              // onClose()
              //normalement flag joueur pret, pas temps direct
              // readyFlag.current = true
              setReady()
              // store.start_time = Math.floor(Date.now() / 1000)
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
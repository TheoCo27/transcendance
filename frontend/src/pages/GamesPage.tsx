import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useState } from "react";
import Guess from "../components/Wordle/Guess";
import PuzzleStore from "../components/Wordle/PuzzleStore";
import { useToast } from "../components/ui/toast";
import Keyboard from "../components/Wordle/Keyboard";
import ProgressBar from "../components/Wordle/ProgressBar";
import RulesPanel from "../components/Wordle/RulesPanel";

export default observer(function GamesPage() {

  const store = useLocalObservable(() => PuzzleStore)
  const toast = useToast();
  const [isRulesOpen, setRulesOpen] = useState(true);
  const [currentTime, setcurrentTime] = useState(-1);

   useEffect(() => {
    store.init()
    window.addEventListener('keyup', store.handleKeyup)

    // L'interval est créé ici, donc UNE fois :
    const intervalId = setInterval(() => {
      //PAS SUR UTILE
      if (!isRulesOpen)
        store.checkTimeUp();
      if (store.currentGuess === 6 || store.won) {
        clearInterval(intervalId);
      }
    }, 1200); // update every 1.2s for progress

    return () => {
      window.removeEventListener('keyup', store.handleKeyup)
      clearInterval(intervalId);
    }
  }, [])

  useEffect( () => {
      if (store.ToastId === 0) return;
      
      if (store.ToastMessage === "Ce mot n'est pas dans la liste")
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === `Pour valider un mot, vous devez entrer ${store.nbr_letters} lettres`)
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === "Vous avez terminé n* (NUM PULL DU BACK)")
        toast.success(store.ToastMessage);
      else if (store.ToastMessage === "Le temps est écoulé, vous n'avez pas trouvé le bon mot")
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === "Vous n'avez pas trouvé le bon mot")
        toast.error(store.ToastMessage);

  }, [store.ToastId])

  
	return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      
    {
      isRulesOpen ? (
        <div className="flex items-center justify-end">
          <RulesPanel onClose={() => setRulesOpen(false)} />
        </div>
		    //qd tous pret et que regles sont fermees
        // peux pas mettre dans autre scope car doit se lancer une seule fois pour le temps
        //oubien un flag qui passe a 1 pour exec une seule fois
        // start_time vaux -1 de base donc pas besoin si exec ici, sinon le test ok

          // if (!isRulesOpen && playersReady === numberOfPlayers)
            // store.start_time = Math.floor(Date.now() / 1000)
      ) : (
        <>
          {/* si isRulesOpen true, lance pas timer*/}
          {/* start_timer */}
          <h1>GamePage</h1>
          <h1>Wordle</h1>
          <ProgressBar start_time={store.start_time} store={store} />

          {store.guesses.map((_, i) => (
            <Guess
              checkerValidWord={store.all_words_array_json}
              lettersCount={store.nbr_letters}
              flag={store.validWord}
              word={store.word}
              guess={store.guesses[i] ?? ""}
              isGuessed={i < store.currentGuess}
            />
          ))}

          <div className="mt-3">
            <Keyboard store={store} />
          </div>
          
          {/* creer debug flag */}
          <div>word: {store.word}</div>
          <div>currentGuess: {store.currentGuess}</div> 
          <div>guesses: {JSON.stringify(store.guesses)}</div>
          <div>Secondes passees: {Math.floor(Date.now() / 1000) - store.start_time}</div>
        </>
      )
    }
    
    </div>
  );
});

    {/* <Guess {...s} /> */}
  // {/* <Guess word={"test"} guess={"ttst2"} isGuessed={false} /> */}
  // {/* {store.won && <h1> You Won </h1> || store.lost && <h1> You lost </h1>} */}
  

  // {/* <h1>Azerty clavier</h1>  */}

  // error_list: "This word isn't in the list",
		
  // const value = useMemo<ToastContextValue>(
  //   () => ({
  //     error: (message, options) => {
  //       addToast("error", message, options);
  //     },
  //     success: (message, options) => {
  //       addToast("success", message, options);
  //     },
  //   }),
  //   [addToast],
  // );

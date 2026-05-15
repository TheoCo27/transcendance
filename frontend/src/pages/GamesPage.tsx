import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useState, useRef } from "react";
import Guess from "../components/Wordle/Guess";
import PuzzleStore from "../components/Wordle/PuzzleStore";
import { useToast } from "../components/ui/toast";
import Keyboard from "../components/Wordle/Keyboard";
import ProgressBar from "../components/Wordle/ProgressBar";
import RulesPanel from "../components/Wordle/RulesPanel";
import { toHHMMSS } from "../components/Wordle/ConvertTime";

export default observer(function GamesPage() {

  const store = useLocalObservable(() => PuzzleStore)
  const toast = useToast();
  const [isRulesOpen, setRulesOpen] = useState(true);
  const [isPlayerReady, setPlayerReady] = useState(false);

  const isRulesOpenRef = useRef(isRulesOpen); //car useEffect garde sinon la tt premiere valeure
  useEffect(() => {
    isRulesOpenRef.current = isRulesOpen;
  }, [isRulesOpen]);

   useEffect(() => {
    store.init()
    window.addEventListener('keyup', store.handleKeyup)

    // L'interval est créé ici, donc UNE fois :
    const intervalId = setInterval(() => {
      // si tout les joueurs prets
      if (isRulesOpenRef.current === false)
        store.checkTimeUp();
      if (store.currentGuess === 6 || store.won) {
        clearInterval(intervalId);
      }
    }, 1000); // update every 1s for progress

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
      else if (store.ToastMessage === `Vous avez trouvé le bon mot en, ${toHHMMSS((Math.floor(Date.now() / 1000) - store.total_time).toString())}`) //TEMPORAIRE
        toast.success(store.ToastMessage);
      else if (store.ToastMessage === "Le temps est écoulé, vous n'avez pas trouvé le bon mot")
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === "Vous n'avez pas trouvé le bon mot")
        toast.error(store.ToastMessage);

  }, [store.ToastId])

  
	return (
    <div className="flex flex-1 flex-col py-1 items-center justify-center">
      
    {
      // si isRulesOpen true, lance pas timer
      isRulesOpen ? (
        <div className="flex items-center justify-end">
          <RulesPanel onClose={() => setRulesOpen(false)} store={store} setReady={() => {setPlayerReady(true); }} readyFlag={isPlayerReady}/>
        </div>
      ) : (
        <>
          {/* start_timer */}
          <h1>GamePage</h1>
          <h1>Wordle</h1>
          {/* <div className="flex w-[min(92vw,26rem)]"> */}
          <ProgressBar start_time={store.start_time} store={store} />
          {/* </div> */}

          {store.guesses.map((_, i) => (
              <Guess
                key={i}
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

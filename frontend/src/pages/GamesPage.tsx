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
  const debugFlag = false;

  const isRulesOpenRef = useRef(isRulesOpen); // because useEffect keeps the very first value otherwise
  useEffect(() => {
    isRulesOpenRef.current = isRulesOpen;
  }, [isRulesOpen]);

   useEffect(() => {
    store.init()
    window.addEventListener('keyup', store.handleKeyup)

    // The interval is created here, so only once:
    const intervalId = setInterval(() => {
      // if all players are ready
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
      else if (store.ToastMessage === `Le temps est écoulé, vous n'avez pas trouvé le mot: ${store.word}`)
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === `Vous n'avez pas trouvé le mot: ${store.word}`)
        toast.error(store.ToastMessage);

  }, [store.ToastId])

  
	return (
    <div className="flex flex-1 flex-col py-1 items-center justify-center">
      
    {
      // if isRulesOpen is true, timer not started
      isRulesOpen ? (
        <div className="flex items-center justify-end">
          <RulesPanel onClose={() => setRulesOpen(false)} store={store} setReady={() => {setPlayerReady(true); }} readyFlag={isPlayerReady}/>
        </div>
      ) : (
        <>
          <h1>GamePage</h1>
          <h1>Wordle</h1>
          <ProgressBar start_time={store.start_time} store={store} />

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
               
          { debugFlag ? 
        (
          <>
          <div>word: {store.word}</div>
            <div>currentGuess: {store.currentGuess}</div> 
            <div>guesses: {JSON.stringify(store.guesses)}</div>
            <div>Elapsed seconds: {Math.floor(Date.now() / 1000) - store.start_time}</div>
            </>)          
           : null}
          
        </>
      )
    }
    
    </div>
  );
});


    {/* <Guess {...s} /> */}
  // {/* <Guess word={"test"} guess={"ttst2"} isGuessed={false} /> */}
  // {/* {store.won && <h1> You Won </h1> || store.lost && <h1> You lost </h1>} */}
  		
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

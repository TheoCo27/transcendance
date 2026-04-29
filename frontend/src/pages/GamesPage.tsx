import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect } from "react";
import Guess from "../components/Wordle/Guess";
import type { settings } from "../components/Wordle/Settings";
import PuzzleStore from "../components/Wordle/PuzzleStore";
import { useToast } from "../components/ui/toast";


export default observer(function GamesPage() {

  const store = useLocalObservable(() => PuzzleStore)
  const toast = useToast();

  useEffect( () => {
    store.init()

    window.addEventListener('keyup', store.handleKeyup)

    return () => {
      window.removeEventListener('keyup', store.handleKeyup)
    }
  }, [])

  useEffect( () => {
      if (store.ToastId === 0) return;
      
      if (store.ToastMessage === "This word isn't in the list")
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === "You Finished number (moitiee supeieure)")
        toast.success(store.ToastMessage);
      else if (store.ToastMessage === "You Finished number (moitiee inferieure)")
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === "You haven't finished within time")
        toast.error(store.ToastMessage);
      else if (store.ToastMessage === "You haven't found the right word")
        toast.error(store.ToastMessage);

  }, [store.ToastId, store.ToastMessage, toast])


  // if {store.cur_error} === 1 print error, and {store.cur_error} = 0, else skip
  
	return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <h1>GamePage</h1>
      <h1>Wordle</h1>

      {/* <Guess {...s} /> */}
      {/* key pour via clavier visuel jcrois */}
      {store.guesses.map((_, i) => (
        <Guess
          key={i}
          word={store.word}
          guess={store.guesses[i] ?? ""}
          isGuessed={i < store.currentGuess}
        />
      ))}

		      {/* <Guess word={"test"} guess={"ttst2"} isGuessed={false} /> */}


      {/* {store.won && <h1> You Won </h1> || store.lost && <h1> You lost </h1>} */}
      
      {/* si isGuessed === true utilisateur a appuiye sur entree donc faire comparaison */}

      {/* <h1>Azerty clavier</h1> <Keyboard /> */}

      <div>word: {store.word}</div>      {/* extraire mot de fichier */}
      <div>currentGuess: {store.currentGuess}</div> 
      <div>guesses: {JSON.stringify(store.guesses)}</div>
      {/* <div>guesses: {store.guesses.join(" | ")}</div> */}
    </div>
  );
});

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

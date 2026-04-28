import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect } from "react";
import Guess from "../components/Wordle/Guess";
import type { settings } from "../components/Wordle/Settings";
import PuzzleStore from "../components/Wordle/PuzzleStore";


export default observer(function GamesPage() {

  const store = useLocalObservable(() => PuzzleStore)

  useEffect( () => {
    store.init()

    window.addEventListener('keyup', store.handleKeyup)

    return () => {
      window.removeEventListener('keyup', store.handleKeyup)
    }
  }, [])

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


      {store.won && <h1> You Won </h1> || store.lost && <h1> You lost </h1>}
      
      {/* si isGuessed === true utilisateur a appuiye sur entree donc faire comparaison */}

      {/* <h1>Azerty clavier</h1> <Keyboard /> */}

      <div>word: {store.word}</div>      {/* extraire mot de fichier */}
      <div>currentGuess: {store.currentGuess}</div> 
      <div>guesses: {JSON.stringify(store.guesses)}</div>
      {/* <div>guesses: {store.guesses.join(" | ")}</div> */}
    </div>
  );
});

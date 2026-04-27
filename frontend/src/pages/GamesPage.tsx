import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect } from "react";
import Guess from "../components/Wordle/Guess";
import type { settings } from "../components/Wordle/Settings";
import PuzzleStore from "../components/Wordle/PuzzleStore";


export default function GamesPage() {

// const s: settings = {
//   word: "test",
//   guess: "test2",
//   isGuessed: false,
// };

	return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <h1>GamePage</h1>
      <h1>Wordle</h1>

      {/* <Guess {...s} /> */}
      	{new Array(6).fill(0).map((_, i) => (
		      <Guess word={"test"} guess={"ttst2"} isGuessed={false} />
	  ))}

      <h1>Win / Loss </h1>
      {/* si isGuessed === true utilisateur a appuiye sur entree donc faire comparaison */}

      <h1>Azerty clavier</h1>
      {/* <h1>Qwerty clavier si mode du site en anglais</h1> */}
      {/* <Keyboard /> */}
      {/* extraire mot de fichier */}
    </div>
  );
}
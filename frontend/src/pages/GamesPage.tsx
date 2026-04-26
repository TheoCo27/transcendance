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
      {/* si isGuessed === true ne pas prendre d'input */}
      {/* <Keyboard word={"test"} guess={"test2"} isGuessed={false} /> */}
      {/* extraire mot de fichier */}
    </div>
  );
}
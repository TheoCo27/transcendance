import type { settings } from "./Settings";

export default function Guess({ word, guess, isGuessed }: settings) {
//   if (word === "debug") return <div>ok</div>;
//   if (guess === "debug") return <div>ok</div>;
//   if (isGuessed) return <div>ok</div>;

  return (
  <div className="grid grid-cols-5 gap-1 mb-1"> 
	{new Array(5).fill(0).map((_, i) => {
		const bgColor = !isGuessed //si === 0
		? 'bg-black'
		: guess[i] === word[i]
		? 'bg-green-400'
		: word.includes(guess[i])
		? 'bg-yellow-400'
		: 'bg-black'

		return (
			// test output, si guess[i] est vide pareil, sinon couleur change
		<div className={`h-16 w-16 border border-gray-400 font-bold text-3xl uppercase flex items-center justify-center ${bgColor}`}>
			{guess[i]}
			</div>
		)
	})}
	</div>
  )
}


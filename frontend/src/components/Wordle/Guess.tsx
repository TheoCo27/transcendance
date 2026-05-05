import type { settings } from "./Settings";
import five_words_all from "./wordle_compare_5.json"


export default function Guess({ flag, word, guess, isGuessed}: settings) {
//   if (word === "debug") return <div>ok</div>;
//   if (guess === "debug") return <div>ok</div>;
//   if (isGuessed) return <div>ok</div>;

	if (guess.length === 5)
	{
		if (five_words_all.includes(guess))
			flag = true
		else
			flag = false
	}
	else
		flag = false

// SI 0 NORMAL, SINON BGCOLOR DERNIERE COULEUR
	let bgColor : string

  return (
  <div className="grid grid-cols-5 gap-1.25 mb-1.25"> 
	{new Array(5).fill(0).map((_, i) => {

		flag == true ?
		(bgColor = !isGuessed //si === 0
		? 'bg-black'
		: guess[i] === word[i]
		? 'bg-green-500'
		: word.includes(guess[i])
		? 'bg-yellow-400'
		: 'bg-gray-500') 
		: (bgColor = !isGuessed //si === 0
		? 'bg-black'
		: 'bg-gray-500') 

		return (
			guess.length === 5 && isGuessed ?
			<div
			className={
				`h-16 w-16 rounded font-bold text-3xl uppercase flex items-center justify-center ${bgColor}`}
			> 
			{guess[i]}
			</div>
			:
			<div
			className={[
				`h-16 w-16 border-2 rounded font-bold text-3xl uppercase flex items-center justify-center ${bgColor}`,
				guess[i] ? "border-gray-400" : "border-gray-600",
			].join(" ")}
			> 
			{guess[i]}
			</div>
		)
	})}
	</div>
  )
}


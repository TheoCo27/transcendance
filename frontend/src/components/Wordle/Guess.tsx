import type { settings } from "./Settings";

export default function Guess({ checkerValidWord, lettersCount, flag, word, guess, isGuessed}: settings) {
//   if (word === "debug") return <div>ok</div>;
//   if (guess === "debug") return <div>ok</div>;
//   if (isGuessed) return <div>ok</div>;

	if (guess.length === lettersCount)
	{
		if (checkerValidWord.includes(guess))
			flag = true
		else
			flag = false
	}
	else
		flag = false

	let bgColor : string

	const gridColsClass = {
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	}[lettersCount] || "grid-cols-5";


  return (
  <div className={`grid ${gridColsClass} gap-1.25 mb-1.25`}> 
	{new Array(lettersCount).fill(0).map((_, i) => {

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
			guess.length === lettersCount && isGuessed ?
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


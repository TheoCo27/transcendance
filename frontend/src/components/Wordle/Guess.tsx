import type { settings } from "./Settings";
import { memo } from "react";

const Guess = memo(function Guess({ checkerValidWord, lettersCount, flag, word, guess, isGuessed}: settings) {

	if (guess.length === lettersCount)
	{
		if (checkerValidWord.includes(guess))
			flag = true
		else
			flag = false
	}
	else
		flag = false

	const gridColsClass = {
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	}[lettersCount] || "grid-cols-5";

	// Pre-calculate colors for all positions
	const colors: string[] = new Array(lettersCount).fill('bg-gray-500');

	// wordLetterCount prend toutes les lettres, avec leurs nombres de repetitions
	// si wordLetterCount[word[j]] est undefined (premiere iteration, vaut 0 et plus 1 pour chaque boucles)
	// donc futur appels wordLetterCount[word[j]] existe donc juste +1
	// pas wordLetterCount[word[j]]++, car undefined++ donne NaN

	//si l'index du guess et du word recherchee correspondent, couleure verte
	//et reduit de un le nombre d'occurence de cette lettre

	// si la lettre n'as pas ete trouvee a son emplacement exact (couleure toujour gray)
	// et que il reste aumoins une fois cette lettre dans le word dont on recherche, couleure jaune

	if (flag == true && isGuessed) {
		// Count available letters in word
		const wordLetterCount: { [key: string]: number } = {};
		for (let j = 0; j < word.length; j++) {
			wordLetterCount[word[j]] = (wordLetterCount[word[j]] || 0) + 1;
		}

		// First pass: mark greens
		for (let j = 0; j < guess.length; j++) {
			if (guess[j] === word[j]) {
				colors[j] = 'bg-green-500';
				wordLetterCount[guess[j]]--;
			}
		}

		// Second pass: mark yellows
		for (let j = 0; j < guess.length; j++) {
			if (colors[j] === 'bg-gray-500' && wordLetterCount[guess[j]] > 0) {
				colors[j] = 'bg-yellow-400';
				wordLetterCount[guess[j]]--;
			}
		}
	}
	else if (!isGuessed)
		colors.fill('bg-black'); //if neither, color is black

  return (
  <div className={`grid ${gridColsClass} gap-1.5 mb-1.25 flex w-[min(92vw,22rem)]`}>
	{new Array(lettersCount).fill(0).map((_, i) => {

		const bgColor = colors[i];

		return (
			guess.length === lettersCount && isGuessed ?
			<div
			key={i}
			className={
				`h-16 rounded font-bold text-3xl uppercase flex items-center justify-center ${bgColor}`}
			>
			{guess[i]}
			</div>
			:
			<div
			key={i}
			className={[
				`h-16 border-2 rounded font-bold text-3xl uppercase flex items-center justify-center ${bgColor}`,
				guess[i] ? "border-gray-400" : "border-gray-600",
			].join(" ")}
			>
			{guess[i]}
			</div>
		)
	})}
	</div>
  )
});

export default Guess;

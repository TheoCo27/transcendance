//import words depuis fichier json
import five_words from "./wordle_5.json"
import five_words_all from "./wordle_compare_5.json"

// type settings = {
//   word : string;
//   guesses : string[];
//   currentGuess : number;
// }

// const s: settings = {

// };


export default {

	word: "",
	guesses: [] as string[],
	currentGuess: 0,
	ToastMessage: "",
	ToastId: 0,

	get won() {
		return this.currentGuess > 0 && this.guesses[this.currentGuess - 1] === this.word
	},
	get lost() {
		return this.currentGuess === 6
	},

	toast_validWord(guess : string) {
		if (!five_words_all.includes(guess)) {
			this.ToastMessage = "This word isn't in the list";
			this.ToastId++;
			return;
		}
			return 1;
	},

	toast_won() {
		if (this.currentGuess > 0 && this.guesses[this.currentGuess - 1] === this.word) {
			this.ToastMessage = "You Finished number (moitiee supeieure)";
			this.ToastId++;
		}
	},
	
	toast_lost() {
		if (this.currentGuess === 6) {
			this.ToastMessage = "You haven't found the right word";
			this.ToastId++;
		}
	},

	init() {
		this.word = five_words[Math.floor(Math.random() * five_words.length)]
		this.guesses = new Array(6).fill('');
		this.currentGuess = 0
	},

	submitGuess() {
		const guess = this.guesses[this.currentGuess];
		if (guess.length !== 5) return;

		if (this.toast_validWord(guess))
		{
			this.currentGuess++;
			this.toast_won();
			this.toast_lost();
		}
	},

	handleKeyup(e : KeyboardEvent)
	{
		//si bon return fait R
		if (this.won || this.lost)
			return

		if (e.key === 'Enter'){
			return this.submitGuess()
		}

		if (e.key === 'Backspace'){
			this.guesses[this.currentGuess] = this.guesses[this.currentGuess].slice(0, -1)
			return
		}

		if (this.guesses[this.currentGuess].length < 5 && /^[a-z]$/i.test(e.key)) {
			this.guesses[this.currentGuess] += e.key.toLocaleLowerCase()
		}
	},
}
// five_words.includes(this.guesses[this.currentGuess])
//e.key.match(/^[A-z]$/) prend aussi \/ ect

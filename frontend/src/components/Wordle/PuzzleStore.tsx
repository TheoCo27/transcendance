//import words depuis fichier json
import five_words from "./wordle_5.json"

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

	get won() {
		return this.currentGuess > 0 && this.guesses[this.currentGuess - 1] === this.word
	},
	get lost() {
		return this.currentGuess === 6
	},

	init() {
		this.word = five_words[Math.floor(Math.random() * five_words.length)]
		this.guesses = new Array(6).fill('');
		this.currentGuess = 0
	},

	submitGuess() {
		if (this.guesses[this.currentGuess].length == 5) {
			this.currentGuess++
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

//import words depuis fichier json
import five_words from "./wordle_5.json"

type settings = {
  word : string;
  guesses : string[];
  currentGuess : number;
}

const s: settings = {
  word: '',
  guesses: [],
  currentGuess: 0,
};

export default {

	get won() {
		return s.guesses[s.currentGuess - 1] === s.word
	},
	get lost() {
		return s.currentGuess === 6
	},

	init() {
		s.word = five_words[Math.floor(Math.random() * five_words.length)]
		s.guesses = new Array(6).fill('');
		s.currentGuess = 0
	},
}
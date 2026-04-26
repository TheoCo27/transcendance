//import words depuis fichier json

export default {

	word:'',
	guesses: [],
	currentGuess: 0,

	get won() {
		return this.guesses[this.currentGuess - 1] === this.word
	},
	get lost() {
		return this.currentGuess === 6
	}

	// init() {
	// 	this.word = words
	// 	this.guesses = 
	// 	this.currentGuess = 0
	// }
}
//import words depuis fichier json
import five_words from "./wordle_5.json"
import all_five_words from "./wordle_compare_5.json"

import six_words from "./wordle_6.json"
import all_six_words from "./wordle_compare_6.json"

import seven_words from "./wordle_7.json"
import all_seven_words from "./wordle_compare_7.json"

export type PuzzleStoreType = {
  word: string;
  guesses: string[];
  currentGuess: number;
  validWord: boolean,
  submittedGuesses: string[];

  ToastMessage: string;
  ToastId: number;

  start_time: number;
  timeStatus: boolean;
  time_per_word: number;

  nbr_letters: number;
  words_array_json: string[];
  letters_array_json: string[];
  all_words_array_json: string[];

  won: boolean;
  lost: boolean;

  keyGuessed : string[];
  keyInexact : string[];
  AllGuessesMashed : string[]; // que utilisee ici

  players_ready : number;

  toast_validWord(guess: string): 1 | 0;
  toast_x_letters(): void;
  toast_won(): void;
  toast_timeup(): void;
  toast_lost(): void;
  checkTimeUp(): void;

  init(): void;
  submitGuess(): void;
  handleKeyup(e: KeyboardEvent): void;
  handleKeyboard(key : string) : void;
};


export default {

	word: "",
	guesses: [] as string[],
	currentGuess: 0,
	validWord: true,

	ToastMessage: "",
	ToastId: 0,

	start_time: -1,
	time_per_word: 5,

	nbr_letters: 6,
	words_array_json: [] as string[],
	letters_array_json: [] as string[],
	all_words_array_json: [] as string[],

	players_ready: 1, //PULL VALEUR DU BACK

	get won() {
		return this.currentGuess > 0 && this.guesses[this.currentGuess - 1] === this.word
	},
	get lost() {
		return this.currentGuess === 6
	},


	get submittedGuesses() {
	return this.guesses
		.slice(0, this.currentGuess)               // seulement envoyés
		.filter((g) => typeof g === 'string' && g.length === this.nbr_letters && this.all_words_array_json.includes(g))
	},

	get AllGuessesMashed() {
		return this.submittedGuesses.join('').split('')
	},

	get keyGuessed() {
		return this.word.split('').filter((letter, i) => this.submittedGuesses.map((w) => w[i]).includes(letter))
	},

	get keyInexact(){
		return this.word.split('').filter((letter) => this.AllGuessesMashed.includes(letter))
	},

	//TEMPS
	get timeStatus(){
		return ((Math.floor(Date.now() / 1000) - this.start_time) >= this.time_per_word);
	},

	toast_validWord(guess : string) {
		if (!this.all_words_array_json.includes(guess)) {
			this.ToastMessage = "Ce mot n'est pas dans la liste";
			this.ToastId++;
			return 0;
		}
			return 1;
	},

	toast_x_letters() {
		this.ToastMessage = `Pour valider un mot, vous devez entrer ${this.nbr_letters} lettres`;
		this.ToastId++;
	},
	
	toast_won() {
		this.ToastMessage = "Vous avez terminé n* (NUM PULL DU BACK)";
		this.ToastId++;
	},

	toast_timeup() {
		this.ToastMessage = "Le temps est écoulé, vous n'avez pas trouvé le bon mot";
		this.ToastId++;
	},

	toast_lost() {
		this.ToastMessage = "Vous n'avez pas trouvé le bon mot";
		this.ToastId++;
	},

	init() {

		if (this.nbr_letters === 7)
			this.words_array_json = seven_words, this.all_words_array_json = all_seven_words;
		else if (this.nbr_letters === 6)
			this.words_array_json = six_words, this.all_words_array_json = all_six_words;
		else
			this.words_array_json = five_words, this.all_words_array_json = all_five_words, this.nbr_letters = 5;

		this.word = this.words_array_json[Math.floor(Math.random() * this.words_array_json.length)]
		this.guesses = new Array(this.nbr_letters).fill('');
		this.currentGuess = 0
	},

	submitGuess() {
		const guess = this.guesses[this.currentGuess];
		if (guess.length !== this.nbr_letters) {
			this.toast_x_letters();
			return;
		}

		if (this.toast_validWord(guess)) {
			//autres test a ajouter, des multiplayer pour (toast_inferior_half, toast_timeup, toast_timeup_final)
			this.currentGuess++;
			if (this.guesses[this.currentGuess - 1] === this.word)
				this.toast_won();
			if (!this.timeStatus && this.currentGuess === 6 && this.guesses[this.currentGuess - 1] != this.word)
				this.toast_lost();
			//RESET TIMER
			this.start_time = Date.now() / 1000;
		}
	},


	checkTimeUp() {
		if (this.timeStatus) {
			if (this.guesses[this.currentGuess].length === this.nbr_letters)
				this.toast_validWord(this.guesses[this.currentGuess]);
			else
				this.toast_x_letters();

			this.currentGuess++;
			this.start_time = Math.floor(Date.now() / 1000);//RESET TIMER
			if (this.currentGuess === 6)
				this.won ? this.toast_won() : this.toast_timeup()
		}
	},

	handleKeyboard(key : string)
	{
		//si bon ou 6 essais et mauvais mot, le return fait R
		if (this.won || this.lost)
			return

		if (key === 'Enter'){
			return this.submitGuess()
		}

		if (key === 'Backspace'){
			this.guesses[this.currentGuess] = this.guesses[this.currentGuess].slice(0, -1)
			return
		}

		if (this.guesses[this.currentGuess].length < this.nbr_letters) {
			this.guesses[this.currentGuess] += key
		}
	},

	handleKeyup(e : KeyboardEvent)
	{
		//si bon ou 6 essais et mauvais mot, le return fait R
		if (this.won || this.lost)
			return

		if (e.key === 'Enter'){
			return this.submitGuess()
		}

		if (e.key === 'Backspace'){
			this.guesses[this.currentGuess] = this.guesses[this.currentGuess].slice(0, -1)
			return
		}

		if (this.guesses[this.currentGuess].length < this.nbr_letters && /^[a-z]$/i.test(e.key)) {
			this.guesses[this.currentGuess] += e.key.toLocaleLowerCase()
		}
	},
}

// type settings = {
//   word : string;
//   guesses : string[];
//   currentGuess : number;
// }

// const s: settings = {

// };

// five_words.includes(this.guesses[this.currentGuess])
//e.key.match(/^[A-z]$/) prend aussi \/ ect

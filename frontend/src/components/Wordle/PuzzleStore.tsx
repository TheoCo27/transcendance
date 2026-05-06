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

export type PuzzleStoreType = {
  word: string;
  guesses: string[];
  currentGuess: number;

  ToastMessage: string;
  ToastId: number;
  start_time: number;
  timeStatus: boolean;
  validWord: boolean,
  submittedGuesses: string[];
  time_per_word: number;

  won: boolean;
  lost: boolean;

  keyGuessed : string[];
  keyInexact : string[];
  AllGuessesMashed : string[]; // que utilisee ici

  toast_validWord(guess: string): 1 | 0;
  toast_five_letters(): void;
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
	ToastMessage: "",
	ToastId: 0,
	start_time: Math.floor(Date.now() / 1000),
	validWord: true,
	time_per_word: 5,
	

	get won() {
		return this.currentGuess > 0 && this.guesses[this.currentGuess - 1] === this.word
	},
	get lost() {
		return this.currentGuess === 6
	},


	get submittedGuesses() {
	return this.guesses
		.slice(0, this.currentGuess)               // seulement envoyés
		.filter((g) => typeof g === 'string' && g.length === 5 && five_words_all.includes(g))
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
		if (!five_words_all.includes(guess)) {
			this.ToastMessage = "Ce mot n'est pas dans la liste";
			this.ToastId++;
			return 0;
		}
			return 1;
	},

	toast_five_letters() {
		this.ToastMessage = "Pour valider un mot, vous devez entrer 5 lettres";
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
		this.word = five_words[Math.floor(Math.random() * five_words.length)]
		this.guesses = new Array(6).fill('');
		this.currentGuess = 0
	},

	submitGuess() {
		const guess = this.guesses[this.currentGuess];
		if (guess.length !== 5) {
			this.toast_five_letters();
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
			if (this.guesses[this.currentGuess].length === 5)
				this.toast_validWord(this.guesses[this.currentGuess]);
			else
				this.toast_five_letters();

			this.currentGuess++;
			this.start_time = Math.floor(Date.now() / 1000);//RESET TIMER
			if (this.currentGuess === 6)
				this.won ? this.toast_won() : this.toast_timeup()
		}
	},

	handleKeyboard(key : string)
	{
		//si bon le return fait R
		if (this.won || this.lost)
			return

		if (key === 'Enter'){
			return this.submitGuess()
		}

		if (key === 'Backspace'){
			this.guesses[this.currentGuess] = this.guesses[this.currentGuess].slice(0, -1)
			return
		}

		if (this.guesses[this.currentGuess].length < 5) {
			this.guesses[this.currentGuess] += key
		}
	},

	handleKeyup(e : KeyboardEvent)
	{
		//si bon mot, return donc fait R
		// marche pas won si dernier mot

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

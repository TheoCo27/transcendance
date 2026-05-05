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

  won: boolean;
  lost: boolean;

  keyGuessed : string[];
  keyInexact : string[];
  AllGuessesMashed : string[]; // que utilisee ici

  toast_validWord(guess: string): 1 | 0;
  toast_five_letters(): void;
  toast_superior_half(): void;
  toast_inferior_half(): void;
  toast_timeup(): void;
  toast_timeup_final(): void;
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
		return ((Math.floor(Date.now() / 1000) - this.start_time) >= 30);
	},

	toast_validWord(guess : string) {
		if (!five_words_all.includes(guess)) {
			this.ToastMessage = "This word isn't in the list";
			this.ToastId++;
			return 0;
		}
			return 1;
	},

	toast_five_letters() {
		this.ToastMessage = "To submit word you need to input 5 letters";
		this.ToastId++;
	},
	
	toast_superior_half() {
		this.ToastMessage = "You Finished number (moitiee supeieure)";
		this.ToastId++;
	},
	
	toast_inferior_half() {
		this.ToastMessage = "You Finished number (moitiee inferieure)";
		this.ToastId++;
	},

	toast_timeup() {
		this.ToastMessage = "Time limit has passed, careful for the next try";
		this.ToastId++;
	},

	toast_timeup_final() {
		this.ToastMessage = "Time limit has passed, you haven't found the right word";
		this.ToastId++;
	},

	toast_lost() {
		this.ToastMessage = "You haven't found the right word";
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
				this.toast_superior_half();
			if (!this.timeStatus && this.currentGuess === 6 && this.guesses[this.currentGuess - 1] != this.word)
				this.toast_lost();
			//RESET TIMER
			this.start_time = Date.now() / 1000;
		}
	},


	checkTimeUp() {
		if (this.timeStatus) {
			this.toast_timeup();
			if (this.guesses[this.currentGuess].length === 5)
				this.toast_validWord(this.guesses[this.currentGuess]);
			else
				this.toast_five_letters();

			this.currentGuess++;
			this.start_time = Math.floor(Date.now() / 1000);//RESET TIMER
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

//import words from json file
import five_words from "./wordle_5.json";
import all_five_words from "./wordle_compare_5.json";

import six_words from "./wordle_6.json";
import all_six_words from "./wordle_compare_6.json";

import seven_words from "./wordle_7.json";
import all_seven_words from "./wordle_compare_7.json";

import { toHHMMSS } from "./ConvertTime";

export type PuzzleStoreType = {
  word: string;
  guesses: string[];
  currentGuess: number;
  validWord: boolean;
  submittedGuesses: string[];

  ToastMessage: string;
  ToastId: number;

  start_time: number;
  total_time: number;
  timeStatus: boolean;
  time_per_word: number;

  rulePannelClosed: boolean;

  nbr_letters: number;
  maxAttempts: number;
  words_array_json: string[];
  letters_array_json: string[];
  all_words_array_json: string[];

  won: boolean;
  lost: boolean;
  endedByTimeout: boolean;

  keyGuessed: string[];
  keyInexact: string[];
  AllGuessesMashed: string[]; // only used here (in PuzzleStore)

  toast_validWord(guess: string): 1 | 0;
  toast_x_letters(): void;
  toast_won(): void;
  toast_timeup(): void;
  toast_lost(): void;
  checkTimeUp(): void;

  init(sharedWord?: string): void;
  submitGuess(): void;
  handleKeyup(e: KeyboardEvent): void;
  handleKeyboard(key: string): void;
};

export default {
  word: "",
  guesses: [] as string[],
  currentGuess: 0,
  validWord: true,

  ToastMessage: "",
  ToastId: 0,

  start_time: -1,
  total_time: -1,
  time_per_word: 30,

  rulePannelClosed: false,

  nbr_letters: 5,
  maxAttempts: 6,
  words_array_json: [] as string[],
  letters_array_json: [] as string[],
  all_words_array_json: [] as string[],

  get won() {
    return (
      this.currentGuess > 0 && this.guesses[this.currentGuess - 1] === this.word
    );
  },
  get lost() {
    return this.currentGuess === this.maxAttempts;
  },
  endedByTimeout: false,

  get submittedGuesses() {
    return this.guesses
      .slice(0, this.currentGuess) // only sent words (from index 0 to, currentGuess)
      .filter(
        (g) =>
          typeof g === "string" &&
          g.length === this.nbr_letters &&
          this.all_words_array_json.includes(g),
      );
  },

  get AllGuessesMashed() {
    return this.submittedGuesses.join("").split("");
  },

  get keyGuessed() {
    return this.word
      .split("")
      .filter((letter, i) =>
        this.submittedGuesses.map((w) => w[i]).includes(letter),
      );
  },

  get keyInexact() {
    return this.word
      .split("")
      .filter((letter) => this.AllGuessesMashed.includes(letter));
  },

  //TIME
  get timeStatus() {
    return (
      Math.floor(Date.now() / 1000) - this.start_time >= this.time_per_word
    );
  },

  toast_validWord(guess: string) {
    if (!this.all_words_array_json.includes(guess)) {
      this.ToastMessage = "Ce mot ne figure pas dans la liste.";
      this.ToastId++;
      return 0;
    }
    return 1;
  },

  toast_x_letters() {
    this.ToastMessage = `Pour valider un mot, vous devez saisir ${this.nbr_letters} lettres.`;
    this.ToastId++;
  },

  toast_won() {
    this.endedByTimeout = false;
    this.ToastMessage = `Bravo, vous avez trouvé le bon mot en ${toHHMMSS((Math.floor(Date.now() / 1000) - this.total_time).toString())}.`;
    this.ToastId++;
  },

  toast_timeup() {
    this.endedByTimeout = true;
    this.ToastMessage = `Le temps est écoulé : vous n'avez pas trouvé le mot ${this.word}.`;
    this.ToastId++;
  },

  toast_lost() {
    this.endedByTimeout = false;
    this.ToastMessage = `Vous n'avez pas trouvé le mot ${this.word}.`;
    this.ToastId++;
  },

  init(sharedWord?: string) {
    if (this.nbr_letters === 7)
      ((this.words_array_json = seven_words),
        (this.all_words_array_json = all_seven_words));
    else if (this.nbr_letters === 6)
      ((this.words_array_json = six_words),
        (this.all_words_array_json = all_six_words));
    else
      ((this.words_array_json = five_words),
        (this.all_words_array_json = all_five_words));

    const resolvedWord =
      typeof sharedWord === "string" &&
      sharedWord.length === this.nbr_letters &&
      this.all_words_array_json.includes(sharedWord)
        ? sharedWord
        : this.words_array_json[
            Math.floor(Math.random() * this.words_array_json.length)
          ];

    this.word = resolvedWord;
    this.guesses = new Array(this.maxAttempts).fill(""); //custom dynamic size, depending on rules settings
    this.currentGuess = 0;
    this.ToastMessage = "";
    this.validWord = true;
    this.endedByTimeout = false;
    this.start_time = -1;
    this.total_time = -1;
    this.rulePannelClosed = false;
  },

  submitGuess() {
    const guess = this.guesses[this.currentGuess];
    if (guess.length !== this.nbr_letters) {
      this.toast_x_letters();
      return;
    }

    if (this.toast_validWord(guess)) {
      this.currentGuess++;
      if (this.guesses[this.currentGuess - 1] === this.word) this.toast_won();
      if (
        !this.timeStatus &&
        this.currentGuess === this.maxAttempts &&
        this.guesses[this.currentGuess - 1] != this.word
      )
        this.toast_lost();

      this.start_time = Date.now() / 1000; //RESET TIMER (takes current time)
    }
  },

  checkTimeUp() {
    if (this.start_time < 0 || this.won || this.lost) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Math.floor(this.start_time);
    const missedTurns = Math.floor(elapsed / this.time_per_word);

    if (missedTurns <= 0) {
      return;
    }

    let turnsToConsume = missedTurns;
    while (turnsToConsume > 0 && !this.won && !this.lost) {
      this.currentGuess++;
      turnsToConsume--;
    }

    const remainder = elapsed % this.time_per_word;
    this.start_time = now - remainder;

    if (this.currentGuess >= this.maxAttempts) {
      this.currentGuess = this.maxAttempts;
      this.toast_timeup();
    }
  },

  handleKeyboard(key: string) {
    // good word or 6 trys and bad word, else its skipped
    if (this.won || this.lost) return;

    if (key === "Enter") {
      return this.submitGuess();
    }

    if (key === "Backspace") {
      this.guesses[this.currentGuess] = this.guesses[this.currentGuess].slice(
        0,
        -1,
      );
      return;
    }

    if (this.guesses[this.currentGuess].length < this.nbr_letters) {
      this.guesses[this.currentGuess] += key;
    }
  },

  handleKeyup(e: KeyboardEvent) {
    // good word or 6 trys and bad word, else its skipped
    if (this.rulePannelClosed) {
      if (this.won || this.lost) return;

      if (e.key === "Enter") return this.submitGuess();

      if (e.key === "Backspace") {
        this.guesses[this.currentGuess] = this.guesses[this.currentGuess].slice(
          0,
          -1,
        );
        return;
      }

      if (
        this.guesses[this.currentGuess].length < this.nbr_letters &&
        /^[a-z]$/i.test(e.key)
      ) {
        this.guesses[this.currentGuess] += e.key.toLocaleLowerCase();
      }
    }
  },
};

// type settings = {
//   word : string;
//   guesses : string[];
//   currentGuess : number;
// }

// const s: settings = {

// };

// five_words.includes(this.guesses[this.currentGuess])
//e.key.match(/^[A-z]$/) prend aussi \/ ect

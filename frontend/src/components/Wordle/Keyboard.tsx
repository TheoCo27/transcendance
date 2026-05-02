import type  { PuzzleStoreType } from "./PuzzleStore";
import { observer, useLocalObservable } from "mobx-react-lite";
import enterImg from './img/symbole-de-la-fleche-gauche-dans-un-cercle.png';
import backspaceImg from './img/retour-arriere.png';


export default function Keyboard({ store }: { store: PuzzleStoreType }){	

	const qwerty = [
	'qwertyuiop',
	'asdfghjkl',
	['Enter', ...'zxcvbnm'.split(''), 'Backspace'],
	];
	const wideKeys = new Set(["Backspace", "Enter"]);
	let isWide : boolean

	//pour les map ajt potenciellemnt les index (apart pr les couleurs inutile)
	return (
	<div>
		{qwerty.map((row) => (
		<div className="flex justify-center">
			{(Array.isArray(row) ? row : row.split('')).map((key) => (
			isWide = wideKeys.has(key),

			<div
			className={[
				"m-px flex h-12 rounded-md bg-gray-400 font-bold text-2xl items-center justify-center",
				isWide ? "w-15" : "w-9.5",
			].join(" ")}
			>

			<button className="uppercase" onClick={() => store.handleKeyboard(key)} >
			{key === 'Enter' ? (
				<img src={enterImg} alt="enter" className="h-7 w-7" />
			) : key === 'Backspace' ? (
				<img src={backspaceImg} alt="return" className="h-7 w-7" />
			) : (
				key
			)}
			</button>
			
			</div>
			))}
		</div>
		))}
	</div>
	);
}
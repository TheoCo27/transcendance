import type  { PuzzleStoreType } from "./PuzzleStore";
import { ArrowRightToLine, Delete } from 'lucide-react';

export default function Keyboard({ store }: { store: PuzzleStoreType }){	

const azerty = [
	'azertyuiop',
	'qsdfghjklm',
	['Enter', ...'wxcvbn'.split(''), 'Backspace'],
];
	const wideKeys = new Set(["Backspace", "Enter"]);
	let isWide : boolean
	let bgColor : string
	let vectSize= "size-7"

	return (
	<div className="w-full h-full">
		<div className={`flex w-[min(92vw,26rem)] flex-col`}>
			{azerty.map((row,i) => (
			<div key={i} className="flex py-1 justify-center gap-1">
				{(Array.isArray(row) ? row : row.split('')).map((key,i2) => (
				isWide = wideKeys.has(key),
				bgColor = store.keyGuessed.includes(key)
				? 'bg-green-500'
				: store.keyInexact.includes(key)
				? 'bg-yellow-400'
				: 'bg-gray-400',
				<div
				key={i2}
				className={[
					` h-15 flex rounded-md ${bgColor} font-bold text-2xl md:text-3xl items-center justify-center`,
					isWide ? "w-16" : "w-9.5",
				].join(" ")}
				>
				<button className="uppercase" onClick={() => store.handleKeyboard(key)} >
				{key === 'Enter' ? (
					<ArrowRightToLine className={`${vectSize}`} />
				) : key === 'Backspace' ? (
					<Delete className={`${vectSize}`} />
				) : (
					key
				)}
				</button>
		
				</div>
				))}
			</div>
			))}
		</div>
	</div>
	);
}

// import enterImg from './img/symbole-de-la-fleche-gauche-dans-un-cercle.png';
// import backspaceImg from './img/retour-arriere.png';

//disabled={store.guesses[store.currentGuess].length !== store.nbr_letters} 
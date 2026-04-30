import type  { PuzzleStoreType } from "./PuzzleStore";
import { observer, useLocalObservable } from "mobx-react-lite";


export default function Keyboard({ store }: { store: PuzzleStoreType }){	

	// const qwerty = ['qwertyuiop', 'asdfghjkl', '', 'zxcvbnm', '']
	const qwerty = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
	return (
  	<div> 
		{qwerty.map((row) => (

  				<div className="flex justify-center"> 
				{row.split('').map((key) => (
					<div className="m-px flex h-12 w-9.5 rounded-md bg-gray-400  font-bold text-2xl items-center justify-center">
						<button className="uppercase" onClick={() => (store.handleKeyboard(key))}> {key} </button>
					</div>
				))}
				</div>
			))}
	</div>
	)
}
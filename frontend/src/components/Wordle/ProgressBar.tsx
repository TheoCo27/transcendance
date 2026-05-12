import { useState, useEffect } from 'react';
import { observer } from "mobx-react-lite";
import type  { PuzzleStoreType } from "./PuzzleStore";


export default observer(function ProgressBar({ store, start_time }: { store: PuzzleStoreType, start_time : number }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
	const interval = setInterval(() => {
	if (store.currentGuess === 6 || store.won) {
		console.log("bar finie");
		clearInterval(interval);
		}
	  setNow(Math.floor(Date.now() / 1000));
	}, 500); // update every 0.5s for smoother progress
	return () =>{
		clearInterval(interval);
	} 
  }, []);

  const elapsed = now - start_time;
  const max = store.time_per_word;

  return (
	<progress 
	  dir='rtl'
	  value={Math.min(elapsed, max)}
	  max={max}
	  style={{ width: '36%', height: 26}}
	  className=" flex w-[min(92vw,26rem)] mb-3 bg-blue-400 my-progress"
	/>
  );
});
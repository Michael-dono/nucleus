/* Everything the game keeps between visits. Today that is only the best run.
   All localStorage access goes through here; failures (private mode, blocked storage) are ignored. */

const BEST_KEY = 'nucgrim.best';

/* the best run so far, or null */
export function loadBest(){
  try{
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

/* store rec ({time, kills, wave, level}) if it survived longer than the stored best */
export function saveBestIfBetter(rec){
  try{
    const raw = localStorage.getItem(BEST_KEY);
    const b = raw ? JSON.parse(raw) : null;
    if(!b || rec.time > b.time) localStorage.setItem(BEST_KEY, JSON.stringify(rec));
  }catch(e){}
}

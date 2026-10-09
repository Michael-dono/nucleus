/* A tiny synchronous event bus. Game systems announce what changed; the UI listens and redraws.
   Used only for game -> UI notifications:
     'spells:changed'     a magic was gained, levelled or given a talent  (HUD pips)
     'artifacts:changed'  an artifact was gained or ranked up             (HUD slots)
     'choice:open'  job   a level-up / talent / relic choice is waiting   (choice screen)
     'run:over'     rec   the conjurer died                               (game-over screen) */

const listeners = {};
export function on(name, fn){ (listeners[name] || (listeners[name] = [])).push(fn); }
export function emit(name, data){
  const list = listeners[name];
  if(list) for(const fn of list) fn(data);
}

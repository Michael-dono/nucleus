/* The frame loop: requestAnimationFrame -> update (when playing) -> HUD -> draw.
   dt is capped at 1/25 s, so a stalled tab resumes at a crawl instead of jumping;
   all movement, timers and cooldowns scale with dt, so speed does not depend on frame rate. */
import { S } from './state.js';
import { cvs } from './view.js';
import { update } from '../game/game.js';
import { updateHUD } from '../ui/hud.js';
import { draw } from '../render/renderer.js';

let last = 0, raf = 0;
let curHidden = null;

function frame(ts){
  raf = requestAnimationFrame(frame);
  if(!last) last = ts;
  let dt = (ts-last)/1000; last = ts;
  dt = Math.min(dt, 1/25);
  const playing = S.running && !S.paused && !S.over;
  /* no pointer on the playfield — it comes back for menus and upgrade cards */
  if(playing !== curHidden){ curHidden = playing; cvs.style.cursor = playing ? 'none' : 'default'; }
  if(playing){ update(dt); updateHUD(dt); }
  draw();
}

export function startLoop(){
  last = 0;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

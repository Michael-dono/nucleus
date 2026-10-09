/* Entry point: wire the systems together and land on the title screen.
   The spell registry is imported first on purpose: every spell module is fully loaded
   before anything that reads the registry at start-up. */
import './spells/index.js';
import { resize } from './core/view.js';
import { initInput } from './core/input.js';
import { startLoop } from './core/loop.js';
import { resetIdle } from './game/game.js';
import { initHUD } from './ui/hud.js';
import { initChoices } from './ui/choices.js';
import { initScreens, showTitle, togglePause } from './ui/screens.js';

window.addEventListener('resize', resize);
initInput(() => togglePause());
initScreens();
initHUD();
initChoices();

function boot(){
  resize();
  /* never inherit screen visibility from a restored DOM — a boot always lands on the title */
  showTitle();
  resetIdle();
  startLoop();
}
/* claude.ai artifact hot-reload hooks; ignored anywhere else */
try{ window.claude?.hot?.snapshot?.(()=>({})); }catch(e){}
if(window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot();

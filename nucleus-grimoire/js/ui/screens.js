/* Title, pause and game-over screens, and the buttons on them. */
import { S } from '../core/state.js';
import { on } from '../core/events.js';
import { ARTIFACT_SLOTS } from '../config.js';
import { roman } from '../data/waves.js';
import { newGame } from '../game/game.js';
import { heldArtifacts } from '../game/modifiers.js';
import { loadBest } from '../storage/save.js';
import { loadoutHTML } from './hud.js';
import { el } from './dom.js';

const mmss = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

export function showBest(){
  const b = loadBest();
  if(!b) return;
  el('bestLine').textContent = `Best run — ${mmss(b.time)} · wave ${roman(b.wave)} · ${b.kills} broken`;
}

/* the title screen, with nothing else open */
export function showTitle(){
  for(const id of ['scChoice','scPause','scOver']) el(id).classList.remove('on');
  el('scStart').classList.add('on');
  showBest();
}

function start(){
  el('scStart').classList.remove('on');
  el('scOver').classList.remove('on');
  el('scPause').classList.remove('on');
  el('scChoice').classList.remove('on');
  newGame();
}

export function togglePause(force){
  if(!S.running || S.over || S.choiceOpen) return;
  const want = force!=null ? force : !S.paused;
  S.paused = want;
  el('scPause').classList.toggle('on', want);
  if(want) el('pauseLoadout').innerHTML = loadoutHTML();
}

function showGameOver(){
  const p = S.player;
  el('overTitle').textContent = S.wave>=3 ? 'Undone' : 'Unmade';
  el('overStats').innerHTML =
    `<div><div class="k">Survived</div><div class="v">${mmss(S.time)}</div></div>
     <div><div class="k">Wave reached</div><div class="v">${roman(S.wave+1)}</div></div>
     <div><div class="k">Shapes broken</div><div class="v">${S.kills}</div></div>
     <div><div class="k">Conjurer level</div><div class="v">${p.level}</div></div>
     <div><div class="k">Artifact slots</div><div class="v">${heldArtifacts().length}/${ARTIFACT_SLOTS}</div></div>`;
  el('overLoadout').innerHTML = loadoutHTML();
  el('scOver').classList.add('on');
}

export function initScreens(){
  on('run:over', showGameOver);
  el('btnStart').addEventListener('click', start);
  el('btnAgain').addEventListener('click', start);
  el('btnResume').addEventListener('click', ()=>togglePause(false));
  el('btnQuit').addEventListener('click', ()=>{ togglePause(false); S.running=false; el('scStart').classList.add('on'); showBest(); });
  el('tgNormal').addEventListener('click', ()=>{ S.quick=false; el('tgNormal').setAttribute('aria-pressed','true'); el('tgQuick').setAttribute('aria-pressed','false'); });
  el('tgQuick').addEventListener('click', ()=>{ S.quick=true; el('tgQuick').setAttribute('aria-pressed','true'); el('tgNormal').setAttribute('aria-pressed','false'); });
}

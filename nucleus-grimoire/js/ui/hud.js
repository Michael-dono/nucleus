/* The in-run HUD: magic pips with cooldown masks, artifact slots, bars and readouts. */
import { S } from '../core/state.js';
import { on } from '../core/events.js';
import { clamp } from '../core/math.js';
import { ARTIFACT_SLOTS, MAGIC_SLOTS } from '../config.js';
import { ARTIFACT_DEFS, ARTIFACT_KEYS } from '../data/artifacts.js';
import { WAVES, waveDef, roman } from '../data/waves.js';
import { SPELL_DEFS, SPELL_KEYS, stats, upgradeName } from '../spells/index.js';
import { heldArtifacts } from '../game/modifiers.js';
import { el } from './dom.js';
import { ico } from './icons.js';

let pipEls = {};
function buildPips(){
  const wrap = el('pips'); wrap.innerHTML=''; pipEls = {};
  for(const k of SPELL_KEYS){
    const sp = S.spells[k]; if(!sp) continue;
    const d = SPELL_DEFS[k];
    const div = document.createElement('div');
    div.className = 'pip' + (sp.t7?' tal':'');
    div.innerHTML = `<span class="glyph">${ico(k,d.color)}<i class="cdmask"></i></span>
                     <span class="lv${sp.lv>=15?' max':''}">${sp.lv>=15?'MAX':'LV '+sp.lv}</span>`;
    wrap.appendChild(div);
    pipEls[k] = div.querySelector('.cdmask');
  }
  el('magicCount').textContent = `${Object.keys(S.spells).length}/${MAGIC_SLOTS}`;
}

function buildSlots(){
  const wrap = el('slots'); if(!wrap) return;
  const held = heldArtifacts();
  wrap.innerHTML = '';
  for(let i=0;i<ARTIFACT_SLOTS;i++){
    const k = held[i];
    const div = document.createElement('div');
    if(k){
      const d = ARTIFACT_DEFS[k], lv = S.passives[k];
      const col = d.req ? SPELL_DEFS[d.req].color : '#9aa6c4';
      div.className = 'slot filled';
      div.title = `${d.name} · rank ${lv}/${d.max}`;
      div.innerHTML = `${ico(d.icon,col)}<span class="rk${lv>=d.max?' max':''}">${lv}</span>`;
    } else {
      div.className = 'slot empty';
      div.title = 'Empty artifact slot';
    }
    wrap.appendChild(div);
  }
  el('slotCount').textContent = `${held.length}/${ARTIFACT_SLOTS}`;
}

/* chips listing magics (with talents) and artifacts — pause and game-over screens */
export function loadoutHTML(){
  let h = '';
  for(const k of SPELL_KEYS){
    const sp = S.spells[k]; if(!sp) continue;
    const d = SPELL_DEFS[k];
    let tal = '';
    if(sp.t7)  tal  = ' · ' + upgradeName(k, sp.t7);
    if(sp.t15) tal += ' · ' + upgradeName(k, sp.t15);
    h += `<span class="lo">${ico(k,d.color)} ${d.name} <b style="color:var(--bone)">Lv${sp.lv}</b>${tal}</span>`;
  }
  for(const k of ARTIFACT_KEYS){
    const lv = S.passives[k]; if(!lv) continue;
    const d = ARTIFACT_DEFS[k];
    const col = d.req ? SPELL_DEFS[d.req].color : '#9aa6c4';
    h += `<span class="lo">${ico(d.icon,col)} ${d.name} <b style="color:var(--bone)">R${lv}</b></span>`;
  }
  const free = ARTIFACT_SLOTS - heldArtifacts().length;
  if(free>0) h += `<span class="lo" style="opacity:.55">${free} artifact slot${free>1?'s':''} empty</span>`;
  return h;
}

/* cooldown masks every frame; text and bars ~11 times a second */
let hudAcc = 0;
export function updateHUD(dt){
  for(const k in pipEls){
    const sp = S.spells[k]; if(!sp) continue;
    const st = stats(k);
    pipEls[k].style.transform = `scaleY(${clamp(sp.cd/Math.max(st.cd,0.001),0,1)})`;
  }
  hudAcc += dt; if(hudAcc < 0.09) return; hudAcc = 0;
  const p = S.player, w = S.wave, d = waveDef(w);
  const tier = Math.floor(w/WAVES.length);
  el('waveName').textContent = `WAVE ${roman(w+1)} · ${tier?'REFRACTED ':''}${d.label}`;
  const left = Math.max(0, S.waveLen - S.waveTime);
  el('waveSub').textContent = S.bossActive ? 'boss engaged' : `${d.boss.toLowerCase()} in ${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`;
  el('mWave').style.width = (S.bossActive?100:(S.waveTime/S.waveLen*100))+'%';
  el('mHp').style.width = clamp(p.hp/p.maxHp,0,1)*100+'%';
  el('nHp').textContent = `${Math.max(0,Math.ceil(p.hp))}/${Math.round(p.maxHp)}`;
  el('mXp').style.width = clamp(p.xp/p.xpNext,0,1)*100+'%';
  el('nXp').textContent = `${Math.floor(p.xp)}/${p.xpNext}`;
  el('rTime').textContent = `${Math.floor(S.time/60)}:${String(Math.floor(S.time%60)).padStart(2,'0')}`;
  el('rKills').textContent = S.kills;
  el('rLv').textContent = p.level;
  const bb = el('bossbar');
  if(S.boss && !S.boss.dead){ bb.classList.add('on'); el('bossName').textContent = S.boss.name; el('mBoss').style.width = clamp(S.boss.hp/S.boss.maxHp,0,1)*100+'%'; }
  else bb.classList.remove('on');
}

export function initHUD(){
  on('spells:changed', buildPips);
  on('artifacts:changed', buildSlots);
}

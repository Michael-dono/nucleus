/* Levelling and loot: the queue of pending choices (level-ups, talents, relics), what each
   choice offers, and applying the pick. The choice screen itself is js/ui/choices.js. */
import { S } from '../core/state.js';
import { emit } from '../core/events.js';
import { clearKeys } from '../core/input.js';
import { MAGIC_SLOTS, ARTIFACT_SLOTS } from '../config.js';
import { ARTIFACT_DEFS, ARTIFACT_KEYS } from '../data/artifacts.js';
import { SPELL_KEYS } from '../spells/index.js';
import { heldArtifacts, computeMods } from './modifiers.js';

export function addSpell(key){
  S.spells[key] = {lv:1, cd:0, t7:null, t15:null, cast:0};
}

/* S.queue holds jobs: {kind:'startspell'|'levelup'|'talent'|'artifact', ...}.
   Opening one pauses the run until the UI calls back with a pick (then closeChoice in the UI). */
export function openChoice(){
  const job = S.queue.shift();
  if(!job){ S.choiceOpen=false; S.paused=false; return; }
  S.choiceOpen = true; S.paused = true;
  clearKeys();                     /* drop keys held at the moment of the pause */
  emit('choice:open', job);
}

function drawWeighted(pool, n){
  const out = [];
  for(let i=0;i<n && pool.length;i++){
    let tot = 0; for(const o of pool) tot+=o.w;
    let r = Math.random()*tot, idx = pool.length-1;
    for(let j=0;j<pool.length;j++){ r -= pool[j].w; if(r<=0){ idx=j; break; } }
    out.push(pool.splice(idx,1)[0]);
  }
  return out;
}

/* Level-ups offer MAGIC, heavily biased toward what you already carry,
   plus ranks in artifacts already in your slots. New artifacts come from relics only. */
export function rollOptions(n){
  const pool = [];
  const owned = Object.keys(S.spells);
  for(const k of owned){
    const sp = S.spells[k]; if(sp.lv>=15) continue;
    const nx = sp.lv+1;
    const milestone = (nx===7 || nx===15);
    pool.push({type:'spell', key:k, w: milestone ? 34 : 24});   /* what you own dominates the roll */
  }
  if(owned.length < MAGIC_SLOTS)
    for(const k of SPELL_KEYS) if(!S.spells[k]) pool.push({type:'newspell', key:k, w:7});
  for(const k of heldArtifacts()){
    if(S.passives[k] >= ARTIFACT_DEFS[k].max) continue;
    pool.push({type:'passive', key:k, w: k==='multicast' ? 6 : 9});
  }
  const out = drawWeighted(pool, n);
  if(!out.length) out.push({type:'heal'});
  return out;
}

/* Relic: three artifacts. Relics bound to magic you do not own never appear. */
export function rollArtifacts(n){
  const pool = [];
  const used = heldArtifacts().length;
  for(const k of ARTIFACT_KEYS){
    const d = ARTIFACT_DEFS[k], lv = S.passives[k]||0;
    if(lv >= d.max) continue;
    if(d.req && !S.spells[d.req]) continue;
    if(lv === 0 && used >= ARTIFACT_SLOTS) continue;   /* board full — deepen what you hold */
    pool.push({type:'passive', key:k, w: lv===0 ? (d.req ? 17 : 11) : 8});
  }
  const out = drawWeighted(pool, n);
  if(!out.length) out.push({type:'heal'});
  return out;
}

export function applyOption(o){
  if(o.type==='newspell'){ addSpell(o.key); emit('spells:changed'); }
  else if(o.type==='spell'){
    const sp = S.spells[o.key];
    sp.lv++;
    if(sp.lv===7) S.queue.unshift({kind:'talent', key:o.key, tier:7});
    if(sp.lv===15) S.queue.unshift({kind:'talent', key:o.key, tier:15});
    emit('spells:changed');
  }
  else if(o.type==='passive'){
    S.passives[o.key] = (S.passives[o.key]||0)+1;
    computeMods();
    if(o.key==='vitality'){ S.player.maxHp += 9; S.player.hp = Math.min(S.player.maxHp, S.player.hp+9); }
    emit('artifacts:changed');
  }
  else if(o.type==='heal'){ S.player.hp = Math.min(S.player.maxHp, S.player.hp + S.player.maxHp*0.4); }
}

/* the first choice of a run: your starting magic, which also colours your core */
export function chooseStartSpell(key){
  addSpell(key); S.player.core = key; emit('spells:changed');
}

/* tier 7 takes one of three talents; tier 15 one of the two left */
export function chooseTalent(key, tier, id){
  const sp = S.spells[key];
  if(tier===7) sp.t7 = id; else sp.t15 = id;
  emit('spells:changed');
}

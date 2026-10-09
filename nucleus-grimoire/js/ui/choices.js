/* The choice screen: starting magic, level-ups, talents (cards) and relics (plates).
   Rendering only — what is offered and what a pick does live in js/game/progression.js. */
import { S } from '../core/state.js';
import { on } from '../core/events.js';
import { ARTIFACT_SLOTS } from '../config.js';
import { ARTIFACT_DEFS } from '../data/artifacts.js';
import { waveDef } from '../data/waves.js';
import { SPELL_DEFS, SPELL_KEYS, describe, upgradesOf } from '../spells/index.js';
import { heldArtifacts } from '../game/modifiers.js';
import { openChoice, rollOptions, rollArtifacts, applyOption, addSpell, chooseStartSpell, chooseTalent } from '../game/progression.js';
import { el } from './dom.js';
import { ico } from './icons.js';

/* A card must not be claimable by a movement key you happened to be holding
   when the level-up fired: nothing is auto-focused, and picks ignore the first 300ms. */
let pickLock = 0;
function focusSheet(){
  const s = el('scChoice').querySelector('.sheet');
  if(s) s.focus({preventScroll:true});
}

function showChoice(job){
  pickLock = performance.now() + 300;
  if(job.kind==='levelup') renderLevelUp();
  else if(job.kind==='startspell') renderStartSpell();
  else if(job.kind==='artifact') renderArtifactChoice(job);
  else renderTalent(job.key, job.tier);
}

/* after a pick: next queued choice, or back to the run */
function closeChoice(){
  el('scChoice').classList.remove('on');
  if(S.queue.length) openChoice();
  else { S.choiceOpen=false; S.paused=false; }
}

function card(opts){
  const b = document.createElement('button');
  b.className = 'card' + (opts.talent?' talent':'') + (opts.relic?' relic':'');
  b.type = 'button';
  b.innerHTML =
    `<span class="accent" style="background:${opts.color}"></span>
     <span class="body">
       <span class="head">${ico(opts.icon, opts.color)}<span>
          <span class="kind">${opts.kind}</span><br>
          <span class="nm">${opts.name}</span>
       </span></span>
       <p class="txt">${opts.txt}</p>
       <span class="foot"><span>${opts.footL||''}</span><span>${opts.footR||''}</span></span>
     </span>`;
  b.addEventListener('click', ()=>{
    if(performance.now() < pickLock) return;
    opts.onPick();
  });
  return b;
}

function renderLevelUp(){
  const p = S.player;
  el('scChoice').classList.remove('relicmode');
  el('chCards').className = 'cards';
  el('chEyebrow').textContent = `Level ${p.level}`;
  el('chTitle').textContent = 'Choose a magic';
  const wrap = el('chCards'); wrap.innerHTML = '';
  for(const o of rollOptions(3)){
    let c;
    if(o.type==='newspell'){
      const d = SPELL_DEFS[o.key];
      c = card({color:d.color, icon:o.key, kind:'New magic · '+d.kind, name:d.name, txt:d.blurb,
        footL:'LEVEL 1', footR:'', onPick:()=>{ applyOption(o); closeChoice(); }});
    } else if(o.type==='spell'){
      const d = SPELL_DEFS[o.key]; const sp = S.spells[o.key];
      const nx = sp.lv+1;
      const note = nx===7 ? 'Choose 1 of 3 talents at this level.' : nx===15 ? 'Choose your second talent at this level.' : d.blurb;
      c = card({color:d.color, icon:o.key, kind:`${d.name} · Lv ${sp.lv} → ${nx}`, name:(nx===7||nx===15)?'Milestone':'Deepen',
        txt:`${note}<br><span style="font-family:var(--f-mono);font-size:11.5px;color:var(--bone-dim)">${describe(o.key)} → ${describe(o.key, nx)}</span>`,
        footL:`LEVEL ${nx} / 15`, footR:(nx===7||nx===15)?'★ TALENT':'', onPick:()=>{ applyOption(o); closeChoice(); }});
    } else if(o.type==='passive'){
      c = artifactCard(o);
    } else {
      c = card({color:'#ef476f', icon:'vitality', kind:'Respite', name:'Mend', txt:'Recover <em>40% of your health</em>.',
        footL:'', footR:'', onPick:()=>{ applyOption(o); closeChoice(); }});
    }
    wrap.appendChild(c);
  }
  el('scChoice').classList.add('on');
  focusSheet();
}

/* first choice of a run: which magic you begin with — your core takes its colour */
function renderStartSpell(){
  el('scChoice').classList.remove('relicmode');
  el('chCards').className = 'cards';
  el('chEyebrow').textContent = 'Before the first shape arrives';
  el('chTitle').textContent = 'Choose your starting magic';
  const wrap = el('chCards'); wrap.innerHTML = '';
  for(const k of SPELL_KEYS){
    const d = SPELL_DEFS[k];
    addSpell(k); const desc = describe(k); delete S.spells[k];   /* level-1 numbers for the card */
    wrap.appendChild(card({color:d.color, icon:k, kind:'Starting magic · '+d.kind, name:d.name,
      txt:`${d.blurb}<br><span style="font-family:var(--f-mono);font-size:11.5px;color:var(--bone-dim)">${desc}</span>`,
      footL:'LEVEL 1', footR:'CORE · '+d.name.toUpperCase(),
      onPick:()=>{ chooseStartSpell(k); closeChoice(); }}));
  }
  el('scChoice').classList.add('on');
  focusSheet();
}

function artifactCard(o){
  const d = ARTIFACT_DEFS[o.key];
  const cur = S.passives[o.key]||0, lv = cur+1;
  const used = heldArtifacts().length;
  const bound = d.req ? SPELL_DEFS[d.req] : null;
  return card({
    relic: cur===0,
    color: bound ? bound.color : '#9aa6c4',
    icon: d.icon,
    kind: cur===0 ? (bound ? `Relic · bound to ${bound.name}` : `Relic · ${d.trait}`) : `Artifact · rank up`,
    name: d.name,
    txt: d.txt,
    footL:`RANK ${lv} / ${d.max}`,
    footR: cur===0 ? `TAKES SLOT ${used+1} / ${ARTIFACT_SLOTS}` : `HELD · ${used}/${ARTIFACT_SLOTS} SLOTS`,
    onPick:()=>{ applyOption(o); closeChoice(); }
  });
}

function renderArtifactChoice(job){
  el('chEyebrow').textContent =
      job.start ? 'Before the first shape arrives'
    : job.elite ? 'A greater shape breaks · relic recovered'
    : `${waveDef(job.wave||0).boss} falls · relic recovered`;
  el('chTitle').textContent = heldArtifacts().length >= ARTIFACT_SLOTS ? 'Deepen an artifact'
    : job.start ? 'Choose a starting relic' : 'Claim an artifact';
  const wrap = el('chCards');
  wrap.innerHTML = '';
  wrap.className = 'relic-list';
  el('scChoice').classList.add('relicmode');

  /* the slot board, so you can see exactly what this is going into */
  const held = heldArtifacts();
  const board = document.createElement('div');
  board.className = 'relic-board';
  let bh = '<span class="rb-label">ARTIFACT SLOTS</span><span class="rb-pips">';
  for(let i=0;i<ARTIFACT_SLOTS;i++){
    const k = held[i];
    bh += k ? `<i class="rb filled" title="${ARTIFACT_DEFS[k].name}"></i>`
            : `<i class="rb${i===held.length?' next':''}"></i>`;
  }
  bh += `</span><span class="rb-count">${held.length} / ${ARTIFACT_SLOTS}</span>`;
  board.innerHTML = bh;
  wrap.appendChild(board);

  for(const o of rollArtifacts(3)){
    if(o.type !== 'passive'){
      wrap.appendChild(relicPlate({
        icon:'vitality', color:'#ef476f', name:'Mend', bound:'Respite',
        txt:'Recover <em>40% of your health</em>.', rank:0, max:0,
        onPick:()=>{ applyOption(o); closeChoice(); }
      }));
      continue;
    }
    const d = ARTIFACT_DEFS[o.key];
    const cur = S.passives[o.key]||0;
    const bound = d.req ? SPELL_DEFS[d.req] : null;
    wrap.appendChild(relicPlate({
      icon: d.icon, color: bound ? bound.color : '#c9a227',
      name: d.name, bound: bound ? 'BOUND TO ' + bound.name.toUpperCase() : d.trait.toUpperCase(),
      txt: d.txt, rank: cur, max: d.max,
      slot: cur===0 ? held.length+1 : null,
      onPick:()=>{ applyOption(o); closeChoice(); }
    }));
  }
  el('scChoice').classList.add('on');
  focusSheet();
}

/* A relic is not an upgrade card: wide plate, socketed glyph, rank shown as pips. */
function relicPlate(o){
  const b = document.createElement('button');
  b.className = 'relic-plate';
  b.type = 'button';
  let pips = '';
  for(let i=0;i<o.max;i++) pips += `<i class="${i<o.rank?'on':(i===o.rank?'gain':'')}"></i>`;
  b.innerHTML =
    `<span class="rp-socket" style="--c:${o.color}">${ico(o.icon,o.color)}</span>
     <span class="rp-body">
       <span class="rp-bound">${o.bound}</span>
       <span class="rp-name">${o.name}</span>
       <span class="rp-txt">${o.txt}</span>
     </span>
     <span class="rp-meta">
       ${o.max ? `<span class="rp-pips">${pips}</span>` : ''}
       <span class="rp-rank">${o.max ? (o.rank===0 ? 'NEW · SLOT '+o.slot : 'RANK '+o.rank+' → '+(o.rank+1)) : ''}</span>
     </span>`;
  b.addEventListener('click', ()=>{
    if(performance.now() < pickLock) return;
    o.onPick();
  });
  return b;
}

/* three talents per magic; level 7 offers all three, level 15 offers the two you passed on */
function renderTalent(key, tier){
  const d = SPELL_DEFS[key], sp = S.spells[key];
  el('scChoice').classList.remove('relicmode');
  el('chCards').className = 'cards';
  el('chEyebrow').textContent = `${d.name} · Level ${tier}`;
  el('chTitle').textContent = tier===7 ? 'Choose a talent · 1 of 2' : 'Choose a talent · 2 of 2';
  const wrap = el('chCards'); wrap.innerHTML = '';
  for(const u of upgradesOf(key)){
    if(u.id===sp.t7) continue;
    wrap.appendChild(card({talent:true, color:d.color, icon:key, kind:'Talent · Lv '+tier, name:u.name, txt:u.txt,
      footL:d.name.toUpperCase(), footR:'TALENT',
      onPick:()=>{ chooseTalent(key, tier, u.id); closeChoice(); }}));
  }
  el('scChoice').classList.add('on');
  focusSheet();
}

export function initChoices(){
  on('choice:open', showChoice);
}

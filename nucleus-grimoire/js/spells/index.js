/* ============================ spell registry ============================
   Every magic is one file in this folder exporting a spell object (see fireball.js for the shape).
   To add a magic: write the file, import it here, and add it to SPELL_LIST.
   SPELL_LIST order = start-screen order, HUD order, and the order spells are cast each frame. */
import { S } from '../core/state.js';
import { SHARED_SHOTS, SHARED_ZONES } from './shared.js';
import { fireball } from './fireball.js';
import { lightray } from './lightray.js';
import { icewave } from './icewave.js';
import { imps } from './imps.js';
import { windblade } from './windblade.js';
import { chain } from './chain.js';
import { earth } from './earth.js';
import { tsunami } from './tsunami.js';

export const SPELL_LIST = [fireball, lightray, icewave, imps, windblade, chain, earth, tsunami];
export const SPELL_DEFS = {};
for(const d of SPELL_LIST) SPELL_DEFS[d.key] = d;
export const SPELL_KEYS = Object.keys(SPELL_DEFS);

/* type name -> {step, expire?, draw} for everything in S.shots; {step, draw, layer} for S.zones */
export const SHOT_TYPES = Object.assign({}, SHARED_SHOTS, ...SPELL_LIST.map(d => d.shots || {}));
export const ZONE_TYPES = Object.assign({}, SHARED_ZONES, ...SPELL_LIST.map(d => d.zones || {}));
/* skyFall kind -> draw (meteor, droplet) */
export const FALL_LOOKS = Object.assign({}, ...SPELL_LIST.map(d => d.falls || {}));

/* ============================ spell stats ============================ */
/* a spell's numbers at level L from its level rules alone — no artifacts, no talents.
   (mul = multiply, add = add; repeated multipliers compound) */
export function baseAt(key, L){
  const d = SPELL_DEFS[key], o = Object.assign({}, d.base);
  for(const r of d.levels) for(const at of r.at){
    if(at > L) continue;
    if(r.mul) o[r.stat] *= r.mul; else o[r.stat] += r.add;
  }
  return o;
}

/* the live numbers a cast uses: level rules, then general artifacts, then the spell's own
   talents and bound artifacts (modify), then cooldown and damage multipliers */
export function stats(key){
  const sp = S.spells[key]; if(!sp) return null;
  const d = SPELL_DEFS[key], M = S.mods;
  const has = id => sp.t7===id || sp.t15===id;   /* two of the three talents, picked at levels 7 and 15 */
  const o = baseAt(key, sp.lv);
  o.lv = sp.lv; o.color = d.color; o.el = d.el;
  if('count'  in o) o.count  += M.count;
  if('radius' in o) o.radius *= M.area;
  if('size'   in o) o.size   *= M.area;
  d.modify(o, has, M);
  o.cd *= M.cd;
  o.dmgMult = M.dmg;
  return o;
}

/* short live description for cards */
export function describe(key, lvOverride){
  const sp = S.spells[key]; if(!sp) return '';
  const saved = sp.lv;
  if(lvOverride) sp.lv = lvOverride;
  const st = stats(key);
  sp.lv = saved;
  const n = v => Math.round(v), parts = [`${n(st.dmg*st.dmgMult)} dmg`];
  if(st.count  != null) parts.push(`×${st.count}`);
  if(st.radius != null) parts.push(`r${n(st.radius)}`);
  if(st.pierce != null) parts.push(`pierce ${st.pierce}`);
  if(st.jumps  != null) parts.push(`${st.jumps} jumps`);
  if(st.dur    != null) parts.push(`${st.dur.toFixed(1)}s`);
  if(st.size   != null) parts.push(`size ×${st.size.toFixed(2)}`);
  parts.push(`every ${st.cd.toFixed(2)}s`);
  return parts.join(' · ');
}

/* the three talents of a magic: its two level-7 talents plus its evolution */
export const upgradesOf = key => { const d = SPELL_DEFS[key]; return [...d.t7, {id:'evolve', ...d.evolve}]; };
export const upgradeName = (key, id) => (upgradesOf(key).find(u => u.id===id) || {}).name;

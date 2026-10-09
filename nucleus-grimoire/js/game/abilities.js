/* Runs the magic you own each frame: per-spell passives, casting on cooldown,
   and stepping every shot (S.shots) and zone (S.zones) by its registered type. */
import { S } from '../core/state.js';
import { SPELL_LIST, SPELL_KEYS, SPELL_DEFS, SHOT_TYPES, ZONE_TYPES, stats } from '../spells/index.js';

/* per-frame spell hooks that run before casting (Cold Aura) */
export function updateSpellPassives(dt){
  for(const d of SPELL_LIST) if(d.update && S.spells[d.key]) d.update(dt, stats(d.key));
}

export function updateCasting(dt){
  for(const key of SPELL_KEYS){
    const sp = S.spells[key]; if(!sp) continue;
    sp.cd -= dt;
    if(sp.cd<=0){
      const st = stats(key);
      sp.cd = st.cd + (SPELL_DEFS[key].cast(st) || 0);   /* a cast may hold its cooldown back (Whirlpool) */
    }
  }
}

export function updateShots(dt){
  for(let i=S.shots.length-1;i>=0;i--){
    const s = S.shots[i], T = SHOT_TYPES[s.type];
    s.life -= dt;
    /* end of life: the type may react (blast, land, burst) or keep flying (Monsoon's return) */
    if(s.life <= 0 && !(T.expire && T.expire(s))){ S.shots.splice(i,1); continue; }
    if(T.step(s, dt)) S.shots.splice(i,1);
  }
}

export function updateZones(dt){
  const p = S.player;
  for(let i=S.zones.length-1;i>=0;i--){
    const z = S.zones[i];
    if(ZONE_TYPES[z.type].step(z, dt, p)) S.zones.splice(i,1);
  }
  for(const d of SPELL_LIST) if(d.afterZones) d.afterZones();
}

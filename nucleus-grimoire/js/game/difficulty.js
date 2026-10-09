/* How tough and how numerous the horde is at any moment. Dials are in js/config.js.
   Enemy health tracks the clock (not the wave); S.wave counts bosses killed. */
import { S } from '../core/state.js';
import { HP_GROWTH_PER_MIN, HP_GROWTH_STEP, SPAWN_STEP, HP_RAMP_SOFTEN, ENEMY_START_HP, SPAWN_SCALE } from '../config.js';

export function hpMul(){
  const mins = S.time/60;
  /* softened exponential: steep through the first few minutes, tapering after that
     so a long run stays winnable instead of hitting a wall of unkillable shapes */
  return Math.pow(hpGrowth(), Math.pow(mins, HP_RAMP_SOFTEN));
}
/* growth steps up after the 1st, 3rd, 5th... boss */
export function hpGrowth(){ return HP_GROWTH_PER_MIN + HP_GROWTH_STEP*Math.floor((S.wave+1)/2); }
/* spawn rate steps up after the 2nd, 4th, 6th... boss */
export function spawnBoost(){ return Math.pow(SPAWN_STEP, Math.floor(S.wave/2)); }
export function hpAt(){ return ENEMY_START_HP * hpMul(); }

/* ordinary enemy stats for wave w (elites and bosses scale these, see spawning.js) */
export function waveScale(w){
  return {
    hp:    hpAt(),
    speed: Math.min(44 + w*3.2, 96),
    dmg:   6 + w*3.2,
    xp:    (1 + Math.floor(w*0.55)) * Math.sqrt(hpMul())
  };
}

/* enemies arriving per second right now */
export function spawnRate(){
  const w = S.wave;
  const prog = S.bossActive ? 1 : S.waveTime/S.waveLen;
  /* the horde thickens much faster than it toughens */
  let rate = (1.9 + w*1.15) * (0.6 + prog*1.0) * (S.quick?1.8:1) * SPAWN_SCALE * spawnBoost();
  if(S.bossActive) rate *= 0.45;
  return rate;
}

/* seconds between elites in wave w */
export const eliteInterval = w => Math.max(4.5, 15 - w*1.3);

/* boss health for wave w: early bosses flatter, late curve unchanged */
export function bossHp(w, tier){ return hpAt() * (34 + w*7) * (1 + tier*0.45); }

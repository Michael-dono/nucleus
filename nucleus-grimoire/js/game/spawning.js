/* Where and when enemies appear: the wave clock, the steady stream, elites, and bosses.
   Enemy stats come from difficulty.js; wave looks from data/waves.js. */
import { S } from '../core/state.js';
import { view } from '../core/view.js';
import { TAU, rnd, pick } from '../core/math.js';
import { ENEMY_CAP } from '../config.js';
import { WAVES, waveDef, SHAPE_R } from '../data/waves.js';
import { waveScale, spawnRate, eliteInterval, bossHp } from './difficulty.js';
import { burst } from './effects.js';

let spawnAcc = 0, eliteAcc = 0;   /* carried over between runs, as they always have been */

export function updateSpawning(dt){
  if(!S.bossActive){
    S.waveTime += dt;
    if(S.waveTime >= S.waveLen) spawnBoss();
  }
  spawnTick(dt);
}

function spawnTick(dt){
  const w = S.wave;
  const rate = spawnRate();
  const cap = ENEMY_CAP;
  spawnAcc += rate*dt;
  while(spawnAcc >= 1){
    spawnAcc -= 1;
    if(S.enemies.length < cap) spawnEnemy();
  }
  eliteAcc += dt;
  const ei = eliteInterval(w);
  if(eliteAcc > ei && !S.bossActive && S.waveTime > 20){ eliteAcc = 0; if(S.enemies.length<cap) spawnEnemy(null,true); }
}

/* an ordinary enemy (or an elite) on a ring just beyond the screen */
export function spawnEnemy(kind, elite){
  const w = S.wave, sc = waveScale(w), d = waveDef(w);
  const shape = kind || (d.shape==='mix' ? pick(['tri','square','circle','pent','hex','diamond','star']) : d.shape);
  const ang = rnd(TAU);
  const rad = Math.max(view.w,view.h)*0.62 + rnd(140,40);
  const bearsRelic = !!(elite && !S.eliteRelic);    /* one relic-bearing elite per wave */
  if(bearsRelic) S.eliteRelic = true;
  const e = {
    x: S.player.x + Math.cos(ang)*rad,
    y: S.player.y + Math.sin(ang)*rad,
    vx:0, vy:0, shape, accent: d.accent,
    r: SHAPE_R[shape] * (elite?1.7:1),
    hp: sc.hp*(elite?2.6:1), maxHp: sc.hp*(elite?2.6:1),
    speed: sc.speed*(elite?0.75:1)*rnd(1.1,0.9),
    dmg: sc.dmg*(elite?1.4:1), xp: sc.xp*(elite?9:1),
    rot: rnd(TAU), spin: rnd(1.4,-1.4), elite:!!elite,
    relic: bearsRelic,
    frozen:0, slow:0, slowT:0, held:0, expose:0, flash:0, hitCd:0, dead:false, boss:false,
    stackT:0, stackN:0
  };
  S.enemies.push(e);
  return e;
}

function spawnBoss(){
  const w = S.wave, d = waveDef(w), sc = waveScale(w);
  const tier = Math.floor(w / WAVES.length);
  const ang = rnd(TAU), rad = Math.max(view.w,view.h)*0.6;
  const hp = bossHp(w, tier);
  const b = {
    x: S.player.x+Math.cos(ang)*rad, y: S.player.y+Math.sin(ang)*rad,
    vx:0, vy:0, shape:'boss', bossKind:d.bossKind, accent:d.accent, name:d.boss,
    r: 56 + w*1.8, hp, maxHp:hp,
    speed: Math.min(34 + w*1.4, 62), dmg: sc.dmg*1.9, xp: 120 + w*45,
    rot:0, spin:0.5, boss:true, dead:false,
    frozen:0, slow:0, slowT:0, held:0, expose:0, flash:0, hitCd:0,
    stackT:0, stackN:0, atk: 4.5, phase:0, dash:0, minion:3
  };
  S.enemies.push(b);
  S.boss = b; S.bossActive = true;
  for(let i=0;i<40;i++) burst(b.x,b.y, d.accent, 3);
  S.shake = Math.max(S.shake, 14);
  return b;
}

/* A run from start to finish: setting it up, one simulation step, and its end.
   update(dt) is the whole simulation in order; render/renderer.js draws the result. */
import { S } from '../core/state.js';
import { emit } from '../core/events.js';
import { lerp } from '../core/math.js';
import { gridBuild } from '../core/grid.js';
import { WAVE_LEN } from '../config.js';
import { newPlayer, updatePlayer } from './player.js';
import { computeMods } from './modifiers.js';
import { openChoice } from './progression.js';
import { updateSpawning } from './spawning.js';
import { updateSpellPassives, updateCasting, updateShots, updateZones } from './abilities.js';
import { updateEnemies, updateEShots, cleanupEnemies } from './enemies.js';
import { processBlasts } from './combat.js';
import { updateOrbs } from './pickups.js';
import { updateEffects } from './effects.js';
import { saveBestIfBetter } from '../storage/save.js';

export function newGame(){
  S.running=true; S.over=false; S.paused=false;
  S.t=0; S.time=0; S.kills=0; S.wave=0; S.waveTime=0;
  S.waveLen = S.quick ? WAVE_LEN.quick : WAVE_LEN.normal;
  S.bossActive=false; S.boss=null; S.shake=0; S.hitFlash=0;
  S.player = newPlayer();
  S.cam.x=0; S.cam.y=0;
  S.spells={}; S.passives={};
  S.enemies.length=0; S.shots.length=0; S.eshots.length=0;
  S.orbs.length=0; S.zones.length=0; S.parts.length=0; S.nums.length=0;
  S.queue.length=0; S.choiceOpen=false;
  S.blasts.length=0; S.auraSlow=0; S.auraTick=0; S.auraPulse=0;
  computeMods();
  emit('spells:changed');
  emit('artifacts:changed');
  S.eliteRelic = false;
  /* pick a starting magic first (it also colours your core), then a relic */
  S.queue.push({kind:'startspell'});
  S.queue.push({kind:'artifact', start:true});
  openChoice();
}

/* the idle title-screen state, so the first frame is not an empty void */
export function resetIdle(){
  S.running=false; S.over=false; S.paused=false; S.choiceOpen=false;
  S.player = newPlayer();
  computeMods();
  S.spells = {}; S.passives = {};
  emit('spells:changed');
  emit('artifacts:changed');
}

export function update(dt){
  S.t += dt; S.time += dt;
  const p = S.player;

  updatePlayer(dt);

  S.cam.x = lerp(S.cam.x, p.x, 1-Math.pow(0.001,dt));
  S.cam.y = lerp(S.cam.y, p.y, 1-Math.pow(0.001,dt));
  S.shake = Math.max(0, S.shake - dt*42);
  S.hitFlash = Math.max(0, S.hitFlash - dt*3);

  gridBuild();
  updateSpellPassives(dt);

  updateSpawning(dt);
  updateCasting(dt);

  updateEnemies(dt);
  updateShots(dt);
  updateEShots(dt);
  updateZones(dt);
  processBlasts();
  updateOrbs(dt);
  updateEffects(dt);
  cleanupEnemies();

  if(p.hp<=0) gameOver();
}

function gameOver(){
  if(S.over) return;
  S.over = true; S.running = false;
  const p = S.player;
  const rec = {time:S.time, kills:S.kills, wave:S.wave+1, level:p.level};
  saveBestIfBetter(rec);
  emit('run:over', rec);
}

/* The conjurer: creation, movement, and taking damage. */
import { S } from '../core/state.js';
import { rnd } from '../core/math.js';
import { inputVec } from '../core/input.js';
import { PLAYER } from '../config.js';

export function newPlayer(){
  return {x:0,y:0,vx:0,vy:0,hp:PLAYER.hp,maxHp:PLAYER.hp,r:PLAYER.r,dir:{x:1,y:0},
          look:{x:1,y:0}, blink:0, blinkT:rnd(4,1.5),
          level:1,xp:0,xpNext:PLAYER.xpFirst,iframe:0,walk:0,facing:1,bubbleT:0,bubbleN:0};
}

export function updatePlayer(dt){
  const p = S.player, M = S.mods;
  const iv = inputVec();
  const spd = PLAYER.speed * M.speed;
  p.vx = iv.x*spd; p.vy = iv.y*spd;
  p.x += p.vx*dt; p.y += p.vy*dt;
  if(iv.x||iv.y){ p.dir.x=iv.x; p.dir.y=iv.y; p.walk += dt*9; if(Math.abs(iv.x)>0.1) p.facing = iv.x>0?1:-1; }
  else p.walk += dt*1.6;
  p.iframe = Math.max(0, p.iframe-dt);
  if(M.regen) p.hp = Math.min(p.maxHp, p.hp + M.regen*dt);
}

export function hurtPlayer(raw){
  const p = S.player;
  const dmg = raw * S.mods.dr;
  p.hp -= dmg;
  p.iframe = PLAYER.iframe;
  S.hitFlash = 1;
  S.shake = Math.max(S.shake, 7);
  S.nums.push({x:p.x, y:p.y-20, v:-40, t:0.7, txt:'-'+Math.round(dmg), c:'#ef476f', big:true});
}

/* Mana orbs (XP): dropped by kills, magnetised toward the player, and turned into levels. */
import { S } from '../core/state.js';
import { TAU, rnd, dist2 } from '../core/math.js';
import { PLAYER } from '../config.js';
import { openChoice } from './progression.js';

const ORB_VAL = [1,5,22];   /* XP of the three orb tiers (colours: render/world.js) */

export function dropOrb(x,y,t,scale){
  if(S.orbs.length > 700) return;
  S.orbs.push({x,y,t, v: ORB_VAL[t]*(scale||1), vx:rnd(50,-50), vy:rnd(50,-50), mag:false, ph:rnd(TAU)});
}

export function updateOrbs(dt){
  const p = S.player;
  const pr = PLAYER.pickup * S.mods.pickup;
  for(let i=S.orbs.length-1;i>=0;i--){
    const o = S.orbs[i];
    o.ph += dt*3;
    const d2 = dist2(o.x,o.y,p.x,p.y);
    if(!o.mag && d2 < pr*pr) o.mag = true;
    if(o.mag){
      const a = Math.atan2(p.y-o.y, p.x-o.x);
      const sp = 260 + (1 - Math.min(1, Math.sqrt(d2)/pr))*420;
      o.x += Math.cos(a)*sp*dt; o.y += Math.sin(a)*sp*dt;
    } else {
      o.x += o.vx*dt; o.y += o.vy*dt; o.vx*=0.9; o.vy*=0.9;
    }
    if(d2 < 20*20){ gainXp(o.v); S.orbs.splice(i,1); }
  }
}

export function gainXp(v){
  const p = S.player;
  p.xp += v * S.mods.xp;
  while(p.xp >= p.xpNext){
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.floor(8 + p.level*4.6 + p.level*p.level*0.55);
    S.queue.push({kind:'levelup'});
  }
  if(S.queue.length && !S.choiceOpen) openChoice();
}

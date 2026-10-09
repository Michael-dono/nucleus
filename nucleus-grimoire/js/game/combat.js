/* All damage goes through dealDamage. Also: element effects, kills and their rewards,
   area hits, beams, and the deferred electric death explosions. */
import { S } from '../core/state.js';
import { TAU, rnd, dist2 } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { EL, ELEMENTS } from '../data/elements.js';
import { burst, ring } from './effects.js';
import { dropOrb } from './pickups.js';
import { openChoice } from './progression.js';

/* ---- elements: put a status on a shape that survived the hit ---- */
export function applyElement(e, el, dmg){
  if(e.dead || !el) return;
  const boss = e.boss;
  switch(el){
    case 'fire':{
      const dps = dmg*EL.burnPct*S.mods.burn/EL.burnDur;
      e.burnDmg = e.burnT>0 ? Math.max(e.burnDmg, dps) : dps;
      e.burnT = EL.burnDur;
      break;
    }
    case 'ice':
      e.slow = Math.max(e.slow, (EL.slow + S.mods.rimeSlow)*(boss?0.5:1));
      e.slowT = Math.max(e.slowT, EL.slowDur);
      break;
    case 'light':    e.blindT = EL.blindDur; break;
    case 'dark':     if(!boss) e.fearT = EL.fearDur; break;
    case 'water':    e.soakT = EL.soakDur; break;
    case 'electric': e.shockT = EL.shockDur; break;
    case 'wind':     if(!boss){ if(!(e.windT>0)) e.windA = rnd(TAU); e.windT = EL.windDur; } break;
    case 'earth':    if(!boss) e.rootT = EL.rootDur; break;
  }
}

/* contamination: 30% of the hit again as poison over 5s */
export function contaminate(e, dmg){ e.toxT = 5; e.toxDmg = dmg*0.3/10; }

/* opt: {color, el, big} — el applies that element if the shape survives */
export function dealDamage(e, amount, opt){
  if(e.dead) return;
  let m = 1;
  if(e.slow>0 && S.mods.chill) m *= 1 + S.mods.chill;   /* Shatterpoint */
  if(e.soakT>0) m *= 1 + EL.soak;                         /* water */
  if(e.hp/e.maxHp < 0.30) m *= S.mods.exec;
  const amt = amount * m;
  e.hp -= amt;
  e.flash = 0.13;
  if(S.nums.length < 90) S.nums.push({x:e.x+rnd(9,-9), y:e.y-e.r-3, v:-34, t:0.62, txt:Math.round(amt), c:(opt&&opt.color)||'#e9e5da', big:!!(opt&&opt.big)});
  if(e.hp<=0) killEnemy(e, opt);
  else if(opt && opt.el) applyElement(e, opt.el, amount);
}

export function killEnemy(e, opt){
  if(e.dead) return;
  e.dead = true;
  S.kills++;
  burst(e.x,e.y, e.accent, e.boss?70:7, e.boss?4:1.6);
  if(S.mods.lifesteal){ const p = S.player; p.hp = Math.min(p.maxHp, p.hp + S.mods.lifesteal); }

  /* electric: a marked shape explodes — queued, resolved in processBlasts */
  if(e.shockT>0){ e.shockT = 0; S.blasts.push({x:e.x, y:e.y, R:EL.shockR*S.mods.area, dmg:e.maxHp*EL.shockPct}); }

  /* mana orbs */
  if(e.boss){
    for(let i=0;i<16;i++) dropOrb(e.x+rnd(70,-70), e.y+rnd(70,-70), 2);
    for(let i=0;i<6;i++) dropOrb(e.x+rnd(40,-40), e.y+rnd(40,-40), 1);
    S.shake = Math.max(S.shake, 22);
    onBossDead();
  } else {
    const r = Math.random();
    const t = r < 0.02 ? 2 : r < 0.18 ? 1 : 0;
    dropOrb(e.x, e.y, t, e.xp);
    if(e.relic){
      for(let i=0;i<24;i++) burst(e.x,e.y,'#ffd166',1,2);
      ring(e.x,e.y,70,'#ffd166');
      S.queue.push({kind:'artifact', elite:true});
      if(!S.choiceOpen) openChoice();
    }
  }
}

function onBossDead(){
  const cleared = S.wave;
  S.bossActive=false; S.boss=null;
  S.wave++; S.waveTime=0; S.eliteRelic=false;   /* next wave's first elite carries a relic */
  const p = S.player;
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp*0.25);
  /* the field empties itself into you: every orb still lying around comes home */
  let pulled = 0;
  for(const o of S.orbs){ if(!o.mag){ o.mag = true; pulled++; } }
  ring(p.x, p.y, 300, '#5ad2f4');
  ring(p.x, p.y, 210, '#ffd166');
  S.nums.push({x:p.x, y:p.y-46, v:-26, t:1.5, txt:`MAGNET  ${pulled} orbs`, c:'#5ad2f4', big:true});
  /* every boss drops a relic — choice of three artifacts */
  S.queue.unshift({kind:'artifact', wave:cleared});
  if(!S.choiceOpen) openChoice();
}

/* hit everything within R of (x,y); the list is collected first so kills inside cannot disturb it */
export function hitArea(x, y, R, dmg, opt, each){
  const list = gridQuery(x, y, R+20).filter(e => !e.dead && dist2(e.x,e.y,x,y) < (R + e.r*0.5)**2);
  for(const e of list){ dealDamage(e, dmg, opt); if(each && !e.dead) each(e); }
  return list.length;
}

/* damage everything inside a segment of width w running from (x,y) along angle a */
export function beamHit(x,y,a,reach,w,dmg,color,seen,el){
  const cx = Math.cos(a), cy = Math.sin(a);
  const step = 90, half = w*0.5 + 14;
  for(let d=Math.min(40, reach*0.5); d<=reach+45; d+=step){   /* short bounce segments still get sampled */
    const px = x+cx*d, py = y+cy*d;
    for(const e of gridQuery(px,py,step*0.62+half)){
      if(e.dead || (seen && seen.has(e))) continue;
      /* perpendicular distance to the beam line, forward of the origin only */
      const rx = e.x-x, ry = e.y-y;
      const along = rx*cx + ry*cy;
      if(along < 0 || along > reach) continue;
      const perp = Math.abs(rx*cy - ry*cx);
      if(perp > half + e.r*0.6) continue;
      if(seen) seen.add(e);
      dealDamage(e, dmg, {color, el});
    }
  }
}

/* electric deaths are queued and resolved after everything else, so a chain of them never
   runs inside another sweep; each blast clears its own mark, so the chain always ends */
export function processBlasts(){
  let guard = 0;
  while(S.blasts.length && guard++ < 300){
    const b = S.blasts.shift();
    ring(b.x, b.y, b.R, ELEMENTS.electric.color);
    burst(b.x, b.y, '#c4bdff', 8, 1.2);
    hitArea(b.x, b.y, b.R, b.dmg, {color:ELEMENTS.electric.color});
  }
  S.blasts.length = 0;
}

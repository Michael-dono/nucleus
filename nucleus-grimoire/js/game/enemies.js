/* Enemy behaviour each frame: status timers, chasing, crowd separation, contact damage,
   boss attacks, and the boss's projectiles. */
import { S } from '../core/state.js';
import { TAU, rnd, dist2 } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { EL } from '../data/elements.js';
import { dealDamage } from './combat.js';
import { hurtPlayer } from './player.js';
import { spawnEnemy } from './spawning.js';
import { burst } from './effects.js';

export function updateEnemies(dt){
  const p = S.player;
  for(let i=0;i<S.enemies.length;i++){
    const e = S.enemies[i];
    if(e.dead) continue;
    e.rot += e.spin*dt;
    e.flash = Math.max(0, e.flash-dt);
    e.slowT = Math.max(0, e.slowT-dt); if(e.slowT<=0) e.slow=0;
    e.hitCd = Math.max(0, e.hitCd-dt);
    /* element timers */
    if(e.blindT>0) e.blindT -= dt;
    if(e.fearT>0)  e.fearT  -= dt;
    if(e.soakT>0)  e.soakT  -= dt;
    if(e.shockT>0) e.shockT -= dt;
    if(e.windT>0)  e.windT  -= dt;
    if(e.rootT>0)  e.rootT  -= dt;
    if(e.burnT>0){ e.burnT-=dt; e.burnAcc=(e.burnAcc||0)+dt; if(e.burnAcc>=0.4){e.burnAcc=0; dealDamage(e, e.burnDmg*0.4, {color:'#ff6b35'});} }
    if(e.toxT>0){ e.toxT-=dt; e.toxAcc=(e.toxAcc||0)+dt;
      if(e.toxAcc>=0.5){ e.toxAcc=0; dealDamage(e, e.toxDmg, {color:'#b7f050'}); if(e.dead) continue; } }
    if(e.stackT>0){ e.stackT-=dt; if(e.stackT<=0) e.stackN=0; }
    e.inPool = false;

    if(e.boss) bossBehave(e, dt);

    let mv = e.rootT>0 ? 0 : 1 - e.slow;          /* earth holds it in place; ice slows it */

    const dx = p.x-e.x, dy = p.y-e.y;
    const d = Math.hypot(dx,dy) || 1;
    let ax = dx/d, ay = dy/d;
    if(e.fearT>0){ ax = -ax; ay = -ay; }          /* dark: it runs from you */
    if(e.windT>0){                                 /* wind: it staggers about */
      e.windA += rnd(7,-7)*dt;
      ax = Math.cos(e.windA); ay = Math.sin(e.windA); mv *= 0.6;
    }

    /* separation */
    if(!e.boss){
      const near = gridQuery(e.x,e.y, e.r*2.1);
      let sx=0, sy=0;
      for(let j=0;j<near.length;j++){
        const o = near[j]; if(o===e||o.dead) continue;
        const ox = e.x-o.x, oy = e.y-o.y;
        const od2 = ox*ox+oy*oy, rr = (e.r+o.r)*0.92;
        if(od2 < rr*rr && od2 > 0.01){ const od = Math.sqrt(od2); sx += ox/od*(1-od/rr); sy += oy/od*(1-od/rr); }
      }
      ax += sx*1.5; ay += sy*1.5;
      const m = Math.hypot(ax,ay)||1; ax/=m; ay/=m;
    }

    e.x += (ax*e.speed*mv + e.vx)*dt;
    e.y += (ay*e.speed*mv + e.vy)*dt;
    e.vx *= Math.pow(0.02, dt); e.vy *= Math.pow(0.02, dt);

    /* contact */
    const cd = e.r + p.r;
    if(dist2(e.x,e.y,p.x,p.y) < cd*cd && e.hitCd<=0 && p.iframe<=0){
      e.hitCd = 0.7;
      if(e.blindT>0 && Math.random() < EL.blindChance) burst(e.x,e.y,'#fff1a8',4);   /* light: it misses */
      else hurtPlayer(e.dmg);
    }
  }
}

/* bosses alternate a radial volley (from the 2nd wave on) and a charge that calls minions */
function bossBehave(b, dt){
  b.atk -= dt;
  b.rot += 0.55*dt;
  if(b.dash>0){ b.dash -= dt; }
  if(b.atk<=0){
    b.atk = S.quick ? 3.6 : 4.4;
    b.phase++;
    const p = S.player;
    if(b.phase % 2 === 1 && S.wave>=1){
      /* radial volley */
      const n = 6 + Math.min(10, S.wave);
      const base = Math.atan2(p.y-b.y, p.x-b.x);
      for(let i=0;i<n;i++){
        const a = base + i*TAU/n;
        S.eshots.push({x:b.x,y:b.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:7,dmg:b.dmg*0.55,life:4.6,c:b.accent});
      }
      S.shake = Math.max(S.shake, 6);
    } else {
      /* charge */
      const p2 = S.player;
      const a = Math.atan2(p2.y-b.y, p2.x-b.x);
      b.vx = Math.cos(a)*330; b.vy = Math.sin(a)*330; b.dash = 0.9;
      for(let i=0;i<b.minion;i++) spawnEnemy();
    }
  }
}

/* boss projectiles */
export function updateEShots(dt){
  const p = S.player;
  for(let i=S.eshots.length-1;i>=0;i--){
    const s = S.eshots[i];
    s.life -= dt; s.x += s.vx*dt; s.y += s.vy*dt;
    if(s.life<=0){ S.eshots.splice(i,1); continue; }
    const rr = s.r + p.r;
    if(dist2(s.x,s.y,p.x,p.y) < rr*rr){
      if(p.iframe<=0) hurtPlayer(s.dmg);
      burst(s.x,s.y,s.c,6);
      S.eshots.splice(i,1);
    }
  }
}

/* drop the dead, and anything that has wandered far off the field */
export function cleanupEnemies(){
  const p = S.player;
  for(let i=S.enemies.length-1;i>=0;i--){
    const e=S.enemies[i];
    if(e.dead){ S.enemies.splice(i,1); continue; }
    if(dist2(e.x,e.y,p.x,p.y) > 2600*2600) S.enemies.splice(i,1);
  }
}

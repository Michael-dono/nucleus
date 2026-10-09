/* Building blocks several spells use: lingering damage zones, expanding rings,
   and things that fall from the sky. Each one is a shot or zone type with its own step and draw. */
import { S } from '../core/state.js';
import { view, ctx } from '../core/view.js';
import { TAU, rnd, clamp, dist2, hexA } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { dealDamage, contaminate } from '../game/combat.js';

/* ---- lingering ground: Molotov, Chaos, Rumble, contaminated puddles ---- */
export const DOT_LOOK = {
  fire:  {c:'#ff8c42'},
  chaos: {c:'#a86bd8'},
  mire:  {c:'#a0703c'},
  water: {c:'#2f8fe0'}
};
/* `total` damage spread over `dur` seconds to everything inside */
export function dotZone(x, y, r, total, dur, look, extra){
  S.zones.push(Object.assign({type:'dot', x, y, r, life:dur, max:dur, tick: total/Math.max(1, dur/0.5), rate:0.5, acc:0, look}, extra||{}));
}

/* ---- an expanding ring that hits each shape once as it passes (Ice Wave, Supernova, rogue waves) ---- */
export function surge(o){
  S.zones.push(Object.assign({type:'surge', r:8, band:20, wait:0, hit:new Set(), edge:0}, o));
}

/* ---- something dropping out of the sky above the screen onto (tx,ty); onLand runs at impact ----
   `kind` picks the look (a spell registers it under `falls`). */
export function skyFall(kind, tx, ty, delay, r, color, onLand){
  const fall = 0.55 + delay;
  const sx = tx - view.h*0.38*(Math.random()<0.5?1:-1), sy = S.cam.y - view.h/2 - 90;   /* above the top edge */
  S.shots.push({type:'fall', kind, x:sx, y:sy, vx:(tx-sx)/fall, vy:(ty-sy)/fall, tx, ty, fall, life:fall, r, color, onLand, spin:rnd(TAU)});
}

/* Meteor Shower / Rainfall: a target mark on the ground that tightens as it comes down */
export function drawFallMark(s, color){
  const k = clamp(1 - s.life/s.fall, 0, 1), R = s.r*6;
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.45*k; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(s.tx, s.ty, R*(1.1-0.5*k), R*(1.1-0.5*k)*0.45, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.18*k; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(s.tx, s.ty, s.r*2.4*(0.4+k), s.r*1.1*(0.4+k), 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/* shot types: step(s, dt) -> true when spent; expire(s) at end of life -> true to keep flying */
export const SHARED_SHOTS = {
  fall: {
    step(s, dt){ s.x += s.vx*dt; s.y += s.vy*dt; s.spin += dt*9; return false; },
    expire(s){ s.onLand(s.tx, s.ty); return false; }
    /* draw: by s.kind, from the spells' `falls` */
  }
};

/* zone types: step(z, dt, player) -> true when finished; layer 'under' (beneath enemies) or 'over' */
export const SHARED_ZONES = {
  dot: {
    layer:'under',
    step(z, dt){
      z.life -= dt; z.acc += dt;
      if(z.acc >= z.rate){
        z.acc = 0;
        for(const e of gridQuery(z.x,z.y,z.r+20).filter(e => !e.dead && dist2(e.x,e.y,z.x,z.y) < z.r*z.r)){
          dealDamage(e, z.tick, {color:DOT_LOOK[z.look].c});
          if(z.slow && !e.dead){ e.slow = Math.max(e.slow, z.slow); e.slowT = Math.max(e.slowT, 0.6); }
        }
      }
      return z.life <= 0;
    },
    draw(z){
      const a = clamp(z.life/z.max,0,1), c = DOT_LOOK[z.look].c;
      ctx.save();
      const g = ctx.createRadialGradient(z.x,z.y,z.r*0.15,z.x,z.y,z.r);
      g.addColorStop(0, hexA(c, 0.26*a)); g.addColorStop(1, hexA(c, 0.06*a));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,TAU); ctx.fill();
      ctx.globalAlpha = 0.5*a; ctx.strokeStyle = c; ctx.lineWidth = 1.3;
      ctx.setLineDash([6,8]); ctx.lineDashOffset = -S.t*12;
      ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,TAU); ctx.stroke();
      ctx.setLineDash([]);
      if(z.look==='fire'){   /* licking flames */
        ctx.globalAlpha = 0.5*a; ctx.fillStyle = '#ffce6a';
        for(let i=0;i<7;i++){
          const ph = S.t*2.2 + i*1.7 + z.x*0.01;
          const rr = z.r*(0.4 + 0.55*((ph*0.5)%1)), aa = i*TAU/7 + Math.sin(ph)*0.25;
          ctx.beginPath(); ctx.arc(z.x+Math.cos(aa)*rr, z.y+Math.sin(aa)*rr, 3.2*(1-((ph*0.5)%1)), 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  },

  surge: {
    layer:'over',
    step(z, dt, p){
      if(z.wait > 0){ z.wait -= dt; if(z.follow){ z.x = p.x; z.y = p.y; } return false; }
      if(z.follow){ z.x = p.x; z.y = p.y; }
      z.r += z.speed*dt;
      for(const e of gridQuery(z.x,z.y,z.r+z.band+20)){
        if(e.dead || z.hit.has(e)) continue;
        const d = Math.hypot(e.x-z.x, e.y-z.y);
        if(d > z.r + e.r || d < z.r - z.band - e.r) continue;
        z.hit.add(e);
        dealDamage(e, z.dmg*(1 + z.edge*clamp(d/z.maxR,0,1)), {color:z.color, el:z.el});
        if(z.contam && !e.dead) contaminate(e, z.dmg);
      }
      return z.r >= z.maxR;
    },
    draw(z){
      if(z.wait > 0) return;
      const a = clamp(1 - z.r/z.maxR, 0, 1);
      ctx.save();
      ctx.strokeStyle = z.color;
      for(let k=0;k<3;k++){
        ctx.lineWidth = 3.6 - k*1.1;
        ctx.globalAlpha = (0.30 + 0.6*a) * (1 - k*0.3);
        ctx.beginPath(); ctx.arc(z.x, z.y, Math.max(2, z.r - k*7), 0, TAU); ctx.stroke();
      }
      if(z.el==='ice'){   /* frost shards riding the ring */
        ctx.globalAlpha = 0.5*a + 0.2; ctx.fillStyle = '#d8f4ff';
        for(let i=0;i<10;i++){
          const aa = i*TAU/10 + S.t*0.6;
          ctx.save();
          ctx.translate(z.x+Math.cos(aa)*z.r, z.y+Math.sin(aa)*z.r);
          ctx.rotate(aa);
          ctx.fillRect(-3.4,-1.1, 6.8, 2.2);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }
};

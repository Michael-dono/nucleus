/* Drawing everything that lives on the field besides enemies and the player:
   spell zones and shots (each type draws itself, see js/spells), mana orbs, particles, numbers. */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, clamp, lerp } from '../core/math.js';
import { SPELL_LIST, SHOT_TYPES, ZONE_TYPES, FALL_LOOKS } from '../spells/index.js';

/* ground layer: spell auras, then zones registered as layer 'under' (pools, rifts, whirlpools, craters) */
export function drawZonesUnder(){
  for(const d of SPELL_LIST){
    const sp = S.spells[d.key];
    if(sp && d.drawUnder && S.player) d.drawUnder(sp);
  }
  for(const z of S.zones){
    const T = ZONE_TYPES[z.type];
    if(T.layer==='under') T.draw(z);
  }
}

/* top layer: rings and beams */
export function drawZonesOver(){
  for(const z of S.zones){
    const T = ZONE_TYPES[z.type];
    if(T.layer==='over') T.draw(z);
  }
}

export function drawShots(){
  for(const s of S.shots){
    if(s.type==='fall') FALL_LOOKS[s.kind](s);
    else SHOT_TYPES[s.type].draw(s);
  }
}

/* mana orbs, by tier */
const ORB_COL = ['#5ad2f4','#ffd166','#ff5d8f'];
export function drawOrbs(){
  for(const o of S.orbs){
    const c = ORB_COL[o.t];
    const s = (o.t===0?3:o.t===1?4:5.6) + Math.sin(o.ph)*0.5;
    ctx.save();
    ctx.globalAlpha=0.28; ctx.fillStyle=c;
    ctx.beginPath(); ctx.arc(o.x,o.y,s*2.4,0,TAU); ctx.fill();
    ctx.globalAlpha=1; ctx.fillStyle=c;
    ctx.translate(o.x,o.y); ctx.rotate(Math.PI/4);
    ctx.fillRect(-s/1.4,-s/1.4,s*1.4,s*1.4);
    ctx.restore();
  }
}

export function drawParticles(){
  for(const q of S.parts){
    const a = clamp(q.t/q.max,0,1);
    ctx.save();
    ctx.globalAlpha = a;
    if(q.ring){
      ctx.strokeStyle=q.c; ctx.lineWidth=2.4*a+0.6;
      ctx.beginPath(); ctx.arc(q.x,q.y, lerp(q.r0,q.r,1-a), 0, TAU); ctx.stroke();
    } else if(q.zap){   /* electric arc */
      ctx.strokeStyle=q.c; ctx.lineWidth=1.8;
      ctx.beginPath(); q.pts.forEach(([x,y],i)=> i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
    } else {
      ctx.fillStyle=q.c;
      ctx.beginPath(); ctx.arc(q.x,q.y,q.r*a,0,TAU); ctx.fill();
    }
    ctx.restore();
  }
}

export function drawNumbers(){
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const n of S.nums){
    const a = clamp(n.t/0.62,0,1);
    ctx.globalAlpha = a;
    ctx.font = `${n.big?700:400} ${n.big?14:11}px "JetBrains Mono", monospace`;
    ctx.fillStyle = n.c;
    ctx.fillText(n.txt, n.x, n.y);
  }
  ctx.restore();
}

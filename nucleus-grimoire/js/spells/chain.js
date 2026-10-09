/* ==== Electric Chain (electric) ====
   A fast bolt at the nearest shape that jumps on to more.
   Talents: Static, Superconductivity, Shock Therapy (evolve). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, rnd, lerp } from '../core/math.js';
import { ELEMENTS } from '../data/elements.js';
import { dealDamage, hitArea } from '../game/combat.js';
import { nearestEnemy } from '../game/targeting.js';
import { burst, ring, zapFx } from '../game/effects.js';

function boltShot(x, y, target, dmg, jumps, hit, st, plain){
  return {type:'bolt', x, y, sx:x, sy:y, target, dmg, jumps, hit, st, plain, speed:950, life:1.2};
}
/* bolt s has reached e: strike it, then arc on to the nearest shape it has not touched */
function chainOn(s, e){
  dealDamage(e, s.dmg, {color:ELEMENTS.electric.color, el:'electric'});
  zapFx(s.sx, s.sy, e.x, e.y);
  s.hit.add(e);
  if(s.plain || s.jumps <= 0) return;
  const nx = nearestEnemy(e.x, e.y, s.st.range, s.hit);
  if(nx) S.shots.push(boltShot(e.x, e.y, nx, s.dmg*(s.st.ramp||1), s.jumps-1, s.hit, s.st, false));
  if(s.st.extra){   /* Shock Therapy: an extra bolt that cannot jump */
    const ex = new Set(s.hit); if(nx) ex.add(nx);
    const o = nearestEnemy(e.x, e.y, 300, ex);
    if(o) S.shots.push(boltShot(e.x, e.y, o, s.dmg*1.5, 0, ex, s.st, true));
  }
}
function castChain(st){
  const p = S.player, dmg = st.dmg*st.dmgMult;
  if(st.static){
    for(let i=0;i<st.count;i++){
      const a = rnd(TAU);
      S.shots.push({type:'static', x:p.x, y:p.y, vx:Math.cos(a)*140, vy:Math.sin(a)*140, st, dmg,
        zaps:st.jumps, zapT:1.5, life:st.jumps*1.5 + 4, ph:rnd(TAU)});
    }
    return;
  }
  const used = new Set();
  for(let i=0;i<st.count;i++){
    const t = nearestEnemy(p.x, p.y, 700, used) || nearestEnemy(p.x, p.y, 700);
    if(!t) return;
    used.add(t);
    S.shots.push(boltShot(p.x, p.y, t, dmg, st.jumps, new Set(), st, false));
  }
}
function staticBoom(s){
  const R = 80*S.mods.area;
  ring(s.x, s.y, R, ELEMENTS.electric.color);
  burst(s.x, s.y, '#c4bdff', 16, 1.4);
  hitArea(s.x, s.y, R, s.dmg*2, {color:ELEMENTS.electric.color, el:'electric', big:true});
}

function boltStep(s, dt){
  let t = s.target;
  if(!t || t.dead){ t = s.target = nearestEnemy(s.x, s.y, 300, s.hit); if(!t) return true; }
  const dx = t.x-s.x, dy = t.y-s.y, d = Math.hypot(dx,dy) || 1, step = s.speed*dt;
  if(d <= step + t.r){ s.x = t.x; s.y = t.y; chainOn(s, t); return true; }
  s.x += dx/d*step; s.y += dy/d*step;
  return false;
}

/* Static: a slow ball that drifts toward shapes, zapping one every 1.5s, then bursts */
function staticStep(s, dt){
  s.ph += dt*8;
  const t = nearestEnemy(s.x, s.y, 600);
  if(t){
    const a = Math.atan2(t.y-s.y, t.x-s.x), k = Math.min(1, dt*2);
    s.vx = lerp(s.vx, Math.cos(a)*140, k); s.vy = lerp(s.vy, Math.sin(a)*140, k);
  }
  s.x += s.vx*dt; s.y += s.vy*dt;
  s.zapT -= dt;
  if(s.zapT > 0) return false;
  const z = nearestEnemy(s.x, s.y, s.st.range);
  if(!z){ s.zapT = 0.3; return false; }
  s.zapT = 1.5;
  dealDamage(z, s.dmg, {color:ELEMENTS.electric.color, el:'electric'});
  zapFx(s.x, s.y, z.x, z.y);
  if(s.st.extra){
    const ex = new Set([z]), o = nearestEnemy(s.x, s.y, 300, ex);
    if(o) S.shots.push(boltShot(s.x, s.y, o, s.dmg*1.5, 0, ex, s.st, true));
  }
  s.dmg *= s.st.ramp || 1;
  if(--s.zaps <= 0){ staticBoom(s); return true; }
  return false;
}

function drawBolt(s){
  ctx.save();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#b9b0ff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(s.sx,s.sy); ctx.lineTo(s.x,s.y); ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(s.x,s.y,3.2,0,TAU); ctx.fill();
  ctx.globalAlpha = 0.4; ctx.fillStyle = '#7b6cff';
  ctx.beginPath(); ctx.arc(s.x,s.y,8,0,TAU); ctx.fill();
  ctx.restore();
}
function drawStatic(s){
  ctx.save();
  ctx.translate(s.x,s.y);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#7b6cff';
  ctx.beginPath(); ctx.arc(0,0,16,0,TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = '#d9d4ff';
  ctx.beginPath(); ctx.arc(0,0,6,0,TAU); ctx.fill();
  ctx.strokeStyle = '#b9b0ff'; ctx.lineWidth = 1.2;
  for(let k=0;k<4;k++){   /* crackle */
    const aa = s.ph + k*TAU/4;
    ctx.beginPath(); ctx.moveTo(Math.cos(aa)*7, Math.sin(aa)*7);
    ctx.lineTo(Math.cos(aa+0.4)*12, Math.sin(aa+0.4)*12); ctx.lineTo(Math.cos(aa)*16, Math.sin(aa)*16); ctx.stroke();
  }
  ctx.restore();
}

export const chain = {
  key:'chain',
  name:'Electric Chain', el:'electric', color:'#7b6cff', kind:'Chain · Electric',
  blurb:'A bolt leaps at the nearest shape and arcs on to two more.',
  base:{cd:2, dmg:20, count:1, jumps:2},
  levels:[
    {at:[2,6,10,14], stat:'count', add:1},
    {at:[3,7,11],    stat:'dmg',   mul:1.35},
    {at:[4,8,12],    stat:'cd',    mul:0.8},
    {at:[5,9,13],    stat:'jumps', add:1}
  ],
  t7:[
    {id:'static', name:'Static',            txt:'Cast <em>slow electric balls</em> that zap a nearby shape every 1.5s — as many zaps as jumps — then <em>explode for 2×</em>.'},
    {id:'super',  name:'Superconductivity', txt:'<em>Double the jumps</em>, and the bolt hits <em>1.2× harder</em> with every jump.'}
  ],
  evolve:{name:'Shock Therapy', txt:'Every jump also launches <em>an extra bolt</em> that cannot jump but hits for <em>1.5×</em>.'},

  icon:`<path d="M3 13l5-5 4 4 4-6 5 5"/><circle cx="3" cy="13" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="21" cy="11" r="1.4"/><path d="M11 21l2-4h-3l2-4"/>`,
  orbit:{col:'#7b6cff', glow:'#c4bdff', tilt:-1.30, speed: 1.90, rx:22, ry: 7.5, ph:0.8, layer:5},
  core:{hi:'#efeaff', mid:'#7b6cff', lo:'#241a66', rim:'#0c0828', n1:'#4b3fc0', n2:'#c4bdff', spark:'#ffffff'},

  modify(o, has, M){
    if(has('static')) o.static = true;
    if(has('super')){ o.jumps *= 2; o.ramp = 1.2; }
    if(has('evolve')) o.extra = true;
    o.range = 220*M.area;
  },
  cast: castChain,

  shots:{
    bolt:{ step: boltStep, draw: drawBolt },
    static:{ step: staticStep, expire(s){ staticBoom(s); return false; }, draw: drawStatic }
  }
};

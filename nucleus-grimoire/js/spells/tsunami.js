/* ==== Tsunami (water) ====
   A giant wave rolls out the way you are moving.
   Talents: Whirlpool, Rainfall, Contamination (evolve) — and their pairings. */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, rnd, dist2, fanAngle, hexA } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { dealDamage, hitArea, contaminate } from '../game/combat.js';
import { fallTargets } from '../game/targeting.js';
import { burst, ring } from '../game/effects.js';
import { dotZone, surge, skyFall, drawFallMark } from './shared.js';

function castTsunami(st){
  const p = S.player, dmg = st.dmg*st.dmgMult, size = st.size;
  const dir = Math.atan2(p.dir.y, p.dir.x);
  if(st.rain){
    const R = 70*size*(st.contam ? 1.2 : 1);
    fallTargets(2*st.count).forEach((t,i) => skyFall('drop', t.x, t.y, i*0.07, 8*size, st.color, (x,y)=>{
      ring(x, y, R, st.color); burst(x, y, '#9fd0ff', 14, 1.4);
      hitArea(x, y, R, dmg*1.5, {color:st.color, el:'water'}, st.contam ? e => contaminate(e, dmg*1.5) : null);
      if(st.whirl) S.zones.push({type:'whirl', x, y, r:R, life:3, max:3, acc:0, tick:0, pull:45, slow:0.4, color:st.color, spin:rnd(TAU)});
      if(st.contam) dotZone(x, y, R, dmg*1.5*0.3, 5, 'water');
    }));
    return;
  }
  if(st.whirl){
    const k = 1 + 0.1*st.count;
    S.zones.push({type:'whirl', follow:true, x:p.x, y:p.y, r:160*size*k, life:3, max:3, acc:0, tick:dmg*0.25*k,
      pull:60, slow:0.3, color:st.color, spin:0, rogue: st.contam ? dmg*k : 0, rogueT:0});
    return 3;   /* the cooldown starts once the whirlpool ends */
  }
  const n = st.contam ? 4*st.count : st.count;
  for(let i=0;i<n;i++){
    const a = st.contam ? dir + i*TAU/n : fanAngle(dir, i, Math.PI/6);
    S.shots.push({type:'wave', x:p.x, y:p.y, a, speed:520, w:260*size, th:46*size, life:0.9, max:0.9,
      dmg, hit:new Set(), contam:!!st.contam, color:st.color});
  }
}

function waveStep(s, dt){
  const ca = Math.cos(s.a), sa = Math.sin(s.a);
  s.x += ca*s.speed*dt; s.y += sa*s.speed*dt;
  for(const e of gridQuery(s.x, s.y, s.w/2 + s.th + 20)){
    if(e.dead || s.hit.has(e)) continue;
    const rx = e.x-s.x, ry = e.y-s.y;
    if(Math.abs(rx*ca + ry*sa) > s.th/2 + e.r || Math.abs(-rx*sa + ry*ca) > s.w/2 + e.r) continue;
    s.hit.add(e);
    dealDamage(e, s.dmg, {color:s.color, el:'water'});
    if(!e.dead){
      const kb = e.boss ? 40 : 240;
      e.vx += ca*kb; e.vy += sa*kb;
      if(s.contam) contaminate(e, s.dmg);
    }
  }
  return false;
}

/* whirlpools drag shapes inward and hold them back; the big one may also bite and throw rogue waves */
function whirlStep(z, dt, p){
  if(z.follow){ z.x = p.x; z.y = p.y; }
  z.life -= dt; z.acc += dt; z.spin += dt*3;
  const inside = gridQuery(z.x,z.y,z.r+20).filter(e => !e.dead && dist2(e.x,e.y,z.x,z.y) < z.r*z.r);
  for(const e of inside){
    if(!e.boss){
      const dx = z.x-e.x, dy = z.y-e.y, d = Math.hypot(dx,dy) || 1;
      if(d > 14){ e.x += dx/d*z.pull*dt; e.y += dy/d*z.pull*dt; }
    }
    e.slow = Math.max(e.slow, z.slow); e.slowT = Math.max(e.slowT, 0.3);
  }
  if(z.tick && z.acc >= 0.5){
    z.acc = 0;
    for(const e of inside) dealDamage(e, z.tick, {color:z.color, el:'water'});
  }
  if(z.rogue){
    z.rogueT -= dt;
    if(z.rogueT <= 0){   /* Contamination with Whirlpool: a rogue wave rolls out every 3s */
      z.rogueT = 3;
      surge({x:z.x, y:z.y, follow:z.follow, maxR:z.r*1.8, speed:520, band:30, dmg:z.rogue, el:'water', color:'#9fd0ff', contam:true});
    }
  }
  return z.life <= 0;
}

function drawWhirl(z){
  const f = Math.min(1, (z.max-z.life)*4) * Math.min(1, z.life*3);
  ctx.save();
  ctx.globalAlpha = 0.16*f; ctx.fillStyle = z.color;
  ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,TAU); ctx.fill();
  ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 2;
  for(let k=0;k<4;k++){   /* spiral arms */
    ctx.globalAlpha = 0.45*f;
    ctx.beginPath();
    for(let t=0;t<=1;t+=0.05){
      const ang = z.spin + k*TAU/4 + t*2.6, rr = z.r*(1-t*0.85);
      const px = z.x+Math.cos(ang)*rr, py = z.y+Math.sin(ang)*rr;
      t ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawWave(s){
  const f = Math.min(1, s.life/s.max*2.5, (s.max-s.life)*8), w = s.w/2, th = s.th;
  ctx.save();
  ctx.translate(s.x,s.y); ctx.rotate(s.a);
  const g = ctx.createLinearGradient(-th,0,th*0.8,0);
  g.addColorStop(0, hexA('#2f8fe0', 0.05*f)); g.addColorStop(0.7, hexA('#2f8fe0', 0.45*f)); g.addColorStop(1, hexA('#9fd0ff', 0.7*f));
  ctx.fillStyle = g;
  ctx.beginPath();   /* a curling band, crest leading */
  ctx.moveTo(-th*0.2, -w);
  ctx.quadraticCurveTo(th*1.3, 0, -th*0.2, w);
  ctx.lineTo(-th*1.1, w*0.92);
  ctx.quadraticCurveTo(0, 0, -th*1.1, -w*0.92);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.85*f; ctx.strokeStyle = '#e8f5ff'; ctx.lineWidth = 2;   /* foam on the crest */
  ctx.beginPath(); ctx.moveTo(-th*0.2, -w); ctx.quadraticCurveTo(th*1.3, 0, -th*0.2, w); ctx.stroke();
  ctx.restore();
}

/* Rainfall droplet */
function drawDroplet(s){
  drawFallMark(s, '#2f8fe0');
  const a = Math.atan2(s.vy,s.vx);
  ctx.save();
  ctx.translate(s.x,s.y); ctx.rotate(a);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#9fd0ff';
  ctx.beginPath(); ctx.moveTo(-s.r*7,0); ctx.lineTo(0,-s.r*0.8); ctx.lineTo(0,s.r*0.8); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(-s.r*0.3,-s.r*0.3,s.r*0.1, 0,0,s.r);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.5,'#7fc4ff'); g.addColorStop(1,'#1d5fa8');
  ctx.globalAlpha = 1; ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(s.r*1.8,0); ctx.arc(0,0,s.r,0.9,-0.9+TAU); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export const tsunami = {
  key:'tsunami',
  name:'Tsunami', el:'water', color:'#2f8fe0', kind:'Wave · Water',
  blurb:'A giant wave rolls out the way you are moving, sweeping a wide band of the field.',
  base:{cd:4, dmg:40, count:1, size:1},
  levels:[
    {at:[2,6,10,14], stat:'cd',    mul:0.9},
    {at:[3,7,11],    stat:'dmg',   mul:1.3},
    {at:[4,8,12],    stat:'size',  mul:1.15},
    {at:[5,9,13],    stat:'count', add:1}
  ],
  t7:[
    {id:'whirl', name:'Whirlpool', txt:'Waves merge into <em>one whirlpool around you</em> for 3s that drags shapes in; each wave merged adds <em>+10% damage and size</em>.'},
    {id:'rain',  name:'Rainfall',  txt:'Call <em>giant droplets</em> down onto clusters instead — <em>2 per wave</em>, each hitting for <em>1.5×</em>.'}
  ],
  evolve:{name:'Contamination', txt:'Waves roll out in <em>four directions</em> and poison for <em>30% over 5s</em>.'},

  icon:`<path d="M2 15c3 0 3-4 6-4s3 4 6 4 3-4 6-4"/><path d="M2 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/><path d="M13 8c0-3 3-5 7-4-2.4.2-3.4 2-2.4 4"/>`,
  orbit:{col:'#2f8fe0', glow:'#9fd0ff', tilt:-2.20, speed: 1.15, rx:24, ry: 9.5, ph:3.0, layer:7},
  core:{hi:'#e8f5ff', mid:'#2f8fe0', lo:'#0b2f5c', rim:'#061830', n1:'#1d5fa8', n2:'#9fd0ff', spark:'#ffffff'},

  modify(o, has, M){
    if(has('whirl')) o.whirl = true;
    if(has('rain'))  o.rain = true;
    if(has('evolve')) o.contam = true;
  },
  cast: castTsunami,

  shots:{ wave:{ step: waveStep, draw: drawWave } },
  falls:{ drop: drawDroplet },
  zones:{ whirl:{ layer:'under', step: whirlStep, draw: drawWhirl } }
};

/* ==== Dark Orbs (dark) — internal key 'imps' (it replaced Dark Imps; saved key kept) ====
   Homing orbs that hunt shape after shape for a few seconds.
   Talents: Divide and Conquer, Chaos, Supernova (evolve). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, rnd, clamp, dist2 } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { dealDamage } from '../game/combat.js';
import { nearestEnemy, onScreen } from '../game/targeting.js';
import { burst } from '../game/effects.js';
import { A } from '../game/modifiers.js';
import { dotZone, surge } from './shared.js';

function spawnOrb(st, x, y, a, life, child){
  S.shots.push({type:'orb', x, y, vx:Math.cos(a)*st.speed, vy:Math.sin(a)*st.speed, st,
    dmg:st.dmg*st.dmgMult, r:st.r*(child?0.75:1), speed:st.speed*(child?1.15:1), turn:st.turn,
    life, max:life, target:null, last:null, cool:0, ph:rnd(TAU), child:!!child, color:st.color});
}
function castImps(st){
  const p = S.player;
  for(let i=0;i<st.count;i++){
    const a = i*TAU/st.count + rnd(0.3,-0.3);
    spawnOrb(st, p.x+Math.cos(a)*22, p.y+Math.sin(a)*22, a, st.dur*S.mods.dur, false);
  }
}
/* the nearest *other* shape on screen; if there is none, the one it just hit */
function orbTarget(s){
  let best = null, bd = Infinity;
  for(const e of gridQuery(s.x, s.y, 700)){
    if(e.dead || e===s.last || !onScreen(e,40)) continue;
    const d = dist2(e.x,e.y,s.x,s.y);
    if(d < bd){ bd = d; best = e; }
  }
  return best || (s.last && !s.last.dead ? s.last : nearestEnemy(s.x,s.y,900));
}
/* Supernova shockwaves: generation 0 from a hit, up to 2 more generations from collisions */
function spawnNova(x, y, dmg, gen){
  const R = 70*S.mods.area;
  S.novaId = (S.novaId||0) + 1;
  surge({nova:true, id:S.novaId, gen, met:new Set(), x, y, maxR:R, speed:R/0.35, band:18, dmg, el:'dark', color:'#c99bff'});
}
function novaCollisions(){
  const nv = S.zones.filter(z => z.type==='surge' && z.nova);
  for(let i=0;i<nv.length;i++) for(let j=i+1;j<nv.length;j++){
    const a = nv[i], b = nv[j];
    if(a.met.has(b.id) || dist2(a.x,a.y,b.x,b.y) > (a.r+b.r)**2) continue;
    a.met.add(b.id);
    const g = Math.max(a.gen, b.gen) + 1;
    if(g <= 2 && nv.length < 40 && Math.random() < 0.6) spawnNova((a.x+b.x)/2, (a.y+b.y)/2, Math.max(a.dmg,b.dmg), g);
  }
}

function orbStep(s, dt){
  s.ph += dt*6;
  s.cool = Math.max(0, s.cool-dt);
  if(!s.target || s.target.dead) s.target = orbTarget(s);
  if(s.target){
    const want = Math.atan2(s.target.y-s.y, s.target.x-s.x);
    let cur = Math.atan2(s.vy,s.vx);
    const df = ((want-cur+Math.PI*3)%TAU)-Math.PI;
    cur += clamp(df, -s.turn*dt, s.turn*dt);
    s.vx = Math.cos(cur)*s.speed; s.vy = Math.sin(cur)*s.speed;
  }
  s.x += s.vx*dt; s.y += s.vy*dt;
  if(s.cool > 0) return false;
  for(const e of gridQuery(s.x, s.y, s.r+24)){
    if(e.dead) continue;
    const rr = e.r + s.r;
    if(dist2(s.x,s.y,e.x,e.y) >= rr*rr) continue;
    dealDamage(e, s.dmg, {color:s.color, el:'dark'});
    burst(s.x, s.y, s.color, 5);
    s.cool = 0.2; s.last = e; s.target = null;
    const st = s.st;
    if(st.chaos) dotZone(s.x, s.y, 50*S.mods.area, s.dmg*0.4, 4*S.mods.dur, 'chaos');
    if(st.nova) spawnNova(s.x, s.y, s.dmg*1.5, 0);
    if(st.split && !s.child){   /* Divide and Conquer: the orb becomes two */
      const a = Math.atan2(s.vy, s.vx);
      spawnOrb(st, s.x, s.y, a-1, s.life, true);
      spawnOrb(st, s.x, s.y, a+1, s.life, true);
      burst(s.x, s.y, s.color, 10);
      return true;
    }
    return false;
  }
  return false;
}

function drawOrbShot(s){
  ctx.save();
  ctx.translate(s.x,s.y);
  const wob = 1 + Math.sin(s.ph)*0.07, fade = Math.min(1, s.life*3);
  ctx.globalAlpha = 0.3*fade; ctx.fillStyle = s.color;
  ctx.beginPath(); ctx.arc(0,0,s.r*2.3*wob,0,TAU); ctx.fill();
  ctx.globalAlpha = fade;
  const g = ctx.createRadialGradient(0,0,s.r*0.2, 0,0,s.r*wob);
  g.addColorStop(0,'#3a1d52'); g.addColorStop(0.7,'#1a0d26'); g.addColorStop(1,'#0c0612');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0,0,s.r*wob,0,TAU); ctx.fill();
  ctx.strokeStyle = s.color; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0,0,s.r*wob,0,TAU); ctx.stroke();
  ctx.restore();
}

export const imps = {
  key:'imps',
  name:'Dark Orbs', el:'dark', color:'#a86bd8', kind:'Summon · Dark',
  blurb:'Homing orbs of nothing hunt shape after shape, terrifying whatever they touch.',
  base:{cd:2.5, dmg:20, count:3, dur:3},
  levels:[
    {at:[2,6,10,14], stat:'count', add:1},
    {at:[3,7,11],    stat:'dmg',   mul:1.3},
    {at:[4,8,12],    stat:'dur',   add:1},
    {at:[5,9,13],    stat:'cd',    mul:0.8}
  ],
  t7:[
    {id:'divide', name:'Divide and Conquer', txt:'Orbs <em>split in two</em> on their first hit, and hit for <em>+20%</em>.'},
    {id:'chaos',  name:'Chaos',              txt:'Every hit leaves an area that deals <em>40% over 4s</em>.'}
  ],
  evolve:{name:'Supernova', txt:'Every hit releases a <em>shockwave</em> for <em>1.5×</em>. Where two shockwaves collide, a <em>60% chance</em> of another.'},

  icon:`<circle cx="9" cy="10" r="4.4"/><circle cx="16.5" cy="15" r="3"/><path d="M7.4 8.8h.01M10.6 8.8h.01" stroke-width="2.2"/>`,
  orbit:{col:'#a86bd8', glow:'#d9b5ff', tilt:-0.62, speed:-1.70, rx:27, ry:10.0, ph:5.1, layer:3},
  core:{hi:'#b48be0', mid:'#4a2470', lo:'#14081f', rim:'#a86bd8', n1:'#2a1240', n2:'#7a4aa8', spark:'#e0c4ff'},

  modify(o, has, M){
    o.count += A('impwarden');
    o.dur   += A('blacksigil');
    o.turn   = 5 * (1 + 0.40*A('blacksigil'));
    if(has('divide')){ o.split = true; o.dmg *= 1.2; }
    if(has('chaos')) o.chaos = true;
    if(has('evolve')) o.nova = true;
    o.r = 7*M.area; o.speed = 300;
  },
  cast: castImps,

  shots:{ orb:{ step: orbStep, draw: drawOrbShot } },
  /* after every zone has moved: Supernova shockwaves that meet may spawn another */
  afterZones: novaCollisions
};

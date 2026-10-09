/* ==== Wind Blade (wind) ====
   A 60° arc of cutting air flung at the nearest shape; pierces.
   Talents: Vortex, Monsoon, Storm (evolve). */
import { S } from '../core/state.js';
import { view, ctx } from '../core/view.js';
import { TAU, fanAngle } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { dealDamage } from '../game/combat.js';
import { nearestEnemy } from '../game/targeting.js';

/* a blade is an arc of the circle around its origin, widening as it flies outward */
function arcShot(o){
  S.shots.push(Object.assign({type:'arc', d:18, hits:0, hit:new Set(), back:false}, o));
}
function castWindBlade(st){
  const p = S.player, dmg = st.dmg*st.dmgMult;
  const tgt = nearestEnemy(p.x,p.y,900);
  const base = tgt ? Math.atan2(tgt.y-p.y,tgt.x-p.x) : Math.atan2(p.dir.y,p.dir.x);
  const range = Math.max(view.w,view.h)*0.45;
  if(st.storm){
    /* one 170° slash carrying every blade; Vortex adds a mirrored 140° slash; 2.5s in total */
    const life = st.ret ? 1.25 : 2.5, speed = 320;
    const slash = (a, half) => arcShot({ox:p.x, oy:p.y, a, half, speed, life, flight:life, dmg:dmg*st.count,
      pierce:Infinity, ret:!!st.ret, band:st.band*1.6, color:st.color, storm:true});
    slash(base, 85*Math.PI/180);
    if(st.vortex) slash(base+Math.PI, 70*Math.PI/180);
    return;
  }
  const life = range/st.speed;
  for(let i=0;i<st.count;i++){
    const a = st.vortex ? base + i*TAU/st.count : fanAngle(base, i, Math.PI/3);
    arcShot({ox:p.x, oy:p.y, a, half:Math.PI/6, speed:st.speed, life, flight:life, dmg,
      pierce:st.pierce, ret:!!st.ret, band:st.band, color:st.color});
  }
}

function arcStep(s, dt){
  const p = S.player;
  if(s.back){
    s.ox = p.x; s.oy = p.y;
    s.d -= s.speed*dt;
    if(s.d <= 14) return true;
  } else s.d += s.speed*dt;
  for(const e of gridQuery(s.ox, s.oy, s.d + s.band + 20)){
    if(e.dead || s.hit.has(e)) continue;
    const dx = e.x-s.ox, dy = e.y-s.oy, d = Math.hypot(dx,dy) || 1;
    if(Math.abs(d - s.d) > s.band + e.r) continue;
    const off = Math.abs(((Math.atan2(dy,dx) - s.a + Math.PI*3) % TAU) - Math.PI);
    if(off > s.half + e.r/d) continue;
    s.hit.add(e);
    dealDamage(e, s.dmg, {color:s.color, el:'wind', big:!!s.storm});
    if(++s.hits > s.pierce) return true;
  }
  return false;
}

/* Monsoon: at the end of its flight the blade turns for home, pierce restored, 1.5× */
function arcExpire(s){
  if(s.ret && !s.back){ s.back = true; s.life = s.flight*2; s.hits = 0; s.hit.clear(); s.dmg *= 1.5; return true; }
  return false;
}

function drawArc(s){
  const r = Math.max(2, s.d), a0 = s.a - s.half, a1 = s.a + s.half;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.22; ctx.strokeStyle = s.color; ctx.lineWidth = s.band*2.2;
  ctx.beginPath(); ctx.arc(s.ox,s.oy,r,a0,a1); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = '#e6fffa'; ctx.lineWidth = Math.max(2, s.band*0.45);
  ctx.beginPath(); ctx.arc(s.ox,s.oy,r,a0,a1); ctx.stroke();
  ctx.globalAlpha = 0.3; ctx.strokeStyle = '#c4f1ea'; ctx.lineWidth = 1;   /* air streaks behind */
  for(const k of [1.2, 2.2]){
    const rr = s.back ? r + s.band*k : r - s.band*k;
    if(rr > 2){ ctx.beginPath(); ctx.arc(s.ox,s.oy,rr,a0+0.05,a1-0.05); ctx.stroke(); }
  }
  ctx.restore();
}

export const windblade = {
  key:'windblade',
  name:'Wind Blade', el:'wind', color:'#79c7bf', kind:'Arc · Wind',
  blurb:'A 60° arc of cutting air flung at the nearest shape. It passes through one and keeps going.',
  base:{cd:2, dmg:22, count:1, pierce:1},
  levels:[
    {at:[2,6,10,14], stat:'count',  add:1},
    {at:[3,7,11],    stat:'dmg',    mul:1.3},
    {at:[4,8,12],    stat:'cd',     mul:0.8},
    {at:[5,9,13],    stat:'pierce', add:1}
  ],
  t7:[
    {id:'vortex',  name:'Vortex',  txt:'<em>+3 blades</em>, thrown <em>in all directions</em> at once, with <em>+20% damage</em>.'},
    {id:'monsoon', name:'Monsoon', txt:'Blades <em>sweep back to you</em>, hitting for <em>1.5×</em> on the way home.'}
  ],
  evolve:{name:'Storm', txt:'All blades merge into <em>one 170° slash</em> with <em>infinite pierce</em> that lasts 2.5s and hits for <em>damage × blades merged</em>. With Vortex, a mirrored 140° slash goes the other way.'},

  icon:`<path d="M4 17C9 19.5 17 17 20 7c-4.2 6.4-10.4 9.2-16 10z"/><path d="M3 9h6M5 12.5h4"/>`,
  orbit:{col:'#79c7bf', glow:'#c4f1ea', tilt: 0.52, speed: 1.40, rx:25, ry: 9.0, ph:2.6, layer:4},
  core:{hi:'#f0fffb', mid:'#79c7bf', lo:'#1f5c55', rim:'#08201d', n1:'#3f8f86', n2:'#c4f1ea', spark:'#ffffff'},

  modify(o, has, M){
    if(has('vortex')){ o.count += 3; o.dmg *= 1.2; o.vortex = true; }
    if(has('monsoon')) o.ret = true;
    if(has('evolve')) o.storm = true;
    o.band = 16*M.area; o.speed = 520;
  },
  cast: castWindBlade,

  shots:{ arc:{ step: arcStep, expire: arcExpire, draw: drawArc } }
};

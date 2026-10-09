/* ==== Earth Splitter (earth) ====
   Rifts open under the nearest separate shapes and root them.
   Talents: Earthquake, Rumble, Seismic Wave (evolve). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, rnd, clamp } from '../core/math.js';
import { hitArea } from '../game/combat.js';
import { clusterTargets, nearestN } from '../game/targeting.js';
import { burst, ring } from '../game/effects.js';
import { dotZone } from './shared.js';

function castEarth(st){
  const p = S.player, dmg = st.dmg*st.dmgMult;
  const pts = st.quake ? clusterTargets(p.x, p.y, 1) : nearestN(st.count, st.radius*1.2).map(e => ({x:e.x, y:e.y}));
  pts.forEach((t,i) => S.zones.push({type:'rift', x:t.x, y:t.y, r:st.radius, wait:i*0.08, opened:false,
    life: st.rumble ? 1 : 0.45, max: st.rumble ? 1 : 0.45, dmg, rumble:!!st.rumble, seismic:!!st.seismic,
    rot:rnd(TAU), color:st.color}));
}

/* opens (damage once), stays a moment, and with Rumble leaves slowing ground */
function riftStep(z, dt){
  if(z.wait > 0){ z.wait -= dt; return false; }
  if(!z.opened){
    z.opened = true;
    hitArea(z.x, z.y, z.r, z.dmg, {color:z.color, el:'earth'});
    burst(z.x, z.y, '#7a5530', 10, 1.2);
    S.shake = Math.max(S.shake, 3);
    if(z.seismic){
      ring(z.x, z.y, z.r*1.5, '#d6a96e');
      hitArea(z.x, z.y, z.r*1.5, z.dmg*1.5, {color:'#d6a96e', el:'earth'});
    }
  }
  z.life -= dt;
  if(z.life <= 0){
    if(z.rumble) dotZone(z.x, z.y, z.r, z.dmg*0.3, 5*S.mods.dur, 'mire', {slow:0.10});
    return true;
  }
  return false;
}

function drawRift(z){
  if(z.wait > 0) return;
  const a = clamp(z.life/z.max,0,1);
  ctx.save();
  ctx.globalAlpha = 0.35*a; ctx.fillStyle = '#2a1a0c';
  ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.75,z.rot,0,TAU); ctx.fill();
  ctx.globalAlpha = 0.9*a; ctx.strokeStyle = '#ffb066'; ctx.lineWidth = 2.2;
  ctx.beginPath();   /* the split itself */
  for(let i=0;i<=6;i++){
    const k = i/6 - 0.5, j = (i%2 ? 1 : -1) * z.r*0.12;
    const px = z.x + Math.cos(z.rot)*k*z.r*2 - Math.sin(z.rot)*j;
    const py = z.y + Math.sin(z.rot)*k*z.r*2 + Math.cos(z.rot)*j;
    i ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.6*a; ctx.strokeStyle = z.color; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.75,z.rot,0,TAU); ctx.stroke();
  ctx.restore();
}

export const earth = {
  key:'earth',
  name:'Earth Splitter', el:'earth', color:'#a0703c', kind:'Rift · Earth',
  blurb:'The ground splits open under the nearest shapes and holds them fast.',
  base:{cd:2.5, dmg:30, count:1, radius:26},
  levels:[
    {at:[2,6,10,14], stat:'count',  add:1},
    {at:[3,7,11],    stat:'dmg',    mul:1.3},
    {at:[4,8,12],    stat:'cd',     mul:0.75},
    {at:[5,9,13],    stat:'radius', mul:1.35}
  ],
  t7:[
    {id:'quake',  name:'Earthquake', txt:'Open <em>one rift with 2× radius</em> on the biggest cluster; every rift given up cuts <em>0.25s</em> off the cooldown.'},
    {id:'rumble', name:'Rumble',     txt:'Rifts stay open <em>1s</em>, then leave ground that <em>slows 10%</em> and deals <em>30% over 5s</em>.'}
  ],
  evolve:{name:'Seismic Wave', txt:'Each rift opens with a <em>shockwave</em> — <em>1.5× damage</em> over <em>1.5× the radius</em>.'},

  icon:`<path d="M2 19h20"/><path d="M4 19l5-9 3 4 3-7 5 12"/><path d="M12 14l-1.2 2.4 1.4 1.2-.8 1.4"/>`,
  orbit:{col:'#a0703c', glow:'#e0b98a', tilt: 1.60, speed:-0.90, rx:28, ry:10.5, ph:4.2, layer:6},
  core:{hi:'#f3e2c8', mid:'#a0703c', lo:'#3d2810', rim:'#1a1006', n1:'#6e4a22', n2:'#d6a96e', spark:'#fff3dc'},

  modify(o, has, M){
    if(has('quake')){ o.cd = Math.max(0.5, o.cd - 0.25*(o.count-1)); o.count = 1; o.radius *= 2; o.quake = true; }
    if(has('rumble')) o.rumble = true;
    if(has('evolve')) o.seismic = true;
  },
  cast: castEarth,

  zones:{ rift:{ layer:'under', step: riftStep, draw: drawRift } }
};

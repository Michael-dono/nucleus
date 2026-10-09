/* ==== Ice Wave (ice) ====
   An expanding ring of cold centred on (and following) the player.
   Talents: Cold Aura, Frost Reach, Avalanche (evolve). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, clamp, dist2 } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { dealDamage, applyElement } from '../game/combat.js';
import { A } from '../game/modifiers.js';
import { surge } from './shared.js';
import { stats } from './index.js';

function iceRing(st, delay, mult){
  const R = st.radius;
  surge({follow:true, maxR:R, speed:Math.max(240, R/0.4), band:22*S.mods.area, wait:delay||0,
    dmg:st.dmg*st.dmgMult*(mult||1), edge:st.edge||0, el:'ice', color:st.color});
}
function castIceWave(st){
  if(st.aura) return;                           /* Cold Aura replaces the waves — see updateAura */
  for(let i=0;i<(st.waves||1);i++) iceRing(st, i*0.25, 1);
}

/* Cold Aura: steady slow, damage every second, and a 2× pulse every 2.5s (outside cooldown reduction) */
function updateAura(dt, st){
  const p = S.player, R = st.radius, dmg = st.dmg*st.dmgMult, edge = st.edge||0;
  S.auraSlow  = (S.auraSlow ||0) + dt;
  S.auraTick  = (S.auraTick ||0) + dt;
  S.auraPulse = (S.auraPulse||0) + dt;
  if(S.auraSlow >= 0.25){
    S.auraSlow = 0;
    for(const e of gridQuery(p.x,p.y,R+20)) if(!e.dead && dist2(e.x,e.y,p.x,p.y) < R*R) applyElement(e, 'ice', 0);
  }
  if(S.auraTick >= 1){
    S.auraTick = 0;
    for(const e of gridQuery(p.x,p.y,R+20).filter(e => !e.dead && dist2(e.x,e.y,p.x,p.y) < R*R)){
      const d = Math.sqrt(dist2(e.x,e.y,p.x,p.y));
      dealDamage(e, dmg*(1 + edge*clamp(d/R,0,1)), {color:st.color, el:'ice'});
    }
  }
  if(S.auraPulse >= 2.5){
    S.auraPulse = 0;
    for(let i=0;i<(st.waves||1);i++) iceRing(st, i*0.25, 2);
  }
}

/* Cold Aura: a standing disc of cold around you (drawn beneath everything) */
function drawAura(st){
  const p = S.player, R = st.radius;
  ctx.save();
  const g = ctx.createRadialGradient(p.x,p.y,R*0.1,p.x,p.y,R);
  g.addColorStop(0,'rgba(90,210,244,0.03)'); g.addColorStop(0.8,'rgba(90,210,244,0.07)'); g.addColorStop(1,'rgba(179,236,255,0.14)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x,p.y,R,0,TAU); ctx.fill();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#5ad2f4'; ctx.lineWidth = 1.4;
  ctx.setLineDash([9,11]); ctx.lineDashOffset = -S.t*18;
  ctx.beginPath(); ctx.arc(p.x,p.y,R,0,TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.55; ctx.fillStyle = '#d8f4ff';
  for(let i=0;i<14;i++){
    const aa = i*TAU/14 + S.t*0.35, rr = R*(0.35 + 0.6*((i*0.37 + S.t*0.12)%1));
    ctx.fillRect(p.x+Math.cos(aa)*rr-1.5, p.y+Math.sin(aa)*rr-1.5, 3, 3);
  }
  ctx.restore();
}

export const icewave = {
  key:'icewave',
  name:'Ice Wave', el:'ice', color:'#5ad2f4', kind:'Ring · Ice',
  blurb:'A tight ring of cold bursts out around you, biting and slowing everything it crosses.',
  base:{cd:2.5, dmg:15, radius:95},
  levels:[
    {at:[2,5,8,11,14], stat:'dmg',    mul:1.5},
    {at:[3,6,9,12],    stat:'radius', mul:1.15},
    {at:[4,7,10,13],   stat:'cd',     mul:0.8}
  ],
  t7:[
    {id:'aura',  name:'Cold Aura',   txt:'The wave becomes a <em>permanent aura</em>: <em>15% slow</em>, damage <em>every second</em>, and a <em>2× pulse</em> every 2.5s.'},
    {id:'reach', name:'Frost Reach', txt:'Radius <em>+28%</em>, and damage grows with distance — up to <em>+70% at the edge</em>.'}
  ],
  evolve:{name:'Avalanche', txt:'Release <em>three waves</em> in quick succession, with <em>+20% damage</em> and <em>+25% cooldown</em>.'},

  icon:`<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><path d="M12 1.6v2M12 20.4v2M1.6 12h2M20.4 12h2"/>`,
  orbit:{col:'#5ad2f4', glow:'#b3ecff', tilt: 1.05, speed:-1.25, rx:26, ry: 9.5, ph:1.9, layer:1},
  core:{hi:'#f2fcff', mid:'#7fd9f5', lo:'#1f6f8c', rim:'#08202a', n1:'#3a9cc0', n2:'#b3ecff', spark:'#ffffff'},

  modify(o, has, M){
    o.radius *= 1 + 0.18*A('rimelens');
    if(has('reach')){ o.radius *= 1.28; o.edge = 0.7; }
    if(has('evolve')){ o.waves = 3; o.dmg *= 1.2; o.cd *= 1.25; }
    if(has('aura')) o.aura = true;
  },
  cast: castIceWave,

  /* every frame while owned (before casting): Cold Aura */
  update(dt, st){ if(st.aura) updateAura(dt, st); },
  /* drawn beneath the zones while owned */
  drawUnder(sp){ if(sp.t7==='aura' || sp.t15==='aura') drawAura(stats('icewave')); }
};

/* ==== Fireball (fire) ====
   A projectile that bursts in a small blast on the first shape it meets.
   Talents: Molotov, Frenzy, Meteor Shower (evolve). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, rnd, clamp, dist2, fanAngle } from '../core/math.js';
import { gridQuery } from '../core/grid.js';
import { hitArea } from '../game/combat.js';
import { nearestEnemy, fallTargets } from '../game/targeting.js';
import { burst, ring } from '../game/effects.js';
import { A } from '../game/modifiers.js';
import { dotZone, skyFall, drawFallMark } from './shared.js';
import { starPath } from '../render/shapes.js';

function fireballBlast(st, x, y, dmg, R, meteor){
  ring(x, y, R, st.color);
  burst(x, y, st.color, meteor?24:10, meteor?2:1.1);
  hitArea(x, y, R, dmg, {color:st.color, el:'fire', big:meteor});
  if(st.molotov) dotZone(x, y, R*1.5, dmg*0.35, 5*S.mods.dur, 'fire');
}

function castFireball(st){
  const p = S.player, dmg = st.dmg*st.dmgMult;
  if(st.meteor){
    fallTargets(st.count).forEach((t,i) => skyFall('meteor', t.x, t.y, i*0.09, st.size*2.6, st.color, (x,y)=>{
      fireballBlast(st, x, y, dmg, st.radius, true);
      S.shake = Math.max(S.shake, 9);
      burst(x, y, '#5a4636', 14, 1.6);
      S.zones.push({type:'crater', x, y, r:st.radius*0.55, life:1.6, max:1.6});
    }));
    return;
  }
  const tgt = nearestEnemy(p.x,p.y,900);
  const base = tgt ? Math.atan2(tgt.y-p.y,tgt.x-p.x) : Math.atan2(p.dir.y,p.dir.x);
  for(let i=0;i<st.count;i++){
    const a = tgt ? fanAngle(base, i, 0.17) : base + rnd(0.45,-0.45);
    S.shots.push({type:'fireball', x:p.x, y:p.y, vx:Math.cos(a)*st.speed, vy:Math.sin(a)*st.speed,
      st, dmg, r:st.size, R:st.radius, life:2.4, pierce:st.pierce, hits:0, hit:new Set(), spin:rnd(TAU)});
  }
}

/* a fireball in flight — and, with a much longer tail, a falling meteor */
function drawFireball(s){
  const a = Math.atan2(s.vy,s.vx), meteor = s.type==='fall';
  if(meteor) drawFallMark(s, '#ff6b35');
  ctx.save();
  ctx.translate(s.x,s.y);
  /* trailing flame — a meteor drags a much longer tail */
  ctx.save(); ctx.rotate(a);
  ctx.globalAlpha = 0.28; ctx.fillStyle = '#ff6b35';
  ctx.beginPath();
  ctx.moveTo(-s.r*(meteor?11:6.5), 0); ctx.lineTo(0, -s.r*1.15); ctx.lineTo(0, s.r*1.15);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 0.34; ctx.fillStyle = '#ff8c42';
  ctx.beginPath(); ctx.arc(0,0,s.r*2.5,0,TAU); ctx.fill();
  const g = ctx.createRadialGradient(-s.r*0.3,-s.r*0.3,s.r*0.15, 0,0,s.r);
  g.addColorStop(0,'#fff3cf'); g.addColorStop(0.5,'#ffc247'); g.addColorStop(1,'#e8461f');
  ctx.globalAlpha = 1; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0,0,s.r,0,TAU); ctx.fill();
  ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 1;
  starPath(ctx, 0, 0, s.r*1.5, s.r*0.95, 6, s.spin); ctx.stroke();
  ctx.restore();
}

export const fireball = {
  key:'fireball',
  name:'Fireball', el:'fire', color:'#ff6b35', kind:'Projectile · Fire',
  blurb:'A sphere of flame that bursts in a small blast on the first shape it meets and sets it alight.',
  base:{cd:2, dmg:24, count:1, radius:32, pierce:0},
  levels:[
    {at:[2,6,10], stat:'count',  add:1},
    {at:[3,7,11], stat:'dmg',    mul:1.3},
    {at:[4,8,12], stat:'cd',     mul:0.8},
    {at:[5,13],   stat:'radius', mul:1.3},
    {at:[9,14],   stat:'pierce', add:1}
  ],
  t7:[
    {id:'molotov', name:'Molotov', txt:'Every impact — pierces included — leaves a <em>burning zone</em> 1.5× the blast that deals <em>35% over 5s</em>.'},
    {id:'frenzy',  name:'Frenzy',  txt:'<em>+30%</em> damage, pierce and blast, and <em>+3 fireballs</em> every cast.'}
  ],
  evolve:{name:'Meteor Shower', txt:'You stop throwing fire and <em>call meteors</em> down from the sky onto the <em>biggest clusters</em> — <em>2× blast</em>, <em>+40% damage</em>.'},

  icon:`<circle cx="12" cy="14" r="6.4"/><path d="M12 7.6C12 5 10 3.4 8.6 2.6c.6 2.4-1 3-1 5"/><path d="M12 7.6c.4-1.8 1.8-3 3.4-3.4-.4 1.6.2 2.4.2 3.4"/>`,
  orbit:{col:'#ff6b35', glow:'#ffb066', tilt: 0.00, speed: 1.55, rx:24, ry: 8.5, ph:0.0, layer:0},
  core:{hi:'#fff1d6', mid:'#ff8a4c', lo:'#8a2a10', rim:'#2a0f06', n1:'#c2461c', n2:'#ffb066', spark:'#fff0c0'},

  /* talents and bound artifacts on top of the level numbers */
  modify(o, has, M){
    o.count  += A('emberglass');
    o.radius *= 1 + 0.15*A('emberglass');
    if(has('frenzy')){ o.dmg *= 1.3; o.pierce = Math.max(o.pierce+1, Math.ceil(o.pierce*1.3)); o.radius *= 1.3; o.count += 3; }
    if(has('molotov')) o.molotov = true;
    if(has('evolve')){ o.meteor = true; o.radius *= 2; o.dmg *= 1.4; }
    o.speed = 470; o.size = 5.2*M.area;
  },
  cast: castFireball,

  shots:{
    fireball:{
      step(s, dt){
        s.x += s.vx*dt; s.y += s.vy*dt; s.spin += dt*9;
        for(const e of gridQuery(s.x, s.y, s.r+26)){
          if(e.dead || s.hit.has(e)) continue;
          const rr = e.r + s.r;
          if(dist2(s.x,s.y,e.x,e.y) >= rr*rr) continue;
          s.hit.add(e);
          fireballBlast(s.st, s.x, s.y, s.dmg, s.R, false);
          return ++s.hits > s.pierce;
        }
        return false;
      },
      expire(s){ fireballBlast(s.st, s.x, s.y, s.dmg, s.R, false); return false; },
      draw: drawFireball
    }
  },
  falls:{ meteor: drawFireball },
  zones:{
    /* the scorch a meteor leaves behind (visual only) */
    crater:{
      layer:'under',
      step(z, dt){ z.life -= dt; return z.life <= 0; },
      draw(z){
        const a = clamp(z.life/z.max,0,1);
        ctx.save();
        ctx.globalAlpha = 0.45*a; ctx.fillStyle = '#1a0f0a';
        ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.6,0,0,TAU); ctx.fill();
        ctx.globalAlpha = 0.6*a; ctx.strokeStyle = '#ff8c42'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.6,0,0,TAU); ctx.stroke();
        ctx.globalAlpha = 0.5*a; ctx.lineWidth = 1;
        for(let i=0;i<6;i++){   /* cracks radiating from the impact */
          const aa = i*TAU/6 + z.x*0.013;
          ctx.beginPath(); ctx.moveTo(z.x+Math.cos(aa)*z.r*0.3, z.y+Math.sin(aa)*z.r*0.18);
          ctx.lineTo(z.x+Math.cos(aa)*z.r*1.25, z.y+Math.sin(aa)*z.r*0.75); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
};

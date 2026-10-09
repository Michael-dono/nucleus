/* ==== Ray of Light (light) ====
   Rays across the whole screen in random directions, burning every 0.2s they last.
   Talents: Refract, Sol, Prism (evolve). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU, rnd, pick, clamp, hexA } from '../core/math.js';
import { ELEMENTS, EL_KEYS } from '../data/elements.js';
import { beamHit } from '../game/combat.js';
import { raySegments, screenRay } from '../game/targeting.js';
import { A } from '../game/modifiers.js';
import { starPath } from '../render/shapes.js';

function castLightRay(st){
  const p = S.player, dmg = st.dmg*st.dmgMult;
  const elOf = () => st.prism ? pick(EL_KEYS) : 'light';
  const ticks = Math.max(1, Math.round(st.dur/0.2));
  if(st.sol){
    const arms = [];
    for(let k=0;k<st.count;k++) arms.push(elOf());
    S.zones.push({type:'sol', x:p.x, y:p.y, a:rnd(TAU), spin:1.4, arms, life:st.dur, max:st.dur,
      acc:0.2, ticks, done:0, dmg, width:st.width, bounce:st.bounce||0});
    return;
  }
  for(let i=0;i<st.count;i++){
    S.zones.push({type:'ray', segs:screenRay(p.x, p.y, rnd(TAU), st.bounce||0), life:st.dur, max:st.dur,
      acc:0.2, ticks, done:0, dmg, width:st.width, el:elOf()});
  }
}

function drawBeam(x,y,a,reach,w,alpha,color,tail=0){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(a);
  const g = ctx.createLinearGradient(0,0,reach,0);
  g.addColorStop(0, `rgba(255,255,255,${0.95*alpha})`);
  g.addColorStop(0.12, hexA(color, 0.75*alpha));
  g.addColorStop(1, hexA(color, tail*alpha));   /* tail>0 keeps the beam lit to the wall */
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0,-w*0.5); ctx.lineTo(reach,-w*0.3);
  ctx.lineTo(reach, w*0.3); ctx.lineTo(0, w*0.5);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = alpha*0.9;
  ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = Math.max(1, w*0.14);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(reach,0); ctx.stroke();
  ctx.restore();
}

export const lightray = {
  key:'lightray',
  name:'Ray of Light', el:'light', color:'#ffd166', kind:'Beam · Light',
  blurb:'Rays cut across the whole screen in random directions and burn for every moment they last.',
  base:{cd:3, dmg:30, count:3, dur:0.2, width:12},
  levels:[
    {at:[4,7,10,13],   stat:'count', add:1},
    {at:[2,5,8,11,14], stat:'dur',   add:0.2},
    {at:[3,6,9,12],    stat:'dmg',   mul:1.25}
  ],
  t7:[
    {id:'refract', name:'Refract', txt:'Rays <em>bounce once</em> off the edge of the screen, and hit for <em>1.3×</em>.'},
    {id:'sol',     name:'Sol',     txt:'Rays fan out <em>evenly</em> and <em>sweep clockwise</em> for <em>1.5s</em>. Cooldown becomes <em>2.5s</em>.'}
  ],
  evolve:{name:'Prism', txt:'Every ray takes a <em>random element</em> — fire, ice, light, dark, earth, wind, water or electric — and inflicts its effect.'},

  icon:`<circle cx="12" cy="12" r="3.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2L19 19M19 5l-2.8 2.8M7.8 16.2L5 19"/>`,
  orbit:{col:'#ffd166', glow:'#fff0bf', tilt: 2.10, speed: 1.05, rx:23, ry: 8.0, ph:3.4, layer:2},
  core:{hi:'#fffbe8', mid:'#ffd166', lo:'#8a6a1a', rim:'#2a2008', n1:'#c9a227', n2:'#fff0bf', spark:'#ffffff'},

  modify(o, has, M){
    o.count += A('refractor');
    o.width *= M.area * (1 + 0.30*A('solarfocus'));
    o.dmg   *= 1 + 0.15*A('solarfocus');
    if(has('refract')){ o.bounce = 1; o.dmg *= 1.3; }
    if(has('sol')){ o.sol = true; o.dur = 1.5; o.cd = 2.5; }
    if(has('evolve')) o.prism = true;
  },
  cast: castLightRay,

  zones:{
    /* a ray across the screen, burning every 0.2s it lasts */
    ray:{
      layer:'over',
      step(z, dt){
        z.acc += dt;
        if(z.acc >= 0.2 && z.done < z.ticks){
          z.acc = 0; z.done++;
          const c = ELEMENTS[z.el].color;
          for(const g of z.segs) beamHit(g.x,g.y,g.a,g.len,z.width,z.dmg,c,new Set(),z.el);
        }
        z.life -= dt;
        return z.life <= 0 && z.done >= z.ticks;
      },
      draw(z){
        const a = clamp(z.life/z.max, 0, 1)*0.6 + 0.4, c = ELEMENTS[z.el].color;
        z.segs.forEach((g,k) => drawBeam(g.x, g.y, g.a, g.len, z.width*(0.6+a*0.6), a*(1-k*0.2), c, 0.55));
      }
    },
    /* Sol: evenly spaced arms around you sweeping clockwise */
    sol:{
      layer:'over',
      step(z, dt, p){
        z.x = p.x; z.y = p.y;
        z.a += z.spin*dt;
        z.acc += dt;
        if(z.acc >= 0.2){
          z.acc = 0;
          const n = z.arms.length;
          z.arms.forEach((el,k) => {
            const seen = new Set(), c = ELEMENTS[el].color;
            for(const g of raySegments(z.x, z.y, z.a + k*TAU/n, z.bounce)) beamHit(g.x,g.y,g.a,g.len,z.width,z.dmg,c,seen,el);
          });
        }
        z.life -= dt;
        return z.life <= 0;
      },
      draw(z){
        const fade = Math.min(1, z.life*3, (z.max-z.life)*6), n = z.arms.length;
        z.arms.forEach((el,k) => {
          raySegments(z.x, z.y, z.a + k*TAU/n, z.bounce).forEach((g,j) =>
            drawBeam(g.x, g.y, g.a, g.len, z.width, 0.6*fade*(1-j*0.2), ELEMENTS[el].color, 0.5));
        });
        ctx.save();
        ctx.globalAlpha = 0.5*fade; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.4;
        starPath(ctx, z.x, z.y, 34, 15, Math.max(3,n), z.a); ctx.stroke();
        ctx.restore();
      }
    }
  }
};

/* The conjurer: a nucleus with an elemental sphere in orbit for every magic.
   Each spell file supplies its orbit (`orbit`) and its core palette (`core`). */
import { S } from '../core/state.js';
import { ctx } from '../core/view.js';
import { TAU } from '../core/math.js';
import { SPELL_LIST, SPELL_DEFS } from '../spells/index.js';

/* nucleus palette before a starting magic is chosen: plain bone */
const CORE_NONE = {hi:'#fdfaf3', mid:'#d6d0c1', lo:'#6e6a60', rim:'#14161f', n1:'#8e8878', n2:'#b8b2a2', spark:'#fff6d8'};

/* orbits in paint order (orbit.layer), built on first draw */
let orbitals = null;
const getOrbitals = () => orbitals || (orbitals =
  SPELL_LIST.map(d => Object.assign({key:d.key}, d.orbit)).sort((a,b) => a.layer - b.layer));

export function drawPlayer(){
  const p = S.player;
  const cp = (SPELL_DEFS[p.core] || {}).core || CORE_NONE;
  const bob = Math.sin(p.walk*0.6)*1.3;
  const ORBITALS = getOrbitals();

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.globalAlpha = p.iframe>0 ? (Math.floor(S.t*22)%2 ? 0.4 : 1) : 1;
  ctx.lineCap='round'; ctx.lineJoin='round';

  /* ground shadow */
  ctx.save(); ctx.globalAlpha *= 0.32; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(0, 20, 13, 4, 0, 0, TAU); ctx.fill(); ctx.restore();

  /* orbit paths, drawn behind the core */
  ctx.save();
  ctx.globalAlpha *= 0.26; ctx.strokeStyle='#e9e5da'; ctx.lineWidth=1;
  for(const o of ORBITALS){
    ctx.save(); ctx.rotate(o.tilt);
    ctx.beginPath(); ctx.ellipse(0,0,o.rx,o.ry,0,0,TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  /* an elemental sphere sits on each orbit; owning the magic lights it up */
  const orbs = [];
  for(const o of ORBITALS){
    const owned = !!S.spells[o.key];
    const ang = S.t*o.speed + o.ph;
    const ex = Math.cos(ang)*o.rx, ey = Math.sin(ang)*o.ry;
    const x = ex*Math.cos(o.tilt) - ey*Math.sin(o.tilt);
    const y = ex*Math.sin(o.tilt) + ey*Math.cos(o.tilt);
    orbs.push({x, y, o, owned, back: Math.sin(ang) < 0});
  }

  const paintOrb = (q)=>{
    const {x,y,o,owned} = q;
    const lv = owned ? S.spells[o.key].lv : 0;
    const r = owned ? 3.6 + Math.min(lv,15)*0.16 : 2.3;
    ctx.save();
    if(owned){
      ctx.globalAlpha *= 0.3;
      ctx.fillStyle = o.glow;
      ctx.beginPath(); ctx.arc(x,y, r*3.1, 0, TAU); ctx.fill();
      ctx.globalAlpha = (p.iframe>0 ? 0.6 : 1);
      ctx.fillStyle = o.col;
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
      ctx.fillStyle = o.glow;
      ctx.beginPath(); ctx.arc(x-r*0.3, y-r*0.35, r*0.42, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = '#8b887f'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
    }
    ctx.restore();
  };

  orbs.filter(q=>q.back).forEach(paintOrb);        /* behind the nucleus */

  /* --- nucleus --- */
  const pulse = 1 + Math.sin(S.t*3.1)*0.05;
  ctx.save();
  const g = ctx.createRadialGradient(-2.5,-3,1, 0,0,11*pulse);
  g.addColorStop(0,cp.hi); g.addColorStop(0.55,cp.mid); g.addColorStop(1,cp.lo);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0,0,10.5*pulse,0,TAU); ctx.fill();
  ctx.strokeStyle = cp.rim; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.arc(0,0,10.5*pulse,0,TAU); ctx.stroke();
  /* packed nucleons */
  ctx.globalAlpha *= 0.5;
  for(let i=0;i<6;i++){
    const a = i*TAU/6 + S.t*0.35;
    ctx.fillStyle = i%2 ? cp.n1 : cp.n2;
    ctx.beginPath(); ctx.arc(Math.cos(a)*4.4, Math.sin(a)*4.4, 2.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
  /* core spark */
  ctx.save();
  ctx.globalAlpha *= 0.85; ctx.fillStyle = cp.spark;
  ctx.beginPath(); ctx.arc(0,0, 2.4 + Math.sin(S.t*5)*0.5, 0, TAU); ctx.fill();
  ctx.restore();

  orbs.filter(q=>!q.back).forEach(paintOrb);       /* in front of the nucleus */

  ctx.restore();
}

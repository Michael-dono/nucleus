/* Purely visual particles: bursts, expanding rings, electric arcs, floating damage numbers.
   Nothing here affects gameplay. */
import { S } from '../core/state.js';
import { TAU, rnd, lerp } from '../core/math.js';

export function burst(x,y,c,n,scale){
  const s = scale||1;
  for(let i=0;i<n;i++){
    if(S.parts.length>500) return;
    const a = rnd(TAU), sp = rnd(190,40)*s;
    S.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:rnd(.6,.24),max:.6,c,r:rnd(2.6,1)*s});
  }
}
export function ring(x,y,r,c){ S.parts.push({ring:true,x,y,r0:r*0.25,r,t:0.34,max:0.34,c}); }

/* a visible electric arc between two points */
export function zapFx(x1,y1,x2,y2){
  const pts = [], n = 6;
  for(let i=0;i<=n;i++){
    const k = i/n, j = (i===0||i===n) ? 0 : 9;
    pts.push([lerp(x1,x2,k)+rnd(j,-j), lerp(y1,y2,k)+rnd(j,-j)]);
  }
  S.parts.push({zap:true, pts, t:0.2, max:0.2, c:'#c4bdff', x:x1, y:y1});
}

export function updateEffects(dt){
  for(let i=S.parts.length-1;i>=0;i--){
    const q=S.parts[i]; q.t-=dt;
    if(q.t<=0){S.parts.splice(i,1);continue;}
    if(!q.ring && !q.zap){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vx*=0.92; q.vy*=0.92; }
  }
  for(let i=S.nums.length-1;i>=0;i--){
    const n=S.nums[i]; n.t-=dt; n.y += n.v*dt; n.v*=0.9;
    if(n.t<=0) S.nums.splice(i,1);
  }
}

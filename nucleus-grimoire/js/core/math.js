/* Small math and randomness helpers shared by every system. */

export const TAU = Math.PI * 2;
export const rnd = (a=1,b=0)=> b + Math.random()*(a-b);
export const rint = n => Math.floor(Math.random()*n);
export const pick = a => a[rint(a.length)];
export const clamp = (v,a,b)=> v<a?a:v>b?b:v;
export const dist2 = (ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
export const lerp = (a,b,t)=>a+(b-a)*t;

/* the first projectile of a volley flies dead at the target; the rest fan around it */
export const fanAngle = (base,i,step)=> i===0 ? base
  : base + Math.ceil(i/2)*(i%2?1:-1)*step + rnd(0.05,-0.05);

/* '#rrggbb' + alpha -> 'rgba(...)' */
export const hexA = (hex, a) => { const v = parseInt(hex.slice(1),16); return `rgba(${v>>16},${(v>>8)&255},${v&255},${a})`; };

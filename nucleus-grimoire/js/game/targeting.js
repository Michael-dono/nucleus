/* Finding things to hit: nearest enemy, densest clusters, what is on screen, rays to the screen edge. */
import { S } from '../core/state.js';
import { view } from '../core/view.js';
import { dist2, rnd } from '../core/math.js';
import { gridQuery } from '../core/grid.js';

export function nearestEnemy(x,y,maxR,exclude){
  let best=null, bd = (maxR||1e9)**2;
  const list = maxR ? gridQuery(x,y,maxR) : S.enemies;
  for(let i=0;i<list.length;i++){
    const e = list[i];
    if(e.dead || (exclude && exclude.has(e))) continue;
    const d = dist2(x,y,e.x,e.y);
    if(d<bd){bd=d;best=e;}
  }
  return best;
}

/* densest pockets of the horde near (x,y), biggest first — one centroid per coarse cell */
export function clusterTargets(x,y,n){
  const C = 160, R = Math.max(view.w,view.h)*0.6, cells = new Map();
  for(const e of S.enemies){
    if(e.dead || Math.abs(e.x-x) > R || Math.abs(e.y-y) > R) continue;
    const k = Math.floor(e.x/C)*100003 + Math.floor(e.y/C);
    let c = cells.get(k); if(!c){ c = {n:0,sx:0,sy:0}; cells.set(k,c); }
    c.n++; c.sx += e.x; c.sy += e.y;
  }
  return [...cells.values()].sort((a,b)=>b.n-a.n).slice(0,n).map(c=>({x:c.sx/c.n, y:c.sy/c.n}));
}

export const onScreen = (e, pad=0) => Math.abs(e.x-S.cam.x) < view.w/2+pad && Math.abs(e.y-S.cam.y) < view.h/2+pad;

/* up to n on-screen shapes nearest the player, each at least `sep` from the ones already chosen */
export function nearestN(n, sep){
  const p = S.player, list = [];
  for(const e of gridQuery(p.x, p.y, Math.max(view.w,view.h)*0.6)) if(!e.dead && onScreen(e)) list.push(e);
  list.sort((a,b) => dist2(a.x,a.y,p.x,p.y) - dist2(b.x,b.y,p.x,p.y));
  const out = [];
  for(const e of list){
    if(out.length >= n) break;
    if(out.every(o => dist2(o.x,o.y,e.x,e.y) > sep*sep)) out.push(e);
  }
  return out;
}

/* cluster targets for n falling things, jittered when there are fewer clusters than drops */
export function fallTargets(n){
  const p = S.player, tg = clusterTargets(p.x, p.y, n);
  const out = [];
  for(let i=0;i<n && tg.length;i++){
    const t = tg[i % tg.length], rep = i >= tg.length;
    out.push({x: t.x + (rep?rnd(45,-45):0), y: t.y + (rep?rnd(45,-45):0)});
  }
  return out;
}

/* Trace a ray to the edge of the visible screen and reflect it there
   (angle in = angle out: a vertical wall flips x, a horizontal wall flips y). */
export function raySegments(x,y,a,bounces){
  const L = S.cam.x-view.w/2, R = S.cam.x+view.w/2, T = S.cam.y-view.h/2, B = S.cam.y+view.h/2;
  let dx = Math.cos(a), dy = Math.sin(a);
  const segs = [];
  for(let k=0;k<=bounces;k++){
    const tx = dx > 1e-9 ? (R-x)/dx : dx < -1e-9 ? (L-x)/dx : Infinity;
    const ty = dy > 1e-9 ? (B-y)/dy : dy < -1e-9 ? (T-y)/dy : Infinity;
    const t = Math.max(0, Math.min(tx,ty));
    segs.push({x, y, a:Math.atan2(dy,dx), len:t});
    x += dx*t; y += dy*t;
    if(tx <= ty) dx = -dx;
    if(ty <= tx) dy = -dy;
  }
  return segs;
}
/* a ray across the whole screen: from the edge behind the player, through the player, to the far edge */
export function screenRay(x, y, a, bounces){
  const back = raySegments(x, y, a+Math.PI, 0)[0];
  const sx = x + Math.cos(a+Math.PI)*back.len, sy = y + Math.sin(a+Math.PI)*back.len;
  return raySegments(sx, sy, a, bounces);
}

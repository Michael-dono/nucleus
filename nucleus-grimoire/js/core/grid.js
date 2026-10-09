/* Spatial hash of live enemies, rebuilt once per frame. gridQuery returns a SHARED array
   that the next query overwrites — copy or filter it before calling anything that may query again. */
import { S } from './state.js';

const GRID = {cell:72, map:new Map()};
function gkey(cx,cy){ return cx*73856093 ^ cy*19349663; }

export function gridBuild(){
  GRID.map.clear();
  const c = GRID.cell;
  for(const e of S.enemies){
    if(e.dead) continue;
    const k = gkey(Math.floor(e.x/c), Math.floor(e.y/c));
    let a = GRID.map.get(k); if(!a){a=[];GRID.map.set(k,a);} a.push(e);
  }
}

const _q = [];
export function gridQuery(x,y,r){
  _q.length = 0;
  const c = GRID.cell;
  const x0=Math.floor((x-r)/c), x1=Math.floor((x+r)/c);
  const y0=Math.floor((y-r)/c), y1=Math.floor((y+r)/c);
  for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++){
    const a = GRID.map.get(gkey(cx,cy));
    if(a) for(let i=0;i<a.length;i++) _q.push(a[i]);
  }
  return _q;
}

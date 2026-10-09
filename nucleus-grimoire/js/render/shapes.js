/* Path builders for the geometric look (call fill/stroke afterwards). */
import { TAU } from '../core/math.js';

export function polyPath(c,x,y,r,n,rot){
  c.beginPath();
  for(let i=0;i<n;i++){
    const a = rot + i*TAU/n - Math.PI/2;
    const px = x+Math.cos(a)*r, py = y+Math.sin(a)*r;
    i ? c.lineTo(px,py) : c.moveTo(px,py);
  }
  c.closePath();
}
export function starPath(c,x,y,R,ri,n,rot){
  c.beginPath();
  for(let i=0;i<n*2;i++){
    const r = (i%2) ? ri : R;
    const a = rot + i*Math.PI/n - Math.PI/2;
    const px = x+Math.cos(a)*r, py = y+Math.sin(a)*r;
    i ? c.lineTo(px,py) : c.moveTo(px,py);
  }
  c.closePath();
}
export function circPath(c,x,y,r){ c.beginPath(); c.arc(x,y,r,0,TAU); }

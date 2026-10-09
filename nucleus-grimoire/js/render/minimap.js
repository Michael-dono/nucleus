/* The minimap: where the horde is, and above all where the boss is. Drawn in screen space. */
import { S } from '../core/state.js';
import { view, ctx } from '../core/view.js';
import { TAU, clamp } from '../core/math.js';

const MM_RANGE = 2600;                     /* world units across the whole box */

export function drawMinimap(){
  if(!S.running || S.over) return;
  const p = S.player;
  const s  = clamp(Math.min(view.w,view.h)*0.23, 96, 158);
  const x0 = view.w - s - 14;
  const y0 = (S.bossActive ? 132 : 104);
  const k  = s / MM_RANGE;
  const cx = x0 + s/2, cy = y0 + s/2;

  ctx.save();
  ctx.fillStyle = 'rgba(8,9,12,0.76)';
  ctx.fillRect(x0, y0, s, s);

  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, s, s); ctx.clip();

  /* faint world grid so movement reads */
  ctx.strokeStyle = 'rgba(233,229,218,0.05)'; ctx.lineWidth = 1;
  const gstep = 700*k;
  const gx = cx - ((p.x*k) % gstep), gy = cy - ((p.y*k) % gstep);
  for(let x=gx-gstep*3; x<x0+s+gstep; x+=gstep){ ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y0+s); ctx.stroke(); }
  for(let y=gy-gstep*3; y<y0+s+gstep; y+=gstep){ ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+s,y); ctx.stroke(); }

  /* the horde */
  let offscreen = 0;
  for(const e of S.enemies){
    if(e.dead || e.boss) continue;
    const mx = cx + (e.x-p.x)*k, my = cy + (e.y-p.y)*k;
    if(mx < x0-2 || mx > x0+s+2 || my < y0-2 || my > y0+s+2){ offscreen++; continue; }
    if(e.relic){
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffd166';
      ctx.fillRect(mx-2, my-2, 4, 4);
    } else if(e.elite){
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx-1.5, my-1.5, 3, 3);
    } else {
      ctx.globalAlpha = 0.55; ctx.fillStyle = e.accent;
      ctx.fillRect(mx-0.9, my-0.9, 1.8, 1.8);
    }
  }
  ctx.globalAlpha = 1;

  /* you, at the centre */
  ctx.fillStyle = '#e9e5da';
  ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(233,229,218,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, TAU); ctx.stroke();

  /* the boss — clamped to the rim when it is off the box, so its bearing always shows */
  const b = S.boss;
  if(b && !b.dead){
    let mx = cx + (b.x-p.x)*k, my = cy + (b.y-p.y)*k;
    const pad = 9;
    const clamped = (mx < x0+pad || mx > x0+s-pad || my < y0+pad || my > y0+s-pad);
    const ang = Math.atan2(b.y-p.y, b.x-p.x);
    if(clamped){
      mx = clamp(mx, x0+pad, x0+s-pad);
      my = clamp(my, y0+pad, y0+s-pad);
    }
    const pulse = 1 + Math.sin(S.t*5)*0.22;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ef476f'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(mx, my, 8*pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ef476f';
    ctx.save(); ctx.translate(mx,my); ctx.rotate(Math.PI/4);
    ctx.fillRect(-3.4,-3.4,6.8,6.8);
    ctx.restore();
    if(clamped){                                  /* arrow pointing the way out */
      ctx.save(); ctx.translate(mx,my); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(5,-4); ctx.lineTo(5,4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  /* frame + corner ticks */
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(233,229,218,0.20)'; ctx.lineWidth = 1;
  ctx.strokeRect(x0+0.5, y0+0.5, s-1, s-1);
  ctx.strokeStyle = 'rgba(233,229,218,0.5)'; ctx.lineWidth = 1.4;
  const T = 9;
  for(const [ax,ay,dx,dy] of [[x0,y0,1,1],[x0+s,y0,-1,1],[x0,y0+s,1,-1],[x0+s,y0+s,-1,-1]]){
    ctx.beginPath();
    ctx.moveTo(ax+dx*T, ay); ctx.lineTo(ax, ay); ctx.lineTo(ax, ay+dy*T);
    ctx.stroke();
  }
  /* label + count of what is beyond the edge */
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(233,229,218,0.42)';
  ctx.fillText('FIELD', x0+3, y0-4);
  if(offscreen){
    ctx.textAlign = 'right';
    ctx.fillText('+' + offscreen + ' beyond', x0+s-3, y0-4);
  }
  ctx.restore();
}

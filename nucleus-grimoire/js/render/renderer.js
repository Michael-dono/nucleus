/* One frame of drawing, back to front. Reads state only — never changes the game. */
import { S } from '../core/state.js';
import { view, ctx } from '../core/view.js';
import { TAU, rnd } from '../core/math.js';
import { joy } from '../core/input.js';
import { polyPath } from './shapes.js';
import { drawZonesUnder, drawZonesOver, drawShots, drawOrbs, drawParticles, drawNumbers } from './world.js';
import { drawEnemies, drawEShots } from './enemies.js';
import { drawPlayer } from './player.js';
import { drawMinimap } from './minimap.js';

export function draw(){
  const w = view.w, h = view.h;
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
  ctx.fillStyle = '#08090c';
  ctx.fillRect(0,0,w,h);

  /* camera, with screen shake */
  const sh = S.shake;
  const ox = w/2 - S.cam.x + (sh?rnd(sh,-sh):0);
  const oy = h/2 - S.cam.y + (sh?rnd(sh,-sh):0);

  drawGround(ox,oy,w,h);

  ctx.save();
  ctx.translate(ox,oy);

  drawZonesUnder();
  drawOrbs();
  drawEnemies();
  drawEShots();
  drawPlayer();
  drawShots();
  drawZonesOver();
  drawParticles();
  drawNumbers();

  ctx.restore();

  /* vignette + hit flash */
  const g = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.32,w/2,h/2,Math.max(w,h)*0.78);
  g.addColorStop(0,'rgba(8,9,12,0)'); g.addColorStop(1,'rgba(4,4,6,0.82)');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  if(S.hitFlash>0){ ctx.fillStyle = `rgba(239,71,111,${S.hitFlash*0.2})`; ctx.fillRect(0,0,w,h); }

  drawMinimap();

  /* touch stick */
  if(joy.active){
    ctx.save();
    ctx.strokeStyle='rgba(233,229,218,.18)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(joy.ox,joy.oy,52,0,TAU); ctx.stroke();
    const jx=joy.x-joy.ox, jy=joy.y-joy.oy, m=Math.hypot(jx,jy)||1, c=Math.min(m,52);
    ctx.fillStyle='rgba(233,229,218,.3)';
    ctx.beginPath(); ctx.arc(joy.ox+jx/m*c, joy.oy+jy/m*c, 15, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* dotted plane + faint sigil rings anchored in world space */
function drawGround(ox,oy,w,h){
  const step = 64;
  const sx = ((ox % step) + step) % step;
  const sy = ((oy % step) + step) % step;
  ctx.fillStyle = 'rgba(233,229,218,.052)';
  for(let x = sx - step; x < w+step; x += step)
    for(let y = sy - step; y < h+step; y += step)
      ctx.fillRect(x, y, 1.4, 1.4);
  ctx.save(); ctx.translate(ox,oy);
  ctx.strokeStyle='rgba(233,229,218,.035)'; ctx.lineWidth=1;
  const cx = Math.round(S.cam.x/700)*700, cy = Math.round(S.cam.y/700)*700;
  for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){
    const x = cx+i*700, y = cy+j*700;
    const seed = ((x*13+y*7)%5+5)%5;
    ctx.beginPath(); ctx.arc(x,y, 120+seed*26, 0, TAU); ctx.stroke();
    polyPath(ctx,x,y, 60+seed*12, 3+seed, S.t*0.03+seed); ctx.stroke();
  }
  ctx.restore();
}

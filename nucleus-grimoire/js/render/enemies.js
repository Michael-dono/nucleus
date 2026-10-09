/* Drawing enemies, bosses and boss projectiles. */
import { S } from '../core/state.js';
import { view, ctx } from '../core/view.js';
import { TAU } from '../core/math.js';
import { polyPath, starPath, circPath } from './shapes.js';

function drawEnemyShape(e){
  const r = e.r, rot = e.rot;
  switch(e.shape){
    case 'tri': polyPath(ctx,e.x,e.y,r,3,rot); break;
    case 'square': polyPath(ctx,e.x,e.y,r,4,rot+Math.PI/4); break;
    case 'circle': circPath(ctx,e.x,e.y,r); break;
    case 'pent': polyPath(ctx,e.x,e.y,r,5,rot); break;
    case 'hex': polyPath(ctx,e.x,e.y,r,6,rot); break;
    case 'diamond': polyPath(ctx,e.x,e.y,r,4,rot); break;
    case 'star': starPath(ctx,e.x,e.y,r,r*0.45,5,rot); break;
    default: polyPath(ctx,e.x,e.y,r,4,rot);
  }
}

/* each boss is a stack of rotating outlines; returns the path builders, outermost first */
function drawBossShape(b){
  const r = b.r, t = S.t;
  const paths = [];
  switch(b.bossKind){
    case 'tri':
      paths.push(()=>polyPath(ctx,b.x,b.y,r,3,t*0.4));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.58,3,-t*0.7+Math.PI));
      break;
    case 'square':
      paths.push(()=>polyPath(ctx,b.x,b.y,r,4,t*0.3+Math.PI/4));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.62,4,-t*0.5));
      break;
    case 'circle':
      paths.push(()=>circPath(ctx,b.x,b.y,r));
      paths.push(()=>circPath(ctx,b.x,b.y,r*0.66));
      paths.push(()=>{ctx.beginPath();ctx.arc(b.x,b.y,r*0.86,t*1.2,t*1.2+2.1);});
      paths.push(()=>{ctx.beginPath();ctx.arc(b.x,b.y,r*0.86,t*1.2+Math.PI,t*1.2+Math.PI+2.1);});
      break;
    case 'invpent':
      paths.push(()=>polyPath(ctx,b.x,b.y,r,5,Math.PI+t*0.25));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.6,5,-t*0.45));
      paths.push(()=>starPath(ctx,b.x,b.y,r*0.82,r*0.34,5,Math.PI-t*0.25));
      break;
    case 'hexagram':
      paths.push(()=>polyPath(ctx,b.x,b.y,r,3,t*0.5));
      paths.push(()=>polyPath(ctx,b.x,b.y,r,3,-t*0.5+Math.PI));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.5,6,t*0.2));
      break;
    case 'nested':
      for(let i=0;i<4;i++){
        const k=i, rr = r*(1-i*0.22);
        paths.push(()=>polyPath(ctx,b.x,b.y,rr,4,(k%2?1:-1)*t*(0.3+k*0.22)+Math.PI/4));
      }
      break;
    case 'nova':{
      const pl = 1+Math.sin(t*2.4)*0.07;
      paths.push(()=>starPath(ctx,b.x,b.y,r*pl,r*0.42,8,t*0.3));
      paths.push(()=>starPath(ctx,b.x,b.y,r*0.6,r*0.2,4,-t*0.6));
      paths.push(()=>circPath(ctx,b.x,b.y,r*0.3*pl));
      break;
    }
    default:
      paths.push(()=>polyPath(ctx,b.x,b.y,r,3,t*0.4));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.82,4,-t*0.35));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.64,5,t*0.5));
      paths.push(()=>polyPath(ctx,b.x,b.y,r*0.46,6,-t*0.65));
      paths.push(()=>circPath(ctx,b.x,b.y,r*0.26));
  }
  return paths;
}

export function drawEnemies(){
  const cull = Math.max(view.w,view.h)*0.75+80;
  ctx.lineJoin='round';
  for(const e of S.enemies){
    if(e.dead) continue;
    if(Math.abs(e.x-S.cam.x) > cull || Math.abs(e.y-S.cam.y) > cull) continue;
    /* the strongest visible status tints the shape */
    const col = e.flash>0 ? '#ffffff' : e.rootT>0 ? '#c08a4e' : e.fearT>0 ? '#b97be6'
              : e.shockT>0 ? '#9d92ff' : e.soakT>0 ? '#5aaaf0' : e.windT>0 ? '#8fe3a0'
              : e.slow>0 ? '#8fdcf0' : e.toxT>0 ? '#b7f050' : e.burnT>0 ? '#ff9b5c' : e.accent;

    if(e.boss){
      const paths = drawBossShape(e);
      ctx.save();
      /* a boss always announces itself: a slow sigil ring outside the silhouette */
      ctx.globalAlpha = 0.5; ctx.strokeStyle = e.accent; ctx.lineWidth = 1.2;
      ctx.setLineDash([10,16]); ctx.lineDashOffset = -S.t*26;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r*1.3 + Math.sin(S.t*2)*3, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.14; ctx.fillStyle = col;
      paths[0](); ctx.fill();
      ctx.globalAlpha = 0.28; ctx.strokeStyle = col; ctx.lineWidth = 7;
      paths[0](); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2.4;
      for(const pth of paths){ pth(); ctx.stroke(); }
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.globalAlpha = 0.22; ctx.strokeStyle = col; ctx.lineWidth = e.elite?6:4;
    drawEnemyShape(e); ctx.stroke();
    ctx.globalAlpha = e.flash>0 ? 1 : 0.1; ctx.fillStyle = col;
    drawEnemyShape(e); ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = e.elite?2.4:1.7;
    ctx.strokeStyle = col;
    drawEnemyShape(e); ctx.stroke();
    if(e.elite){ ctx.globalAlpha=0.7; ctx.lineWidth=1; polyPath(ctx,e.x,e.y,e.r*0.5,3,-e.rot); ctx.stroke(); }
    if(e.relic){   /* this one is carrying a relic — a gold sigil orbits it */
      ctx.globalAlpha=0.85; ctx.strokeStyle='#ffd166'; ctx.lineWidth=1.3;
      ctx.setLineDash([5,7]); ctx.lineDashOffset=-S.t*20;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r*1.6,0,TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#ffd166';
      starPath(ctx, e.x, e.y-e.r*2.1, 4, 1.7, 4, S.t*1.1); ctx.fill();
    }
    ctx.restore();
  }
}

export function drawEShots(){
  for(const s of S.eshots){
    ctx.save();
    ctx.globalAlpha=0.25; ctx.fillStyle=s.c;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.2,0,TAU); ctx.fill();
    ctx.globalAlpha=1; ctx.strokeStyle=s.c; ctx.lineWidth=1.8;
    polyPath(ctx,s.x,s.y,s.r,3,S.t*4); ctx.stroke();
    ctx.restore();
  }
}

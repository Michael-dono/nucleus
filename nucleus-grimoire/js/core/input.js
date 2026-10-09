/* Keyboard + touch/mouse drag stick. Produces one movement vector per frame (inputVec). */
import { S } from './state.js';
import { cvs } from './view.js';

let keys = {};
export const joy = {active:false, id:null, ox:0, oy:0, x:0, y:0};

/* drop held keys (used when a choice screen opens, so a held key cannot leak into it) */
export function clearKeys(){ keys = {}; }

export function inputVec(){
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup']) dy-=1;
  if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1;
  if(keys['d']||keys['arrowright']) dx+=1;
  if(joy.active){
    const jx = joy.x-joy.ox, jy = joy.y-joy.oy;
    const m = Math.hypot(jx,jy);
    if(m>6){ const s=Math.min(m,58)/58; dx += jx/m*s; dy += jy/m*s; }
  }
  const m = Math.hypot(dx,dy);
  if(m>1){dx/=m;dy/=m;}
  return {x:dx,y:dy};
}

/* onPause: called for Esc / P */
export function initInput(onPause){
  window.addEventListener('keydown', e=>{
    const k = e.key.toLowerCase();
    if(S.choiceOpen){            /* movement keys never reach a card, or the player */
      if(k!=='tab') e.preventDefault();
      return;
    }
    keys[k]=true;
    if(k==='escape'||k==='p') onPause();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });
  window.addEventListener('blur', ()=>{ keys={}; joy.active=false; });

  cvs.addEventListener('pointerdown', e=>{
    if(!S.running || S.paused) return;
    if(e.pointerType==='mouse' && e.button!==0) return;
    joy.active=true; joy.id=e.pointerId;
    const r = cvs.getBoundingClientRect();
    joy.ox = joy.x = e.clientX-r.left; joy.oy = joy.y = e.clientY-r.top;
    cvs.setPointerCapture(e.pointerId);
  });
  cvs.addEventListener('pointermove', e=>{
    if(!joy.active || e.pointerId!==joy.id) return;
    const r = cvs.getBoundingClientRect();
    joy.x = e.clientX-r.left; joy.y = e.clientY-r.top;
  });
  const endJoy = e=>{ if(e.pointerId===joy.id){ joy.active=false; joy.id=null; } };
  cvs.addEventListener('pointerup', endJoy);
  cvs.addEventListener('pointercancel', endJoy);
}

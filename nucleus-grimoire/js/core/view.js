/* The canvas and the size of the visible play area. Game logic reads view.w / view.h for
   "what is on screen" (targeting, spawn distance, rays reaching the screen edge). */

export const cvs = document.getElementById('game');
export const ctx = cvs.getContext('2d');
export const view = {w:0, h:0, dpr:1};

export function resize(){
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cvs.getBoundingClientRect();
  view.w = Math.max(320, r.width); view.h = Math.max(320, r.height);
  cvs.width = Math.round(view.w * view.dpr); cvs.height = Math.round(view.h * view.dpr);
}

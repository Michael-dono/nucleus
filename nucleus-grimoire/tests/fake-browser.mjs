// A minimal fake browser for running the game headlessly in Node (no dependencies).
// It provides document / window / canvas / localStorage / requestAnimationFrame, seeds Math.random,
// and folds every canvas call and DOM write into a running hash — so two builds of the game can be
// compared frame by frame (identical hash = identical drawing and identical DOM updates).
//
//   const fb = installFakeBrowser({seed: 1});
//   await import('../js/main.js');         // the game boots against the fake browser
//   fb.click('btnStart'); fb.step(); ...
//
export function installFakeBrowser({seed = 1, width = 1280, height = 720} = {}){
  /* ---- deterministic randomness ---- */
  let s = seed >>> 0;
  Math.random = () => {                     // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---- running hash of everything observable ---- */
  let h = 0x811c9dc5, ops = 0;
  const log = str => {
    ops++;
    for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= 10; h = Math.imul(h, 0x01000193);
  };
  const fmt = v => typeof v === 'number' ? String(v) : typeof v === 'string' ? v
    : v && v.__id ? v.__id : Array.isArray(v) ? '[' + v.map(fmt).join(',') + ']' : typeof v;

  /* ---- canvas 2D context: records calls, remembers state (save/restore) ---- */
  const DEFAULTS = {globalAlpha: 1, lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', font: '10px sans-serif',
    textAlign: 'start', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', lineDashOffset: 0};
  let cs = {...DEFAULTS}; const stack = [];
  let gradN = 0;
  const methods = {
    save(){ stack.push({...cs}); }, restore(){ if(stack.length) cs = stack.pop(); },
    createRadialGradient: () => ({__id: 'grad' + (++gradN), addColorStop: (o, c) => log(`stop ${o} ${c}`)}),
    createLinearGradient: () => ({__id: 'grad' + (++gradN), addColorStop: (o, c) => log(`stop ${o} ${c}`)}),
    measureText: t => ({width: String(t).length * 6})
  };
  const ctx = new Proxy({}, {
    get(_, k){
      if(k in cs) return cs[k];
      return (...args) => { log(String(k) + '(' + args.map(fmt).join(',') + ')'); return methods[k] ? methods[k](...args) : undefined; };
    },
    set(_, k, v){ cs[k] = v; log(String(k) + '=' + fmt(v)); return true; }
  });

  /* ---- DOM ---- */
  let elN = 0;
  class El {
    constructor(id){ this.__id = id || ('el' + (++elN)); this.children = []; this.listeners = {}; this.cls = new Set(); this.sub = {};
      const me = this;
      this.style = new Proxy({}, {set(t, k, v){ t[k] = v; log(`${me.__id}.style.${String(k)}=${v}`); return true; }});
      this.classList = {
        add: c => { me.cls.add(c); log(`${me.__id}+${c}`); },
        remove: c => { me.cls.delete(c); log(`${me.__id}-${c}`); },
        toggle: (c, f) => { const on = f === undefined ? !me.cls.has(c) : !!f; on ? me.cls.add(c) : me.cls.delete(c); log(`${me.__id}~${c}${on}`); return on; },
        contains: c => me.cls.has(c)
      };
    }
    set innerHTML(v){ this._html = v; this.children = []; log(`${this.__id}.html=${v}`); } get innerHTML(){ return this._html || ''; }
    set textContent(v){ this._text = String(v); log(`${this.__id}.text=${v}`); } get textContent(){ return this._text || ''; }
    set className(v){ this._cn = v; this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); log(`${this.__id}.class=${v}`); } get className(){ return this._cn || ''; }
    set title(v){ log(`${this.__id}.title=${v}`); }
    set width(v){ this._w = v; log(`${this.__id}.width=${v}`); } get width(){ return this._w || 0; }
    set height(v){ this._h = v; log(`${this.__id}.height=${v}`); } get height(){ return this._h || 0; }
    setAttribute(k, v){ log(`${this.__id}@${k}=${v}`); }
    appendChild(c){ this.children.push(c); log(`${this.__id}<${c.__id}`); return c; }
    addEventListener(t, fn){ (this.listeners[t] || (this.listeners[t] = [])).push(fn); }
    dispatch(t, ev = {}){ for(const fn of this.listeners[t] || []) fn(Object.assign({preventDefault(){}}, ev)); }
    querySelector(sel){ return this.sub[sel] || (this.sub[sel] = new El(this.__id + ' ' + sel)); }
    focus(){} setPointerCapture(){}
    getBoundingClientRect(){ return {width, height, left: 0, top: 0}; }
    getContext(){ return ctx; }
  }
  const byId = {};
  const win = new El('window');
  win.devicePixelRatio = 1;
  globalThis.window = win;
  globalThis.document = {getElementById: id => byId[id] || (byId[id] = new El(id)), createElement: () => new El()};
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => { store.set(k, String(v)); log(`ls ${k}=${v}`); }
  };
  let now = 0, rafCb = null;
  globalThis.performance = {now: () => now};
  globalThis.requestAnimationFrame = cb => { rafCb = cb; return 1; };
  globalThis.cancelAnimationFrame = () => {};

  /* ---- driver ---- */
  const FRAME = 1000/60;
  const fb = {
    el: id => globalThis.document.getElementById(id),
    get hash(){ return (h >>> 0).toString(16).padStart(8, '0'); },
    get ops(){ return ops; },
    get now(){ return now; },
    store,
    /* advance one animation frame */
    step(ms = FRAME){ now += ms; const cb = rafCb; if(cb) cb(now); },
    click(id){ fb.el(id).dispatch('click'); },
    key(type, key){ win.dispatch(type, {key}); },
    pointer(type, x, y, id = 1){ fb.el('game').dispatch(type, {pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y}); },
    choiceOpen: () => fb.el('scChoice').cls.has('on'),
    /* clickable cards/plates on the open choice screen */
    choices: () => fb.el('chCards').children.filter(c => (c.listeners.click || []).length)
  };
  return fb;
}

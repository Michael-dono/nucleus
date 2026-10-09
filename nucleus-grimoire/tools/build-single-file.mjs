// Builds dist/NucleusGrimoire.html: the whole game in ONE file (CSS and JS inlined),
// which opens with a double-click (no server) — for sending to friends or pasting as an artifact.
//
//   node tools/build-single-file.mjs
//
// No dependencies. It concatenates the ES modules in the exact order a browser would run them
// (dependencies first, depth-first from js/main.js) inside one function scope. For that to work the
// code keeps three rules, which this script checks:
//   1. imports are `import { a, b } from './x.js'` or `import './x.js'` — no `as`, no `* as`, no default;
//   2. exports are `export const|let|function ...` — no `export default`, no `export { }`;
//   3. every top-level name is unique across all modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'NucleusGrimoire.html');

const fail = msg => { console.error('build failed: ' + msg); process.exit(1); };
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');

/* ---- modules, in browser evaluation order ---- */
const IMPORT_RE = /^import\s+(?:\{([^}]*)\}\s+from\s+)?['"]([^'"]+)['"];?[ \t]*$/gm;
const order = [], seen = new Set();
function visit(file){
  if(seen.has(file)) return;
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  if(/^import\s+(\*|\w)/m.test(src)) fail(`${rel(file)}: only "import { ... } from" or bare imports are supported`);
  for(const m of src.matchAll(IMPORT_RE)){
    if(m[1] && /\bas\b/.test(m[1])) fail(`${rel(file)}: "import { x as y }" is not supported`);
    visit(path.resolve(path.dirname(file), m[2]));
  }
  if(/^export\s+(default|\{|\*)/m.test(src)) fail(`${rel(file)}: only "export const|let|function" is supported`);
  order.push({file, src});
}
visit(path.join(ROOT, 'js', 'main.js'));

/* ---- top-level names must not collide once everything shares one scope ---- */
function splitTop(s){                         // split "a = 1, b = f(x, y)" on depth-0 commas
  const parts = []; let depth = 0, cur = '', q = null;
  for(const ch of s){
    if(q){ cur += ch; if(ch === q) q = null; continue; }
    if(ch === '"' || ch === "'" || ch === '`'){ q = ch; cur += ch; continue; }
    if('([{'.includes(ch)) depth++;
    if(')]}'.includes(ch)) depth--;
    if(ch === ',' && depth === 0){ parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts;
}
const owner = new Map();
for(const {file, src} of order){
  const names = [];
  for(const m of src.matchAll(/^(?:export\s+)?function\s+([\w$]+)/gm)) names.push(m[1]);
  for(const m of src.matchAll(/^(?:export\s+)?(?:const|let|var)\s+([^\n]*)/gm)){
    for(const part of splitTop(m[1])){
      const id = part.trim().match(/^([\w$]+)/);
      if(id) names.push(id[1]);
    }
  }
  for(const n of names){
    if(owner.has(n) && owner.get(n) !== file) fail(`top-level name "${n}" is declared in both ${rel(owner.get(n))} and ${rel(file)}`);
    owner.set(n, file);
  }
}

/* ---- stitch ---- */
const js = order.map(({file, src}) =>
  `/* ==== ${rel(file)} ==== */\n` +
  src.replace(IMPORT_RE, '').replace(/^export\s+/gm, '').replace(/^\n+/, '')
).join('\n');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = [];
html = html.replace(/[ \t]*<link rel="stylesheet" href="(css\/[^"]+)">\r?\n/g, (_, href) => {
  css.push(`/* ==== ${href} ==== */\n` + fs.readFileSync(path.join(ROOT, href), 'utf8'));
  return '';
});
if(!css.length) fail('no local stylesheets found in index.html');
html = html.replace('</head>', `<style>\n${css.join('\n')}</style>\n</head>`);
const tag = '<script type="module" src="js/main.js"></script>';
if(!html.includes(tag)) fail(`index.html must load the game with ${tag}`);
html = html.replace(tag, () => `<script>\n(function(){\n"use strict";\n${js}\n})();\n</script>`);

fs.mkdirSync(OUT_DIR, {recursive: true});
fs.writeFileSync(OUT, html);
console.log(`wrote ${rel(OUT)} — ${order.length} modules, ${css.length} stylesheets, ${(html.length/1024).toFixed(0)} KB`);

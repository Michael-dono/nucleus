/* The wave cycle: each wave has its own enemy shape, colour and boss. After the 8th it repeats ("refracted"). */

export const WAVES = [
  {shape:'tri',    label:'SHARDS',     accent:'#ef476f', boss:'THE GREAT SHARD',      bossKind:'tri'},
  {shape:'square', label:'BULWARKS',   accent:'#f4a261', boss:'THE MONOLITH',         bossKind:'square'},
  {shape:'circle', label:'MOTES',      accent:'#9bd1e5', boss:'THE PALE ORB',         bossKind:'circle'},
  {shape:'pent',   label:'SENTINELS',  accent:'#c8a2ff', boss:'THE INVERTED SENTINEL',bossKind:'invpent'},
  {shape:'hex',    label:'COMBS',      accent:'#7ee081', boss:'HEXLOCK',              bossKind:'hexagram'},
  {shape:'diamond',label:'SLIVERS',    accent:'#ffd166', boss:'TESSERACT',            bossKind:'nested'},
  {shape:'star',   label:'SIGILS',     accent:'#ff8fab', boss:'NOVA SIGIL',           bossKind:'nova'},
  {shape:'mix',    label:'THE UNMADE', accent:'#dcdcdc', boss:'THE UNMADE',           bossKind:'unmade'}
];
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
export const roman = n => ROMAN[n-1] || String(n);
export const waveDef = w => WAVES[w % WAVES.length];

/* contact radius of each ordinary enemy shape */
export const SHAPE_R = {tri:13, square:12, circle:11, pent:12.5, hex:12.5, diamond:11.5, star:13, mix:12};

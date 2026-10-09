/* The single reference for what each element does. Every magic hits with its own element;
   Prism rays roll one at random. Bosses shrug off fear, root and disrupt, and take half the slow.
   The behaviour itself is in js/game/combat.js (applyElement) and js/game/enemies.js (timers). */

export const ELEMENTS = {
  fire:    {name:'Fire',     color:'#ff4d3d'},
  ice:     {name:'Ice',      color:'#8fe3ff'},
  light:   {name:'Light',    color:'#fff1a8'},
  dark:    {name:'Dark',     color:'#a35bd8'},
  earth:   {name:'Earth',    color:'#a0703c'},
  wind:    {name:'Wind',     color:'#79d98a'},
  water:   {name:'Water',    color:'#2f8fe0'},
  electric:{name:'Electric', color:'#7b6cff'}
};
export const EL_KEYS = Object.keys(ELEMENTS);
export const EL = {
  burnPct:0.10, burnDur:5,                  /* fire: 10% of the hit again, over 5s */
  slow:0.15,    slowDur:1.5,                /* ice: movement slowed */
  blindChance:0.5, blindDur:0.5,            /* light: contact may deal no damage */
  fearDur:1,                                /* dark: runs away from you */
  soak:0.20,    soakDur:2,                  /* water: +20% damage taken from every source */
  shockDur:3,   shockPct:0.15, shockR:70,   /* electric: explodes on death for 15% of its max health */
  windDur:1.2,                              /* wind: movement disrupted */
  rootDur:1.2                               /* earth: held in place */
};

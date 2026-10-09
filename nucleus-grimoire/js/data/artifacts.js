/* ============================ artifacts ============================
   Eight slots. NEW artifacts come only from relics (start, bosses, one elite per wave): choice of three.
   Ranks in artifacts you already hold can also turn up on ordinary level-ups.
   A relic bound to a magic you do not own (`req`) is never offered.

   What each general artifact does is applied in js/game/modifiers.js (computeMods);
   spell-bound artifacts are applied inside their spell's modify() in js/spells/<spell>.js.
   Order matters: it is the order of the HUD slots and of the relic roll. */

export const ARTIFACT_DEFS = {
  /* --- general --- */
  power:    {name:'Sigil of Wrath',    icon:'power',     max:8, trait:'Focused Power', txt:'<em>+12% damage</em> from every magic you own.'},
  vitality: {name:'Heartstone',        icon:'vitality',  max:8, trait:'Vitality',      txt:'<em>+9 max health</em>, and heal for the same amount now.'},
  magnitude:{name:'Widening Lens',     icon:'magnitude', max:6, trait:'Magnitude',     txt:'<em>+10% magic size</em> — radii, pools, gales, spheres.'},
  multicast:{name:'Split Prism',       icon:'multicast', max:3, trait:'Multicast',     txt:'<em>+1 to the count of every magic.</em> One more bolt, one more pool, one more cyclone.'},
  duration: {name:'Hourglass Shard',   icon:'duration',  max:5, trait:'Persistence',   txt:'<em>+15% duration</em> for everything your magic leaves on the field.'},
  haste:    {name:'Quicksilver Vial',  icon:'haste',     max:6, trait:'Haste',         txt:'<em>−8% cooldown</em> on every magic.'},
  swift:    {name:'Feathered Sole',    icon:'swift',     max:5, trait:'Swiftness',     txt:'<em>+8% movement speed</em>.'},
  attune:   {name:'Lodestone',         icon:'attune',    max:5, trait:'Attunement',    txt:'<em>+35% mana pickup range</em> and <em>+8% experience</em>.'},
  ward:     {name:'Obsidian Ward',     icon:'ward',      max:5, trait:'Warding',       txt:'<em>−8% damage taken</em>.'},
  regrowth: {name:'Verdant Root',      icon:'regrowth',  max:5, trait:'Regrowth',      txt:'<em>Regenerate 0.28 health per second.</em>'},
  execlens: {name:"Executioner's Lens",icon:'execlens',  max:4, trait:'Cruelty',       txt:'<em>+25% damage</em> to anything already below <em>30% health</em>.'},
  blood:    {name:'Bloodgroove',       icon:'blood',     max:4, trait:'Sanguine',      txt:'Every shape you break <em>restores 0.2 health</em>.'},

  /* --- bound to Fireball --- */
  emberglass:{name:'Emberglass',    icon:'fireball', req:'fireball', max:2, trait:'Fireball',
             txt:'<em>+1 fireball</em> per cast, and every detonation is <em>15% wider</em>.'},
  cinderheart:{name:'Cinder Heart', icon:'fireball', req:'fireball', max:3, trait:'Fireball',
             txt:'Fireball\'s <em>burn is 40% stronger</em>.'},

  /* --- bound to Ice Wave --- */
  rimelens:{name:'Rime Lens',       icon:'icewave', req:'icewave', max:3, trait:'Ice Wave',
             txt:'Ice Wave reaches <em>18% farther</em>, and every ice slow deepens by <em>5%</em>.'},
  shatterpoint:{name:'Shatterpoint',icon:'icewave', req:'icewave', max:3, trait:'Ice Wave',
             txt:'Anything <em>slowed</em> takes <em>+25% damage</em> from every source.'},

  /* --- bound to Ray of Light --- */
  refractor:{name:'Refractor',      icon:'lightray', req:'lightray', max:3, trait:'Ray of Light',
             txt:'<em>+1 ray</em> every time the light goes out.'},
  solarfocus:{name:'Solar Focus',   icon:'lightray', req:'lightray', max:3, trait:'Ray of Light',
             txt:'Rays are <em>30% wider</em> and hit for <em>+15%</em>.'},

  /* --- bound to Dark Orbs --- */
  impwarden:{name:'Orb Warden',     icon:'imps', req:'imps', max:3, trait:'Dark Orbs',
             txt:'<em>+1 orb</em> with every summoning.'},
  blacksigil:{name:'Black Sigil',   icon:'imps', req:'imps', max:3, trait:'Dark Orbs',
             txt:'Orbs last <em>1s longer</em> and <em>home 40% harder</em>.'}
};
export const ARTIFACT_KEYS = Object.keys(ARTIFACT_DEFS);

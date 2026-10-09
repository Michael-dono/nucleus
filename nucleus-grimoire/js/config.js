/* Global tuning dials. Spell numbers live in each spell file (js/spells/*.js);
   artifact numbers in js/data/artifacts.js; element effects in js/data/elements.js;
   the enemy/boss scaling formulas in js/game/difficulty.js. */

/* ---- difficulty dials ---- */
export const HP_GROWTH_PER_MIN = 3.5;   /* health multiplier per minute, before softening */
/* the two ramps alternate: odd bosses (1st, 3rd, 5th...) toughen the horde, even bosses thicken it */
export const HP_GROWTH_STEP    = 0.5;   /* added to the growth after every odd boss */
export const SPAWN_STEP        = 1.12;  /* spawn rate multiplied by this after every even boss */
export const HP_RAMP_SOFTEN    = 0.68;  /* 1 = raw exponential; below 1 bends the late curve down */
export const ENEMY_START_HP = 50; /* normal enemy health at 0:00; the growth curve multiplies this */
export const SPAWN_SCALE = 6;     /* multiplier on how fast the horde arrives */
export const ENEMY_CAP   = 900;   /* concurrent enemies; the first thing to lower if frames drop */

/* ---- run structure ---- */
export const WAVE_LEN = {normal:120, quick:45};   /* seconds until each wave's boss */
export const MAGIC_SLOTS = 4;                      /* magics carried at once */
export const ARTIFACT_SLOTS = 8;                   /* distinct artifacts carried at once */

/* ---- the conjurer ---- */
export const PLAYER = {
  hp: 120,          /* starting and max health */
  r: 12,            /* contact radius */
  speed: 168,       /* movement, px/s, before Swiftness */
  iframe: 0.55,     /* invulnerability after a hit, s */
  pickup: 135,      /* mana orb magnet radius, before Attunement */
  xpFirst: 11       /* XP needed for level 2 (later levels: see gainXp) */
};

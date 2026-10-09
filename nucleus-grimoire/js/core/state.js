/* The single source of truth for a run. Every system reads and writes this object;
   the UI only displays it. Arrays are cleared in place (length = 0) so references stay valid. */

export const S = {
  running:false, over:false, paused:false, quick:false,
  t:0, time:0, kills:0, wave:0, waveTime:0, waveLen:120,
  bossActive:false, boss:null, shake:0, hitFlash:0,
  cam:{x:0,y:0},
  player:null,
  spells:{},        /* key -> {lv, cd, t7, t15, cast} */
  passives:{},      /* artifact key -> rank */
  mods:null,        /* derived from artifacts by computeMods() */
  enemies:[], shots:[], eshots:[], orbs:[], zones:[], parts:[], nums:[],
  queue:[], choiceOpen:false, best:null, blasts:[]
};

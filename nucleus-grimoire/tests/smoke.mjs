// Headless smoke test — no browser, no dependencies:   node tests/smoke.mjs
// Boots the real game in a fake browser, plays the start choices, then runs every magic with every
// pair of its talents for 12 seconds (update + draw each frame), and checks nothing throws or goes NaN.
// Takes a minute or two.
import { installFakeBrowser } from './fake-browser.mjs';

const fb = installFakeBrowser({seed: 7});
await import('../js/main.js');
const { S } = await import('../js/core/state.js');
const { emit } = await import('../js/core/events.js');
const { computeMods } = await import('../js/game/modifiers.js');
const { SPELL_KEYS, baseAt, upgradesOf } = await import('../js/spells/index.js');

let failures = 0;
const check = (ok, msg) => { if(!ok){ failures++; console.log('  FAIL ' + msg); } };

/* level tables are finite */
for(const k of SPELL_KEYS) for(let L = 1; L <= 15; L++)
  for(const [stat, v] of Object.entries(baseAt(k, L))) check(Number.isFinite(v), `${k} Lv${L} ${stat} = ${v}`);

/* a normal start: title -> start magic -> starting relic -> playing */
fb.step(); fb.click('btnStart');
for(let i = 0; i < 2; i++){ for(let f = 0; f < 25; f++) fb.step(); fb.choices()[0].dispatch('click'); }
check(S.running && !S.choiceOpen && Object.keys(S.spells).length === 1, 'start choices lead into a running game');

for(const key of SPELL_KEYS){
  const ids = upgradesOf(key).map(u => u.id);
  for(const [a, b] of [[0,1],[0,2],[1,2]]){
    const label = `${key}: ${ids[a]} + ${ids[b]}`;
    try{
      fb.click('btnStart');                                   // fresh run
      for(let f = 0; f < 25; f++) fb.step();
      fb.choices()[0].dispatch('click');                      // start magic
      for(let f = 0; f < 25; f++) fb.step();
      fb.choices()[0].dispatch('click');                      // relic
      S.spells = {[key]: {lv:15, cd:0, t7:ids[a], t15:ids[b], cast:0}};
      S.passives = {multicast:1, magnitude:2};
      S.player.maxHp = S.player.hp = 1e9;
      computeMods(); emit('spells:changed'); emit('artifacts:changed');
      const kills0 = S.kills;
      for(let f = 0; f < 60*12; f++){
        if(fb.choiceOpen() && f % 25 === 0 && fb.choices().length) fb.choices()[0].dispatch('click');
        fb.step();
      }
      const p = S.player;
      check(Number.isFinite(p.x) && Number.isFinite(p.y), `${label}: player position finite`);
      check(S.enemies.every(e => Number.isFinite(e.x) && Number.isFinite(e.hp)), `${label}: enemies finite`);
      check(S.kills > kills0, `${label}: killed something (${S.kills - kills0})`);
      console.log(`  ok  ${label.padEnd(42)} kills ${S.kills - kills0}`);
    }catch(err){
      failures++;
      console.log(`  FAIL ${label}: ${err && err.stack || err}`);
    }
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nall smoke checks passed');
process.exit(failures ? 1 : 0);

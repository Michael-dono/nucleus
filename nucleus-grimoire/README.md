# Nucleus Grimoire

A minimalist survivors-style roguelike for the browser, in the spirit of Magic Survival and Vampire Survivors.
You are an atomic nucleus on an endless plane. Your magics fire automatically, and you choose how they grow.
The geometric horde never stops.

- **Eight elemental magics:** Fireball, Ray of Light, Ice Wave, Dark Orbs, Wind Blade, Electric Chain, Earth Splitter and Tsunami.
  You carry up to 4. Each levels to 15 and has 3 talents: you choose one at level 7 and another at level 15.
- **Elements:** every hit applies its element's status (burn, slow, blind, fear, soak, shock, disrupt or root).
- **Artifacts:** up to 8. A choice of three drops at the start, from each boss, and from the first elite of each wave.
- **Waves:** a boss arrives every 2:00 (0:45 in Quick Test). Enemy health rises with the clock, and the number of
  enemies rises with every boss you defeat.

Plain HTML, CSS and JavaScript (ES modules) drawn on a `<canvas>`. No frameworks, no build step and no npm packages.

---

## Running it locally

Browsers will not load ES modules from a `file://` page, so **double-clicking `index.html` shows a black screen**.
Serve the folder with any static server instead:

| You have | Run in the project folder | Then open |
|---|---|---|
| VS Code | install the **Live Server** extension, then right-click `index.html` and choose **Open with Live Server** | (opens itself) |
| Python | `python -m http.server 8000` | http://localhost:8000 |
| Node.js | `npx serve .` | the URL it prints |

**A single file for friends** (opens with a double-click, no server needed):

```
node tools/build-single-file.mjs      ->  dist/NucleusGrimoire.html
```

That file is also what you paste or publish when you share the game as one page (for example, a claude.ai artifact).

## Controls

| Action | Keyboard | Touch / mouse |
|---|---|---|
| Move | WASD or arrow keys | drag anywhere (virtual stick) |
| Pause / resume | Esc or P | — |
| Pick a card | click | tap |

Nothing on a choice screen can be picked in its first 300 ms. That way, a key you were holding cannot choose a card by accident.

## Tests

```
node tests/smoke.mjs
```

This runs the real game headlessly in a fake browser (`tests/fake-browser.mjs`): the start flow, then every magic with every
pair of its talents. It fails on exceptions, `NaN`, or a magic that kills nothing. Run it after every change.

The fake browser seeds `Math.random` and hashes every canvas call and DOM write. Two builds that produce the same
hashes behave and draw identically. The modular code was verified against the original single-file game this way.

---

## Architecture

```
index.html                 page markup only (HUD, start / choice / pause / game-over screens), loads css/ and js/main.js
css/
  base.css                 design tokens (colours, fonts), page shell, canvas
  hud.css                  top rail (wave, HP, XP, boss bar) and bottom tray (magic pips, artifact slots)
  screens.css              overlays, cards, buttons, toggles, stat grid, loadout chips
  relics.css               the relic (artifact) choice screen
js/
  main.js                  entry point: wires input, UI and loop; boots to the title screen
  config.js                global tuning dials: difficulty, wave length, slots, player base stats
  core/
    state.js               S, the single source of truth for a run (player, enemies, shots, zones...)
    loop.js                requestAnimationFrame loop: update -> HUD -> draw, with dt capped at 1/25 s
    view.js                canvas, 2D context, visible-area size (view.w / view.h)
    input.js               keyboard + drag stick -> movement vector
    grid.js                spatial hash of enemies, for fast nearby queries
    events.js              tiny event bus (game -> UI notifications)
    math.js                TAU, rnd, clamp, lerp, dist2, fanAngle, hexA
  data/
    elements.js            ELEMENTS + EL: what each element does (the reference table)
    artifacts.js           every artifact: name, max rank, text, which magic it is bound to
    waves.js               the 8-wave cycle (enemy shape, colour, boss) and enemy radii
  game/                    the simulation, with no DOM access
    game.js                newGame, update(dt) (the whole frame, in order), game over
    player.js              the conjurer: creation, movement, taking damage
    spawning.js            wave clock, enemy stream, elites, bosses
    difficulty.js          enemy health / speed / damage / XP and spawn-rate formulas
    enemies.js             enemy AI, status timers, contact damage, boss attacks, boss projectiles
    combat.js              dealDamage (all damage), applyElement, kills and rewards, area / beam hits, electric blasts
    targeting.js           nearest enemy, clusters, on-screen checks, rays to the screen edge
    abilities.js           casting on cooldown; stepping every shot and zone through the spell registry
    pickups.js             mana orbs (XP) and levelling
    progression.js         the choice queue, what level-ups and relics offer, applying a pick
    modifiers.js           artifacts -> S.mods (damage, area, cooldown...)
    effects.js             particles, rings, electric arcs, floating numbers (visual only)
  spells/
    index.js               the registry: SPELL_LIST, stats(), baseAt(), describe(), talent lookup
    shared.js              shared building blocks: damage pools, expanding rings, things falling from the sky
    fireball.js ... tsunami.js   one file per magic: numbers, talents, cast, its shots / zones and how they draw
  render/                  reads state, draws, never changes the game
    renderer.js            one frame, back to front: ground, zones, orbs, enemies, player, shots, effects, vignette, minimap
    world.js               zones / shots (drawn by their registered type), mana orbs, particles, numbers
    enemies.js             enemy and boss shapes, boss projectiles
    player.js              the nucleus and its orbiting element spheres
    minimap.js             the field map with the boss marker
    shapes.js              polygon / star / circle paths
  ui/                      DOM only, no game rules
    hud.js                 pips, slots, bars and readouts; loadout chips
    choices.js             start-magic / level-up / talent cards and relic plates
    screens.js             title, pause and game-over screens and their buttons
    icons.js               SVG glyphs
    dom.js                 el(id)
  storage/
    save.js                localStorage: the best run
tools/
  build-single-file.mjs    bundles everything into dist/NucleusGrimoire.html
tests/
  fake-browser.mjs         headless DOM / canvas / storage stand-ins, seeded randomness, call hashing
  smoke.mjs                the smoke test
```

### How it fits together

```
main.js ── boots ──> core/loop.js ── each frame ──> game/game.js update(dt)   (only while playing)
                                                └─> ui/hud.js updateHUD(dt)
                                                └─> render/renderer.js draw()

update(dt):  player -> camera -> grid -> spell passives -> spawning -> casting -> enemies
             -> shots -> boss shots -> zones -> electric blasts -> mana orbs -> effects -> cleanup -> death check
```

- **State.** Everything about a run lives in `S` (`core/state.js`). Systems read and write it. The renderer and the UI only read it.
- **Game to UI.** The simulation never touches the DOM. It emits `spells:changed`, `artifacts:changed`, `choice:open` and `run:over`
  (`core/events.js`), and the UI modules redraw.
- **UI to game.** Buttons and cards call game functions directly (`newGame`, `applyOption`, `chooseTalent`...).
- **States.** title (`!S.running`) -> playing -> choice (`S.choiceOpen`, which pauses) -> playing ... -> game over (`S.over`).
  The pause screen sets `S.paused`. The loop simulates only when `S.running && !S.paused && !S.over`.
- **Frame-rate independence.** All movement, timers and cooldowns are multiplied by `dt`, which is capped at 1/25 s.
- **Damage.** Every hit, whether from a spell, burn, poison, pool or blast, goes through `dealDamage(enemy, amount, {color, el, big})`.
  That function applies Shatterpoint, soak and Executioner's Lens, spawns the damage number, handles the kill, and applies the element.
- **Spatial grid.** `gridQuery` returns a shared array that the next query overwrites. Copy or `.filter()` it before
  calling anything that may query again (`hitArea` shows the pattern).

### The spell plugin format

A magic is one object exported from `js/spells/<name>.js`:

```js
export const fireball = {
  key, name, el, color, kind, blurb,          // identity and card text
  base:   {cd, dmg, count, radius, ...},      // level-1 numbers
  levels: [{at:[2,6,10], stat:'count', add:1}, {at:[3,7,11], stat:'dmg', mul:1.3}, ...],
  t7:     [talentA, talentB], evolve: talentC, // three talents: pick one at Lv 7, one more at Lv 15
  icon, orbit, core,                           // SVG glyph, orbiting sphere, core palette
  modify(o, has, M){ ... },                    // talents and bound artifacts change the numbers
  cast(st){ ... },                             // fire it; may return extra cooldown
  shots: { typeName: {step(s,dt), expire?(s), draw(s)} },   // things it puts in S.shots
  zones: { typeName: {step(z,dt,p), draw(z), layer} },      // things it puts in S.zones ('under' | 'over')
  falls: { kind: draw },                       // looks for skyFall(kind, ...)
  update?(dt, st), drawUnder?(sp), afterZones?()   // optional per-frame hooks
};
```

`stats(key)` builds the live numbers in this order: `base` -> `levels` up to the current level (multipliers compound)
-> general artifacts (count, area) -> `modify` -> cooldown and damage multipliers.

---

## Extending the game

### Add a new magic

1. Copy `js/spells/earth.js` (short and self-contained) to `js/spells/poison.js` and rename the export to `poison`.
2. Edit `key`, `name`, `el` (one of `data/elements.js`), `color`, `base`, `levels`, `t7`, `evolve`, `icon`, `orbit` (give it the next `layer`) and `core`.
3. Write `cast(st)`. Push shots or zones with a **new type name**, then define that type's `step` and `draw` under `shots` / `zones`.
   Reuse the helpers: `hitArea`, `dealDamage`, `nearestEnemy`, `nearestN`, `fallTargets`, `dotZone`, `surge`, `skyFall`.
4. In `js/spells/index.js`, import it and add it to `SPELL_LIST`.

Nothing else changes. The start screen, level-up cards, HUD, orbit, loadout and tests all pick it up from the registry.

### Add a new artifact

1. Add an entry to `js/data/artifacts.js`: `{name, icon, max, trait, txt}`. Add `req: 'spellkey'` to bind it to a magic.
2. Make it do something:
   - **General effect:** add a field to `S.mods` in `js/game/modifiers.js` and read it where it applies,
     for example `S.mods.dmg` in `stats()` or `S.mods.dr` in `hurtPlayer`.
   - **Bound to a magic:** read `A('yourkey')` inside that spell's `modify()`.
3. For a new icon, add an SVG body to `ARTIFACT_ICONS` in `js/ui/icons.js`.

### Add a new enemy type

Enemies are one data shape with behaviour from `game/enemies.js`.

- **New look for a wave:** add a shape to `SHAPE_R` (`data/waves.js`) and a case to `drawEnemyShape`
  (`render/enemies.js`), then use it as a wave's `shape`.
- **New behaviour:** give the enemy a field in `spawnEnemy` (`game/spawning.js`), for example `ranged: true`, and branch on it in
  `updateEnemies`, the way `e.boss` branches to `bossBehave`.

### Add a new boss

Add or change a wave in `data/waves.js` (`boss` name and `bossKind`), then add a `case` for that `bossKind` in
`drawBossShape` (`render/enemies.js`). Boss health is `bossHp()` in `game/difficulty.js`. Its attacks are in `bossBehave`
(`game/enemies.js`).

### Add a new element or status

Add it to `ELEMENTS` and `EL` (`data/elements.js`) and add a `case` in `applyElement` (`game/combat.js`). If it lasts, add
its timer in `updateEnemies` (`game/enemies.js`) and, optionally, a tint in `drawEnemies` (`render/enemies.js`).

### Change difficulty

All the dials are in `js/config.js`: start health, health growth per minute and per boss, spawn steps, enemy cap,
wave length, and player base stats. The formulas that use them are in `js/game/difficulty.js`.

---

## Save data

Only the best run is stored. It goes in `localStorage` under the key `nucgrim.best` as `{time, kills, wave, level}`.
All access goes through `js/storage/save.js`, and failures (private mode, blocked storage) are silently ignored.
Saves are per browser and per site. Players on your deployed site and players opening the single-file build each keep their own.

## Deploying

The game is a static site with no build step. Any static host serves the project folder as it is.

- **Vercel:** import the GitHub repository, set Framework Preset to **Other**, and leave Build Command and Output Directory empty.
- **GitHub Pages:** go to Settings, then Pages, choose Deploy from a branch, and select `main` / root.
- **Anywhere else:** upload the folder, or upload `dist/NucleusGrimoire.html` alone.

The game uses only Google Fonts (loaded by `index.html`). It has no API keys, secrets or server code.

## Ground rules for the code

- Simulation code (`game/`, `spells/` logic) never touches the DOM. Rendering never changes game state.
- Keep imports of the form `import { a } from './x.js'` and exports `export const|function`. Keep every top-level name unique
  across files. The single-file build depends on all three, and it checks them.
- Gameplay randomness uses `Math.random`. That keeps the headless tests deterministic.

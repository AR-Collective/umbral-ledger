# Umbral Ledger (vertical slice)

A 2D stealth game where you are a shadow, light is the enemy, and the kind voice guiding you may be lying.
Themes: **Shadow · Time · Fire**. Built with **Phaser 3.90**.

This repository is the **vertical slice**: the Prologue (the Hourglass Hall) and World 1 (Hollowmere), playable from the title screen to the end of the world. The full design is in [`docs/umbral-ledger-game-design.md`](docs/umbral-ledger-game-design.md).

---

## Run it

You need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Editing any file reloads the game instantly.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Builds a static site into `dist/` (upload to GitHub Pages or itch.io) |
| `npm run build:single` | Builds ONE self-contained `dist-single/index.html` you can send to anyone |
| `npm run preview` | Serves the `dist/` build locally to check it |
| `npm test` | Runs the unit tests (lighting agreement, branch odds, save state) |

---

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | A / D or arrows | Left stick or d-pad |
| Jump (tap for a short hop) | Space, W or Up | A |
| Merge (hide in shade) | Hold S or Down | Stick down |
| Strike (from behind or above) | J | X |
| Shade Step (dash) | K | B |
| Foresight (stops time) | Hold F | LT |
| Interact | E | Y |
| Survivors wait / follow | Q | RB |
| Pause and Ledger | Esc (Tab opens the Ledger directly) | Start |
| Mute / full HUD | M / H | |
| **Dev menu** | **` (backtick)** | |

---

## Dev mode (press the ` key)

A panel opens on the right. It is plain HTML on top of the game, so it is easy to extend.

- **Jump to checkpoint:** every Stillpoint plus named spots (the first Lanternman, the fork, the rooftops, the cellars, the chapel, the bell, the mill wheel, the dawn chase). You arrive with full Sand and Threads.
- **Switches:** god mode, invisible to watchers, infinite Sand, infinite Threads, noclip (fly with the arrows), skip cutscenes, and "on page reload, resume at last jump" so every code edit drops you straight back where you were testing.
- **Debug views:** a light grid that shows what the game *computes* (shade, dim, light, fire) on top of what it *draws*; all vision cones, meters and noise rings; physics boxes.
- **Force branch outcomes:** pick the bell's result (favorable, mixed, unfavorable) or which road the fork's patrol walks.
- **Live tuning sliders:** time scale, light resistance step, grace in light, burn rate, darkness, detection speed, vision range, Lanternman speeds, fog, run speed, dawn length, Wick-Mother speed.
- **Copy tuning:** copies the current numbers so you can paste the ones you like into `src/tuning.js`.

Turn dev mode off for the judging build by setting `dev: { enabled: false }` at the bottom of `src/tuning.js`.

---

## Where to change things

The code is split so that **looks, numbers, words and levels can each change without touching the engine code.** That was the point of building the vertical slice first.

| You want to change | Edit this | Notes |
|---|---|---|
| Any gameplay number (light damage, enemy speed, jump height) | `src/tuning.js` | Every number has a comment. Nothing else hardcodes them. |
| Any text (dialogue, hints, branch text, Ledger lines, cutscenes) | `src/story.js` | Trust and suspicion beats are tagged in comments. |
| A level's layout, lights, enemies, triggers | `src/levels/prologue.js`, `src/levels/hollowmere.js` | Written in the small vocabulary from `src/levels/builder.js` (`solid`, `ledge`, `pillar`, `lamppost`, `watcher`, `stillpoint`, `trigger`...). |
| How something looks | `src/textures.js` | All art is painted in code. To use a real PNG, load it in `BootScene` under the same key. |
| Sounds | `src/systems/audio.js` | All sound is synthesized with the Web Audio API. |
| Cutscene pictures | `src/scenes/CutsceneScene.js` (painters) and `src/story.js` (text) | |

### Project layout

```
src/
  main.js              creates the game and the dev panel
  tuning.js            every gameplay number
  story.js             every line of text
  textures.js          every image (painted in code)
  systems/
    lighting.js        THE light system: one source of truth for drawing and gameplay
    state.js           the save: Threads, Sand, flags, branch rolls, Ledger
    branches.js        odds, bands, seeded rolls, bad-luck protection
    rng.js             seeded random numbers
    foresight.js       the time-stop ghost replay
    audio.js           synthesized sound and adaptive music layers
    input.js           keyboard and gamepad mapped to actions
    bus.js             messages from the world to the HUD
  entities/
    Player.js          movement, Merge, dash, strike, light damage, the shadow's look
    Watcher.js         Lanternmen, guardians, acolyte: movement rules + senses
    Survivor.js        Maren and Edrin
    WickMother.js      the dawn chase
  levels/
    builder.js         the level vocabulary
    prologue.js        the Hourglass Hall
    hollowmere.js      World 1
    index.js           list of levels
  scenes/              Boot, Title, Cutscene, Game, HUD, End
  dev/                 the dev panel and its saved switches
tests/                 unit tests (node --test)
docs/                  the game design document
```

---

## The important decisions, explained

**1. One light system, two readers.** The design's first rule is "if it looks dark, it is dark." So `lighting.js` holds one description of the light (lights, things that block light, and darker zones) and two functions read it: `render()` draws the screen and `getLightAt(x, y)` tells the damage and the enemies how lit a point is. They share the same positions, flicker, falloff curve and blending maths. `tests/lighting.test.js` checks thousands of random points to prove the drawn shadows and the computed shadows agree.

**2. Cover is total shade.** In a side view, standing "in front of" a pillar, statue, crate or cart means you are tucked behind it. So the inside of cover is fully dark for both the renderer and the AI. That makes hiding readable: if you are inside cover and merged, you are safe, and you can see it.

**3. Enemies are readable but lethal.** You asked for enemies that feel threatening from the start. In light they spot you in about half a second up close, they run faster than you, and one grab kills. In return every rule is visible: a vision cone near you (with an inner band for "too close even in shade"), a meter over their heads, a short "?" pause before every "!", and a different sound for each state. Watchers cannot climb, so going up is always an escape.

**4. Light starts almost lethal.** At the start, full light kills in about 2.5 seconds and even dim light stings. A 0.3 second grace and a ramp stop instant deaths from brushing an edge. Each world you finish moves one step down the resistance table in `tuning.js` (the story reason is in the design doc, section 3.4).

**5. Foresight shows the honest future.** Enemy movement is a plain function (`stepWatcherState`). Foresight copies each enemy's state and runs the same function forward, so the ghosts are exactly what the enemies will do unless you disturb them.

**6. Branches cannot be save-scummed.** Each run has a seed stored in the save. Every branch rolls from its own seeded stream and is saved the moment it rolls, so dying and reloading a Stillpoint never re-rolls. Only Reweave (once per world, costs a Thread) can.

**7. Dying restores the world to the last Stillpoint.** The scene simply rebuilds from the level file with the flags saved at the Stillpoint. Rebuilding is simple and cannot leave half-reset enemies behind. Branch outcomes and Threads are not restored, on purpose.

**8. Phaser 3 instead of Phaser 4.** Phaser 3.90 has years of tutorials, examples and answers online, and a stable API. The game runs in any browser, so a judge can play from a link.

---

## Adding World 2

1. Copy `src/levels/hollowmere.js` to a new file and change the `id`, `name`, layout, `stillpoints` and `spawns`.
2. Add it to `src/levels/index.js`.
3. Put its text in `src/story.js` and any new numbers in `src/tuning.js`.
4. Send the player there from the end of Hollowmere (`reachGate` in `hollowmere.js`).

It appears in the dev panel's jump list automatically.

---

## Known gaps in the slice

Cling and later abilities, the hub between worlds, Craving and Paranoia, Remnants and the Skill Altar, Keystones (Hollowmere is not a Breakpoint world), and key remapping are not in this slice. Gamepad support is written but was only tested with the keyboard.

## Credits

All art and sound are generated by code in this repository. Fonts: Cinzel, Cormorant Garamond and Inter from Google Fonts (SIL Open Font License); the game falls back to system fonts offline.

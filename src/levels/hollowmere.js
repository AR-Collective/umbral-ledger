// =====================================================================
// WORLD 1: HOLLOWMERE  (Evade & Escort)
//
// Unique rule: the fog hides you, but dawn is coming. At dawn the fog burns
// off and the sun rises, and you must run inside its long shadows.
//
// Layout (left to right):
//   1. The Outskirts      first Stillpoint, a lamp, the first Lanternman, swinging lamps
//   2. The Fork           a diamond: rooftops (high road) or cellars (low road),
//                         rejoining at the square. A LIGHT branch (random) decides
//                         which road the extra Lanternman walks.
//   3. The Square         midway Stillpoint, find Maren and Edrin, escort them,
//                         and the HEAVY branch: ring the bell or not.
//   4. The Mill Road      watched road whose guards depend on the bell's outcome,
//                         and a windmill whose sails throw turning shadows.
//   5. Dawn               Stillpoint before the climax, then the chase: the
//                         Wick-Mother behind you, the sun rising ahead.
// =====================================================================

import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { TUNING } from '../tuning.js';
import { DEV } from '../dev/devFlags.js';
import { rollLight } from '../systems/branches.js';
import { LINES } from '../story.js';

const G = 760;          // street level
const CELLAR = 960;     // cellar floor
const WIDTH = 11200;
const GATE_X = 10920;
const MILL = { x: 6470, hubY: G - 278 };

// The Heavy branch at the bell. Odds and modifiers are the rules; story.js has the words.
const BELL = {
  id: 'hollowmere.bell',
  base: { favorable: 50, mixed: 35, unfavorable: 15 },
  options: [{ id: 'ring', rolled: true }, { id: 'silent', rolled: false }],
  modifiers: [
    { id: 'unseen', shift: 10, check: () => !GAME.flag('seenSinceSquare') },
    {
      id: 'hidden', shift: 15,
      check: (s) => s.survivors.length > 0 && s.survivors.every((v) => v.state === 'wait' && v.light.state === 'shade'),
    },
  ],
  apply(scene, choice, outcome) {
    scene.level.bellMarker?.setVisible(false);
    if (choice === 'silent') { GAME.addLedger('bell_silent'); return; }
    AUDIO.play('bell', scene.spatialFor(5440));
    scene.say('entity', LINES.h_bell_hide.text);
    if (scene.settings.shake) scene.cameras.main.shake(500, 0.004);
    GAME.addLedger(`bell_${outcome}`);
    drawMillWatchers(scene, outcome, false);
    if (outcome === 'unfavorable') {
      scene.time.delayedCall(2200, () => {
        AUDIO.play('roar', { pan: 1, vol: 0.5 });
        scene.playLines(['h_wick_early']);
      });
    }
  },
};

// Which mill-road watchers walk to the bell for each outcome.
const DRAWN = { favorable: ['lm_m1', 'lm_m2'], mixed: ['lm_m1'], unfavorable: [], none: [] };
const DRAW_SPOTS = { lm_m1: 4960, lm_m2: 5080 };

function drawMillWatchers(scene, outcome, instant) {
  for (const id of DRAWN[outcome] ?? []) {
    const w = scene.watchers.find((v) => v.id === id);
    if (!w) continue;
    if (instant) { w.s.x = DRAW_SPOTS[id]; }
    w.drawTo(DRAW_SPOTS[id], -1);
    w.s.minX = Math.min(w.s.minX, 4800);
  }
}

// Cover props. Each casts light and shadow with an outline traced from its
// painting (relative to the bottom-centre), so a dome makes a dome-shaped
// shadow, not a box. The occlude box is where it hides you, as before.
const SHAPE = {
  haystack: [-71, 0, -66, -46, -48, -76, -24, -90, 3, -94, 32, -88, 56, -68, 68, -42, 71, 0],
  // the bed and sacks above, the wheels below: you crouch between them
  cart: [-78, -62, -62, -82, -36, -86, 4, -80, 54, -62, 54, -38, 46, -14, 22, -4, -44, -4, -68, -26],
  barrel: [-10, 0, -18, -10, -20, -28, -18, -46, -10, -55, 10, -55, 18, -46, 20, -28, 18, -10, 10, 0],
};
function haystack(b, x) { b.prop('haystack', x, G, { occlude: [-62, -78, 124, 78], shape: SHAPE.haystack }); }
// A cart counts as cover down to the ground (you crouch between its wheels).
function cart(b, x, flip = false) { b.prop('cart', x, G, { occlude: flip ? [-54, -66, 124, 66] : [-70, -66, 124, 66], shape: SHAPE.cart, flip }); }
function barrel(b, x, y = G) { b.prop('barrel', x, y, { occlude: [-18, -52, 36, 52], shape: SHAPE.barrel }); }
function crate(b, x, y = G, solid = false) { b.prop('crate', x, y, { occlude: [-26, -54, 52, 54], solid }); }
function tree(b, x, o = {}) { b.decor('tree_big', x, G + 8, { depth: 11, scale: o.scale ?? 1, flip: o.flip, tint: o.tint ?? 0xc8c8dc }); }

// a chimney on a flat roof: a light blocker you can hide behind
function chimney(b, x, roofY) { b.stack(x, roofY, 34, 60, { depth: 13 }); }

// Chase obstacles. Everything else on the dawn road is cover you run through;
// these are in your way, so they share one look: drawn in front of the cover
// props, with a pulsing ember outline above the light layer that stays
// readable in the deepest shadow. Solid ones stay under the survivors' hop.
const OBSTACLE = {
  barricade: { solid: [-56, -52, 112, 52], shape: [-62, 0, -48, -54, 48, -54, 62, 0] },   // a hop
  wagon: { solid: [-78, -74, 156, 74] },              // a full jump
  thatch: { solid: null },                            // not solid, but it burns
};
function obstacle(b, kind, x) {
  const s = b.s;
  const key = `obs_${kind}`;
  const img = s.add.image(x, G, key).setOrigin(0.5, 1).setDepth(23);
  const rim = s.add.image(x, G + 3, `${key}_rim`).setOrigin(0.5, 1).setDepth(44).setBlendMode('ADD').setAlpha(0.75);
  const pulse = s.tweens.add({ targets: rim, alpha: 0.35, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const ob = { kind, x, img, rim, pulse, halfW: img.width / 2 };
  const box = OBSTACLE[kind].solid;
  if (box) {
    const shape = OBSTACLE[kind].shape;
    ob.zone = b.solid(x + box[0], G + box[1], box[2], box[3], { visible: false, occlude: !shape });
    if (shape) s.lighting.addPolyOccluder(shape.map((v, i) => (i % 2 ? G + v : x + v)), 'obstacle');
    ob.rect = s.solidRects[s.solidRects.length - 1];
    b.edge(x + box[0], G + box[1], box[2]);
  } else {
    // the burn core is a little narrower than a running jump, so a clean jump never burns you
    b.candle(x, G - 4, { stick: false, radius: 110, intensity: 0.95, flameScale: 1.3, flare: 0.6 });
    for (const dx of [-38, 36]) {
      const f = s.add.image(x + dx, G - 14, 'flame').setOrigin(0.5, 0.9).setDepth(42).setBlendMode('ADD').setScale(0.8);
      s.tweens.add({ targets: f, scaleY: 1.0, scaleX: 0.7, duration: 110 + Math.abs(dx) * 2, yoyo: true, repeat: -1 });
    }
    s.add.particles(x, G - 20, 'spark', {
      x: { min: -54, max: 54 }, lifespan: { min: 700, max: 1400 }, speedY: { min: -120, max: -40 }, speedX: { min: -20, max: 30 },
      scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xfff0c0, 0xffb050, 0xff6a20], blendMode: 'ADD', frequency: 40,
    }).setDepth(42);
  }
  return ob;
}

// The Wick-Mother does not go around debris: she goes through it.
function smash(scene, ob) {
  ob.smashed = true;
  ob.zone.body.enable = false;
  const i = scene.solidRects.indexOf(ob.rect);
  if (i >= 0) scene.solidRects.splice(i, 1);
  ob.pulse.stop();
  scene.tweens.add({ targets: ob.rim, alpha: 0, duration: 200 });
  scene.tweens.add({ targets: ob.img, alpha: 0, y: G + 30, angle: 18, duration: 500, ease: 'Quad.easeIn' });
  scene.add.particles(ob.x, G - 30, 'smoke', {
    lifespan: 900, speed: { min: 40, max: 160 }, angle: { min: 200, max: 340 }, scale: { start: 0.5, end: 1.4 },
    alpha: { start: 0.55, end: 0 }, tint: 0x2a1e16, emitting: false,
  }).setDepth(43).explode(18);
  scene.add.particles(ob.x, G - 30, 'ember', {
    lifespan: { min: 500, max: 1100 }, speed: { min: 120, max: 320 }, angle: { min: 210, max: 330 }, gravityY: 700,
    scale: { start: 1.1, end: 0.2 }, tint: [0xc99a62, 0x5a4a36], emitting: false,
  }).setDepth(43).explode(16);
  AUDIO.play('landHard', scene.spatialFor(ob.x));
  if (scene.settings.shake) scene.cameras.main.shake(180, 0.004);
}

// small linear helpers for the dawn grade
const lerp = (a, b, k) => a + (b - a) * k;
function lerpTint(a, b, k) {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, k));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k));
  const bl = Math.round(lerp(a & 255, b & 255, k));
  return (r << 16) | (g << 8) | bl;
}

export default {
  id: 'hollowmere',
  name: 'Hollowmere',
  width: WIDTH,
  height: 1080,
  sky: 'night',
  ambience: 'night',
  fog: true,
  start: 'h1',
  horizonY: G,
  grade: { shadow: [0.78, 0.86, 1.2], high: [1.14, 1.0, 0.84], vig: 0.55 },

  // Checkpoints: guaranteed at the start, midway and before the climax, plus
  // one hidden on the low road as an exploration reward (design doc 4.8).
  stillpoints: [
    { id: 'h1', name: 'The Mile-Stone', x: 170, y: G },
    { id: 'hroot', name: 'The Root Cellar', x: 3390, y: CELLAR, hidden: true },
    { id: 'h2', name: 'The Well', x: 3990, y: G },
    { id: 'h3', name: 'The Millstone', x: 7010, y: G },
  ],
  wickMother: { groundY: G },

  spawns: [
    { id: 'hd_lamp', label: 'Outskirts: lamp and low wall', x: 520, y: G },
    { id: 'hd_firstlm', label: 'SHOWCASE: first Lanternman', x: 930, y: G },
    { id: 'hd_swing', label: 'Swinging lamps', x: 1760, y: G },
    { id: 'hd_fork', label: 'The fork (roofs or cellars)', x: 2150, y: G },
    { id: 'hd_roof', label: 'High road (rooftops)', x: 2500, y: 580 },
    { id: 'hd_cellar', label: 'Low road (cellars)', x: 2360, y: CELLAR },
    { id: 'hd_chapel', label: 'Chapel (find the survivors)', x: 4180, y: G },
    { id: 'hd_escort', label: 'SHOWCASE: square with survivors', x: 4420, y: G, flags: { survivors: 'follow', 'trig:chapel': true, 'trig:squareEnter': true } },
    { id: 'hd_bell', label: 'The bell (Heavy branch)', x: 5160, y: G, flags: { survivors: 'follow', 'trig:chapel': true, 'trig:squareEnter': true } },
    { id: 'hd_mill', label: 'Mill road', x: 5620, y: G, flags: { survivors: 'follow', 'trig:chapel': true } },
    { id: 'hd_wheel', label: 'Windmill shadows', x: 6200, y: G, flags: { survivors: 'follow', 'trig:chapel': true } },
    { id: 'hd_dawn', label: 'SHOWCASE: dawn chase (Wick-Mother)', x: 7040, y: G, flags: { survivors: 'follow', 'trig:chapel': true } },
  ],

  build(b, scene) {
    const d = GAME.data;
    const s = b.s;
    // ---- Light branches: rolled once per run, saved, never re-rolled on reload ----
    if (!d.branches['hollowmere.fork']) {
      d.branches['hollowmere.fork'] = { outcome: rollLight(d.seed, 'hollowmere.fork', ['high', 'low']) };
      d.branches['hollowmere.fog'] = { outcome: rollLight(d.seed, 'hollowmere.fog', ['thick', 'thin']) };
      GAME.save();
    }
    const fork = DEV.forceFork !== 'random' ? DEV.forceFork : d.branches['hollowmere.fork'].outcome;
    const fogThick = (d.branches['hollowmere.fog']?.outcome ?? 'thick') === 'thick';
    const fogBase = fogThick ? 0.9 : 0.6;

    // ================= 1. THE OUTSKIRTS (0 - 2250) =================
    b.solid(0, G, 2250, 320, { style: 'earth' });
    b.stack(0, G, 40, 500, { cover: false, depth: 20 });
    b.fog(0, 2400, fogBase);
    for (const sp of this.stillpoints) b.stillpoint(sp);
    tree(b, 300, { scale: 1.05 });
    b.prop('signpost', 360, G, { depth: 17 });
    b.prop('fence', 460, G, { depth: 17 });
    b.trigger({ id: 'arrive', x: 40, y: 0, w: 600, h: 1000, lines: ['h_arrive1', 'h_arrive2', 'h_fog_hint', 'h_threads_hint'] });

    // A lamp you must pass, with a low wall to Merge behind.
    b.house(560, G, 200, 190, { windows: [[30, 44, false], [140, 44, true]], seed: 1, windowRadius: 150 });
    b.stack(690, G, 50, 52);
    b.lamppost(800, G, { radius: 270 });
    b.trigger({ id: 'lamp', x: 540, y: 0, w: 60, h: 1000, lines: ['h_lamp', 'h_cover_hint'] });

    // The first Lanternman steps out of a doorway as you arrive at the cart.
    tree(b, 920, { scale: 0.8, flip: true });
    b.house(1060, G, 260, 220, { windows: [[40, 50, false], [194, 50, false]], door: [110, 54], seed: 2 });
    cart(b, 1000);
    barrel(b, 1420);
    b.watcher({ id: 'lm1', type: 'lanternman', x: 1195, y: G, patrol: [1480, 960], wait: 1.6, facing: -1, bounds: [900, 1490], dormant: true });
    b.trigger({ id: 'firstLM', x: 940, y: 0, w: 50, h: 1000, event: 'firstLanternman', lines: ['h_first_lm1', 'h_first_lm2', 'h_first_lm3', 'h_lm_hint'] });

    // A flat-roofed house: an escape route upward and the way on. Lanternmen do not climb.
    crate(b, 1465, G, true);
    b.house(1500, G, 200, 140, { roof: 'flat', windows: [[84, 40, false]], seed: 3, solid: true });
    b.ledge(1730, 520, 100);
    b.hourShard({ x: 1780, y: 488 });
    b.trigger({ id: 'shardHint', x: 1500, y: 0, w: 80, h: 620, lines: ['h_shard_hint'] });

    // Two lanterns swinging on a frame. Watch the rhythm.
    b.prop('lampframe', 1975, G, { depth: 15 });
    b.hangingLamp(1915, G - 206, { length: 100, amp: 40, period: 3.4, phase: 0, radius: 180, intensity: 0.92 });
    b.hangingLamp(2035, G - 206, { length: 100, amp: 40, period: 3.4, phase: Math.PI, radius: 180, intensity: 0.92 });
    b.trigger({ id: 'swing', x: 1760, y: 0, w: 60, h: 1000, lines: ['h_swing'] });

    // ================= 2. THE FORK: a diamond (2250 - 3900) =================
    b.prop('signpost', 2190, G, { depth: 17, flip: true });
    b.trigger({ id: 'fork', x: 2120, y: 0, w: 60, h: 1000, lines: ['h_fork', 'h_fork_whisper'] });
    // the hole down to the cellars is between 2250 and 2310
    // the stack up to the rooftops
    crate(b, 2355, G, true);
    b.solid(2380, G - 110, 70, 110, { style: 'wood', top: false });

    // ---- the low road: cellars (2250 - 3900, floor at 960) ----
    b.backwall(2250, G, 1650, CELLAR - G, 'stone_body', { tint: 0x4a4658 });
    b.solid(2250, CELLAR, 1700, 120, { style: 'cellar' });
    b.solid(2310, G, 730, 40, { style: 'stone', top: 'cobble' });        // cellar ceiling, part 1 (and the street above)
    b.solid(3100, G, 680, 40, { style: 'stone', top: 'cobble' });        // part 2 (a hole above at 3040-3100 from the alley)
    b.light({ x: 2280, y: 850, radius: 110, intensity: 0.7, color: [140, 150, 200], kind: 'glow' });
    b.solid(2560, 900, 30, 60, { style: 'stone', top: false });
    b.candle(2575, 900, { radius: 150, intensity: 0.9 });
    b.solid(3000, 905, 30, 55, { style: 'stone', top: false });
    b.candle(3015, 905, { radius: 150, intensity: 0.9 });
    barrel(b, 2760, CELLAR);
    barrel(b, 2800, CELLAR);
    crate(b, 2700, CELLAR);
    barrel(b, 3240, CELLAR);
    barrel(b, 3640, CELLAR);
    crate(b, 3690, CELLAR);
    b.solid(3540, 905, 30, 55, { style: 'stone', top: false });
    b.candle(3555, 905, { radius: 150, intensity: 0.9 });
    // stairs up into the square
    b.solid(3790, 900, 50, 60, { style: 'wood', top: false });
    b.solid(3840, 840, 60, 120, { style: 'wood', top: false });
    b.trigger({ id: 'cellar', x: 2250, y: 800, w: 400, h: 200, lines: ['h_cellar'], event: 'tookLowRoad' });
    if (fork === 'low') {
      b.watcher({ id: 'lm_c', type: 'lanternman', x: 2900, y: CELLAR, patrol: [2680, 3200], wait: 1.6, facing: 1, bounds: [2330, 3700] });
    }

    // ---- the high road: rooftops ----
    b.house(2450, G, 250, 160, { roof: 'flat', seed: 4, solid: true, windows: [[60, 40, false], [164, 40, false]] });
    b.solid(2700, 560, 60, 200, { style: 'rubble', top: false });         // a collapsed barricade, part of the roof path
    b.house(2760, G, 260, 170, { roof: 'flat', seed: 5, solid: true, windows: [[50, 50, false], [176, 50, true]], windowLights: false });
    chimney(b, 2900, G - 186);
    // a brazier left burning on the roof: real fire
    b.candle(2985, G - 186, { stick: false, radius: 160, intensity: 0.9, flameScale: 1.1, flare: 0.5 });
    b.house(3120, G, 300, 180, { roof: 'flat', seed: 6, solid: true, windows: [[60, 50, false], [204, 50, false]] });
    chimney(b, 3240, G - 196);
    b.house(3420, G, 360, 150, { roof: 'flat', seed: 7, solid: true, windows: [[120, 40, false], [250, 40, true]], windowLights: false });
    chimney(b, 3600, G - 166);
    b.trigger({ id: 'roofs', x: 2450, y: 300, w: 300, h: 290, event: 'tookHighRoad' });
    if (fork === 'high') {
      b.watcher({ id: 'lm_r', type: 'lanternman', x: 3180, y: G - 196, patrol: [3150, 3400], wait: 1.4, facing: 1, bounds: [3130, 3410] });
    }

    // ================= 3. THE SQUARE (3900 - 5550) =================
    b.solid(3900, G, WIDTH - 3900, 320, { style: 'stone', top: 'cobble' });
    b.fog(3900, 5600, fogBase * 0.55);
    b.prop('well', 4085, G, { occlude: [-50, -48, 100, 48], depth: 17 });
    b.trigger({ id: 'squareEnter', x: 3920, y: 0, w: 120, h: 1000, event: 'squareEnter' });

    // The chapel where Maren and Edrin are hiding.
    b.prop('chapel', 4330, G, { depth: 12 });
    b.trigger({ id: 'chapel', x: 4140, y: 0, w: 60, h: 1000, lines: ['h_square1'] });
    b.survivor({ id: 'maren', name: 'Maren', texture: 'maren', x: 4318, y: G, state: 'hiding', facing: 1 });
    b.survivor({ id: 'edrin', name: 'Edrin', texture: 'edrin', x: 4346, y: G, state: 'hiding', facing: -1 });
    b.interact({
      id: 'chapelDoor', x: 4330, y: G, label: 'Beckon them out',
      enabled: () => !GAME.flag('survivors'),
      use: (sc) => this.events.found(sc),
    });

    // The square itself: a lamp, a walking Lanternman, a sentry that turns.
    tree(b, 4560, { scale: 0.9 });
    b.house(4540, G, 220, 200, { windows: [[30, 50, true], [156, 50, false]], seed: 9, windowRadius: 150 });
    b.house(4960, G, 240, 210, { windows: [[60, 60, false], [170, 60, true]], seed: 10, windowRadius: 150, door: [100, 50] });
    b.lamppost(4760, G, { radius: 260 });
    cart(b, 4620);
    cart(b, 4950, true);
    barrel(b, 5190);
    b.watcher({ id: 'lm_sq1', type: 'lanternman', x: 4700, y: G, patrol: [4560, 5060], wait: 1.6, facing: 1, bounds: [4480, 5170] });
    b.watcher({ id: 'lm_sq2', type: 'lanternman', x: 5300, y: G, patrol: [5300], facing: -1, turnEvery: 4.5, bounds: [5200, 5340] });

    // The bell tower. Its door recess is a hiding spot.
    b.prop('belltower', 5445, G, { depth: 12 });
    b.screen(5420, G - 84, 50, 84, { tag: 'recess' });
    b.trigger({ id: 'bell', x: 5140, y: 0, w: 60, h: 1000, lines: ['h_bell1', 'h_bell_whisper', 'h_bell_hint'] });
    b.interact({
      id: 'bell', x: 5446, y: G, label: 'Look at what the bell could bring', promptH: 120,
      enabled: () => !GAME.data.branches[BELL.id],
      use: (sc) => sc.openBranch(BELL),
    });
    this.bellMarker = s.add.image(5446, G - 120, 'hourshard').setDepth(47).setScale(0.6).setAlpha(0.85);
    s.tweens.add({ targets: this.bellMarker, y: G - 130, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ================= 4. THE MILL ROAD (5550 - 7000) =================
    b.fog(5600, 7100, fogBase * 0.45);
    b.prop('fence', 5560, G, { depth: 17 });
    b.trigger({ id: 'mill', x: 5600, y: 0, w: 60, h: 1000, lines: ['h_millroad'] });
    b.house(5700, G, 230, 200, { windows: [[40, 50, false], [164, 50, true]], seed: 11, windowRadius: 150, door: [100, 50] });
    cart(b, 5960);
    barrel(b, 6120);
    b.watcher({ id: 'lm_m1', type: 'lanternman', x: 5800, y: G, patrol: [5700, 6040], wait: 1.5, facing: 1, bounds: [5620, 6100], tag: 'mill' });
    b.watcher({ id: 'lm_m2', type: 'lanternman', x: 6200, y: G, patrol: [6200], facing: -1, turnEvery: 5, bounds: [6140, 6260], tag: 'mill' });

    // The windmill: the miller's lamp hangs at the hub. The turning sails throw shadow blades.
    b.prop('windmill', MILL.x, G, { depth: 12 });
    this.wheel = { cx: MILL.x, cy: MILL.hubY, r: 150, angle: 0.3, speed: 0.55 };
    this.wheelOcc = s.lighting.addDynamicOccluder('sails');
    this.wheelGfx = s.add.graphics().setDepth(13);
    b.light({ x: MILL.x, y: MILL.hubY + 14, radius: 520, intensity: 0.95, color: [255, 176, 96], flicker: 0.03 });
    s.add.image(MILL.x, MILL.hubY + 2, 'lantern').setOrigin(0.5, 0.05).setDepth(41);
    b.flare(MILL.x, MILL.hubY + 20, 0xffb060, 0.8, 0.85);
    b.trigger({ id: 'wheel', x: 6180, y: 0, w: 60, h: 1000, lines: ['h_wheel'] });
    b.watcher({ id: 'lm_m3', type: 'lanternman', x: 6700, y: G, patrol: [6680, 6880], wait: 1.4, facing: 1, bounds: [6650, 6920], tag: 'mill' });

    // Apply a bell outcome that was decided before this reload.
    const bell = d.branches[BELL.id];
    if (bell && bell.choice === 'ring') drawMillWatchers(scene, bell.outcome, true);
    if (bell) this.bellMarker.setVisible(false);

    // ================= 5. DAWN (7000 - 10900) =================
    // Everything here is cover that casts a sun shadow. At first light the
    // shadows are long and overlap; as the sun climbs they shrink apart and
    // the strips of sunlight between them grow. The chase is that squeeze.
    tree(b, 6950, { scale: 1.1, flip: true });
    b.trigger({ id: 'dawn', x: 7120, y: 0, w: 60, h: 1000, event: 'dawn', requires: 'survivors' });
    const DAWN_ROW = [
      ['hay', 7350], ['wall', 7650, 110], ['cottage', 7900, 160, 140], ['hay', 8350],
      ['cart', 8620], ['wall', 8880, 120], ['hay', 9180], ['cottage', 9420, 150, 130],
      ['fence', 9700], ['wall', 9900, 110], ['hay', 10200], ['cart', 10450], ['wall', 10700, 100],
    ];
    for (const x of [7550, 8200, 9050, 9620, 10350]) tree(b, x, { scale: 0.85 + (x % 3) * 0.1, flip: x % 2 === 0 });
    DAWN_ROW.forEach(([kind, x, w, h], i) => {
      if (kind === 'hay') haystack(b, x);
      else if (kind === 'cart') cart(b, x);
      else if (kind === 'fence') {
        b.prop('fence', x + 12, G, { depth: 17 });     // cover only: anything solid here is an obstacle
      } else if (kind === 'wall') b.stack(x, G, 40, w);
      else if (kind === 'cottage') {
        b.house(x, G, w, h, { seed: 20 + i, windows: [[w * 0.4, 50, false]], windowLights: false, smoke: false });
        b.screen(x, G - h, w, h);
      }
    });
    // In the gaps between the cover, debris in the road keeps you jumping.
    this.obstacles = [
      ['barricade', 7530], ['wagon', 7790], ['thatch', 8210], ['barricade', 8770],
      ['barricade', 9330], ['wagon', 10040], ['thatch', 10600],
    ].map(([kind, x]) => obstacle(b, kind, x));
    b.prop('gate_arch', GATE_X, G, { depth: 12 });
    b.light({ x: GATE_X, y: G - 120, radius: 240, intensity: 0.7, color: [150, 190, 255], kind: 'safe' });
    b.trigger({ id: 'gate', x: GATE_X - 30, y: 0, w: 200, h: 1000, event: 'reachGate', requires: 'chase' });
    b.stack(WIDTH - 40, G, 40, 500, { cover: false, depth: 20 });
  },

  onStart(scene) {
    const d = GAME.data;
    GAME.addLedger(d.branches['hollowmere.fog']?.outcome === 'thin' ? 'fog_thin' : 'fog_thick');
    scene.clockOn = false;
  },

  onUpdate(scene, dt) {
    // Without Maren and Edrin there is no reason to go on: the Almoner turns you back.
    if (!GAME.flag('survivors') && scene.player.x > 7080 && !scene.player.dead) {
      scene.player.teleport(7060, G);
      scene.playLines(['h_go_back'], { force: !this.goBackSaid });
      this.goBackSaid = true;
    }

    // Windmill: turn the sails and feed them to the lighting as moving occluders.
    const w = this.wheel;
    if (w) {
      w.angle += w.speed * dt;
      const polys = [];
      const g = this.wheelGfx;
      g.clear();
      for (let i = 0; i < 4; i++) {
        const a = w.angle + (i * Math.PI) / 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = -sa, ny = ca;     // the side the sail cloth hangs on
        const P = (r, off) => [w.cx + ca * r + nx * off, w.cy + sa * r + ny * off];
        // the spar
        const spar = [...P(20, -3), ...P(w.r + 8, -3), ...P(w.r + 8, 3), ...P(20, 3)];
        // the lattice sail on one side of it
        const sail = [...P(54, 3), ...P(w.r, 3), ...P(w.r, 30), ...P(60, 26)];
        polys.push(spar, sail);
        g.fillStyle(0x1c1620, 0.92);
        g.fillPoints(toPts(sail), true);
        g.lineStyle(1.5, 0x0c0a0e, 1);
        for (let r = 70; r < w.r; r += 18) {
          const [x0, y0] = P(r, 3), [x1, y1] = P(r, 28);
          g.lineBetween(x0, y0, x1, y1);
        }
        const [ex0, ey0] = P(56, 18), [ex1, ey1] = P(w.r, 18);
        g.lineBetween(ex0, ey0, ex1, ey1);
        g.lineStyle(1, 0x9fb4ff, 0.25);
        const [rx0, ry0] = P(60, 27), [rx1, ry1] = P(w.r, 30);
        g.lineBetween(rx0, ry0, rx1, ry1);
        g.fillStyle(0x120d0c, 1);
        g.fillPoints(toPts(spar), true);
      }
      g.fillStyle(0x0c0a0e, 1);
      g.fillCircle(w.cx, w.cy, 9);
      this.wheelOcc.setPolys(polys);
    }

    const wick = scene.wick;
    if (wick?.active) {
      for (const ob of this.obstacles ?? []) if (ob.zone && !ob.smashed && wick.x + 110 > ob.x - ob.halfW) smash(scene, ob);
    }

    // Dawn: the sun climbs, shadows shorten, the fog burns away, the sky warms.
    const c = scene.chase;
    if (c && !scene.ended) {
      const D = TUNING.dawn;
      c.t += dt;
      const k = Math.min(1, c.t / D.duration);
      const rise = Math.min(1, c.t / 6);
      scene.lighting.setSun({
        elevation: D.startElevation + (D.endElevation - D.startElevation) * k,
        intensity: D.sunIntensity * Math.min(1, c.t / 4),
      });
      scene.fogMul = Math.max(0, 1 - k * 1.6);
      const dec = scene.decor;
      dec.dawnSky?.setAlpha(rise * (0.4 + 0.6 * k));
      dec.stars?.setAlpha(1 - rise);
      dec.moon?.setAlpha(1 - rise * 0.85);
      dec.moonHalo?.setAlpha(0.22 * (1 - rise));
      if (dec.sun) {
        if (c.sunY0 === undefined) c.sunY0 = dec.sun.y;
        dec.sun.setAlpha(Math.min(1, c.t / 3) * 0.95);
        dec.sun.y = c.sunY0 - 260 * k;
        dec.sun.setScale(4 + 2 * rise);
      }
      const warm = lerpTint(0xffffff, 0xffc7a0, rise * (0.6 + 0.4 * k));
      for (const L of dec.layers ?? []) L.setTint(warm);
      if (scene.grade) {
        const gp = scene.grade.params;
        gp.shadow = [lerp(0.78, 0.92, rise), lerp(0.86, 0.86, rise), lerp(1.2, 1.04, rise)];
        gp.high = [lerp(1.14, 1.2, rise), lerp(1.0, 1.04, rise), lerp(0.84, 0.82, rise)];
      }
      scene.clockRate = 0.6 - 0.4 * k;
      // Survivors who were told to wait far behind are not left to the Wick-Mother.
      for (const sv of scene.survivors) {
        if (sv.alive && sv.state !== 'safe' && sv.state !== 'flee') { sv.setState('flee'); sv.fleeX = GATE_X + 40 + sv.index * 36; }
      }
    }
  },

  events: {
    firstLanternman(scene) {
      const w = scene.watchers.find((v) => v.id === 'lm1');
      w?.wake({ x: 1195, facing: -1 });
      AUDIO.play('interact', scene.spatialFor(1195));
    },

    tookLowRoad() { GAME.addLedger('low'); },
    tookHighRoad() { GAME.addLedger('high'); },

    squareEnter(scene) {
      scene.setFlag('seenSinceSquare', false);
    },

    found(scene) {
      scene.setFlag('survivors', 'follow');
      GAME.addLedger('found');
      for (const sv of scene.survivors) sv.setState('follow');
      scene.playLines(['h_maren1', 'h_edrin1', 'h_maren2', 'h_escort_hint', 'h_square2']);
    },

    dawn(scene) {
      const bell = GAME.data.branches[BELL.id];
      const unlucky = bell && bell.outcome === 'unfavorable';
      scene.chase = { t: 0 };
      scene.setFlag('chase', true);
      scene.lighting.setSun({ enabled: true, elevation: TUNING.dawn.startElevation, intensity: 0 });
      const W = TUNING.wickMother;
      scene.wick.wake(scene.player.x - (unlucky ? W.startBehindUnlucky : W.startBehind));
      AUDIO.play('roar', { pan: -0.6, vol: 0.9 });
      AUDIO.setAmbience('dawn');
      scene.clockOn = true;
      // Any Lanternmen still out collapse as their borrowed light fails at dawn.
      for (const w of scene.watchers) if (w.mode !== 'down' && w.x > 6000) w.takeDown();
      for (const sv of scene.survivors) {
        if (!sv.alive) continue;
        if (Math.abs(sv.x - scene.player.x) > 600) sv.body.reset(scene.player.x - 60 - sv.index * 30, G - 40);
        sv.setState('flee');
        sv.fleeX = GATE_X + 40 + sv.index * 36;
      }
      scene.playLines(['h_dawn1', 'h_dawn2', 'h_dawn3', 'h_dawn_hint', 'h_wick_hint', 'h_dawn_whisper']);
    },

    reachGate(scene) {
      if (scene.ended) return;
      scene.completeWorld();
      const wick = scene.wick;
      if (wick) {
        wick.active = false;
        scene.tweens.add({ targets: [wick.sprite, wick.crown, wick.crownGlow].filter(Boolean), alpha: 0, duration: 2500 });
        if (wick.flames) wick.flames.emitting = false;
        if (wick.light) wick.light.enabled = false;
        if (wick.cone) wick.cone.enabled = false;
      }
      scene.clockOn = false;
      GAME.addLedger('saved');
      GAME.addLedger('closing');
      GAME.data.fragments = Math.max(GAME.data.fragments, 1);
      GAME.save();
      scene.playLines(['h_end1', 'h_end2'], { force: true });
      scene.time.delayedCall(7500, () => {
        scene.cameras.main.fadeOut(1400, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
          scene.scene.stop('HUD');
          scene.scene.start('Cutscene', { id: 'fragment', next: { scene: 'End', data: { type: 'complete', world: 'hollowmere', name: 'Hollowmere' } } });
        });
      });
    },
  },
};

function toPts(flat) {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ x: flat[i], y: flat[i + 1] });
  return out;
}

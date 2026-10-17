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
//                         and a mill wheel whose spokes throw turning shadows.
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

function chimney(b, x, roofY) {
  const s = b.s;
  s.add.tileSprite(x, roofY - 60, 34, 60, 'tex_stone').setOrigin(0).setDepth(12).setTint(0x7a7090);
  b.screen(x, roofY - 60, 34, 60);
}

function haystack(b, x) { b.prop('haystack', x, G, { occlude: [-55, -80, 110, 80] }); }
function cart(b, x) { b.prop('cart', x, G, { occlude: [-60, -50, 120, 50] }); }
function barrel(b, x, y = G) { b.prop('barrel', x, y, { occlude: [-17, -48, 34, 48] }); }

export default {
  id: 'hollowmere',
  name: 'Hollowmere',
  width: WIDTH,
  height: 1080,
  sky: 'night',
  ambience: 'night',
  fog: true,
  start: 'h1',

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
    { id: 'hd_firstlm', label: 'First Lanternman', x: 930, y: G },
    { id: 'hd_swing', label: 'Swinging lamps', x: 1760, y: G },
    { id: 'hd_fork', label: 'The fork (roofs or cellars)', x: 2150, y: G },
    { id: 'hd_roof', label: 'High road (rooftops)', x: 2500, y: 600 },
    { id: 'hd_cellar', label: 'Low road (cellars)', x: 2360, y: CELLAR },
    { id: 'hd_chapel', label: 'Chapel (find the survivors)', x: 4180, y: G },
    { id: 'hd_escort', label: 'Square with survivors', x: 4420, y: G, flags: { survivors: 'follow', 'trig:chapel': true, 'trig:squareEnter': true } },
    { id: 'hd_bell', label: 'The bell (Heavy branch)', x: 5160, y: G, flags: { survivors: 'follow', 'trig:chapel': true, 'trig:squareEnter': true } },
    { id: 'hd_mill', label: 'Mill road', x: 5620, y: G, flags: { survivors: 'follow', 'trig:chapel': true } },
    { id: 'hd_wheel', label: 'Mill wheel shadows', x: 6300, y: G, flags: { survivors: 'follow', 'trig:chapel': true } },
    { id: 'hd_dawn', label: 'Dawn chase (Wick-Mother)', x: 7040, y: G, flags: { survivors: 'follow', 'trig:chapel': true } },
  ],

  build(b, scene) {
    const d = GAME.data;
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
    b.solid(0, 260, 40, 500, { style: 'stone', edge: false });
    b.fog(0, 2400, fogBase);
    for (const sp of this.stillpoints) b.stillpoint(sp);
    b.prop('signpost', 360, G, { depth: 9 });
    b.prop('fence', 470, G, { depth: 9 });
    b.trigger({ id: 'arrive', x: 40, y: 0, w: 600, h: 1000, lines: ['h_arrive1', 'h_arrive2', 'h_fog_hint'] });

    // A lamp you must pass, with a low wall to Merge behind.
    b.house(560, G, 200, 190, { windows: [[30, 40, false], [130, 40, true]], seed: 1, windowRadius: 120, windowIntensity: 0.4 });
    b.solid(690, G - 52, 50, 52, { style: 'rubble' });
    b.lamppost(800, G, { radius: 250 });
    b.trigger({ id: 'lamp', x: 540, y: 0, w: 60, h: 1000, lines: ['h_lamp', 'h_cover_hint'] });

    // The first Lanternman steps out of a doorway as you arrive at the cart.
    b.house(1060, G, 260, 220, { windows: [[40, 50, false], [190, 50, false]], door: [110, 54], seed: 2 });
    cart(b, 1000);
    barrel(b, 1420);
    b.watcher({ id: 'lm1', type: 'lanternman', x: 1195, y: G, patrol: [1480, 960], wait: 1.6, facing: -1, bounds: [900, 1490], dormant: true });
    b.trigger({ id: 'firstLM', x: 940, y: 0, w: 50, h: 1000, event: 'firstLanternman', lines: ['h_first_lm1', 'h_first_lm2', 'h_first_lm3'] });

    // A flat-roofed house: an escape route upward and the way on. Lanternmen do not climb.
    b.solid(1440, G - 50, 50, 50, { style: 'wood' });
    b.house(1500, G, 200, 150, { roof: 'flat', windows: [[80, 40, false]], seed: 3, solid: true });
    b.ledge(1730, 520, 100);
    b.hourShard({ x: 1780, y: 488 });
    b.trigger({ id: 'shardHint', x: 1500, y: 0, w: 80, h: 620, lines: ['h_shard_hint'] });

    // Two lanterns swinging on a frame. Watch the rhythm.
    b.prop('gallows', 1975, G, { depth: 9 });
    b.hangingLamp(1910, 572, { length: 100, amp: 40, period: 3.4, phase: 0, radius: 170, intensity: 0.9 });
    b.hangingLamp(2040, 572, { length: 100, amp: 40, period: 3.4, phase: Math.PI, radius: 170, intensity: 0.9 });
    b.trigger({ id: 'swing', x: 1760, y: 0, w: 60, h: 1000, lines: ['h_swing'] });

    // ================= 2. THE FORK: a diamond (2250 - 3900) =================
    b.prop('signpost', 2190, G, { depth: 9, flip: true });
    b.trigger({ id: 'fork', x: 2120, y: 0, w: 60, h: 1000, lines: ['h_fork', 'h_fork_whisper'] });
    // the hole down to the cellars is between 2250 and 2310
    // the stack up to the rooftops
    b.solid(2330, G - 50, 50, 50, { style: 'wood' });
    b.solid(2380, G - 110, 70, 110, { style: 'wood' });

    // ---- the low road: cellars (2250 - 3900, floor at 960) ----
    b.solid(2250, CELLAR, 1700, 120, { style: 'stone' });
    b.solid(2310, G, 730, 40, { style: 'stone' });           // cellar ceiling, part 1
    b.solid(3100, G, 680, 40, { style: 'stone' });           // part 2 (a hole above at 3040-3100 from the alley)
    b.light({ x: 2280, y: 870, radius: 90, intensity: 0.3, color: [140, 150, 200], harmless: true, glow: 0.4 });
    b.solid(2560, 900, 30, 60, { style: 'stone' });
    b.candle(2575, 900, { radius: 140, intensity: 0.85 });
    b.solid(3000, 905, 30, 55, { style: 'stone' });
    b.candle(3015, 905, { radius: 140, intensity: 0.85 });
    barrel(b, 2760, CELLAR);
    barrel(b, 2800, CELLAR);
    barrel(b, 3240, CELLAR);
    barrel(b, 3640, CELLAR);
    b.shade(3330, 800, 120, 160, 0.85);
    b.solid(3540, 905, 30, 55, { style: 'stone' });
    b.candle(3555, 905, { radius: 140, intensity: 0.85 });
    // stairs up into the square
    b.solid(3790, 900, 50, 60, { style: 'wood' });
    b.solid(3840, 840, 60, 120, { style: 'wood' });
    b.trigger({ id: 'cellar', x: 2250, y: 800, w: 400, h: 200, lines: ['h_cellar'], event: 'tookLowRoad' });
    if (fork === 'low') {
      b.watcher({ id: 'lm_c', type: 'lanternman', x: 2900, y: CELLAR, patrol: [2680, 3200], wait: 1.6, facing: 1, bounds: [2330, 3700] });
    }

    // ---- the high road: rooftops ----
    b.house(2450, G, 250, 160, { roof: 'flat', seed: 4, solid: true, windows: [[60, 40, false], [160, 40, false]] });
    b.solid(2700, 560, 60, 200, { style: 'rubble' });         // a collapsed barricade, part of the roof path
    b.house(2760, G, 260, 170, { roof: 'flat', seed: 5, solid: true, windows: [[50, 50, false], [170, 50, true]], windowLights: false });
    chimney(b, 2900, 590);
    b.light({ x: 2985, y: 560, radius: 150, intensity: 0.75, color: [255, 170, 90], flicker: 0.04, glow: 0.5 });
    b.house(3120, G, 300, 180, { roof: 'flat', seed: 6, solid: true, windows: [[60, 50, false], [200, 50, false]] });
    chimney(b, 3240, 580);
    b.house(3420, G, 360, 150, { roof: 'flat', seed: 7, solid: true, windows: [[120, 40, false]] });
    chimney(b, 3600, 610);
    b.trigger({ id: 'roofs', x: 2450, y: 300, w: 300, h: 300, event: 'tookHighRoad' });
    if (fork === 'high') {
      b.watcher({ id: 'lm_r', type: 'lanternman', x: 3180, y: 580, patrol: [3150, 3400], wait: 1.4, facing: 1, bounds: [3130, 3410] });
    }

    // ================= 3. THE SQUARE (3900 - 5550) =================
    b.solid(3900, G, WIDTH - 3900, 320, { style: 'earth' });
    b.fog(3900, 5600, fogBase * 0.55);
    b.prop('well', 4085, G, { occlude: [-45, -60, 90, 60] });
    b.trigger({ id: 'squareEnter', x: 3920, y: 0, w: 120, h: 1000, event: 'squareEnter' });

    // The chapel where Maren and Edrin are hiding.
    b.house(4200, G, 260, 250, { windows: [[40, 60, false], [200, 60, false]], door: [105, 56], seed: 8 });
    b.trigger({ id: 'chapel', x: 4140, y: 0, w: 60, h: 1000, lines: ['h_square1'] });
    b.survivor({ id: 'maren', name: 'Maren', texture: 'maren', x: 4318, y: G, state: 'hiding', facing: 1 });
    b.survivor({ id: 'edrin', name: 'Edrin', texture: 'edrin', x: 4346, y: G, state: 'hiding', facing: -1 });
    b.interact({
      id: 'chapelDoor', x: 4330, y: G, label: 'Beckon them out',
      enabled: () => !GAME.flag('survivors'),
      use: (sc) => this.events.found(sc),
    });

    // The square itself: a lamp, a walking Lanternman, a sentry that turns.
    b.house(4520, G, 220, 200, { windows: [[30, 50, true], [150, 50, false]], seed: 9, windowRadius: 120, windowIntensity: 0.45 });
    b.house(4960, G, 240, 210, { windows: [[60, 60, false], [170, 60, true]], seed: 10, windowRadius: 120, windowIntensity: 0.45, door: [100, 50] });
    b.lamppost(4760, G, { radius: 240 });
    cart(b, 4620);
    cart(b, 4950);
    barrel(b, 5190);
    b.watcher({ id: 'lm_sq1', type: 'lanternman', x: 4700, y: G, patrol: [4560, 5060], wait: 1.6, facing: 1, bounds: [4480, 5170] });
    b.watcher({ id: 'lm_sq2', type: 'lanternman', x: 5300, y: G, patrol: [5300], facing: -1, turnEvery: 4.5, bounds: [5200, 5340] });

    // The bell tower. Its door recess is a hiding spot.
    const s = b.s;
    s.add.tileSprite(5390, 300, 110, 460, 'tex_stone').setOrigin(0).setDepth(5).setTint(0x5a5670);
    s.add.triangle(5445, 300, -70, 0, 0, -90, 70, 0, 0x0d0c13).setDepth(5);
    s.add.image(5445, 400, 'bell').setOrigin(0.5, 1).setDepth(6);
    s.add.rectangle(5442, 400, 3, 300, 0x3a2c1c).setOrigin(0.5, 0).setDepth(6);
    s.add.rectangle(5418, G - 84, 56, 84, 0x050409).setOrigin(0).setDepth(6);
    b.shade(5418, G - 84, 56, 84, 0.9);
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
    b.prop('fence', 5560, G, { depth: 9 });
    b.trigger({ id: 'mill', x: 5600, y: 0, w: 60, h: 1000, lines: ['h_millroad'] });
    b.house(5700, G, 230, 200, { windows: [[40, 50, false], [160, 50, true]], seed: 11, windowRadius: 120, windowIntensity: 0.45, door: [100, 50] });
    cart(b, 5960);
    barrel(b, 6120);
    b.watcher({ id: 'lm_m1', type: 'lanternman', x: 5800, y: G, patrol: [5700, 6040], wait: 1.5, facing: 1, bounds: [5620, 6100], tag: 'mill' });
    b.watcher({ id: 'lm_m2', type: 'lanternman', x: 6200, y: G, patrol: [6200], facing: -1, turnEvery: 5, bounds: [6140, 6260], tag: 'mill' });

    // The mill: a lamp at the hub of a turning wheel. The spokes throw shadow blades.
    b.house(6340, G, 300, 300, { roof: 'gable', seed: 12, windows: [[200, 70, false]] });
    this.wheel = { cx: 6470, cy: 620, r: 140, angle: 0, speed: 0.55 };
    this.wheelOcc = s.lighting.addDynamicOccluder('wheel');
    this.wheelGfx = s.add.graphics().setDepth(13);
    b.light({ x: 6470, y: 620, radius: 330, intensity: 0.95, color: [255, 176, 96], flicker: 0.03, glow: 0.55 });
    s.add.image(6470, 620, 'wheel_hub').setDepth(14);
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
    b.trigger({ id: 'dawn', x: 7120, y: 0, w: 60, h: 1000, event: 'dawn', requires: 'survivors' });
    const DAWN_ROW = [
      ['hay', 7350], ['wall', 7650, 110], ['cottage', 7900, 160, 140], ['hay', 8350],
      ['cart', 8620], ['wall', 8880, 120], ['hay', 9180], ['cottage', 9420, 150, 130],
      ['fence', 9700], ['wall', 9900, 110], ['hay', 10200], ['cart', 10450], ['wall', 10700, 100],
    ];
    DAWN_ROW.forEach(([kind, x, w, h], i) => {
      if (kind === 'hay') haystack(b, x);
      else if (kind === 'cart') cart(b, x);
      else if (kind === 'fence') b.solid(x, G - 44, 24, 44, { style: 'wood' });
      else if (kind === 'wall') {
        b.s.add.tileSprite(x, G - w, 40, w, 'tex_stone').setOrigin(0).setDepth(9).setTint(0x7a7090);
        b.screen(x, G - w, 40, w);
      } else if (kind === 'cottage') {
        b.house(x, G, w, h, { seed: 20 + i, windows: [[w * 0.4, 50, false]], windowLights: false });
        b.screen(x, G - h, w, h);
      }
    });
    b.prop('gate_arch', GATE_X, G, { depth: 9 });
    b.light({ x: GATE_X, y: G - 120, radius: 220, intensity: 0.6, color: [150, 190, 255], harmless: true, glow: 0.7 });
    b.trigger({ id: 'gate', x: GATE_X - 30, y: 0, w: 200, h: 1000, event: 'reachGate', requires: 'chase' });
    b.solid(WIDTH - 40, 260, 40, 500, { style: 'stone', edge: false });
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

    // Mill wheel: turn the spokes and feed them to the lighting as moving occluders.
    const w = this.wheel;
    if (w) {
      w.angle += w.speed * dt;
      const polys = [];
      const g = this.wheelGfx;
      g.clear();
      g.lineStyle(10, 0x17120e, 1);
      g.strokeCircle(w.cx, w.cy, w.r);
      for (let i = 0; i < 4; i++) {
        const a = w.angle + (i * Math.PI) / 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = -sa * 9, ny = ca * 9;
        const x0 = w.cx + ca * 26, y0 = w.cy + sa * 26;
        const x1 = w.cx + ca * w.r, y1 = w.cy + sa * w.r;
        const poly = [x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny];
        polys.push(poly);
        g.fillStyle(0x17120e, 1);
        g.fillPoints([{ x: poly[0], y: poly[1] }, { x: poly[2], y: poly[3] }, { x: poly[4], y: poly[5] }, { x: poly[6], y: poly[7] }], true);
      }
      this.wheelOcc.setPolys(polys);
    }

    // Dawn: the sun climbs, shadows shorten, the fog burns away.
    const c = scene.chase;
    if (c && !scene.ended) {
      const D = TUNING.dawn;
      c.t += dt;
      const k = Math.min(1, c.t / D.duration);
      scene.lighting.setSun({
        elevation: D.startElevation + (D.endElevation - D.startElevation) * k,
        intensity: D.sunIntensity * Math.min(1, c.t / 4),
      });
      scene.lighting.ambient = 0.12 + 0.1 * k;
      scene.fogMul = Math.max(0, 1 - k * 1.6);
      scene.decor.dawnSky?.setAlpha(Math.min(1, c.t / 6) * (0.4 + 0.6 * k));
      scene.decor.stars?.setAlpha(1 - Math.min(1, c.t / 6));
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
      scene.playLines(['h_dawn1', 'h_dawn2', 'h_dawn3', 'h_dawn_whisper', 'h_dawn_hint']);
    },

    reachGate(scene) {
      if (scene.ended) return;
      scene.completeWorld();
      const wick = scene.wick;
      if (wick) {
        wick.active = false;
        scene.tweens.add({ targets: [wick.sprite, wick.crown, wick.crownGlow], alpha: 0, duration: 2500 });
        wick.flames.emitting = false;
        wick.light.enabled = false;
        wick.cone.enabled = false;
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

// =====================================================================
// PROLOGUE: THE HOURGLASS HALL (tutorial, about 15 minutes)
//
// Teaches, in this order (design doc section 10):
//   light hurts (a moonbeam) -> time the light (a beam that clouds over)
//   -> Merge behind cover (pillar gallery with a guardian)
//   -> strike from behind (an acolyte) -> Stillpoints and Sand
//   -> Foresight (a guardian's pacing) -> the bargain with the Almoner.
//
// No Threads here: dying just sends you back to the last Stillpoint, and the
// Almoner says "Not yet. Again." (a trust beat: it saves you).
// =====================================================================

import { GAME } from '../systems/state.js';

const FLOOR = 700;

export default {
  id: 'prologue',
  name: 'The Hourglass Hall',
  width: 4900,
  height: 900,
  sky: 'hall',
  ambience: 'hall',
  fog: false,
  noThreads: true,
  start: 'p0',
  horizonY: FLOOR,
  wallTop: 150,
  wallBottom: FLOOR,
  grade: { shadow: [0.84, 0.84, 1.14], high: [1.14, 1.02, 0.88], vig: 0.6 },

  // Checkpoints. Declared here (not inside build) so the dev menu can list them.
  stillpoints: [
    { id: 'p0', name: 'Where you woke', x: 190, y: FLOOR },
    { id: 'p1', name: 'The Quiet Arch', x: 3240, y: FLOOR },
  ],

  // Dev-menu jump points (Stillpoints are added automatically).
  spawns: [
    { id: 'pd_beam', label: 'Moonbeam (light hurts)', x: 600, y: FLOOR },
    { id: 'pd_clouds', label: 'Cloud beam (timing)', x: 1160, y: FLOOR },
    { id: 'pd_gallery', label: 'Pillar gallery (guardian, Merge)', x: 1700, y: FLOOR },
    { id: 'pd_acolyte', label: 'Acolyte (takedown)', x: 2820, y: FLOOR },
    { id: 'pd_foresight', label: 'Foresight corridor', x: 3470, y: FLOOR },
    { id: 'pd_chamber', label: 'SHOWCASE: Hourglass chamber (the Almoner)', x: 4150, y: FLOOR },
  ],

  build(b) {
    // ---------------- the shell of the hall ----------------
    b.solid(0, FLOOR, 4900, 200, { style: 'hall' });
    b.solid(0, 0, 4900, 150, { style: 'hall', edge: false, trim: false });
    b.decor('top_marble', 0, 150, { ox: 0, oy: 0, depth: 21 }).setDisplaySize(4900, 18).setTint(0x8a8496);
    b.solid(0, 150, 60, 550, { style: 'hall', edge: false, trim: false });
    b.solid(4840, 150, 60, 550, { style: 'hall', edge: false, trim: false });

    // ---------------- A. waking ----------------
    for (const sp of this.stillpoints) b.stillpoint(sp);
    b.decor('banner', 330, 152, { oy: 0, depth: 13 });
    b.candelabra(470, FLOOR);
    b.trigger({ id: 'wake', x: 60, y: 0, w: 600, h: 900, lines: ['p_wake1', 'p_wake2', 'p_hint_move'] });

    // ---------------- B. a moonbeam: light hurts ----------------
    b.windowBeam(840, 230, { dir: 97, spread: 8, radius: 600, intensity: 0.8 });
    b.trigger({ id: 'beam', x: 640, y: 0, w: 120, h: 900, lines: ['p_beam1', 'p_beam_hint'] });

    // ---------------- C. a beam that clouds over: time it ----------------
    b.decor('banner', 1140, 152, { oy: 0, depth: 13 });
    b.windowBeam(1440, 230, { dir: 95, spread: 11, radius: 600, intensity: 0.95, pulse: { min: 0.08, max: 1, period: 5.5 } });
    b.trigger({ id: 'clouds', x: 1160, y: 0, w: 100, h: 900, lines: ['p_clouds'] });

    // ---------------- D. pillar gallery: Merge behind cover ----------------
    for (const x of [1800, 2040, 2280, 2520, 2760]) b.pillar(x, FLOOR, 60, 550);
    b.watcher({ id: 'g1', type: 'guardian', x: 2300, y: FLOOR, patrol: [1910, 2700], wait: 1.8, facing: -1, bounds: [1860, 2740] });
    b.trigger({ id: 'guard', x: 1640, y: 0, w: 80, h: 900, lines: ['p_guardian1', 'p_merge_hint', 'p_guardian2', 'p_guardian_hint'] });

    // ---------------- E. the acolyte: strike from behind ----------------
    b.solid(3090, FLOOR - 40, 44, 40, { style: 'hall', top: false });
    b.candle(3112, FLOOR - 40, { radius: 140, intensity: 0.85 });
    b.watcher({ id: 'a1', type: 'acolyte', x: 3010, y: FLOOR, patrol: [3010], facing: 1, bounds: [2900, 3080] });
    b.trigger({ id: 'acolyte', x: 2860, y: 0, w: 60, h: 900, lines: ['p_acolyte1', 'p_strike_hint'] });

    // ---------------- F. a Stillpoint and Sand ----------------
    b.decor('banner', 3300, 152, { oy: 0, depth: 13, flip: true });
    b.sand({ id: 'ps1', x: 3360, y: FLOOR - 40 });
    b.sand({ id: 'ps2', x: 3420, y: FLOOR - 40 });

    // ---------------- G. Foresight: read the guardian's pacing ----------------
    b.watcher({ id: 'g2', type: 'guardian', x: 3940, y: FLOOR, patrol: [3590, 3960], wait: 1.2, facing: -1, bounds: [3560, 3990] });
    b.prop('crate', 3720, FLOOR, { occlude: [-26, -52, 52, 52] });
    b.prop('crate', 3890, FLOOR, { occlude: [-26, -52, 52, 52] });
    b.trigger({ id: 'foresight', x: 3470, y: 0, w: 60, h: 900, lines: ['p_foresight1', 'p_foresight_hint'] });
    // A full-height pillar seals the corridor's light and sight off from the chamber.
    b.pillar(4030, FLOOR, 60, 550);

    // ---------------- H. the Hourglass chamber and the bargain ----------------
    b.decor('hourglass', 4500, FLOOR, { depth: 13 });
    b.light({ x: 4500, y: 470, radius: 580, intensity: 0.95, color: [255, 212, 150], flicker: 0.02 });
    b.flare(4500, 470, 0xffd890, 1.6, 0.35, 12.5);
    // falling sand in the hourglass
    b.s.add.particles(4500, 380, 'sand', {
      lifespan: 900, speedY: { min: 150, max: 190 }, speedX: { min: -3, max: 3 }, scale: { start: 0.35, end: 0.25 },
      alpha: { start: 0.9, end: 0.6 }, tint: 0xe8c372, frequency: 18, blendMode: 'ADD',
    }).setDepth(13.5);
    b.decor('chandelier', 4500, 152, { oy: 0, depth: 13 });
    for (let k = 0; k < 7; k++) b.candle(4437 + k * 21, 228, { stick: false, kind: 'glow', radius: 120, flameScale: 0.5, flare: 0.25 });
    for (const x of [4250, 4370]) b.statue(x, FLOOR);
    for (const x of [4640, 4750]) b.statue(x, FLOOR, { flip: true });
    b.decor('banner', 4200, 152, { oy: 0, depth: 13 });
    b.decor('banner', 4800, 152, { oy: 0, depth: 13, flip: true });
    // The Almoner stands in its own light and casts no shadow. The statues,
    // identical in shape, do. That is the first clue. It is never mentioned.
    b.entityFigure(4560, FLOOR);
    b.trigger({ id: 'chamber', x: 4110, y: 0, w: 60, h: 900, lines: ['p_statues', 'p_dash_hint'] });
    b.trigger({ id: 'bargain', x: 4330, y: 0, w: 40, h: 900, lines: ['p_bargain1', 'p_bargain2', 'p_bargain3'] });

    const s = b.s;
    const portal = s.add.image(4800, FLOOR - 104, 'portal').setDepth(44).setBlendMode('ADD').setAlpha(0.95);
    s.tweens.add({ targets: portal, scaleX: 1.06, scaleY: 0.97, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.add.particles(4800, FLOOR - 40, 'ember', {
      lifespan: 1800, speedY: { min: -90, max: -40 }, speedX: { min: -14, max: 14 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 }, tint: [0xffe6a8, 0xe8c372], blendMode: 'ADD', frequency: 60, x: { min: -40, max: 40 },
    }).setDepth(44);
    b.light({ x: 4800, y: FLOOR - 100, radius: 220, intensity: 0.6, color: [232, 195, 114], kind: 'safe' });
    b.interact({
      id: 'portal', x: 4800, y: FLOOR, label: 'Step through to Hollowmere', promptH: 230,
      use: (scene) => this.events.enterHollowmere(scene),
    });
  },

  // ---------------- scripted moments ----------------
  events: {
    enterHollowmere(scene) {
      if (scene.ended) return;
      scene.ended = true;
      scene.player.frozen = true;
      scene.playLines(['p_portal'], { force: true });
      scene.time.delayedCall(2600, () => {
        scene.cameras.main.fadeOut(1000, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
          GAME.enterWorld('hollowmere');
          scene.scene.stop('HUD');
          scene.scene.start('Cutscene', { id: 'hollowmere', next: { scene: 'Game', data: { world: 'hollowmere' } } });
        });
      });
    },
  },

  onTakedown(scene, w) {
    if (w.id === 'a1') scene.playLines(['p_acolyte_done', 'p_whisper_first']);
  },

  onStillpoint(scene, sp) {
    if (sp.id === 'p1') scene.playLines(['p_stillpoint', 'p_stillpoint_hint']);
  },

  onPickup(scene, item) {
    if (item.kind === 'sand') scene.playLines(['p_sand']);
  },
};

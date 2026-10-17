// =====================================================================
// PROLOGUE: THE HOURGLASS HALL (tutorial, about 15 minutes)
//
// Teaches, in this order (design doc section 10):
//   light hurts (a weak beam) -> time the light (a beam that clouds over)
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

  // Checkpoints. Declared here (not inside build) so the dev menu can list them.
  stillpoints: [
    { id: 'p0', name: 'Where you woke', x: 190, y: FLOOR },
    { id: 'p1', name: 'The Quiet Arch', x: 3240, y: FLOOR },
  ],

  // Dev-menu jump points (Stillpoints are added automatically).
  spawns: [
    { id: 'pd_beam', label: 'Weak beam (light hurts)', x: 600, y: FLOOR },
    { id: 'pd_clouds', label: 'Cloud beam (timing)', x: 1160, y: FLOOR },
    { id: 'pd_gallery', label: 'Pillar gallery (guardian, Merge)', x: 1700, y: FLOOR },
    { id: 'pd_acolyte', label: 'Acolyte (takedown)', x: 2820, y: FLOOR },
    { id: 'pd_foresight', label: 'Foresight corridor', x: 3470, y: FLOOR },
    { id: 'pd_chamber', label: 'Hourglass chamber (the Almoner)', x: 4150, y: FLOOR },
  ],

  build(b) {
    // ---------------- the shell of the hall ----------------
    b.solid(0, FLOOR, 4900, 200, { style: 'hall' });
    b.solid(0, 0, 4900, 150, { style: 'hall', edge: false, trim: false });
    b.solid(0, 150, 60, 550, { style: 'hall', edge: false });
    b.solid(4840, 150, 60, 550, { style: 'hall', edge: false });

    // ---------------- A. waking ----------------
    for (const sp of this.stillpoints) b.stillpoint(sp);
    b.prop('candle', 430, 480, { depth: 9 });
    b.light({ x: 430, y: 462, radius: 160, intensity: 0.55, color: [255, 190, 120], flicker: 0.05, glow: 0.6 });
    b.trigger({ id: 'wake', x: 60, y: 0, w: 600, h: 900, lines: ['p_wake1', 'p_wake2', 'p_hint_move'] });

    // ---------------- B. a weak beam: light hurts ----------------
    b.windowBeam(840, 165, { dir: 98, spread: 9, radius: 640, intensity: 0.5 });
    b.trigger({ id: 'beam', x: 640, y: 0, w: 120, h: 900, lines: ['p_beam1', 'p_beam_hint'] });

    // ---------------- C. a beam that clouds over: time it ----------------
    b.windowBeam(1440, 165, { dir: 94, spread: 12, radius: 660, intensity: 0.95, pulse: { min: 0.08, max: 1, period: 5.5 } });
    b.trigger({ id: 'clouds', x: 1160, y: 0, w: 100, h: 900, lines: ['p_clouds'] });

    // ---------------- D. pillar gallery: Merge behind cover ----------------
    for (const x of [1800, 2040, 2280, 2520, 2760]) b.pillar(x, FLOOR, 60, 550);
    b.watcher({ id: 'g1', type: 'guardian', x: 2300, y: FLOOR, patrol: [1910, 2700], wait: 1.8, facing: -1, bounds: [1860, 2740] });
    b.trigger({ id: 'guard', x: 1640, y: 0, w: 80, h: 900, lines: ['p_guardian1', 'p_merge_hint', 'p_guardian2'] });

    // ---------------- E. the acolyte: strike from behind ----------------
    b.solid(3090, FLOOR - 40, 44, 40, { style: 'hall' });
    b.candle(3112, FLOOR - 40, { radius: 140, intensity: 0.8 });
    b.watcher({ id: 'a1', type: 'acolyte', x: 3010, y: FLOOR, patrol: [3010], facing: 1, bounds: [2900, 3080] });
    b.trigger({ id: 'acolyte', x: 2860, y: 0, w: 60, h: 900, lines: ['p_acolyte1', 'p_strike_hint'] });

    // ---------------- F. a Stillpoint and Sand ----------------
    b.sand({ id: 'ps1', x: 3360, y: FLOOR - 40 });
    b.sand({ id: 'ps2', x: 3420, y: FLOOR - 40 });

    // ---------------- G. Foresight: read the guardian's pacing ----------------
    b.watcher({ id: 'g2', type: 'guardian', x: 3940, y: FLOOR, patrol: [3590, 3960], wait: 1.2, facing: -1, bounds: [3560, 3990] });
    b.prop('crate', 3720, FLOOR, { occlude: [-24, -48, 48, 48] });
    b.prop('crate', 3890, FLOOR, { occlude: [-24, -48, 48, 48] });
    b.trigger({ id: 'foresight', x: 3470, y: 0, w: 60, h: 900, lines: ['p_foresight1', 'p_foresight_hint'] });
    // A full-height pillar seals the corridor's light and sight off from the chamber.
    b.pillar(4030, FLOOR, 60, 550);

    // ---------------- H. the Hourglass chamber and the bargain ----------------
    b.prop('hourglass', 4500, FLOOR, { depth: 6 });
    b.light({ x: 4500, y: 540, radius: 560, intensity: 0.95, color: [255, 214, 150], flicker: 0.02, glow: 0.45 });
    for (const x of [4250, 4370]) b.statue(x, FLOOR);
    for (const x of [4640, 4750]) b.statue(x, FLOOR, { flip: true });
    // The Almoner stands in its own light and casts no shadow. The statues,
    // identical in shape, do. That is the first clue. It is never mentioned.
    b.entityFigure(4535, FLOOR);
    b.trigger({ id: 'chamber', x: 4110, y: 0, w: 60, h: 900, lines: ['p_statues', 'p_dash_hint'] });
    b.trigger({ id: 'bargain', x: 4330, y: 0, w: 40, h: 900, lines: ['p_bargain1', 'p_bargain2', 'p_bargain3'] });

    const s = b.s;
    const portal = s.add.image(4800, FLOOR - 100, 'portal').setDepth(35).setBlendMode('ADD').setAlpha(0.9);
    s.tweens.add({ targets: portal, scaleX: 1.06, scaleY: 0.97, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    b.light({ x: 4800, y: FLOOR - 100, radius: 200, intensity: 0.5, color: [232, 195, 114], harmless: true, glow: 0.6 });
    b.interact({
      id: 'portal', x: 4800, y: FLOOR, label: 'Step through to Hollowmere', promptH: 220,
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
    if (sp.id === 'p1') scene.playLines(['p_stillpoint']);
  },

  onPickup(scene, item) {
    if (item.kind === 'sand') scene.playLines(['p_sand']);
  },
};

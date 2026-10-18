// =====================================================================
// WORLD 7: THE LAST NOON  (Survive and break the sun) - the final world
//
// Unique rule: the sun stopped overhead eleven years ago. Under the ash it is
// harsh daylight everywhere (Dim: they see you from far off), and where the
// sun burns through in shafts, or fire burns in braziers, it is Light.
//
// This is the world where you are nearly whole. Six fragments are home, and
// with them the powers they gave back. The level is a run through them, each
// taught once in a safe spot and then used together, ending in a boss:
//   1. The Burning Road   Black Ember (a brazier in a tunnel), Cling (a shaft),
//                         Shadow Dash (sunshafts)
//   2. The Ash Market     Lanternmen and Acolytes you once fled, now prey
//                         (dash-cuts), a Sunguard (Echo, or three Embers),
//                         a Remnant: LEVEL UP, Black Ember II
//   3. The Bridge         an ambush, and ECLIPSE awakens; a Remnant: Eclipse II
//   4. The Sun Stair      everything at once
//   5. The Noon Throne    the Sun-Warden
// =====================================================================

import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { TUNING } from '../tuning.js';
import { bus } from '../systems/bus.js';
import { Warden } from '../entities/Warden.js';

const G = 760;
const WIDTH = 7800;               // the world ends at the Warden's back: the camera frames his whole throne
const ARENA = [6140, 7700];
const ROAD = 0xffb08a;           // the ground is lit red from below

export default {
  id: 'lastnoon',
  name: 'The Last Noon',
  width: WIDTH,
  height: 1080,
  sky: 'noon',
  ambience: 'noon',
  fog: false,
  grabsHurt: true,                // you are strong now: a grab is a blow, not a death
  start: 'n1',
  horizonY: G,
  grade: { shadow: [1.05, 0.86, 0.86], high: [1.2, 1.02, 0.86], vig: 0.62 },

  stillpoints: [
    { id: 'n1', name: 'The Ash Gate', x: 170, y: G },
    { id: 'n2', name: 'The Cinder Well', x: 3330, y: G },
    { id: 'n3', name: 'Below the Throne', x: 6020, y: G },
  ],

  spawns: [
    { id: 'nd_ember', label: 'Black Ember (brazier tunnel)', x: 300, y: G },
    { id: 'nd_cling', label: 'Cling (the shaft)', x: 700, y: G },
    { id: 'nd_shafts', label: 'Sunshafts (Shadow Dash)', x: 1250, y: G },
    { id: 'nd_market', label: 'SHOWCASE: Ash Market (dash-cuts)', x: 1820, y: G },
    { id: 'nd_echo', label: 'Sunguard gate (Echo)', x: 2520, y: G },
    { id: 'nd_remnant', label: 'Remnant: Black Ember II', x: 2860, y: G },
    { id: 'nd_ambush', label: 'SHOWCASE: the ambush (Eclipse awakens)', x: 3900, y: G },
    { id: 'nd_stair', label: 'The Sun Stair', x: 5060, y: G, abilities: ['eclipse'] },
    { id: 'nd_boss', label: 'SHOWCASE: the Sun-Warden', x: 6060, y: G, abilities: ['eclipse'] },
  ],

  build(b, scene) {
    const s = b.s;
    for (const sp of this.stillpoints) b.stillpoint(sp);
    b.stack(0, G, 40, 600, { cover: false, depth: 20 });
    b.stack(WIDTH - 40, G, 40, 600, { cover: false, depth: 20 });

    // ================= 1. THE BURNING ROAD (0 - 1700) =================
    b.solid(0, G, 1700, 320, { style: 'stone', top: 'cobble', tint: ROAD });
    b.trigger({ id: 'arrive', x: 40, y: 0, w: 300, h: 1000, lines: ['n_arrive1', 'n_arrive2', 'n_whisper1'], event: 'ledgerIntro' });

    // A low tunnel under a fallen gatehouse, a brazier burning inside it.
    b.solid(400, G - 170, 260, 40, { style: 'stone', top: 'cobble', tint: ROAD });
    b.stack(400, G, 26, 130, { cover: false, depth: 18 });
    b.stack(634, G, 26, 130, { cover: false, depth: 18 });
    b.brazier(530, G, { radius: 210 });
    b.trigger({ id: 'ember', x: 300, y: 0, w: 60, h: 1000, lines: ['n_ember', 'n_ember_hint'] });

    // A rampart too tall to jump, and a ruined tower beside it: climb the gap.
    b.solid(780, G - 300, 40, 300, { style: 'stone', top: false, tint: ROAD });
    b.solid(890, G - 260, 300, 260, { style: 'stone', top: 'cobble', tint: ROAD });
    b.trigger({ id: 'cling', x: 690, y: 0, w: 60, h: 1000, lines: ['n_cling', 'n_cling_hint'] });

    // The sun breaking through the ash.
    for (const x of [1340, 1470, 1600]) b.sunshaft(x, { spread: 3.5 });
    b.trigger({ id: 'shafts', x: 1230, y: 0, w: 60, h: 1000, lines: ['n_shafts', 'n_shaft_hint'] });

    // ================= 2. THE ASH MARKET (1700 - 3600) =================
    b.solid(1700, G, 1900, 320, { style: 'stone', top: 'cobble', tint: ROAD });
    // market awnings: the only shade under the noon sun
    for (const [x, w] of [[1880, 130], [2120, 150], [2400, 130]]) {
      b.ledge(x, G - 130, w);
      b.stack(x + 6, G, 10, 130, { cover: false, depth: 15 });
      b.stack(x + w - 16, G, 10, 130, { cover: false, depth: 15 });
    }
    b.house(1760, G, 180, 200, { windows: [[40, 50, true], [120, 50, false]], seed: 71, windowRadius: 140, smoke: false });
    b.watcher({ id: 'lm_a', type: 'lanternman', x: 2050, y: G, patrol: [1960, 2300], wait: 1.2, facing: 1, bounds: [1900, 2360] });
    b.watcher({ id: 'ac_a', type: 'acolyte', x: 2380, y: G, patrol: [2380], facing: -1, turnEvery: 3 });
    b.watcher({ id: 'lm_b', type: 'lanternman', x: 2250, y: G, patrol: [2420, 2160], wait: 1.4, facing: -1, bounds: [2120, 2480] });
    b.trigger({ id: 'market', x: 1800, y: 0, w: 60, h: 1000, lines: ['n_market', 'n_dashcut_hint', 'n_whisper2'] });

    // The Sunguard holding the market gate.
    b.prop('gate_arch', 2760, G, { depth: 12 });
    b.watcher({ id: 'sg_gate', type: 'sunguard', x: 2700, y: G, patrol: [2700], facing: -1 });
    b.trigger({ id: 'sunguard', x: 2500, y: 0, w: 60, h: 1000, lines: ['n_sunguard', 'n_echo_hint', 'n_sunguard_hint'] });
    // Remnant on top of a broken tower (Cling up the gap)
    b.solid(2900, G - 240, 50, 240, { style: 'stone', top: 'cobble', tint: ROAD });
    b.solid(3010, G - 300, 60, 300, { style: 'stone', top: 'cobble', tint: ROAD });
    b.remnant({ id: 'r_ember', x: 3040, y: G - 340, upgrade: 'ember2', title: 'BLACK EMBER II', text: 'Your black fire pierces through enemies and bursts where it lands.' });
    b.brazier(3120, G);
    b.brazier(3580, G);

    // ================= 3. THE BRIDGE (3600 - 4900) =================
    b.solid(3600, G, 1400, 320, { style: 'stone', top: 'cobble', tint: 0xd89a86 });
    for (const x of [3700, 4000, 4300, 4600, 4900]) b.stack(x, G, 18, 70, { cover: false, depth: 18, tint: 0xb07a6a });
    // they wait out of sight until the trap is sprung
    const amb = [
      ['lm_x1', 'lanternman', 3640, 1], ['ac_x1', 'acolyte', 3700, 1], ['lm_x2', 'lanternman', 4560, -1],
      ['ac_x2', 'acolyte', 4500, -1], ['sg_x1', 'sunguard', 4660, -1], ['ac_x3', 'acolyte', 4620, -1],
    ];
    for (const [id, type, x, facing] of amb) b.watcher({ id, type, x, y: G, patrol: [x], facing, dormant: true, bounds: [3620, 4980] });
    b.trigger({ id: 'ambush', x: 4060, y: 0, w: 60, h: 1000, event: 'ambush' });
    b.remnant({ id: 'r_eclipse', x: 4960, y: G - 330, upgrade: 'eclipse2', title: 'ECLIPSE II', text: 'The Corona reaches further, and takes more of them with it.' });
    b.solid(4910, G - 290, 40, 290, { style: 'stone', top: 'cobble', tint: ROAD });
    b.solid(5010, G - 250, 90, 250, { style: 'stone', top: 'cobble', tint: ROAD });

    // ================= 4. THE SUN STAIR (5000 - 6100) =================
    b.solid(5000, G, WIDTH - 5000, 320, { style: 'stone', top: 'cobble', tint: ROAD });
    b.ledge(5260, G - 120, 120);
    b.ledge(5440, G - 220, 120);
    b.ledge(5620, G - 140, 140);
    for (const x of [5330, 5520, 5700]) b.sunshaft(x, { spread: 3 });
    b.brazier(5760, G);
    b.watcher({ id: 'sg_stair', type: 'sunguard', x: 5600, y: G, patrol: [5480, 5700], wait: 1.6, facing: -1, bounds: [5440, 5720] });
    b.watcher({ id: 'lm_stair', type: 'lanternman', x: 5380, y: G, patrol: [5300, 5440], wait: 1, facing: 1, bounds: [5260, 5460] });
    b.trigger({ id: 'stair', x: 5100, y: 0, w: 60, h: 1000, lines: ['n_stair'] });

    // ================= 5. THE NOON THRONE (6100 - 7700) =================
    b.pillar(6520, G, 60, 280);
    b.pillar(7040, G, 60, 280);
    const braziers = [6330, 6800, 7300].map((x) => b.brazier(x, G, { radius: 240, onSnuff: () => scene.boss?.emit() }));
    b.solid(WIDTH - 80, G - 600, 40, 600, { style: 'stone', top: false, tint: 0x8a5a52 });
    scene.boss = new Warden(scene, { x: 7560, groundY: G, braziers, arena: ARENA, spawnXs: [6220, 6680] });
    b.trigger({ id: 'throne', x: 6160, y: 0, w: 60, h: 1000, event: 'throne' });
    b.trigger({ id: 'outro', x: 7380, y: 0, w: 120, h: 1000, event: 'leave', requires: 'wardenDown' });
  },

  onStart(scene) {
    scene.lighting.setSun({ enabled: true, elevation: TUNING.noon.elevation, intensity: TUNING.noon.sunIntensity });
    scene.clockOn = false;
    // However you got here (Chapters, the dev menu, a save), you arrive six fragments strong.
    const d = GAME.data;
    for (const a of ['cling', 'echo', 'ember', 'dashCut']) if (!d.abilities.includes(a)) d.abilities.push(a);
    d.fragments = Math.max(d.fragments, 6);
    // dev jumps past the ambush arrive with Eclipse already awakened
    const sp = scene.currentSpawn;
    for (const a of sp?.abilities ?? []) if (!GAME.hasAbility(a)) GAME.data.abilities.push(a);
    if (GAME.flag('wardenDown')) this.events.nightfall(scene, true);
  },

  onUpdate(scene) {
    // the sun in the sky flares when the Warden calls down a lance
    const sun = scene.decor.sun;
    if (sun && scene.boss && scene.boss.state !== 'dead') sun.setScale(5 + (scene.boss.lances.length ? 0.8 : 0) + Math.sin(scene.simTime * 2) * 0.15);
  },

  events: {
    // shown once per run, not on every respawn at the first Stillpoint
    ledgerIntro() {
      if (GAME.lineSeen('n_ledger_intro')) return;
      GAME.markLineSeen('n_ledger_intro');
      bus.emit('ledgerIntro');
    },

    ambush(scene) {
      for (const w of scene.watchers) {
        if (!/_x\d$/.test(w.id)) continue;      // the ambushers: lm_x1, ac_x2, sg_x1, ...
        w.wake();
        w.stun(1.6 + Math.random() * 0.5, true);     // a beat to rise out of hiding before they charge
      }
      AUDIO.play('alert', { pan: 0 });
      if (scene.settings.shake) scene.cameras.main.shake(300, 0.005);
      scene.playLines(['n_ambush', 'n_eclipse_hint']);
      // the last power wakes up in you
      if (!GAME.hasAbility('eclipse')) {
        scene.time.delayedCall(1100, () => {
          GAME.data.abilities.push('eclipse');
          GAME.save();
          scene.abilities.warpUntil = performance.now() + 1600;   // the world slows as it wakes in you
          scene.abilities.charge = TUNING.abilities.eclipse.killsToCharge;
          AUDIO.play('levelUp');
          scene.cameras.main.flash(300, 255, 241, 192);
          scene.abilities.ring(scene.player.x, scene.player.y, 200, 0xfff1c0, 600, 8);
          bus.emit('levelup', { title: 'ABILITY AWAKENED: ECLIPSE', text: 'Press I. For a few seconds the light cannot touch you, and the Corona throws down everything near.' });
        });
      }
    },

    throne(scene) {
      scene.setFlag('throneEntered', true);
      // the way back closes: a wall of fire-glass rises behind you
      const s = scene;
      const wall = s.add.tileSprite(ARENA[0] - 50, G - 420, 40, 420, 'stone_body').setOrigin(0).setDepth(20).setTint(0xffb08a).setAlpha(0);
      s.tweens.add({ targets: wall, alpha: 1, duration: 600 });
      const z = s.add.zone(ARENA[0] - 30, G - 210, 40, 420);
      s.physics.add.existing(z, true);
      s.physics.add.collider(s.player.zone, z);
      s.solidRects.push({ x: ARENA[0] - 50, y: G - 420, w: 40, h: 420 });
      s.lighting.addRectOccluder(ARENA[0] - 50, G - 420, 40, 420, 'solid');
      scene.playLines(['n_throne1', 'n_throne2']);
      scene.time.delayedCall(1800, () => scene.boss?.start());
      AUDIO.setAmbience('boss');
    },

    wardenDown(scene) {
      scene.setFlag('wardenDown', true);
      GAME.addLedger('noon_saved');
      this.nightfall(scene, false);
      scene.playLines(['n_end1', 'n_end2', 'n_end_hint'], { force: true });
    },

    // The sun goes down at last.
    nightfall(scene, instant) {
      const d = scene.decor;
      const ms = instant ? 0 : 5000;
      scene.lighting.setSun({ enabled: false });
      const night = scene.add.image(0, 0, 'sky_night').setOrigin(0).setScrollFactor(0).setDisplaySize(TUNING.view.width, TUNING.view.height).setDepth(0.05).setAlpha(instant ? 1 : 0);
      if (!instant) scene.tweens.add({ targets: night, alpha: 1, duration: ms });
      const fade = [d.sun, d.sunHalo, d.sunRing].filter(Boolean);
      if (instant) fade.forEach((o) => o.setAlpha(0));
      else scene.tweens.add({ targets: fade, alpha: 0, y: '+=200', duration: ms });
      for (const L of d.layers ?? []) {
        if (instant) L.setTint(0x6a6a9a);
        else scene.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (tw) => { const k = tw.getValue(); const c = Math.round(255 - k * 150); L.setTint((c << 16) | (Math.round(255 - k * 150) << 8) | Math.round(255 - k * 80)); } });
      }
      AUDIO.setAmbience('night');
    },

    leave(scene) {
      if (scene.ended) return;
      scene.completeWorld();
      GAME.data.fragments = 7;
      GAME.addLedger('noon_whole');
      GAME.save();
      scene.time.delayedCall(1200, () => {
        scene.cameras.main.fadeOut(1400, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
          scene.scene.stop('HUD');
          scene.scene.start('Cutscene', { id: 'lastnoon_end', next: { scene: 'End', data: { type: 'final', world: 'lastnoon', name: 'The Last Noon' } } });
        });
      });
    },
  },
};

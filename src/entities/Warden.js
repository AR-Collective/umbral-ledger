// =====================================================================
// THE SUN-WARDEN: boss of the Last Noon (design doc 4.12, World 7).
//
// He holds the sun in place. His halo IS a piece of it: a real burning light.
// Every power the shadow has regained is part of the fight:
//   * three braziers feed his shield. Black Ember (or a Corona) snuffs them.
//   * with all three out he kneels and his core shows: strike it, dash through
//     it, ember it or Corona it for one CRACK. Three cracks and the sun breaks.
//   * he answers with sun-lances (a marked column of noon: move, dash, or
//     Eclipse through it), a beam that sweeps the floor from his halo (hide
//     behind a pillar or Eclipse), and, at the end, acolytes (fuel for Eclipse).
// Rules are readable on purpose: every attack is telegraphed, and the thing
// you must hit glows.
// =====================================================================

import { TUNING } from '../tuning.js';
import { AUDIO } from '../systems/audio.js';
import { bus } from '../systems/bus.js';
import { Watcher } from './Watcher.js';
import { WARDEN_SIZE } from '../art/chars/warden.js';

const W = WARDEN_SIZE;
const ORIGIN_Y = (W.h - 10) / W.h;   // the painted feet sit 10 px above the bottom of the canvas

export class Warden {
  constructor(scene, def) {
    this.scene = scene;
    this.x = def.x;
    this.groundY = def.groundY;
    this.braziers = def.braziers;
    this.arena = def.arena;          // [x1, x2]
    this.spawnXs = def.spawnXs ?? [this.arena[0] + 60, this.arena[0] + 260];
    this.state = 'idle';
    this.phase = 0;
    this.cracks = 0;
    this.t = 0;
    this.timers = { lance: 1.6, sweep: 5, summon: 4 };
    this.lances = [];
    this.touchCd = 0;

    const s = scene;
    this.haloImg = s.add.image(0, 0, 'warden_halo').setDepth(13).setBlendMode('ADD').setScale(1.15).setAlpha(0.95);
    this.body = s.add.image(this.x, this.groundY, 'warden_stand').setOrigin(0.5, ORIGIN_Y).setDepth(34);
    this.coreImg = s.add.image(0, 0, 'warden_core').setDepth(35).setBlendMode('ADD').setScale(0.9).setAlpha(0.7);
    this.crackGfx = s.add.graphics().setDepth(35.5);
    this.shieldGfx = s.add.graphics().setDepth(44).setBlendMode('ADD');
    this.markGfx = s.add.graphics().setDepth(44).setBlendMode('ADD');
    // the halo is the sun: it burns anything close
    this.haloLight = s.lighting.addLight({ x: 0, y: 0, radius: 330, intensity: 0.95, color: [255, 230, 170], flicker: 0.03, fire: true, kind: 'burn' });
    this.sweepLight = s.lighting.addLight({ x: 0, y: 0, radius: 1500, intensity: 0.98, color: [255, 236, 190], cone: { dir: 120, spread: 8 }, kind: 'beam', enabled: false });
    this.sweepLight.enabled = false;
    this.place();
    this.emit();
  }

  get kneeling() { return this.state === 'stagger'; }
  shieldUp() { return this.braziers.some((b) => b.lit); }

  // where things are on the body this frame (kneeling lowers them)
  headPos() { const k = this.kneeling ? 1 : 0; return [this.x + 20, this.groundY - (W.h - 10 - W.headY) + k * 110]; }
  corePos() { const k = this.kneeling ? 1 : 0; return [this.x + (W.coreX - W.w / 2), this.groundY - (W.h - 10 - W.coreY) + k * 96]; }

  place() {
    const [hx, hy] = this.headPos();
    const [cx, cy] = this.corePos();
    this.haloImg.setPosition(hx, hy);
    this.haloLight.x = hx; this.haloLight.y = hy;
    this.coreImg.setPosition(cx, cy);
  }

  emit() {
    bus.emit('boss', { name: 'THE SUN-WARDEN', cracks: this.cracks, total: TUNING.warden.cracks, shield: this.shieldUp(), state: this.state, lit: this.braziers.filter((b) => b.lit).length });
  }

  start() {
    if (this.state !== 'idle') return;
    this.state = 'fight';
    this.phase = 0;
    AUDIO.play('roar', { pan: 0.6, vol: 0.8 });
    this.scene.cameras.main.shake(400, 0.006);
    this.emit();
  }

  // ------------------------------------------------------------------
  update(dt, p) {
    const s = this.scene;
    this.t += dt;
    this.touchCd -= dt;
    this.haloImg.setRotation(this.t * 0.25);
    this.place();
    this.updateLances(dt, p);
    this.drawShield();
    if (this.state === 'dead' || this.state === 'dying') return;

    // the core breathes; brighter when it is exposed
    const exposed = this.kneeling;
    this.coreImg.setAlpha(exposed ? 0.85 + Math.sin(this.t * 10) * 0.15 : 0.35 + Math.sin(this.t * 3) * 0.08).setScale(exposed ? 1.4 : 0.8);

    // touching him while he stands burns and throws you back
    if (!exposed && this.state !== 'idle' && this.touchCd <= 0 && !p.dead && Math.abs(p.x - (this.x - 30)) < 70 && p.feetY > this.groundY - 300) {
      this.touchCd = 1;
      if (p.eclipseT <= 0) { p.hurt(22); s.onBurnTick(22, true); }
      p.knock(-1, 520);
    }

    if (this.state === 'fight') {
      if (!this.shieldUp()) { this.stagger(); return; }
      const T = TUNING.warden;
      const ph = Math.min(this.phase, 2);
      this.timers.lance -= dt;
      if (this.timers.lance <= 0) { this.timers.lance = T.lanceEvery[ph]; this.lance(p); }
      if (T.sweepEvery[ph]) {
        this.timers.sweep -= dt;
        if (this.timers.sweep <= 0 && !this.sweep) { this.timers.sweep = T.sweepEvery[ph]; this.startSweep(); }
      }
      if (T.summonEvery[ph]) {
        this.timers.summon -= dt;
        if (this.timers.summon <= 0) { this.timers.summon = T.summonEvery[ph]; this.summon(); }
      }
      this.updateSweep(dt);
      const raising = this.lances.some((l) => l.tell > 0) || !!this.sweep;
      this.body.setTexture(raising ? 'warden_raise' : 'warden_stand');
    } else if (this.state === 'stagger') {
      this.staggerT -= dt;
      if (this.staggerT <= 0) this.rise();
    }
  }

  // ---------------- sun-lances: a column of noon where you stand ----------------
  lance(p) {
    const T = TUNING.warden;
    const x = Math.max(this.arena[0] + 30, Math.min(this.x - 120, p.x + p.body.velocity.x * 0.25));
    this.lances.push({ x, tell: T.lanceTell, fire: 0, light: null });
    AUDIO.play('lanceTell', this.scene.spatialFor(x));
  }

  updateLances(dt, p) {
    const s = this.scene;
    const T = TUNING.warden;
    const g = this.markGfx;
    g.clear();
    for (const l of this.lances) {
      if (l.tell > 0) {
        l.tell -= dt;
        const k = 1 - l.tell / T.lanceTell;
        // the warning: a ring of sunlight closing on the ground, a faint column above it
        g.fillStyle(0xfff1c0, 0.08 + k * 0.18);
        g.fillRect(l.x - T.lanceWidth / 2, this.groundY - 900, T.lanceWidth, 900);
        g.lineStyle(3, 0xffe6a8, 0.5 + k * 0.5);
        g.strokeEllipse(l.x, this.groundY - 2, T.lanceWidth * (2.2 - k * 1.2), 16 * (2.2 - k * 1.2));
        if (l.tell <= 0) this.lanceStrike(l, p);
      } else if (l.fire > 0) {
        l.fire -= dt;
        const k = l.fire / 0.45;
        g.fillStyle(0xffffff, 0.75 * k);
        g.fillRect(l.x - T.lanceWidth / 2 * (0.6 + k * 0.4), this.groundY - 900, T.lanceWidth * (0.6 + k * 0.4), 900);
        g.fillStyle(0xffe6a8, 0.35 * k);
        g.fillRect(l.x - T.lanceWidth, this.groundY - 900, T.lanceWidth * 2, 900);
        if (l.fire <= 0) { l.done = true; if (l.light) s.lighting.removeLight(l.light); }
      }
    }
    this.lances = this.lances.filter((l) => !l.done);
  }

  lanceStrike(l, p) {
    const s = this.scene;
    const T = TUNING.warden;
    l.fire = 0.45;
    l.light = s.lighting.addLight({ x: l.x, y: this.groundY - 880, radius: 920, intensity: 1, color: [255, 244, 214], cone: { dir: 90, spread: 3 }, kind: 'beam' });
    s.add.particles(l.x, this.groundY - 6, 'spark', {
      lifespan: { min: 400, max: 900 }, speed: { min: 80, max: 300 }, angle: { min: 190, max: 350 }, gravityY: 500, scale: { start: 1.3, end: 0 },
      tint: [0xffffff, 0xfff1c0, 0xffb050], blendMode: 'ADD', emitting: false,
    }).setDepth(45).explode(30);
    if (s.settings.shake) s.cameras.main.shake(160, 0.005);
    AUDIO.play('lance', s.spatialFor(l.x));
    if (!p.dead && Math.abs(p.x - l.x) < T.lanceWidth / 2 + 10 && p.eclipseT <= 0) {
      p.hurt(T.lanceDamage);
      s.onBurnTick(T.lanceDamage, true);
      p.knock(Math.sign(p.x - l.x) || -1, 360);
      if (p.substance <= 0) s.killPlayer('fire');
    }
  }

  // ---------------- the sweep: his halo's gaze crosses the floor ----------------
  startSweep() {
    this.sweep = { t: 0 };
    this.sweepLight.enabled = true;
    AUDIO.play('lanceTell', { pan: 0.4, vol: 1 });
  }

  updateSweep(dt) {
    if (!this.sweep) return;
    const T = TUNING.warden;
    this.sweep.t += dt;
    const k = this.sweep.t / T.sweepTime;
    const [hx, hy] = this.headPos();
    this.sweepLight.x = hx - 20; this.sweepLight.y = hy;
    // from his feet out across the floor and back
    this.sweepLight.cone.dir = 112 + Math.sin(Math.min(1, k) * Math.PI) * 58;
    this.sweepLight.intensity = Math.min(1, this.sweep.t * 3) * 0.98;
    if (k >= 1) { this.sweep = null; this.sweepLight.enabled = false; }
  }

  // ---------------- acolytes, called out of the fire ----------------
  summon() {
    const s = this.scene;
    for (const x of this.spawnXs) {
      if (s.watchers.filter((w) => w.tag === 'summoned' && w.mode !== 'down').length >= 3) break;
      const w = new Watcher(s, { id: `sum${Math.round(s.simTime * 10)}_${x}`, type: 'acolyte', x, y: this.groundY, patrol: [x], tag: 'summoned', bounds: this.arena });
      s.watchers.push(w);
      w.becomeAlert({ id: 'player', x: s.player.x }, true);
      s.add.particles(x, this.groundY - 20, 'spark', {
        lifespan: 700, speed: { min: 40, max: 160 }, angle: { min: 200, max: 340 }, scale: { start: 1.2, end: 0 }, tint: [0xfff1c0, 0xffb050], blendMode: 'ADD', emitting: false,
      }).setDepth(45).explode(24);
    }
    AUDIO.play('alert', { pan: -0.3 });
  }

  // ---------------- the shield and the stagger ----------------
  drawShield() {
    const g = this.shieldGfx;
    g.clear();
    if (this.state === 'dead' || this.state === 'dying' || !this.shieldUp() || this.state === 'idle') return;
    const [cx, cy] = this.corePos();
    const lit = this.braziers.filter((b) => b.lit).length;
    const a = 0.18 + 0.06 * lit + Math.sin(this.t * 4) * 0.04;
    for (let i = 0; i < 3; i++) {
      g.lineStyle(3 - i, 0xffe6a8, a * (1 - i * 0.28));
      g.strokeEllipse(cx - 10, cy - 20, 300 + i * 18 + Math.sin(this.t * 3 + i) * 6, 400 + i * 18);
    }
    // threads of light from each burning brazier to the shield
    for (const b of this.braziers) {
      if (!b.lit) continue;
      g.lineStyle(2, 0xffc070, 0.35 + Math.sin(this.t * 8 + b.x) * 0.15);
      g.lineBetween(b.x, b.y - 10, cx - 10, cy - 20);
    }
  }

  stagger() {
    const s = this.scene;
    this.state = 'stagger';
    this.staggerT = TUNING.warden.staggerTime;
    this.sweep = null; this.sweepLight.enabled = false;
    this.body.setTexture('warden_kneel');
    this.haloLight.intensity = 0.25;           // his sun gutters: you can come close now
    this.haloImg.setAlpha(0.45);
    AUDIO.play('shieldBreak');
    s.cameras.main.shake(500, 0.01);
    s.cameras.main.flash(200, 255, 230, 180);
    s.playLines(['n_warden_kneel']);
    this.emit();
  }

  // He stands, and a moment later his braziers catch again (and with them, his shield).
  rise() {
    const s = this.scene;
    this.state = 'rising';
    this.body.setTexture('warden_stand');
    this.haloLight.intensity = 0.95;
    this.haloImg.setAlpha(0.95);
    this.timers.lance = 2.2;
    this.emit();
    s.time.delayedCall(TUNING.warden.relightDelay * 1000, () => {
      if (this.state !== 'rising') return;
      for (const b of this.braziers) b.relight();
      AUDIO.play('relight');
      this.state = 'fight';
      this.emit();
    });
  }

  // ---------------- being hit ----------------
  hitCore(x, y, reach) {
    if (!this.kneeling || this.crackedThisStagger) return false;
    const [cx, cy] = this.corePos();
    if (Math.hypot(cx - x, cy - y) > reach) return false;
    this.crack();
    return true;
  }

  crack() {
    const s = this.scene;
    this.crackedThisStagger = true;
    this.cracks += 1;
    s.abilities.warpUntil = performance.now() + 700;
    s.cameras.main.flash(300, 255, 255, 255);
    s.cameras.main.shake(600, 0.014);
    AUDIO.play('wardenHit');
    const [cx, cy] = this.corePos();
    s.add.particles(cx, cy, 'spark', {
      lifespan: { min: 500, max: 1300 }, speed: { min: 120, max: 520 }, scale: { start: 1.8, end: 0 }, tint: [0xffffff, 0xfff1c0, 0xffb050],
      blendMode: 'ADD', emitting: false,
    }).setDepth(46).explode(80);
    s.abilities.ring(cx, cy, 260, 0xfff1c0, 600, 10);
    this.drawCracks();
    this.emit();
    if (this.cracks >= TUNING.warden.cracks) { this.die(); return; }
    this.phase += 1;
    s.playLines([this.cracks === 1 ? 'n_warden_crack1' : 'n_warden_crack2']);
    s.time.delayedCall(1300, () => { this.crackedThisStagger = false; this.rise(); });
  }

  drawCracks() {
    const g = this.crackGfx;
    g.clear();
    const [cx, cy] = this.corePos();
    g.lineStyle(3, 0xffffff, 0.95);
    for (let i = 0; i < this.cracks * 3; i++) {
      const a = i * 2.39;
      let x = cx, y = cy;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 3; j++) { x += Math.cos(a + j * 0.4) * 14; y += Math.sin(a + j * 0.4) * 14; g.lineTo(x, y); }
      g.strokePath();
    }
  }

  // Black Ember: the shield turns it aside; the exposed core takes it.
  emberHit(x, y) {
    if (this.state === 'dead' || this.state === 'dying') return false;
    if (this.hitCore(x, y, 70)) return true;
    const [cx, cy] = this.corePos();
    if (this.shieldUp() && this.state !== 'idle' && Math.abs(x - (cx - 10)) < 150 && Math.abs(y - (cy - 20)) < 200) {
      this.scene.add.particles(x, y, 'spark', { lifespan: 300, speed: { min: 80, max: 220 }, scale: { start: 1, end: 0 }, tint: 0xfff1c0, blendMode: 'ADD', emitting: false }).setDepth(45).explode(12);
      return true;
    }
    return Math.abs(x - this.x) < 60 && y > this.groundY - 420;
  }

  corona(x, y, R) { this.hitCore(x, y, R); }
  strikeHit(p) { return this.hitCore(p.x + p.facing * 30, p.y - 10, 110); }
  dashHit(p) { return this.hitCore(p.x, p.y - 10, 90); }

  // ---------------- the end of noon ----------------
  die() {
    const s = this.scene;
    this.state = 'dying';
    this.sweepLight.enabled = false;
    this.emit();
    const [hx, hy] = this.headPos();
    s.add.particles(hx, hy, 'spark', {
      lifespan: { min: 900, max: 2200 }, speed: { min: 100, max: 600 }, scale: { start: 2.2, end: 0 }, tint: [0xffffff, 0xfff1c0, 0xffd27a, 0xff8a30],
      blendMode: 'ADD', emitting: false,
    }).setDepth(46).explode(160);
    s.tweens.add({ targets: this.haloImg, scale: 3, alpha: 0, duration: 1400, ease: 'Cubic.easeOut' });
    s.tweens.add({ targets: [this.coreImg], alpha: 0, duration: 900 });
    s.tweens.add({ targets: this.haloLight, intensity: 0, duration: 1400 });
    s.tweens.add({ targets: this.body, alpha: 0, y: this.groundY + 40, duration: 3200, delay: 600, ease: 'Quad.easeIn' });
    s.tweens.add({ targets: this.crackGfx, alpha: 0, duration: 1600 });
    for (const w of s.watchers) if (w.tag === 'summoned' && w.mode !== 'down') w.takeDown();
    AUDIO.play('sunBreak');
    s.time.delayedCall(1500, () => { this.state = 'dead'; this.haloLight.enabled = false; this.emit(); s.level.events?.wardenDown?.(s); });
  }

  destroy() {
    for (const o of [this.haloImg, this.body, this.coreImg, this.crackGfx, this.shieldGfx, this.markGfx]) o.destroy();
    this.scene.lighting.removeLight(this.haloLight);
    this.scene.lighting.removeLight(this.sweepLight);
    for (const l of this.lances) if (l.light) this.scene.lighting.removeLight(l.light);
  }
}

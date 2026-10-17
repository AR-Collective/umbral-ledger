// The Wick-Mother: Hollowmere's climax. You cannot fight her. You outrun her
// through the long shadows of dawn while her candle-light burns behind you.

import { TUNING } from '../tuning.js';
import { AUDIO } from '../systems/audio.js';
import { feetOrigin, anchorFor } from '../art/characters.js';

export class WickMother {
  constructor(scene, x, groundY) {
    const W = TUNING.wickMother;
    this.scene = scene;
    this.x = x;
    this.groundY = groundY;
    this.time = 0;
    this.stepT = 0;
    this.lungeCd = W.lungeEvery[0];
    this.tellT = 0;
    this.lungeT = 0;
    this.active = false;
    this.lungeFrom = 0;

    const [ox, oy] = feetOrigin('wickmother');
    this.sprite = scene.add.sprite(x, groundY, 'wickmother', 0).setOrigin(ox, oy).setDepth(37);
    this.sprite.play('wickmother_walk');
    // Fire source 1: the candles jammed into her hump (painted into the sheet).
    // The flames emitter spawns at the per-frame wick tips recorded by the art.
    this.wicks = [];
    const wicks = this.wicks;
    this.crownGlow = scene.add.image(x, groundY - 380, 'flare').setDepth(38).setBlendMode('ADD').setTint(0xffa050).setScale(2.2).setAlpha(0.55);
    this.flames = scene.add.particles(0, 0, 'flame', {
      lifespan: 420, speedY: { min: -55, max: -22 }, speedX: { min: -8, max: 8 }, scale: { start: 0.8, end: 0.15 },
      alpha: { start: 1, end: 0 }, tint: [0xfff0c0, 0xffb050, 0xff6a20], blendMode: 'ADD', frequency: 26, quantity: 2,
      emitZone: { type: 'random', source: { getRandomPoint(pt) {
        const w = wicks.length ? wicks[(Math.random() * wicks.length) | 0] : { x: 0, y: 0 };
        pt.x = w.x + (Math.random() - 0.5) * 3; pt.y = w.y; return pt;
      } } },
    }).setDepth(38);
    this.ash = scene.add.particles(0, 0, 'ember', {
      lifespan: 1600, speedY: { min: -120, max: -40 }, speedX: { min: -60, max: 30 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffd080, 0xff7a2a], blendMode: 'ADD', frequency: 45, x: { min: -50, max: 40 },
    }).setDepth(38);
    // Fire source 2: the furnace in her throat. Embers drip from the hanging jaw.
    this.mawGlow = scene.add.image(x, groundY - 260, 'flare').setDepth(38).setBlendMode('ADD').setTint(0xff6a28).setScale(1.1).setAlpha(0.5);
    this.drool = scene.add.particles(0, 0, 'ember', {
      lifespan: 700, speedY: { min: 10, max: 60 }, speedX: { min: -20, max: 30 }, gravityY: 260, scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffc060, 0xff5a1a], blendMode: 'ADD', frequency: 80, x: { min: -14, max: 14 },
    }).setDepth(38);
    // Level scripts fade `crown` with the body when the chase ends: alias it to the maw glow.
    this.crown = this.mawGlow;
    this.light = scene.lighting.addLight({ x, y: groundY - 380, radius: W.lightRadius, intensity: W.lightIntensity, color: [255, 160, 80], flicker: 0.1, fire: true });
    this.cone = scene.lighting.addLight({ x, y: groundY - 260, radius: W.coneRadius, intensity: W.coneIntensity, color: [255, 150, 70], cone: { dir: W.coneDir, spread: W.coneSpread }, flicker: 0.1, fire: true });
    this.setVisible(false);
  }

  setVisible(v) {
    this.sprite.setVisible(v); this.crownGlow.setVisible(v); this.mawGlow.setVisible(v);
    this.flames.emitting = v;
    this.ash.emitting = v;
    this.drool.emitting = v;
    this.light.enabled = v; this.cone.enabled = v;
  }

  wake(x) {
    this.x = x;
    this.active = true;
    this.setVisible(true);
    this.sync();
  }

  update(dt, player) {
    if (!this.active) { this.drool.emitting = false; this.ash.emitting = false; return; }
    const W = TUNING.wickMother;
    this.time += dt;
    const dist = player.x - this.x;

    if (this.lungeT > 0) {
      this.lungeT -= dt;
      const k = 1 - Math.max(0, this.lungeT) / W.lungeTime;
      this.x = this.lungeFrom + W.lungeDistance * (1 - (1 - k) * (1 - k));
    } else if (this.tellT > 0) {
      this.tellT -= dt;
      if (this.tellT <= 0) { this.lungeT = W.lungeTime; this.lungeFrom = this.x; this.scene.cameras.main.shake(260, 0.006); }
    } else {
      const speed = dist > W.catchUpDistance ? W.catchUpSpeed : W.speed;
      this.x += speed * dt;
      this.lungeCd -= dt;
      if (this.lungeCd <= 0 && dist < W.lungeRange && dist > 60) {
        this.tellT = W.lungeTell;
        this.lungeCd = W.lungeEvery[0] + Math.random() * (W.lungeEvery[1] - W.lungeEvery[0]);
        const sp = this.scene.spatialFor(this.x);
        AUDIO.play('roar', { pan: sp.pan, vol: 0.8 });
      }
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.75;
        const sp = this.scene.spatialFor(this.x);
        AUDIO.play('wickStep', sp);
        if (this.scene.settings.shake) this.scene.cameras.main.shake(120, 0.0025 * sp.vol);
      }
    }
    this.sync();

    // Caught: her body reaches you.
    if (player.x < this.x + 80 && player.x > this.x - 90 && !player.dead) this.scene.killPlayer('wick');
  }

  sync() {
    const tell = this.tellT > 0 ? 1 - this.tellT / TUNING.wickMother.lungeTell : 0;
    const lunging = this.tellT > 0 || this.lungeT > 0;
    this.sprite.anims.play(lunging ? 'wickmother_lunge' : 'wickmother_walk', true);
    const ang = -tell * 3;
    this.sprite.setPosition(this.x, this.groundY).setAngle(ang);
    // fire sources follow the art frame by frame (rotated with the tell tilt)
    const f = Number(this.sprite.frame.name);
    const a = anchorFor('wickmother', Number.isFinite(f) ? f : 0);
    const r = ang * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const rot = (p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c });
    const head = rot(a.head), maw = rot(a.maw || a.head);
    const hx = this.x + head.x, hy = this.groundY + head.y;
    const mx = this.x + maw.x, my = this.groundY + maw.y;
    this.wicks.length = 0;
    for (const w of a.wicks || []) { const p = rot(w); this.wicks.push({ x: p.x, y: p.y }); }
    this.flames.setPosition(this.x, this.groundY);
    this.crownGlow.setPosition(hx, hy + 6).setAlpha(0.5 + tell * 0.3);
    this.ash.setPosition(hx, hy);
    this.mawGlow.setPosition(mx, my).setAlpha(0.45 + tell * 0.5).setScale(1.1 + tell * 0.6);
    this.drool.setPosition(mx + 10, my + 24);
    this.light.x = hx; this.light.y = hy;
    this.light.intensity = TUNING.wickMother.lightIntensity * (1 + tell * 0.1);
    this.cone.x = mx; this.cone.y = my;
  }

  destroy() {
    this.sprite.destroy(); this.crownGlow.destroy(); this.mawGlow.destroy(); this.flames.destroy(); this.ash.destroy(); this.drool.destroy();
    this.scene.lighting.removeLight(this.light); this.scene.lighting.removeLight(this.cone);
  }
}

// The Wick-Mother: Hollowmere's climax. You cannot fight her. You outrun her
// through the long shadows of dawn while her candle-light burns behind you.

import { TUNING } from '../tuning.js';
import { AUDIO } from '../systems/audio.js';

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

    this.sprite = scene.add.image(x, groundY, 'wickmother').setOrigin(0.5, 1).setDepth(24);
    this.crown = scene.add.image(x, groundY - 370, 'wick_crown').setDepth(24);
    this.crownGlow = scene.add.image(x, groundY - 380, 'softglow').setDepth(31).setBlendMode('ADD').setTint(0xffa050).setScale(2.2).setAlpha(0.55);
    this.flames = scene.add.particles(0, 0, 'spark', {
      lifespan: 700, speedY: { min: -90, max: -40 }, speedX: { min: -20, max: 20 }, scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xfff0c0, 0xffa040, 0xff5a1f], blendMode: 'ADD', frequency: 30, quantity: 2,
      x: { min: -45, max: 45 },
    }).setDepth(25);
    this.light = scene.lighting.addLight({ x, y: groundY - 360, radius: W.lightRadius, intensity: W.lightIntensity, color: [255, 160, 80], flicker: 0.1, fire: true, glow: 0.7 });
    this.cone = scene.lighting.addLight({ x, y: groundY - 330, radius: W.coneRadius, intensity: W.coneIntensity, color: [255, 150, 70], cone: { dir: W.coneDir, spread: W.coneSpread }, flicker: 0.1, fire: true, glow: 0.5 });
    this.setVisible(false);
  }

  setVisible(v) {
    this.sprite.setVisible(v); this.crown.setVisible(v); this.crownGlow.setVisible(v);
    this.flames.emitting = v;
    this.light.enabled = v; this.cone.enabled = v;
  }

  wake(x) {
    this.x = x;
    this.active = true;
    this.setVisible(true);
    this.sync();
  }

  update(dt, player) {
    if (!this.active) return;
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
    const sway = Math.sin(this.time * 1.6) * 3;
    this.sprite.setPosition(this.x, this.groundY).setAngle(sway * 0.4 - tell * 6);
    const hx = this.x + sway * 2, hy = this.groundY - 372 + tell * 10;
    this.crown.setPosition(hx, hy);
    this.crownGlow.setPosition(hx, hy - 10).setAlpha(0.55 + tell * 0.4);
    this.flames.setPosition(hx, hy - 30);
    this.light.x = hx; this.light.y = hy;
    this.light.intensity = TUNING.wickMother.lightIntensity * (1 + tell * 0.1);
    this.cone.x = hx + 30; this.cone.y = hy + 30;
  }

  destroy() {
    this.sprite.destroy(); this.crown.destroy(); this.crownGlow.destroy(); this.flames.destroy();
    this.scene.lighting.removeLight(this.light); this.scene.lighting.removeLight(this.cone);
  }
}

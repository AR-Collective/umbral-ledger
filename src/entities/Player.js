// The player: a sliver of a man's soul, shaped like his shadow.
//
// The physics body is an invisible box. Everything you see (the body, the
// violet rim, the eyes, the smoke) is drawn separately on top of it, so the
// visuals can squash, lean and fray without changing the collision box.

import Phaser from 'phaser';
import { TUNING, resistanceFor } from '../tuning.js';
import { AUDIO } from '../systems/audio.js';
import { GLOW_PAD } from '../textures.js';
import { SHADE, DIM, LIGHT } from '../systems/lighting.js';

const VIOLET = 0x9a6bff;
const BURN = 0xff7a3a;

export class Player {
  constructor(scene, x, feetY) {
    const T = TUNING.player;
    this.scene = scene;
    this.zone = scene.add.zone(x, feetY - T.bodyH / 2, T.bodyW, T.bodyH);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setMaxVelocity(4000, TUNING.physics.maxFall);
    this.body.setCollideWorldBounds(true);

    this.facing = 1;
    this.merged = false;
    this.substance = T.maxSubstance;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.strikeCd = 0;
    this.strikeAnim = 0;
    this.stepT = 0;
    this.sinceMerge = 99;
    this.wasOnFloor = true;
    this.prevVy = 0;
    this.litT = 0;
    this.dimT = 0;
    this.sinceDamage = 99;
    this.burn = 0;
    this.lightInfo = { value: 0, state: SHADE, fire: false };
    this.dead = false;
    this.frozen = false;
    this.landSquash = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.time = 0;
    this.noclip = false;

    // ---- visuals ----
    const pad = GLOW_PAD.shade_rim ?? 9;
    this.rim = scene.add.image(x, feetY, 'shade_rim')
      .setOrigin(0.5, (84 + pad) / (84 + pad * 2)).setDepth(39).setBlendMode('ADD').setTint(VIOLET).setAlpha(0.7);
    this.sprite = scene.add.image(x, feetY, 'shade').setOrigin(0.5, 1).setDepth(40);
    this.eyes = scene.add.image(x, feetY - 62, 'shade_eyes').setDepth(41).setBlendMode('ADD');

    this.wisps = scene.add.particles(0, 0, 'smoke', {
      lifespan: 1100, speedY: { min: -40, max: -15 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.35, end: 0.9 }, alpha: { start: 0.45, end: 0 }, tint: 0x0d0918,
      frequency: 70, quantity: 1, emitting: true,
    }).setDepth(38);
    this.wisps.startFollow(this.sprite, 0, -30);
    this.embers = scene.add.particles(0, 0, 'spark', {
      lifespan: 650, speedY: { min: -110, max: -40 }, speedX: { min: -40, max: 40 },
      scale: { start: 1.1, end: 0.2 }, alpha: { start: 1, end: 0 }, tint: [0xffd08a, 0xff8a3d, 0xff5a1f],
      blendMode: 'ADD', frequency: 40, quantity: 2, emitting: false,
    }).setDepth(42);
    this.embers.startFollow(this.sprite, 0, -36);
    this.fray = scene.add.particles(0, 0, 'spark', {
      lifespan: 500, speed: { min: 20, max: 70 }, scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: 0xb48cff, blendMode: 'ADD', frequency: 120, quantity: 1, emitting: false,
    }).setDepth(42);
    this.fray.startFollow(this.sprite, 0, -36);
  }

  // ------------- convenience getters used by the AI and the scene -------------
  get x() { return this.body.center.x; }
  get y() { return this.body.center.y; }
  get feetY() { return this.body.bottom; }
  get headY() { return this.body.top + 10; }
  get moving() { return Math.abs(this.body.velocity.x) > 30 || Math.abs(this.body.velocity.y) > 60; }
  get onFloor() { return this.body.blocked.down || this.body.touching.down; }

  // Where the light is measured. Merged, your body is lower, so low cover protects you.
  lightSamplePoints() {
    return [[this.x, this.y], [this.x, this.body.top + 8]];
  }

  setMerged(m) {
    const T = TUNING.player;
    if (m === this.merged) return;
    this.merged = m;
    const h = m ? T.mergedH : T.bodyH;
    this.body.setSize(T.bodyW, h, false);
    this.body.setOffset(0, T.bodyH - h);
    if (m) AUDIO.play('merge', { vol: 0.7 });
  }

  canStand() {
    const T = TUNING.player;
    const b = this.body;
    return !this.scene.solidOverlaps(b.x + 1, b.bottom - T.bodyH, T.bodyW - 2, T.bodyH - T.mergedH);
  }

  teleport(x, feetY) {
    const T = TUNING.player;
    this.setMerged(false);
    this.body.reset(x, feetY - T.bodyH / 2);
    this.body.setVelocity(0, 0);
  }

  // ------------------------------- movement -------------------------------
  update(dt, c) {
    const T = TUNING.player;
    const b = this.body;
    this.time += dt;
    this.dashCd -= dt;
    this.strikeCd -= dt;
    this.strikeAnim -= dt;
    if (this.dead || this.frozen) {
      b.setVelocityX(0);
      if (this.dead) b.setVelocityY(0);
      this.animate(dt);
      return;
    }

    if (this.noclip) {
      b.setAllowGravity(false);
      const sp = 700;
      b.setVelocity(((c.held('right') ? 1 : 0) - (c.held('left') ? 1 : 0)) * sp,
        ((c.held('down') ? 1 : 0) - (c.held('up') || c.held('jump') ? 1 : 0)) * sp);
      this.animate(dt);
      return;
    }
    b.setAllowGravity(this.dashT <= 0);

    const onFloor = this.onFloor;
    this.coyote = onFloor ? T.coyoteTime : this.coyote - dt;
    this.jumpBuf = c.pressed('jump') ? T.jumpBuffer : this.jumpBuf - dt;

    // Merge: hold down on the ground. You stay merged under low ceilings.
    const wantMerge = c.held('down') && onFloor && this.dashT <= 0;
    if (wantMerge && !this.merged) this.setMerged(true);
    if (!wantMerge && this.merged && this.canStand()) this.setMerged(false);
    this.sinceMerge = this.merged ? 0 : this.sinceMerge + dt;

    const dir = (c.held('right') ? 1 : 0) - (c.held('left') ? 1 : 0);
    if (dir !== 0 && this.dashT <= 0) this.facing = dir;

    // Shade Step: a short dash. Good for crossing a strip of light quickly.
    if (c.pressed('dash') && this.dashCd <= 0 && !this.merged) {
      this.dashT = T.dashTime;
      this.dashCd = T.dashCooldown;
      b.setVelocityY(0);
      this.scene.emitNoise(this.x, this.y, TUNING.noise.dash, 'dash');
      AUDIO.play('dash');
      this.scene.dashFx?.(this);
    }

    if (this.dashT > 0) {
      this.dashT -= dt;
      b.setVelocity(this.facing * T.dashSpeed, 0);
    } else {
      const max = this.merged ? T.mergedSpeed : T.runSpeed;
      const target = dir * max;
      const accel = onFloor ? (dir !== 0 ? T.groundAccel : T.groundDecel) : T.airAccel;
      const vx = b.velocity.x;
      const step = accel * dt;
      b.setVelocityX(Math.abs(target - vx) <= step ? target : vx + Math.sign(target - vx) * step);
    }

    // Jumping (with coyote time and a buffer so it never eats an input).
    if (this.jumpBuf > 0 && this.coyote > 0 && this.dashT <= 0) {
      if (this.merged && this.canStand()) this.setMerged(false);
      if (!this.merged) {
        b.setVelocityY(-T.jumpVelocity);
        this.jumpBuf = 0;
        this.coyote = 0;
        AUDIO.play('jump', { vol: 0.8 });
      }
    }
    if (c.released('jump') && b.velocity.y < -T.jumpCutVelocity) b.setVelocityY(-T.jumpCutVelocity);

    // Footsteps make a little noise. Merged movement is silent.
    if (onFloor && Math.abs(b.velocity.x) > 80 && !this.merged && this.dashT <= 0) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.3;
        this.scene.emitNoise(this.x, this.feetY, TUNING.noise.step, 'step');
        AUDIO.play('step', { vol: 0.7 });
      }
    }

    // Landing. Holding Merge as you land makes it silent.
    if (onFloor && !this.wasOnFloor) {
      const impact = this.prevVy;
      this.landSquash = Math.min(0.3, impact / 2400);
      if (c.held('down')) {
        // soft landing, no noise
      } else if (impact > 640) {
        this.scene.emitNoise(this.x, this.feetY, TUNING.noise.landHard, 'land');
        AUDIO.play('landHard');
        this.scene.landFx?.(this, true);
      } else if (impact > 320) {
        this.scene.emitNoise(this.x, this.feetY, TUNING.noise.landSoft, 'land');
        AUDIO.play('land', { vol: 0.8 });
        this.scene.landFx?.(this, false);
      }
    }
    this.wasOnFloor = onFloor;
    this.prevVy = b.velocity.y;

    if (c.pressed('strike') && this.strikeCd <= 0) {
      this.strikeCd = T.strikeCooldown;
      this.strikeAnim = 0.22;
      this.scene.tryStrike(this);
    }

    this.animate(dt);
  }

  // ------------------------------- light damage -------------------------------
  // Returns how hard you are burning right now (0..1) for sound and effects.
  updateLight(dt, info, level, godMode = false) {
    const R = resistanceFor(level);
    const L = TUNING.light;
    this.lightInfo = info;
    let dmg = 0;
    if (info.state === LIGHT) {
      this.litT += dt;
      this.dimT = 0;
      if (this.litT > R.grace) {
        const k = Math.min(1, (this.litT - R.grace) / R.rampTime);
        dmg = (R.dpsStart + (R.dpsMax - R.dpsStart) * k) * (info.fire ? R.fireMult : 1);
      }
    } else if (info.state === DIM && R.dimDps > 0) {
      this.dimT += dt;
      this.litT = Math.max(0, this.litT - dt * 2);
      if (this.dimT > 0.5) dmg = R.dimDps;
    } else {
      this.litT = Math.max(0, this.litT - dt * 3);
      this.dimT = 0;
    }
    if (godMode) dmg = 0;
    if (dmg > 0) {
      this.substance -= dmg * dt;
      this.sinceDamage = 0;
    } else {
      this.sinceDamage += dt;
      if (info.state === SHADE && this.sinceDamage > L.regenDelay) {
        this.substance = Math.min(TUNING.player.maxSubstance, this.substance + L.regenPerSec * dt);
      }
    }
    this.burn = dmg > 0 ? Math.min(1, dmg / R.dpsMax) : Math.max(0, this.burn - dt * 4);
    return this.burn;
  }

  // ------------------------------- visuals -------------------------------
  animate(dt) {
    const b = this.body;
    const fx = b.center.x;
    const fy = b.bottom;
    const T = TUNING.player;
    const vx = b.velocity.x, vy = b.velocity.y;
    const onFloor = this.onFloor;

    let sx = 1, sy = 1;
    if (this.merged) { sx = 1.35; sy = 0.42; }
    else if (!onFloor) {
      const st = Math.max(-0.14, Math.min(0.16, -vy / 2200));
      sy = 1 + st; sx = 1 - st * 0.6;
    } else {
      sy = 1 + Math.sin(this.time * 2.2) * 0.015;
    }
    if (this.landSquash > 0) {
      sy *= 1 - this.landSquash; sx *= 1 + this.landSquash * 0.7;
      this.landSquash = Math.max(0, this.landSquash - dt * 1.6);
    }
    if (this.dashT > 0) { sx *= 1.3; sy *= 0.85; }
    if (this.strikeAnim > 0) { sx *= 1.15; }
    // smooth toward the target shape
    const k = Math.min(1, dt * 18);
    this.sx = (this.sx ?? 1) + (sx - (this.sx ?? 1)) * k;
    this.sy = (this.sy ?? 1) + (sy - (this.sy ?? 1)) * k;

    const lean = Phaser.Math.Clamp(vx / T.runSpeed, -1.4, 1.4) * 0.12 + (this.strikeAnim > 0 ? this.facing * 0.25 : 0);
    const flip = this.facing < 0;

    this.sprite.setPosition(fx, fy).setScale(this.sx, this.sy).setRotation(lean).setFlipX(flip);
    this.rim.setPosition(fx, fy).setScale(this.sx * 1.04, this.sy * 1.03).setRotation(lean).setFlipX(flip);

    // Rim: violet when safe, ember orange when burning. It frays as Substance drops.
    const health = Phaser.Math.Clamp(this.substance / T.maxSubstance, 0, 1);
    const jitter = (1 - health) * 3.5;
    this.rim.x += (Math.random() - 0.5) * jitter;
    this.rim.y += (Math.random() - 0.5) * jitter;
    this.rim.setTint(this.burn > 0.05 ? BURN : VIOLET);
    const state = this.lightInfo.state;
    let rimAlpha = 0.35 + 0.45 * health;
    if (this.merged && state === SHADE) rimAlpha *= 0.55;
    // Tucked behind cover and merged: drawn faint, so it reads as "hidden behind it".
    const hiddenLook = this.merged && this.inCover;
    if (hiddenLook) rimAlpha *= 0.6;
    this.rim.setAlpha(this.dead ? 0 : rimAlpha);
    this.sprite.setAlpha(this.dead ? 0 : hiddenLook ? 0.32 : this.merged && state === SHADE ? 0.6 : 1);

    // Eyes sit in the hood and follow the squash.
    const headH = 62 * this.sy;
    this.blinkT -= dt;
    let eyeScaleY = 1;
    if (this.blinkT < 0) { eyeScaleY = 0.15; if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 4; }
    this.eyes.setPosition(fx + this.facing * 3 + Math.sin(lean) * headH, fy - headH * Math.cos(lean))
      .setScale(1, eyeScaleY).setFlipX(flip)
      .setAlpha(this.dead ? 0 : this.merged ? 0.55 : 0.95);

    this.embers.emitting = !this.dead && this.burn > 0.05;
    this.embers.frequency = 70 - this.burn * 50;
    this.fray.emitting = !this.dead && health < 0.45;
    this.wisps.emitting = !this.dead;
  }

  die(cause) {
    if (this.dead) return;
    this.dead = true;
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    const s = this.scene;
    s.add.particles(this.x, this.y, 'smoke', {
      lifespan: 1400, speed: { min: 30, max: 160 }, scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.7, end: 0 },
      tint: 0x0d0918, quantity: 40, emitting: false,
    }).setDepth(43).explode(40);
    s.add.particles(this.x, this.y, 'spark', {
      lifespan: 900, speed: { min: 60, max: 260 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
      tint: cause === 'burned' || cause === 'fire' ? [0xffd08a, 0xff8a3d] : [0xb48cff, 0x6b4bd8], blendMode: 'ADD',
      quantity: 50, emitting: false,
    }).setDepth(43).explode(50);
    this.animate(0);
  }

  destroy() {
    this.wisps.destroy(); this.embers.destroy(); this.fray.destroy();
    this.sprite.destroy(); this.rim.destroy(); this.eyes.destroy(); this.zone.destroy();
  }
}

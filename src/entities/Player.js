// The player: a sliver of a man's soul, shaped like his shadow.
//
// The physics body is an invisible box. What you see is an animated sprite on
// top of it, with two shader effects (WebGL only):
//   glow     : a soft outline whose colour tells you your light state
//              violet = Shade (safe), pale = Dim (seen at mid range), orange = Light (burning)
//   dissolve : ember-edged holes. They grow as Substance drops, so your health
//              is drawn on your body, and they glow while you burn.
//
// LIGHT DAMAGE IS TICKS: after a short grace, every second in Light takes one
// chunk of Substance, with a red screen pulse and a burst of embers.

import Phaser from 'phaser';
import { TUNING, resistanceFor } from '../tuning.js';
import { AUDIO } from '../systems/audio.js';
import { SHADE, DIM, LIGHT } from '../systems/lighting.js';
import { feetOrigin } from '../art/characters.js';
import { hasShaders } from '../systems/fx.js';
import { GAME } from '../systems/state.js';

const GLOW_SHADE = 0x8a5cff;
const GLOW_DIM = 0xe0d4ff;
const GLOW_LIGHT = 0xff6a1a;
const GLOW_ECLIPSE = 0xfff1c0;

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
    this.sinceDamage = 99;
    this.burnVis = 0;
    this.flash = 0;
    this.tickClock = null;     // seconds until the next burn tick; null = not exposed
    this.outOfLight = 99;
    this.lightInfo = { value: 0, state: SHADE, fire: false };
    this.dead = false;
    this.frozen = false;
    this.landSquash = 0;
    this.time = 0;
    this.noclip = false;
    this.inCover = false;
    this.dissolveT = 0;
    this.clinging = false;      // Cling: sliding down a wall
    this.clingDir = 0;
    this.clingGrace = 0;        // a wall kick still works a moment after letting go
    this.lockT = 0;             // no steering for a moment (a wall kick, a knockback)
    this.eclipseT = 0;          // Eclipse: light cannot touch you
    this.ghostT = 0;

    // ---- visuals ----
    const [ox, oy] = feetOrigin('shade');
    this.sprite = scene.add.sprite(x, feetY, 'shade', 0).setOrigin(ox, oy).setDepth(40);
    this.sprite.play('shade_idle');
    this.shaders = hasShaders(scene);
    if (this.shaders) {
      this.sprite.preFX.setPadding(18);
      this.glow = this.sprite.preFX.addGlow(GLOW_SHADE, 3, 0, false, 0.1, 14);
      this.sprite.setPostPipeline('Dissolve');
      const pp = this.sprite.getPostPipeline('Dissolve');
      this.dissolve = Array.isArray(pp) ? pp[0] : pp;
    }

    this.wisps = scene.add.particles(0, 0, 'smoke', {
      lifespan: 1300, speedY: { min: -36, max: -12 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.22, end: 0.7 }, alpha: { start: 0.4, end: 0 }, tint: 0x0b0814,
      frequency: 90, quantity: 1, emitting: true,
    }).setDepth(39);
    this.wisps.startFollow(this.sprite, 0, -30);
    this.embers = scene.add.particles(0, 0, 'ember', {
      lifespan: { min: 500, max: 900 }, speedY: { min: -140, max: -50 }, speedX: { min: -40, max: 40 },
      scale: { start: 1.1, end: 0.2 }, alpha: { start: 1, end: 0 }, rotate: { min: -20, max: 20 },
      tint: [0xfff0b0, 0xffb040, 0xff6a1a], blendMode: 'ADD', frequency: 28, quantity: 2, emitting: false,
      x: { min: -12, max: 12 }, y: { min: -40, max: 0 },
    }).setDepth(42);
    this.embers.startFollow(this.sprite, 0, -10);
    this.burnSmoke = scene.add.particles(0, 0, 'smoke', {
      lifespan: 1200, speedY: { min: -60, max: -25 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.25, end: 1.0 }, alpha: { start: 0.35, end: 0 }, tint: 0x2a1c18,
      frequency: 70, emitting: false, x: { min: -8, max: 8 },
    }).setDepth(41);
    this.burnSmoke.startFollow(this.sprite, 0, -50);
    this.tickBurst = scene.add.particles(0, 0, 'spark', {
      lifespan: { min: 300, max: 700 }, speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 },
      scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 300,
      tint: [0xffffff, 0xffd080, 0xff7a2a], blendMode: 'ADD', emitting: false,
    }).setDepth(43);
  }

  // ------------- convenience getters used by the AI and the scene -------------
  get x() { return this.body.center.x; }
  get y() { return this.body.center.y; }
  get feetY() { return this.body.bottom; }
  get headY() { return this.body.top + 10; }
  get moving() { return Math.abs(this.body.velocity.x) > 30 || Math.abs(this.body.velocity.y) > 60; }
  get onFloor() { return this.body.blocked.down || this.body.touching.down; }

  // Where the light is measured: the middle of the body and the head.
  // Merged, your body is low, so low cover protects you.
  lightSamplePoints() {
    return [[this.x, this.y], [this.x, this.body.top + 8]];
  }

  setMerged(m) {
    const T = TUNING.player;
    if (m === this.merged) return;
    this.merged = m;
    const h = m ? T.mergedH : T.bodyH;
    const bottom = this.body.bottom;
    this.body.setSize(T.bodyW, h, false);
    this.body.setOffset(0, T.bodyH - h);
    // Keep the feet where they were. Shift the previous-frame position too:
    // Arcade moves the Game Object by (position - prevFrame) after the step,
    // so moving only body.y would also drag the zone down into the floor.
    const dy = bottom - h - this.body.y;
    this.body.y += dy;
    this.body.prev.y += dy;
    this.body.prevFrame.y += dy;
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

  // Walk up small lips (cobbles, kerbs, low steps) instead of snagging on them.
  tryStepUp(dir) {
    const T = TUNING.player;
    const b = this.body;
    const blocked = dir > 0 ? (b.blocked.right || b.touching.right) : (b.blocked.left || b.touching.left);
    if (!blocked || !this.onFloor) return;
    for (let h = 4; h <= T.stepUp; h += 4) {
      const nx = b.x + dir * 3;
      if (!this.scene.solidOverlaps(nx, b.y - h, b.width, b.height - 1)) {
        b.y -= h;
        b.x += dir * 2;
        return;
      }
    }
  }

  // ------------------------------- movement -------------------------------
  update(dt, c) {
    const T = TUNING.player;
    const b = this.body;
    this.time += dt;
    this.dashCd -= dt;
    this.strikeCd -= dt;
    this.strikeAnim -= dt;
    this.lockT -= dt;
    this.guardT = Math.max(0, (this.guardT ?? 0) - dt);
    this.eclipseT = Math.max(0, this.eclipseT - dt);
    if (this.dead || this.frozen) {
      b.setVelocityX(0);
      if (this.dead) { b.setVelocityY(0); b.setAllowGravity(false); }
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
    // falling pulls harder than rising: a snappier, less floaty jump
    b.setGravityY(b.velocity.y > 0 ? TUNING.physics.gravity * (TUNING.physics.fallGravityMult - 1) : 0);

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
      this.dashId = (this.dashId ?? 0) + 1;
      b.setVelocityY(0);
      this.scene.emitNoise(this.x, this.y, TUNING.noise.dash, 'dash');
      AUDIO.play('dash');
      this.scene.dashFx?.(this);
    }

    if (this.dashT > 0) {
      this.dashT -= dt;
      b.setVelocity(this.facing * T.dashSpeed, 0);
      // Shadow Dash: afterimages, and anything weak in the way is cut down
      if (GAME.hasAbility('dashCut')) {
        this.ghostT -= dt;
        if (this.ghostT <= 0) { this.ghostT = 0.025; this.scene.abilities?.afterimage(this); }
        this.scene.abilities?.dashCut(this);
      }
    } else if (this.lockT > 0) {
      // a wall kick or a knockback carries you; steering comes back in a moment
    } else {
      const max = this.merged ? T.mergedSpeed : T.runSpeed;
      const target = dir * max;
      const accel = onFloor ? (dir !== 0 ? T.groundAccel : T.groundDecel) : T.airAccel;
      const vx = b.velocity.x;
      const step = accel * dt;
      b.setVelocityX(Math.abs(target - vx) <= step ? target : vx + Math.sign(target - vx) * step);
      if (dir !== 0) this.tryStepUp(dir);
    }

    // Cling: pressing into a wall in the air, you slide down it instead of falling,
    // and jumping kicks you off the other way.
    const wallDir = (b.blocked.right || b.touching.right) ? 1 : (b.blocked.left || b.touching.left) ? -1 : 0;
    const C = TUNING.abilities.cling;
    this.clinging = GAME.hasAbility('cling') && !onFloor && !this.merged && this.dashT <= 0 && wallDir !== 0 && dir === wallDir && b.velocity.y > -60;
    if (this.clinging) {
      this.clingDir = wallDir;
      this.clingGrace = 0.12;
      if (b.velocity.y > C.slide) b.setVelocityY(C.slide);
      this.facing = wallDir;
      this.coyote = 0;
    } else this.clingGrace -= dt;
    if (this.jumpBuf > 0 && this.clingGrace > 0 && !onFloor && this.dashT <= 0) {
      b.setVelocity(-this.clingDir * C.kickX, -C.kickY);
      this.facing = -this.clingDir;
      this.lockT = C.lockTime;
      this.jumpBuf = 0;
      this.clingGrace = 0;
      this.clinging = false;
      AUDIO.play('jump', { vol: 0.9 });
      this.scene.abilities?.wallKickFx(this);
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
      this.landSquash = Math.min(0.22, impact / 3200);
      if (c.held('down')) {
        // soft landing, no noise
      } else if (impact > 700) {
        this.scene.emitNoise(this.x, this.feetY, TUNING.noise.landHard, 'land');
        AUDIO.play('landHard');
        this.scene.landFx?.(this, true);
      } else if (impact > 360) {
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
      this.sprite.play('shade_strike');
      this.scene.tryStrike(this);
    }

    // Returned powers (the Abilities system checks which ones you have).
    const ab = this.scene.abilities;
    if (ab) {
      if (c.pressed('ember')) ab.ember(this);
      if (c.pressed('echo')) ab.echo(this);
      if (c.pressed('eclipse')) ab.eclipse(this);
    }

    this.animate(dt);
  }

  // ------------------------------- light damage -------------------------------
  // Returns how hard you are burning right now (0..1) for sound and effects.
  updateLight(dt, info, level, godMode = false) {
    const R = resistanceFor(level);
    const L = TUNING.light;
    this.lightInfo = info;
    const lit = info.state === LIGHT && !godMode && this.eclipseT <= 0;

    if (lit) {
      this.outOfLight = 0;
      if (this.tickClock === null) this.tickClock = R.grace;
      this.tickClock -= dt;
      if (this.tickClock <= 0) {
        this.tickClock += R.interval;
        this.burnTick(R.tick * (info.fire ? R.fireMult : 1), info.fire);
      }
    } else {
      this.outOfLight += dt;
      if (this.outOfLight > L.tickResetAfter) this.tickClock = null;
    }

    this.sinceDamage += dt;
    if (!lit && info.state === SHADE && this.sinceDamage > L.regenDelay) {
      this.substance = Math.min(TUNING.player.maxSubstance, this.substance + L.regenPerSec * dt);
    }

    const target = lit ? 1 : 0;
    this.burnVis += (target - this.burnVis) * Math.min(1, dt * (lit ? 10 : 3));
    return this.burnVis;
  }

  burnTick(damage, fire) {
    this.substance -= damage;
    this.sinceDamage = 0;
    this.flash = 1;
    this.tickBurst.explode(fire ? 26 : 18, this.x, this.y - 6);
    this.scene.onBurnTick?.(damage, fire);
  }

  // ------------------------------- visuals -------------------------------
  animate(dt) {
    const b = this.body;
    const s = this.sprite;
    const fx = b.center.x, fy = b.bottom;
    const vx = b.velocity.x, vy = b.velocity.y;
    const onFloor = this.onFloor;

    // pick the animation
    if (!this.dead) {
      let anim;
      if (this.strikeAnim > 0 && !this.merged) anim = 'shade_strike';
      else if (this.merged) anim = Math.abs(vx) > 15 ? 'shade_mergeMove' : 'shade_merge';
      else if (this.dashT > 0) anim = 'shade_dash';
      else if (this.clinging) anim = 'shade_fall';
      else if (!onFloor && !this.noclip) anim = vy < -60 ? 'shade_rise' : 'shade_fall';
      else if (Math.abs(vx) > 30) anim = 'shade_run';
      else anim = 'shade_idle';
      if (anim !== 'shade_strike' || s.anims.currentAnim?.key !== 'shade_strike') s.anims.play(anim, true);
      if (anim === 'shade_run') s.anims.timeScale = Phaser.Math.Clamp(Math.abs(vx) / TUNING.player.runSpeed, 0.55, 1.3);
      else s.anims.timeScale = 1;
    }

    // small squash on landing
    let sy = 1, sx = 1;
    if (this.landSquash > 0) {
      sy = 1 - this.landSquash; sx = 1 + this.landSquash * 0.6;
      this.landSquash = Math.max(0, this.landSquash - dt * 1.4);
    }
    s.setPosition(fx, fy).setScale(sx, sy).setFlipX(this.facing < 0);

    // light-state glow and the burn shader
    const health = Phaser.Math.Clamp(this.substance / TUNING.player.maxSubstance, 0, 1);
    this.flash = Math.max(0, this.flash - dt * 4.5);
    const state = this.lightInfo.state;
    const hidden = this.merged && (this.inCover || state === SHADE);
    if (this.glow) {
      if (this.eclipseT > 0) {
        this.glow.color = GLOW_ECLIPSE;
        this.glow.outerStrength = 5 + Math.sin(this.time * 14) * 1.5;
      } else if (this.burnVis > 0.08) {
        this.glow.color = GLOW_LIGHT;
        this.glow.outerStrength = 4 + this.burnVis * 4 + Math.sin(this.time * 18) * 1.2 + this.flash * 6;
      } else if (state === DIM) {
        this.glow.color = GLOW_DIM;
        this.glow.outerStrength = 3.5 + Math.sin(this.time * 6) * 0.6;
      } else {
        this.glow.color = GLOW_SHADE;
        this.glow.outerStrength = hidden ? 1.4 : 2.6 + (1 - health) * 1.5;
      }
    } else {
      // canvas fallback: tint instead of glow
      if (this.burnVis > 0.08) s.setTint(0xff9a60); else s.clearTint();
    }
    if (this.dissolve) {
      if (!this.dead) this.dissolve.amount = (1 - health) * 0.45;
      this.dissolve.burn = Math.max(this.burnVis, this.dead && this.deathFire ? 1 : 0);
      this.dissolve.flash = this.flash;
    }
    s.setAlpha(this.dead && !this.dissolve ? 0 : hidden ? (this.inCover ? 0.45 : 0.7) : 1);

    this.embers.emitting = !this.dead && this.burnVis > 0.15;
    this.burnSmoke.emitting = !this.dead && this.burnVis > 0.15;
    this.wisps.emitting = !this.dead;
  }

  // Thrown back by a blow (the Last Noon's grabs hurt instead of killing).
  knock(dir, power) {
    this.setMerged(false);
    this.body.setVelocity(dir * power, -320);
    this.lockT = 0.35;
    this.dashT = 0;
  }

  // Damage that is not light: a blow, a sun-lance.
  hurt(damage) {
    this.substance -= damage;
    this.sinceDamage = 0;
    this.flash = 1;
    this.tickBurst.explode(22, this.x, this.y - 6);
  }

  die(cause) {
    if (this.dead) return;
    this.dead = true;
    this.deathFire = cause === 'burned' || cause === 'fire';
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    const s = this.scene;
    s.add.particles(this.x, this.y, 'smoke', {
      lifespan: 1500, speed: { min: 20, max: 120 }, scale: { start: 0.4, end: 1.5 }, alpha: { start: 0.6, end: 0 },
      tint: this.deathFire ? 0x2a1c18 : 0x120c1e, quantity: 36, emitting: false,
    }).setDepth(43).explode(36);
    s.add.particles(this.x, this.y, this.deathFire ? 'ember' : 'spark', {
      lifespan: { min: 600, max: 1400 }, speed: { min: 40, max: 200 }, angle: { min: 200, max: 340 }, gravityY: -60,
      scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
      tint: this.deathFire ? [0xfff0b0, 0xffa040, 0xff6020] : [0xb48cff, 0x6b4bd8], blendMode: 'ADD',
      quantity: 60, emitting: false,
    }).setDepth(43).explode(60);
    if (this.dissolve) {
      s.tweens.add({ targets: this.dissolve, amount: 1.15, duration: 950, ease: 'Quad.easeIn' });
    } else {
      s.tweens.add({ targets: this.sprite, alpha: 0, duration: 600 });
    }
    this.animate(0);
  }

  destroy() {
    this.wisps.destroy(); this.embers.destroy(); this.burnSmoke.destroy(); this.tickBurst.destroy();
    this.sprite.destroy(); this.zone.destroy();
  }
}

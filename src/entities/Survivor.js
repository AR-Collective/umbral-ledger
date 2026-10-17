// Survivors: the people you escort in Hollowmere.
//
// They are human, so light does not burn them, but light SHOWS them. Enemies
// perceive survivors with the same rules as the player (minus Merge). They
// crouch when you Merge, and you can tell them to wait or follow (Q).

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { BARKS } from '../story.js';
import { SHADE } from '../systems/lighting.js';
import { feetOrigin } from '../art/characters.js';
import { hasShaders } from '../systems/fx.js';

export class Survivor {
  constructor(scene, def, index) {
    this.scene = scene;
    this.id = def.id;
    this.name = def.name;
    this.index = index;
    this.state = def.state ?? 'hiding';
    this.crouched = this.state !== 'follow';
    this.facing = def.facing ?? 1;
    this.light = { value: 0, state: SHADE, fire: false };
    this.alive = true;
    this.barkCd = 0;
    this.time = Math.random() * 5;

    this.zone = scene.add.zone(def.x, def.y - 30, 20, 60);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setMaxVelocity(1000, TUNING.physics.maxFall);
    this.body.setCollideWorldBounds(true);

    this.key = def.texture;
    const [ox, oy] = feetOrigin(this.key);
    this.sprite = scene.add.sprite(def.x, def.y, this.key, 0).setOrigin(ox, oy).setDepth(35);
    this.sprite.play(`${this.key}_crouch`);
    // A faint warm outline: the shadow can sense their warmth, so you can always
    // find the people you are protecting, even in the dark.
    if (hasShaders(scene)) {
      this.sprite.preFX.setPadding(10);
      this.glow = this.sprite.preFX.addGlow(0xffa060, 2, 0, false, 0.1, 10);
    }
    this.warmth = scene.add.image(def.x, def.y - 40, 'softglow').setDepth(44).setBlendMode('ADD')
      .setTint(0xffa060).setScale(0.3).setAlpha(0.4);
  }

  get x() { return this.body.center.x; }
  get y() { return this.body.center.y; }
  get feetY() { return this.body.bottom; }
  get moving() { return Math.abs(this.body.velocity.x) > 20; }
  get hidden() { return this.state === 'hiding' || this.state === 'safe'; }
  get onFloor() { return this.body.blocked.down || this.body.touching.down; }

  bark(kind, force = false) {
    if (!force && this.barkCd > 0) return;
    const list = BARKS[kind];
    if (!list) return;
    this.scene.say(this.id, list[Math.floor(Math.random() * list.length)], this);
    this.barkCd = 6;
  }

  setState(state) {
    this.state = state;
    if (state === 'follow') this.crouched = false;
    if (state === 'wait') this.crouched = true;
  }

  update(dt, player) {
    const T = TUNING.survivor;
    const b = this.body;
    this.time += dt;
    this.barkCd -= dt;
    if (!this.alive) return;

    if (this.state === 'hiding' || this.state === 'safe') {
      b.setVelocityX(0);
    } else if (this.state === 'wait') {
      b.setVelocityX(0);
      this.crouched = true;
    } else if (this.state === 'follow') {
      const gap = T.followGap * (this.index + 1);
      const desired = player.x - player.facing * gap;
      const dx = desired - this.x;
      const far = Math.abs(player.x - this.x) > T.giveUpDistance || player.feetY < this.feetY - 260;
      this.crouched = player.merged;
      const speed = this.crouched ? T.crouchWalk : T.walk;
      if (far || Math.abs(dx) < 14) {
        b.setVelocityX(0);
      } else {
        const v = Math.sign(dx) * Math.min(speed, Math.abs(dx) * 4);
        b.setVelocityX(v);
        this.facing = Math.sign(dx);
        // Hop up small steps if blocked.
        const blocked = (v > 0 && (b.blocked.right || b.touching.right)) || (v < 0 && (b.blocked.left || b.touching.left));
        if (blocked && this.onFloor) b.setVelocityY(-T.hop);
      }
    } else if (this.state === 'flee') {
      this.crouched = false;
      const dx = this.fleeX - this.x;
      if (Math.abs(dx) < 10) { this.setState('safe'); b.setVelocityX(0); }
      else {
        b.setVelocityX(Math.sign(dx) * 250);
        this.facing = Math.sign(dx);
        const blocked = (dx > 0 && (b.blocked.right || b.touching.right));
        if (blocked && this.onFloor) b.setVelocityY(-T.hop);
      }
    }
    this.animate();
  }

  animate() {
    const fx = this.body.center.x, fy = this.body.bottom;
    const moving = this.moving;
    const anim = this.crouched ? (moving ? 'crouchWalk' : 'crouch') : (moving ? 'walk' : 'idle');
    this.sprite.anims.play(`${this.key}_${anim}`, true);
    if (anim === 'walk') this.sprite.anims.timeScale = Phaser.Math.Clamp(Math.abs(this.body.velocity.x) / TUNING.survivor.walk, 0.6, 1.4);
    else this.sprite.anims.timeScale = 1;
    this.sprite.setPosition(fx, fy).setFlipX(this.facing < 0);
    this.sprite.setVisible(this.alive);
    const pulse = 0.3 + 0.2 * Math.max(0, Math.sin(this.time * 6.5));
    if (this.glow) this.glow.outerStrength = this.state === 'safe' ? 0 : 1.5 + pulse * 2;
    this.warmth.setPosition(fx, fy - (this.crouched ? 26 : 44)).setAlpha(this.alive && this.state !== 'safe' ? pulse : 0);
  }

  // Where light and sight are measured. Crouched, they are low enough to hide behind a cart.
  sampleY() {
    return this.crouched ? this.feetY - 20 : this.body.top + 14;
  }

  // Enemy perception reads this.
  target() {
    return {
      id: this.id, kind: 'survivor', x: this.x, y: this.sampleY(), feetY: this.feetY,
      light: this.light, crouched: this.crouched, merged: false, moving: this.moving,
      hidden: this.hidden, alive: this.alive, inCover: this.inCover,
      points: [[this.x, this.sampleY()], [this.x, this.body.top + 8]],
    };
  }

  destroy() {
    this.sprite.destroy(); this.warmth.destroy(); this.zone.destroy();
  }
}

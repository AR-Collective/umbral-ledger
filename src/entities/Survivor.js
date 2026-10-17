// Survivors: the people you escort in Hollowmere.
//
// They are human, so light does not burn them, but light SHOWS them. Enemies
// perceive survivors with the same rules as the player (minus Merge). They
// crouch when you Merge, and you can tell them to wait or follow (Q).

import { TUNING } from '../tuning.js';
import { BARKS } from '../story.js';
import { SHADE } from '../systems/lighting.js';

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

    // A faint warm outline drawn over the dark: you can always see the people you protect.
    const pad = 9;
    this.rim = scene.add.image(def.x, def.y, `${def.texture}_rim`).setOrigin(0.5, (def.texture === 'maren' ? 70 + pad : 74 + pad) / ((def.texture === 'maren' ? 70 : 74) + pad * 2))
      .setDepth(44).setBlendMode('ADD').setTint(0xff9a5a).setAlpha(0.15);
    this.sprite = scene.add.image(def.x, def.y, def.texture).setOrigin(0.5, 1).setDepth(20);
    // The shadow can sense their warmth: a small heartbeat glow drawn over the dark,
    // so you can always find the people you are protecting.
    this.warmth = scene.add.image(def.x, def.y - 40, 'softglow').setDepth(45).setBlendMode('ADD')
      .setTint(0xffa060).setScale(0.32).setAlpha(0.5);
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
    const bob = moving ? Math.abs(Math.sin(this.time * 9)) * 2 : 0;
    const sy = this.crouched ? 0.72 : 1;
    this.sprite.setPosition(fx, fy - bob).setScale(1, sy).setFlipX(this.facing < 0);
    this.sprite.setVisible(this.alive);
    this.rim.setPosition(fx, fy - bob).setScale(1, sy).setFlipX(this.facing < 0).setVisible(this.alive && this.state !== 'safe');
    const pulse = 0.4 + 0.25 * Math.max(0, Math.sin(this.time * 6.5));
    this.warmth.setPosition(fx, fy - 40 * sy).setAlpha(this.alive && this.state !== 'safe' ? pulse : 0);
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
      hidden: this.hidden, alive: this.alive,
    };
  }

  destroy() {
    this.sprite.destroy(); this.rim.destroy(); this.warmth.destroy(); this.zone.destroy();
  }
}

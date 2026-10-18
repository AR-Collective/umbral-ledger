// =====================================================================
// ABILITIES: the powers that come home with soul fragments.
//
// Each one does one clear thing (design doc 4.4: few verbs, many interactions):
//   Black Ember (L)  a bolt of black flame. Snuffs fires and lamps, burns enemies.
//                    It is still fire, so it costs you Substance to throw.
//   Echo (U)         a shadow clone that runs on ahead making noise. Watchers
//                    see it, chase it and grab it instead of you.
//   Eclipse (I)      light cannot touch you for a few seconds, and the Corona
//                    burst knocks down everything near. Charged by kills.
//   Shadow Dash      (the upgraded Shade Step, K) cuts down weak enemies in its path.
//   Cling            (passive, in Player.js) slide down walls and kick off them.
//
// Remnant level-ups strengthen them: Ember II pierces and bursts, Eclipse II
// throws a wider Corona.
// =====================================================================

import { TUNING } from '../tuning.js';
import { GAME } from './state.js';
import { AUDIO } from './audio.js';
import { bus } from './bus.js';

export class Abilities {
  constructor(scene) {
    this.scene = scene;
    this.cd = { ember: 0, echo: 0 };
    this.bolts = [];
    this.echoes = [];
    this.charge = TUNING.abilities.eclipse.killsToCharge;   // you arrive with Eclipse ready
    this.warpUntil = 0;
    this.nextEcho = 1;
  }

  has(id) { return GAME.hasAbility(id); }
  up(id) { return !!GAME.data.upgrades[id]; }

  // How the HUD draws the skill bar: 0..1 ready-ness per ability.
  status() {
    const A = TUNING.abilities;
    const p = this.scene.player;
    return {
      ember: { have: this.has('ember'), ready: this.cd.ember <= 0 && p.substance >= A.ember.minSubstance, k: 1 - Math.max(0, this.cd.ember) / A.ember.cooldown },
      echo: { have: this.has('echo'), ready: this.cd.echo <= 0, k: 1 - Math.max(0, this.cd.echo) / A.echo.cooldown },
      eclipse: { have: this.has('eclipse'), ready: this.charge >= A.eclipse.killsToCharge, k: this.charge / A.eclipse.killsToCharge, active: p.eclipseT > 0 },
      dash: { have: true, ready: p.dashCd <= 0, k: 1 - Math.max(0, p.dashCd) / TUNING.player.dashCooldown },
    };
  }

  // Slow motion after a Corona: a short real-time window where the world crawls.
  timeWarp() {
    return performance.now() < this.warpUntil ? TUNING.abilities.eclipse.slowmo : 1;
  }

  // ------------------------------------------------------------------
  // Black Ember
  // ------------------------------------------------------------------
  ember(p) {
    const A = TUNING.abilities.ember;
    if (!this.has('ember') || this.cd.ember > 0 || p.dead || p.merged) return;
    if (p.substance < A.minSubstance) { this.scene.toast('Too little of you left to burn.', 1400); return; }
    this.cd.ember = A.cooldown;
    p.substance -= A.cost;
    p.sinceDamage = 0;
    const s = this.scene;
    const x = p.x + p.facing * 22, y = p.y - 8;
    const img = s.add.image(x, y, 'ember_bolt').setDepth(45).setBlendMode('NORMAL').setFlipX(p.facing < 0);
    const glow = s.add.image(x, y, 'flare').setDepth(44).setBlendMode('ADD').setTint(0x9a5cff).setScale(0.55).setAlpha(0.8);
    const trail = s.add.particles(0, 0, 'spark', {
      lifespan: { min: 250, max: 520 }, speed: { min: 10, max: 60 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xc9a8ff, 0x7a4cff, 0x2a1450], blendMode: 'ADD', frequency: 12, quantity: 2,
    }).setDepth(44);
    const smoke = s.add.particles(0, 0, 'smoke', {
      lifespan: 500, speedX: { min: -30, max: 30 }, speedY: { min: -30, max: 10 }, scale: { start: 0.25, end: 0.7 },
      alpha: { start: 0.55, end: 0 }, tint: 0x0a0612, frequency: 30,
    }).setDepth(43);
    trail.startFollow(img); smoke.startFollow(img);
    this.bolts.push({ x, y, vx: p.facing * A.speed, life: A.life, img, glow, trail, smoke, hit: new Set(), from: p.x });
    AUDIO.play('ember');
    s.cameras.main.shake(70, 0.0015);
  }

  updateBolts(dt) {
    const A = TUNING.abilities.ember;
    const s = this.scene;
    for (const b of this.bolts) {
      if (b.dead) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.img.setPosition(b.x, b.y).setAngle(Math.sin(b.life * 40) * 6);
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { this.boltImpact(b, false); continue; }
      if (s.solidOverlaps(b.x - 4, b.y - 4, 8, 8)) { this.boltImpact(b, true); continue; }
      // fires and lamps: black flame eats light
      let stopped = false;
      for (const sn of s.snuffables) {
        if (!sn.lit || Math.hypot(sn.x - b.x, sn.y - b.y) > sn.r + A.radius) continue;
        this.snuff(sn);
        stopped = true;
        break;
      }
      if (stopped) { this.boltImpact(b, true); continue; }
      if (s.boss?.emberHit(b.x, b.y)) { this.boltImpact(b, true); continue; }
      for (const w of s.watchers) {
        if (b.hit.has(w) || w.mode === 'down' || w.mode === 'dormant') continue;
        if (Math.abs(w.x - b.x) > 26 || b.y < w.groundY - w.cfg.eyeH - 30 || b.y > w.groundY + 4) continue;
        b.hit.add(w);
        if (w.hurt(A.damage, b.from)) this.onKill(w);
        if (!this.up('ember2')) { stopped = true; break; }
      }
      if (stopped) this.boltImpact(b, true);
    }
    this.bolts = this.bolts.filter((b) => !b.dead);
  }

  boltImpact(b, hard) {
    const s = this.scene;
    b.dead = true;
    b.trail.stop(); b.smoke.stop();
    s.time.delayedCall(700, () => { b.trail.destroy(); b.smoke.destroy(); });
    b.img.destroy(); b.glow.destroy();
    if (!hard) return;
    const big = this.up('ember2');
    s.add.particles(b.x, b.y, 'spark', {
      lifespan: { min: 300, max: 700 }, speed: { min: 60, max: big ? 320 : 200 }, scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xe6d4ff, 0x9a5cff, 0x3a1a70], blendMode: 'ADD', emitting: false,
    }).setDepth(45).explode(big ? 34 : 18);
    s.add.particles(b.x, b.y, 'smoke', {
      lifespan: 700, speed: { min: 20, max: 90 }, scale: { start: 0.4, end: 1.3 }, alpha: { start: 0.6, end: 0 }, tint: 0x0c0716, emitting: false,
    }).setDepth(43).explode(10);
    AUDIO.play('emberHit', s.spatialFor(b.x));
    if (big) {
      // Ember II: the bolt bursts, burning everything close
      const R = TUNING.abilities.ember.splash;
      this.ring(b.x, b.y, R, 0x9a5cff, 260);
      for (const w of s.watchers) {
        if (b.hit.has(w) || w.mode === 'down' || w.mode === 'dormant') continue;
        if (Math.abs(w.x - b.x) > R || Math.abs(w.groundY - 50 - b.y) > R) continue;
        if (w.hurt(1, b.from)) this.onKill(w);
      }
    }
  }

  // Put out a fire or a lamp. Black flame takes the light into itself.
  snuff(sn) {
    const s = this.scene;
    sn.lit = false;
    if (sn.light) sn.light.enabled = false;
    for (const o of sn.sprites ?? []) s.tweens.add({ targets: o, alpha: 0, scale: 0.2, duration: 260 });
    s.add.particles(sn.x, sn.y, 'smoke', {
      lifespan: 1400, speedY: { min: -70, max: -20 }, speedX: { min: -20, max: 20 }, scale: { start: 0.4, end: 1.6 },
      alpha: { start: 0.6, end: 0 }, tint: 0x1a1022, emitting: false,
    }).setDepth(43).explode(14);
    AUDIO.play('snuff', s.spatialFor(sn.x));
    sn.onSnuff?.(sn);
  }

  // ------------------------------------------------------------------
  // Echo
  // ------------------------------------------------------------------
  echo(p) {
    const A = TUNING.abilities.echo;
    if (!this.has('echo') || this.cd.echo > 0 || p.dead) return;
    this.cd.echo = A.cooldown;
    const s = this.scene;
    const sprite = s.add.sprite(p.x, p.feetY, 'shade', 0).setOrigin(p.sprite.originX, p.sprite.originY).setDepth(39)
      .setTintFill(0x7a4cff).setAlpha(0.6).setFlipX(p.facing < 0).setBlendMode('ADD');
    sprite.play('shade_run');
    const wisps = s.add.particles(0, 0, 'spark', {
      lifespan: 600, speedY: { min: -40, max: -10 }, speedX: { min: -20, max: 20 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 0.9, end: 0 }, tint: [0xb48cff, 0x7a4cff], blendMode: 'ADD', frequency: 40, x: { min: -10, max: 10 }, y: { min: -50, max: 0 },
    }).setDepth(39);
    wisps.startFollow(sprite);
    const e = { id: `echo${this.nextEcho++}`, x: p.x, feetY: p.feetY, dir: p.facing, life: A.life, sprite, wisps, noiseT: 0 };
    this.echoes.push(e);
    s.add.particles(p.x, p.y, 'spark', {
      lifespan: 500, speed: { min: 60, max: 180 }, scale: { start: 1, end: 0 }, tint: [0xb48cff, 0x7a4cff], blendMode: 'ADD', emitting: false,
    }).setDepth(44).explode(20);
    AUDIO.play('echo');
  }

  updateEchoes(dt) {
    const A = TUNING.abilities.echo;
    const s = this.scene;
    for (const e of this.echoes) {
      if (e.dead) continue;
      e.life -= dt;
      const nx = e.x + e.dir * A.speed * dt;
      if (!s.solidOverlaps(nx - 10, e.feetY - 50, 20, 44)) e.x = nx;
      e.sprite.setPosition(e.x, e.feetY).setAlpha(0.45 + Math.sin(e.life * 12) * 0.12);
      e.noiseT -= dt;
      if (e.noiseT <= 0) { e.noiseT = 0.7; s.emitNoise(e.x, e.feetY - 30, A.noise, 'echo'); }
      if (e.life <= 0) this.popEcho(e.id);
    }
    this.echoes = this.echoes.filter((e) => !e.dead);
  }

  popEcho(id) {
    const e = this.echoes.find((v) => v.id === id);
    if (!e || e.dead) return;
    e.dead = true;
    const s = this.scene;
    s.add.particles(e.x, e.feetY - 40, 'spark', {
      lifespan: 700, speed: { min: 40, max: 200 }, scale: { start: 1.2, end: 0 }, tint: [0xb48cff, 0x7a4cff, 0x1a0a30], blendMode: 'ADD', emitting: false,
    }).setDepth(44).explode(26);
    e.wisps.stop();
    s.time.delayedCall(700, () => e.wisps.destroy());
    e.sprite.destroy();
    AUDIO.play('echoPop', s.spatialFor(e.x));
  }

  // Watchers perceive echoes exactly like the player: an echo stands in light.
  targets() {
    return this.echoes.filter((e) => !e.dead).map((e) => ({
      id: e.id, kind: 'decoy', x: e.x, y: e.feetY - 34, feetY: e.feetY,
      light: { value: 1, state: 'light', fire: false }, merged: false, crouched: false, moving: true,
      hidden: false, alive: true, inCover: false, points: [[e.x, e.feetY - 34], [e.x, e.feetY - 56]],
    }));
  }

  // ------------------------------------------------------------------
  // Eclipse and the Corona
  // ------------------------------------------------------------------
  eclipse(p) {
    const A = TUNING.abilities.eclipse;
    if (!this.has('eclipse') || p.dead) return;
    if (this.charge < A.killsToCharge) { this.scene.toast('The Eclipse is not ready. Every enemy you fell feeds it.', 1600); return; }
    this.charge = 0;
    p.eclipseT = A.duration;
    this.corona(p.x, p.y - 10, this.up('eclipse2') ? A.radius2 : A.radius);
  }

  corona(x, y, R) {
    const s = this.scene;
    const A = TUNING.abilities.eclipse;
    this.warpUntil = performance.now() + 650;
    const cam = s.cameras.main;
    cam.flash(260, 255, 244, 214);
    cam.shake(420, 0.012);
    cam.zoomTo(1.07, 120, 'Quad.easeOut', true, (c, k) => { if (k >= 1) cam.zoomTo(1, 500, 'Sine.easeInOut', true); });
    this.ring(x, y, R, 0xfff1c0, 520, 10);
    this.ring(x, y, R * 0.72, 0x9a5cff, 420, 6);
    // a black sun behind you for a moment
    const disc = s.add.image(x, y, 'eclipse_disc').setDepth(44).setScale(0.2).setAlpha(1);
    s.tweens.add({ targets: disc, scale: (R / 128) * 0.9, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => disc.destroy() });
    s.add.particles(x, y, 'spark', {
      lifespan: { min: 500, max: 1100 }, speed: { min: R * 0.8, max: R * 1.6 }, scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xfff1c0, 0xb48cff], blendMode: 'ADD', emitting: false,
    }).setDepth(45).explode(70);
    AUDIO.play('eclipse');
    for (const w of s.watchers) {
      if (w.mode === 'down' || w.mode === 'dormant') continue;
      if (Math.abs(w.x - x) > R || Math.abs(w.groundY - 60 - y) > R) continue;
      if (w.cfg.killable) { if (w.hurt(99, x)) this.onKill(w, false, false); } else {
        w.stun(A.stun);
        if (w.hurt(1, x)) this.onKill(w, false, false);
      }
    }
    for (const sn of s.snuffables) if (sn.lit && sn.burn !== false && Math.hypot(sn.x - x, sn.y - y) < R) this.snuff(sn);
    s.boss?.corona(x, y, R);
  }

  // An expanding ring of light: the Corona, an Ember II burst.
  ring(x, y, R, color, ms, width = 5) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(45).setBlendMode('ADD');
    const st = { k: 0 };
    s.tweens.add({
      targets: st, k: 1, duration: ms, ease: 'Cubic.easeOut',
      onUpdate: () => { g.clear(); g.lineStyle(width * (1 - st.k) + 1, color, 1 - st.k); g.strokeCircle(x, y, R * st.k); },
      onComplete: () => g.destroy(),
    });
  }

  // ------------------------------------------------------------------
  // Shadow Dash and Cling effects
  // ------------------------------------------------------------------
  dashCut(p) {
    const W = TUNING.abilities.dashCut.width;
    if (this.scene.boss && this._bossCut !== p.dashId && this.scene.boss.dashHit(p)) this._bossCut = p.dashId;
    for (const w of this.scene.watchers) {
      if (w.mode === 'down' || w.mode === 'dormant' || w._cutBy === p.dashId) continue;
      if (Math.abs(w.x - p.x) > W || p.feetY < w.groundY - w.cfg.eyeH - 20 || p.feetY > w.groundY + 20) continue;
      w._cutBy = p.dashId;     // one hit per dash
      if (!w.cfg.killable) {
        this.scene.add.particles(w.x, p.y, 'spark', { lifespan: 300, speed: { min: 80, max: 200 }, scale: { start: 1, end: 0 }, tint: 0xfff1c0, blendMode: 'ADD', emitting: false }).setDepth(45).explode(12);
        AUDIO.play('whiff');
        continue;
      }
      if (w.hurt(99, p.x)) {
        this.onKill(w);
        const slash = this.scene.add.image(w.x, w.groundY - 50, 'slash_fx').setDepth(45).setBlendMode('ADD').setFlipX(p.facing < 0).setAlpha(1);
        this.scene.tweens.add({ targets: slash, alpha: 0, scaleX: 1.6, duration: 260, onComplete: () => slash.destroy() });
      }
    }
  }

  afterimage(p) {
    const s = this.scene;
    const g = s.add.image(p.sprite.x, p.sprite.y, p.sprite.texture.key, p.sprite.frame.name)
      .setOrigin(p.sprite.originX, p.sprite.originY).setFlipX(p.sprite.flipX).setDepth(39)
      .setTintFill(0x7a4cff).setAlpha(0.55).setBlendMode('ADD');
    s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  wallKickFx(p) {
    this.scene.add.particles(p.x - p.facing * 14, p.y, 'smoke', {
      lifespan: 420, speedX: { min: p.facing * 20, max: p.facing * 90 }, speedY: { min: -30, max: 30 }, scale: { start: 0.35, end: 0.9 },
      alpha: { start: 0.55, end: 0 }, tint: 0x241a3a, emitting: false,
    }).setDepth(43).explode(8);
  }

  // ------------------------------------------------------------------
  // feed: whether this kill charges the Eclipse (the Corona's own kills do not)
  onKill(w, sound = true, feed = true) {
    const s = this.scene;
    s.setFlag(`down:${w.id}`, true);
    GAME.data.stats.takedowns += 1;
    const full = TUNING.abilities.eclipse.killsToCharge;
    const was = this.charge;
    if (feed) this.charge = Math.min(full, this.charge + 1);
    if (sound) AUDIO.play('takedown', s.spatialFor(w.x));
    s.add.particles(w.x, w.groundY - 40, 'smoke', {
      lifespan: 900, speed: { min: 20, max: 90 }, scale: { start: 0.4, end: 1.2 }, alpha: { start: 0.6, end: 0 }, tint: 0x0d0918, emitting: false,
    }).setDepth(43).explode(14);
    if (was < full && this.charge === full && this.has('eclipse')) bus.emit('eclipse:ready');
    s.level.onTakedown?.(s, w);
  }

  update(dt) {
    this.cd.ember -= dt;
    this.cd.echo -= dt;
    this.updateBolts(dt);
    this.updateEchoes(dt);
  }

  destroy() {
    for (const b of this.bolts) { b.img.destroy(); b.glow.destroy(); b.trail.destroy(); b.smoke.destroy(); }
    for (const e of this.echoes) { e.sprite.destroy(); e.wisps.destroy(); }
    this.bolts = []; this.echoes = [];
  }
}


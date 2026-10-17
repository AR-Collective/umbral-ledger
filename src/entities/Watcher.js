// =====================================================================
// WATCHERS: anything that hunts you by sight and sound
// (Lanternmen, Hall guardians, acolytes).
//
// Two halves on purpose:
//   stepWatcherState()  pure movement rules on a plain object. Foresight copies
//                       the object and runs this forward to show the future.
//   Watcher.perceive()  the senses. Only the real watcher has them.
//
// Design rules: they must feel THREATENING, but every detection must be
// explainable. They see far in light, chase faster than you run, and one grab
// kills. In return the rules are visible: a cone you can see, a meter that
// fills, a "?" beat before a "!" and a unique sound for each state.
//
// SENSES
//   Sight: a cone from the eyes. It reaches further down than up, so a watcher
//          sees the ground in front of his feet, not only the horizon.
//   Near sense: practically touching (in front of or just behind him), he
//          notices you whatever the light. Only merging INSIDE cover hides you.
//   Hearing: footsteps, landings, dashes, missed strikes.
// =====================================================================

import { TUNING } from '../tuning.js';
import { feetOrigin, anchorFor } from '../art/characters.js';

// ---------------------------------------------------------------------
// Pure movement rules
// ---------------------------------------------------------------------
export function makeWatcherState(def) {
  const patrol = def.patrol && def.patrol.length ? def.patrol.slice() : [def.x];
  return {
    x: def.x,
    facing: def.facing ?? 1,
    mode: def.down ? 'down' : def.dormant ? 'dormant' : 'patrol',
    patrol,
    idx: patrol.length > 1 ? 1 : 0,
    dirIdx: 1,
    waitT: def.startWait ?? 0,
    turnT: 0,
    stimX: def.x,
    lookT: 0,
    susT: 0,
    searchT: 0,
    searchDir: 1,
    lastX: def.x,
    minX: def.bounds ? def.bounds[0] : Math.min(...patrol) - 140,
    maxX: def.bounds ? def.bounds[1] : Math.max(...patrol) + 140,
    wait: def.wait ?? 1.4,
    turnEvery: def.turnEvery ?? 0,
    loop: def.loop ?? 'pingpong',
    moving: false,
  };
}

function moveToward(s, tx, speed, dt) {
  const target = Math.max(s.minX, Math.min(s.maxX, tx));
  const dx = target - s.x;
  if (Math.abs(dx) < 1.5) { s.x = target; return true; }
  s.facing = dx > 0 ? 1 : -1;
  s.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  s.moving = true;
  return false;
}

export function stepWatcherState(s, cfg, dt) {
  const S = TUNING.stealth;
  s.moving = false;
  switch (s.mode) {
    case 'patrol': {
      if (s.patrol.length <= 1) {
        // A sentry: walks back to its post, then faces its post direction or
        // turns around on a timer.
        const arrived = moveToward(s, s.patrol[0], cfg.walk, dt);
        if (arrived) {
          if (s.turnEvery > 0) {
            s.turnT += dt;
            if (s.turnT >= s.turnEvery) { s.turnT = 0; s.facing *= -1; }
          } else if (s.homeFacing) {
            s.facing = s.homeFacing;
          }
        }
        return;
      }
      if (s.waitT > 0) {
        const before = s.waitT;
        s.waitT -= dt;
        // Halfway through a pause, turn to face where we walk next.
        if (before > s.wait / 2 && s.waitT <= s.wait / 2) {
          s.facing = s.patrol[s.idx] >= s.x ? 1 : -1;
        }
        return;
      }
      if (moveToward(s, s.patrol[s.idx], cfg.walk, dt)) {
        s.waitT = s.wait;
        if (s.loop === 'loop') {
          s.idx = (s.idx + 1) % s.patrol.length;
        } else {
          if (s.idx + s.dirIdx >= s.patrol.length || s.idx + s.dirIdx < 0) s.dirIdx *= -1;
          s.idx += s.dirIdx;
        }
      }
      return;
    }
    case 'suspicious': {
      s.susT += dt;
      if (s.susT < 0.6) { s.facing = s.stimX >= s.x ? 1 : -1; return; }
      if (moveToward(s, s.stimX, cfg.walk * 1.1, dt)) {
        s.lookT += dt;
        if (Math.floor(s.lookT / 1.1) !== Math.floor((s.lookT - dt) / 1.1)) s.facing *= -1;
        if (s.lookT > S.lookTime) { s.mode = 'patrol'; s.lookT = 0; }
      }
      return;
    }
    case 'alert':
      moveToward(s, s.lastX, cfg.chase, dt);
      return;
    case 'search': {
      s.searchT += dt;
      const anchor = s.lastX + s.searchDir * 90;
      if (moveToward(s, anchor, cfg.walk * 1.6, dt)) s.searchDir *= -1;
      if (s.searchT > S.searchTime) { s.mode = 'patrol'; s.searchT = 0; }
      return;
    }
    default:
      return;
  }
}

// ---------------------------------------------------------------------
// The live watcher
// ---------------------------------------------------------------------
export class Watcher {
  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.id = def.id ?? `w${Math.round(def.x)}`;
    this.type = def.type ?? 'lanternman';
    this.cfg = TUNING.enemies[this.type];
    this.groundY = def.y;
    this.s = makeWatcherState(def);
    if (def.patrol && def.patrol.length === 1) this.s.homeFacing = def.facing ?? 1;
    this.meters = new Map();
    this.doubleTakeT = 0;
    this.targetId = null;
    this.lostT = 0;
    this.time = Math.random() * 10;
    this.tag = def.tag ?? '';
    this.swingA = 0;
    this.swingV = 0;

    const [ox, oy] = feetOrigin(this.type);
    this.sprite = scene.add.sprite(this.s.x, this.groundY, this.type, 0).setOrigin(ox, oy).setDepth(36);
    this.sprite.play(`${this.type}_idle`);
    this.icon = scene.add.text(0, 0, '', {
      fontFamily: 'Cinzel, Georgia, serif', fontSize: '28px', fontStyle: 'bold', color: '#ffcc66',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5, 1).setDepth(61);
    this.meterGfx = scene.add.graphics().setDepth(61);

    const lc = this.cfg.lantern;
    if (lc) {
      this.lanternSprite = scene.add.image(0, 0, 'lantern').setOrigin(0.5, 0.05).setDepth(37);
      this.lanternGlow = scene.add.image(0, 0, 'flare').setDepth(38).setBlendMode('ADD').setTint(0xffa850).setAlpha(0.85).setScale(0.55);
      this.coneLight = scene.lighting.addLight({
        x: 0, y: 0, radius: lc.radius, intensity: lc.intensity, color: [255, 172, 96], cone: { dir: 0, spread: lc.spread }, flicker: 0.05,
      });
      this.glowLight = scene.lighting.addLight({
        x: 0, y: 0, radius: lc.glowRadius, intensity: lc.glowIntensity, color: [255, 160, 84], flicker: 0.05,
      });
    }
    if (this.s.mode === 'down') this.applyDown(true);
    if (this.s.mode === 'dormant') this.setPresent(false);
    this.syncVisuals(0);
  }

  get x() { return this.s.x; }
  get mode() { return this.s.mode; }

  anchor() {
    const f = this.sprite.frame ? Number(this.sprite.frame.name) : 0;
    return anchorFor(this.type, Number.isFinite(f) ? f : 0);
  }
  eyeX() { const a = this.anchor(); return this.s.x + a.eye.x * this.s.facing; }
  eyeY() { const a = this.anchor(); return this.groundY + a.eye.y; }
  headY() { return this.groundY - this.cfg.eyeH - 10; }
  lanternPos() {
    const a = this.anchor();
    const hx = this.s.x + a.hand.x * this.s.facing, hy = this.groundY + a.hand.y;
    const hang = 16;
    return [hx + Math.sin(this.swingA) * hang, hy + Math.cos(this.swingA) * hang];
  }

  // Dormant watchers wait off-stage (inside a house) until a level event wakes them.
  setPresent(on) {
    this.sprite.setVisible(on);
    this.lanternSprite?.setVisible(on);
    this.lanternGlow?.setVisible(on);
    if (this.coneLight) this.coneLight.enabled = on;
    if (this.glowLight) this.glowLight.enabled = on;
  }

  wake({ x, facing } = {}) {
    if (this.s.mode !== 'dormant') return;
    if (x !== undefined) this.s.x = x;
    if (facing !== undefined) this.s.facing = facing;
    this.s.mode = 'patrol';
    this.setPresent(true);
  }

  // --------------------------- senses ---------------------------
  // Near sense: practically touching. Returns true if he would notice you here.
  nearSense(t) {
    const N = TUNING.stealth.near;
    const ahead = (t.x - this.s.x) * this.s.facing;
    if (ahead < -N.back || ahead > N.front) return false;
    if (Math.abs(t.feetY - this.groundY) > N.height) return false;
    if (t.inCover && (t.merged || t.crouched)) return false;
    return this.scene.lighting.lineOfSight(this.s.x, this.groundY - 40, t.x, t.y);
  }

  // How fast the meter fills for this target (0 = not seen).
  visionRate(t) {
    const S = TUNING.stealth;
    if (t.hidden || !t.alive) return 0;
    if (this.nearSense(t)) return 1 / S.near.fillTime;
    const ex = this.eyeX(), ey = this.eyeY();
    const st = t.light.state;
    let mult = 1;
    if (t.kind === 'player' && t.merged) mult *= S.merge[st];
    if (t.kind === 'survivor' && t.crouched) mult *= S.survivorCrouchMult;
    mult *= 1 - S.fogVision * this.scene.fogAt(t.x);
    const range = S.range[st] * mult;
    if (range <= 0) return 0;
    const half = ((this.s.mode === 'alert' || this.s.mode === 'search' ? S.alertCone : S.cone) * Math.PI) / 180;
    let best = 0;
    for (const [px, py] of t.points) {
      const ahead = (px - ex) * this.s.facing;
      const dy = py - ey;
      const dist = Math.hypot(ahead, dy);
      if (dist > range || ahead <= 0) continue;
      const elev = Math.atan2(dy, ahead);              // + is below the eyes
      if (elev < -half || elev > half + 0.4) continue; // looks further down than up
      if (!this.scene.lighting.lineOfSight(ex, ey, px, py)) continue;
      const closeness = 1 - dist / range;
      best = Math.max(best, (1 / S.fillTime[st]) * (0.55 + 0.9 * closeness));
    }
    if (best <= 0) return 0;
    let rate = best * (t.moving ? S.movingMult : S.stillMult);
    if (this.s.mode === 'search') rate *= S.searchMult;
    return rate;
  }

  hear(nx, ny, radius) {
    if (this.s.mode === 'down' || this.s.mode === 'alert' || this.s.mode === 'dormant') return;
    const d = Math.hypot(nx - this.s.x, (ny - (this.groundY - 40)) * 1.5);
    if (d > radius) return;
    if (this.s.mode === 'search') { this.s.lastX = nx; this.s.searchT = Math.min(this.s.searchT, 2); return; }
    this.becomeSuspicious(nx, false);
  }

  becomeSuspicious(x, sight) {
    const s = this.s;
    if (s.mode === 'down' || s.mode === 'alert' || s.mode === 'dormant') return;
    const was = s.mode;
    s.mode = 'suspicious';
    s.stimX = x;
    s.susT = 0;
    s.lookT = 0;
    if (sight) this.doubleTakeT = TUNING.stealth.doubleTake;
    if (was !== 'suspicious') this.scene.watcherEvent(this, 'suspicious');
  }

  becomeAlert(target, called = false) {
    const s = this.s;
    if (s.mode === 'down' || s.mode === 'dormant') return;
    const was = s.mode;
    s.mode = 'alert';
    s.lastX = target ? target.x : s.lastX;
    this.targetId = target ? target.id : this.targetId;
    this.lostT = 0;
    if (target) this.meters.set(target.id, 1);
    if (was !== 'alert') {
      this.scene.watcherEvent(this, 'alert', target);
      if (!called) this.scene.alertNearby(this);
    }
  }

  perceive(dt, targets) {
    const S = TUNING.stealth;
    const s = this.s;
    if (s.mode === 'down' || s.mode === 'dormant') return;
    this.doubleTakeT -= dt;
    let best = null, bestMeter = -1, seenTarget = null;
    for (const t of targets) {
      const rate = this.visionRate(t);
      let m = this.meters.get(t.id) ?? 0;
      if (rate > 0) {
        if (this.doubleTakeT <= 0 || s.mode === 'alert') m = Math.min(1, m + rate * dt);
        if (s.mode === 'alert' && t.id === this.targetId) seenTarget = t;
      } else if (s.mode !== 'alert') {
        m = Math.max(0, m - S.decay * dt * (s.mode === 'suspicious' ? 0.6 : 1));
      }
      this.meters.set(t.id, m);
      if (m > bestMeter && (rate > 0 || m > 0)) { bestMeter = m; best = t; }
      t._rate = rate;
    }

    if (s.mode !== 'alert') {
      if (best && bestMeter >= 1) {
        this.becomeAlert(best);
      } else if (best && bestMeter >= S.suspiciousAt && best._rate > 0) {
        if (s.mode === 'patrol') this.becomeSuspicious(best.x, true);
        else if (s.mode === 'suspicious') { s.stimX = best.x; s.lookT = 0; }
        else if (s.mode === 'search') { s.lastX = best.x; if (bestMeter > 0.6) this.becomeAlert(best); }
      }
      return;
    }

    // Alert: chase whoever we are locked onto.
    const target = targets.find((t) => t.id === this.targetId);
    if (!target || !target.alive) { s.mode = 'search'; s.searchT = 0; return; }
    if (seenTarget) {
      s.lastX = target.x;
      this.lostT = 0;
    } else {
      this.lostT += dt;
      if (this.lostT > S.loseTime) {
        s.mode = 'search';
        s.searchT = 0;
        this.meters.set(target.id, 0.5);
        this.scene.watcherEvent(this, 'lost');
        return;
      }
    }
    // The grab: close enough horizontally and at the same height.
    if (Math.abs(target.x - s.x) < this.cfg.grab + 10 && target.feetY > this.groundY - 120 && target.feetY < this.groundY + 30) {
      this.scene.onCaught(this, target);
    }
  }

  // --------------------------- takedowns ---------------------------
  canBeTakenDown() {
    return this.cfg.killable && this.s.mode !== 'down' && this.s.mode !== 'alert' && this.s.mode !== 'dormant';
  }

  takeDown() {
    this.s.mode = 'down';
    this.applyDown(false);
  }

  applyDown(instant) {
    if (this.coneLight) this.coneLight.enabled = false;
    if (this.glowLight) this.glowLight.enabled = false;
    if (this.lanternGlow) this.lanternGlow.setVisible(false);
    this.icon.setText('');
    this.meterGfx.clear();
    const hasDown = this.scene.anims.exists(`${this.type}_down`);
    const doDown = () => {
      if (hasDown) this.sprite.play(`${this.type}_down`);
      else this.sprite.setAngle(-this.s.facing * 84);
    };
    if (instant) doDown();
    else {
      this.scene.tweens.add({ targets: this.sprite, angle: -this.s.facing * 30, duration: 220, ease: 'Quad.easeIn', onComplete: () => { this.sprite.setAngle(0); doDown(); } });
    }
    if (this.lanternSprite) {
      const [lx] = this.lanternPos();
      this.lanternSprite.setPosition(lx + this.s.facing * 14, this.groundY - 10).setAngle(80).setTint(0x555555);
    }
  }

  // Bell outcome: walk to a new spot and stand guard there.
  drawTo(x, facing = -1) {
    if (this.s.mode === 'down') return;
    this.s.mode = 'patrol';
    this.s.patrol = [x];
    this.s.homeFacing = facing;
    this.s.minX = Math.min(this.s.minX, x - 40);
    this.s.maxX = Math.max(this.s.maxX, x + 40);
  }

  // --------------------------- per frame ---------------------------
  step(dt) {
    const before = this.s.mode;
    const prevX = this.s.x;
    stepWatcherState(this.s, this.cfg, dt);
    if (before === 'search' && this.s.mode === 'patrol') this.scene.watcherEvent(this, 'gaveUp');
    this.time += dt;
    // the lantern swings like a pendulum, pushed by walking
    const accel = ((this.s.x - prevX) / Math.max(dt, 1e-4)) * -0.0009;
    this.swingV += (-this.swingA * 28 + accel * 60) * dt;
    this.swingV *= Math.pow(0.12, dt);
    this.swingA = Math.max(-0.6, Math.min(0.6, this.swingA + this.swingV * dt + Math.sin(this.time * 2.3) * 0.002));
    this.updateLights();
  }

  updateLights() {
    if (!this.coneLight || this.s.mode === 'down' || this.s.mode === 'dormant') return;
    const [lx, ly] = this.lanternPos();
    const cy = ly + 12;
    this.coneLight.x = lx; this.coneLight.y = cy;
    this.coneLight.cone.dir = this.s.facing > 0 ? 16 : 164;
    this.glowLight.x = lx; this.glowLight.y = cy;
    const alert = this.s.mode === 'alert';
    this.coneLight.intensity = this.cfg.lantern.intensity * (alert ? 1.05 : 1);
  }

  syncVisuals() {
    const s = this.s;
    if (s.mode === 'down' || s.mode === 'dormant') { this.meterGfx.clear(); this.icon.setText(''); return; }
    // animation from mode and movement
    let anim = 'idle';
    if (s.mode === 'alert') anim = this.scene.anims.exists(`${this.type}_run`) ? 'run' : 'walk';
    else if (s.moving) anim = 'walk';
    else if ((s.mode === 'suspicious' || s.mode === 'search') && this.scene.anims.exists(`${this.type}_look`)) anim = 'look';
    const key = `${this.type}_${anim}`;
    if (this.scene.anims.exists(key)) this.sprite.anims.play(key, true);
    this.sprite.anims.timeScale = s.mode === 'search' && anim === 'walk' ? 1.4 : 1;
    this.sprite.setPosition(s.x, this.groundY).setFlipX(s.facing < 0);

    if (this.lanternSprite) {
      const [lx, ly] = this.lanternPos();
      const a = this.anchor();
      const hx = s.x + a.hand.x * s.facing, hy = this.groundY + a.hand.y;
      this.lanternSprite.setPosition(hx, hy).setRotation(-this.swingA);
      this.lanternGlow.setPosition(lx, ly + 12).setScale(0.5 + Math.sin(this.time * 9) * 0.03);
    }

    // State icon and meter: the readable half of the stealth rules.
    const iconY = this.groundY - this.cfg.eyeH - 34;
    this.icon.setPosition(s.x, iconY);
    if (s.mode === 'alert') this.icon.setText('!').setColor('#ff5a4a');
    else if (s.mode === 'suspicious') this.icon.setText('?').setColor('#ffcc66');
    else if (s.mode === 'search') this.icon.setText('?').setColor('#c9b8a6');
    else this.icon.setText('');

    const m = Math.max(0, ...this.meters.values());
    this.meterGfx.clear();
    if (m > 0.02 && s.mode !== 'alert') {
      const cx = s.x, cy = iconY + 14;
      const col = m < TUNING.stealth.suspiciousAt ? 0xf2e6d0 : 0xffb347;
      this.meterGfx.fillStyle(0x000000, 0.55);
      this.meterGfx.fillEllipse(cx, cy, 34, 16);
      this.meterGfx.lineStyle(2, col, 0.9);
      this.meterGfx.strokeEllipse(cx, cy, 34, 16);
      this.meterGfx.fillStyle(col, 0.95);
      this.meterGfx.fillEllipse(cx, cy, 30 * m, 12 * Math.min(1, 0.4 + m));
    }
  }

  destroy() {
    this.sprite.destroy(); this.icon.destroy(); this.meterGfx.destroy();
    this.lanternSprite?.destroy(); this.lanternGlow?.destroy();
    if (this.coneLight) this.scene.lighting.removeLight(this.coneLight);
    if (this.glowLight) this.scene.lighting.removeLight(this.glowLight);
  }
}

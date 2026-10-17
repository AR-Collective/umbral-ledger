// =====================================================================
// WATCHERS: anything that hunts you by sight and sound
// (Lanternmen, Hall guardians, acolytes).
//
// Two halves on purpose:
//   stepWatcherState()  pure movement rules on a plain object. Foresight copies
//                       the object and runs this forward to show the future.
//   Watcher.perceive()  the senses. Only the real watcher has them.
//
// Design rules (P8 decision): they must feel THREATENING, but every detection
// must be explainable. So they see far in light, chase faster than you run,
// and one grab kills. In return the rules are visible: a cone you can see, a
// meter that fills, a "?" beat before a "!" and a unique sound for each state.
// =====================================================================

import { TUNING } from '../tuning.js';
import { AUDIO } from '../systems/audio.js';

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
  };
}

function moveToward(s, tx, speed, dt) {
  const target = Math.max(s.minX, Math.min(s.maxX, tx));
  const dx = target - s.x;
  if (Math.abs(dx) < 1.5) { s.x = target; return true; }
  s.facing = dx > 0 ? 1 : -1;
  s.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  return false;
}

export function stepWatcherState(s, cfg, dt) {
  const S = TUNING.stealth;
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

    const tex = this.type;
    this.sprite = scene.add.image(this.s.x, this.groundY, tex).setOrigin(0.5, 1).setDepth(22);
    this.eyes = scene.add.image(0, 0, this.type === 'guardian' ? 'glint_cold' : 'glint').setDepth(45).setBlendMode('ADD');
    this.icon = scene.add.text(0, 0, '', {
      fontFamily: 'Cinzel, Georgia, serif', fontSize: '26px', fontStyle: 'bold', color: '#ffcc66',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(46);
    this.meterGfx = scene.add.graphics().setDepth(46);

    const lc = this.cfg.lantern;
    if (lc) {
      this.lanternSprite = scene.add.image(0, 0, 'lantern').setDepth(23);
      this.lanternGlow = scene.add.image(0, 0, 'softglow').setDepth(31).setBlendMode('ADD').setTint(0xffa050).setAlpha(0.5).setScale(0.6);
      this.coneLight = scene.lighting.addLight({
        x: 0, y: 0, radius: lc.radius, intensity: lc.intensity, color: [255, 170, 90], cone: { dir: 0, spread: lc.spread }, flicker: 0.06, glow: 0.5,
      });
      this.glowLight = scene.lighting.addLight({
        x: 0, y: 0, radius: lc.glowRadius, intensity: lc.glowIntensity, color: [255, 160, 80], flicker: 0.06, glow: 0.6,
      });
    }
    if (this.s.mode === 'down') this.applyDown(true);
    if (this.s.mode === 'dormant') this.setPresent(false);
    this.syncVisuals(0);
  }

  // Dormant watchers wait off-stage (inside a house) until a level event wakes them.
  setPresent(on) {
    this.sprite.setVisible(on);
    this.eyes.setVisible(on);
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

  get x() { return this.s.x; }
  get mode() { return this.s.mode; }
  eyeX() { return this.s.x + this.s.facing * 8; }
  eyeY() { return this.groundY - this.cfg.eyeH; }
  headY() { return this.groundY - this.cfg.eyeH - 12; }
  lanternPos() {
    if (this.type === 'guardian') return [this.s.x + this.s.facing * 26, this.groundY - 68];
    return [this.s.x + this.s.facing * 22, this.groundY - 50];
  }

  // --------------------------- senses ---------------------------
  // Returns how fast the meter should fill for this target (0 = not seen).
  visionRate(t) {
    const S = TUNING.stealth;
    if (t.hidden || !t.alive) return 0;
    const ex = this.eyeX(), ey = this.eyeY();
    const dx = t.x - ex, dy = t.y - ey;
    const dist = Math.hypot(dx, dy);
    const st = t.light.state;
    let mult = 1;
    if (t.kind === 'player' && t.merged) mult *= S.merge[st];
    if (t.kind === 'survivor' && t.crouched) mult *= S.survivorCrouchMult;
    mult *= 1 - S.fogVision * this.scene.fogAt(t.x);
    const range = S.range[st] * mult;
    const adjacent = t.kind === 'player' && t.merged && st === 'shade' ? 0 : S.adjacent;
    if (dist > Math.max(range, adjacent)) return 0;
    const half = ((this.s.mode === 'alert' || this.s.mode === 'search' ? S.alertCone : S.cone) * Math.PI) / 180;
    const facingAngle = this.s.facing > 0 ? 0 : Math.PI;
    let diff = Math.atan2(dy, dx) - facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const inCone = Math.abs(diff) <= half && dist <= range;
    const isAdjacent = dist <= adjacent;
    if (!inCone && !isAdjacent) return 0;
    if (!this.scene.lighting.lineOfSight(ex, ey, t.x, t.y)) return 0;
    const closeness = isAdjacent ? 1 : 1 - dist / Math.max(1, range);
    let rate = (1 / S.fillTime[st]) * (0.55 + 0.9 * closeness) * (t.moving ? S.movingMult : S.stillMult);
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
    if (s.mode === 'down' || s.mode === 'alert') return;
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
    if (s.mode === 'down') return;
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
    this.eyes.setVisible(false);
    this.icon.setText('');
    const fall = { angle: -this.s.facing * 84, y: this.groundY + 6, alpha: 0.85 };
    if (instant) {
      this.sprite.setAngle(fall.angle).setY(fall.y).setAlpha(fall.alpha);
    } else {
      this.scene.tweens.add({ targets: this.sprite, angle: fall.angle, y: fall.y, alpha: fall.alpha, duration: 520, ease: 'Quad.easeIn' });
    }
    if (this.lanternSprite) {
      const [lx] = this.lanternPos();
      this.lanternSprite.setPosition(lx, this.groundY - 12).setAngle(80).setTint(0x555555);
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
    stepWatcherState(this.s, this.cfg, dt);
    if (before === 'search' && this.s.mode === 'patrol') this.scene.watcherEvent(this, 'gaveUp');
    this.time += dt;
    this.updateLights();
  }

  updateLights() {
    if (!this.coneLight || this.s.mode === 'down' || this.s.mode === 'dormant') return;
    const [lx, ly] = this.lanternPos();
    const sway = Math.sin(this.time * 3) * 2;
    this.coneLight.x = lx; this.coneLight.y = ly + sway;
    this.coneLight.cone.dir = this.s.facing > 0 ? 12 : 168;
    this.glowLight.x = lx; this.glowLight.y = ly + sway;
    const alert = this.s.mode === 'alert';
    this.coneLight.intensity = this.cfg.lantern.intensity * (alert ? 1.05 : 1);
  }

  syncVisuals(dt) {
    const s = this.s;
    if (s.mode === 'down' || s.mode === 'dormant') { this.meterGfx.clear(); this.icon.setText(''); return; }
    const moving = Math.abs((this._lastX ?? s.x) - s.x) > 0.01;
    this._lastX = s.x;
    const bob = moving ? Math.abs(Math.sin(this.time * (s.mode === 'alert' ? 14 : 6))) * 3 : 0;
    this.sprite.setPosition(s.x, this.groundY - bob).setFlipX(s.facing < 0);
    this.sprite.setAngle(moving ? Math.sin(this.time * 6) * 2 : 0);
    const ex = s.x + s.facing * (this.type === 'guardian' ? 7 : this.type === 'acolyte' ? 6 : 14);
    const ey = this.groundY - (this.type === 'guardian' ? 100 : this.type === 'acolyte' ? 44 : 72) - bob;
    this.eyes.setPosition(ex, ey).setFlipX(s.facing < 0);
    this.eyes.setAlpha(s.mode === 'alert' ? 1 : 0.75);
    if (this.lanternSprite) {
      const [lx, ly] = this.lanternPos();
      this.lanternSprite.setPosition(lx, ly + Math.sin(this.time * 3) * 2 - bob);
      this.lanternSprite.setAngle(Math.sin(this.time * 2.4) * 8);
      this.lanternGlow.setPosition(lx, ly - bob);
    }

    // State icon and meter: the readable half of the stealth rules.
    const iconY = this.groundY - this.cfg.eyeH - 40 - bob;
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
      this.meterGfx.lineStyle(2, 0x000000, 0.6);
      this.meterGfx.strokeEllipse(cx, cy, 30, 14);
      this.meterGfx.fillStyle(col, 0.95);
      this.meterGfx.fillEllipse(cx, cy, 30 * m, 14 * Math.min(1, 0.4 + m));
    }
  }

  setFrozen(f) { this.frozen = f; }

  destroy() {
    this.sprite.destroy(); this.eyes.destroy(); this.icon.destroy(); this.meterGfx.destroy();
    this.lanternSprite?.destroy(); this.lanternGlow?.destroy();
    if (this.coneLight) this.scene.lighting.removeLight(this.coneLight);
    if (this.glowLight) this.scene.lighting.removeLight(this.glowLight);
  }
}

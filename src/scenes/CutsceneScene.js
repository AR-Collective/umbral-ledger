// =====================================================================
// CUTSCENES: manhwa-style panels (design doc 5.3, Tier 2).
//
// Each panel is a framed picture built from the game's own textures, with a
// slow camera push, parallax drift and a narration box. They are cheap to make,
// match the manhwa inspiration, and any panel can later be swapped for real
// art by changing its painter below.
// =====================================================================

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { CUTSCENES, SPEAKERS } from '../story.js';
import { AUDIO } from '../systems/audio.js';
import { feetOrigin } from '../art/characters.js';

const SERIF = '"Cormorant Garamond", Georgia, serif';

export class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  init(data) {
    this.panels = CUTSCENES[data.id] ?? [];
    this.next = data.next;
    this.index = -1;
  }

  create() {
    const { width: W, height: H } = TUNING.view;
    this.W = W; this.H = H;
    this.cameras.main.setBackgroundColor('#000000');
    this.layer = this.add.container(0, 0);
    this.box = this.add.container(0, 0).setDepth(10);
    this.skip = this.add.text(W - 20, H - 18, 'E / Space  next      Esc  skip', { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#6f6a82' }).setOrigin(1).setDepth(11);
    this.keys = this.input.keyboard.addKeys('E,ENTER,SPACE,ESC');
    this.input.on('pointerdown', () => this.advance());
    AUDIO.setAmbience('title');
    this.advance();
  }

  update(time, delta) {
    const J = Phaser.Input.Keyboard.JustDown;
    if (J(this.keys.ESC)) { this.finish(); return; }
    if (J(this.keys.E) || J(this.keys.ENTER) || J(this.keys.SPACE)) this.advance();
    if (this.typing) {
      this.typing.shown = Math.min(this.typing.full.length, this.typing.shown + (delta / 1000) * 40);
      this.typing.obj.setText(this.typing.full.slice(0, Math.floor(this.typing.shown)));
      if (this.typing.shown >= this.typing.full.length) this.typing = null;
    }
    this.autoT -= delta / 1000;
    if (this.autoT <= 0 && !this.typing) this.advance();
  }

  advance() {
    if (this.typing) {
      this.typing.obj.setText(this.typing.full);
      this.typing = null;
      return;
    }
    this.index++;
    if (this.index >= this.panels.length) { this.finish(); return; }
    this.showPanel(this.panels[this.index]);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.next.scene, this.next.data));
  }

  showPanel(panel) {
    const { W, H } = this;
    // old panel slides away
    const old = this.layer.list.slice();
    for (const o of old) this.tweens.add({ targets: o, alpha: 0, x: o.x - 60, duration: 500, onComplete: () => o.destroy() });
    this.box.removeAll(true);

    const frame = this.add.container(W / 2 + 80, H / 2).setAlpha(0);
    this.layer.add(frame);
    const pw = 1080, ph = 520;
    const inner = this.add.container(0, 0);
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(W / 2 - pw / 2, H / 2 - ph / 2 - 40, pw, ph);
    inner.setMask(maskShape.createGeometryMask());
    frame.add(inner);
    this.paint(panel, inner, pw, ph);
    // panel border, slightly rotated like a comic page
    const border = this.add.rectangle(0, -40, pw, ph).setStrokeStyle(6, 0xe9e2f5, 0.9);
    frame.add(border);
    this.tweens.add({ targets: frame, alpha: 1, x: W / 2, duration: 650, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: inner, scale: 1.06, duration: 7000, ease: 'Sine.easeOut' });

    // narration box
    const isVoice = !!panel.speaker;
    const boxW = 860;
    const bg = this.add.rectangle(W / 2, H - 92, boxW, 96, isVoice ? 0x0a0912 : 0xf3efe6, 0.96).setStrokeStyle(2, isVoice ? 0xe8c372 : 0x1a1620, 1);
    const txt = this.add.text(W / 2, H - 92, '', {
      fontFamily: SERIF, fontStyle: isVoice ? 'italic' : 'normal', fontSize: '28px', color: isVoice ? '#e8c372' : '#14111a',
      align: 'center', wordWrap: { width: boxW - 60 },
    }).setOrigin(0.5);
    this.box.add([bg, txt]);
    if (isVoice) {
      const name = this.add.text(W / 2 - boxW / 2 + 16, H - 164, SPEAKERS[panel.speaker].name, { fontFamily: 'Cinzel, Georgia', fontSize: '15px', color: '#e8c372', letterSpacing: 4 });
      this.box.add(name);
      AUDIO.play('voiceEntity');
    } else {
      AUDIO.play('ui');
    }
    this.typing = { obj: txt, full: panel.text, shown: 0 };
    this.autoT = 3.5 + panel.text.length / 18;
  }

  // ------------------------------------------------------------------
  // Painters: one per panel "art" key
  // ------------------------------------------------------------------
  paint(panel, c, pw, ph) {
    const add = (o) => { c.add(o); return o; };
    const top = -ph / 2 - 40, bot = ph / 2 - 40, L = -pw / 2;
    const gfx = () => add(this.add.graphics());
    // a vertical gradient over the whole panel (WebGL; canvas falls back to a flat fill)
    const backdrop = (cTop, cBot) => { const g = gfx(); g.fillGradientStyle(cTop, cTop, cBot, cBot, 1); g.fillRect(L, top, pw, ph); return g; };
    const glow = (x, y, tint, sx, sy = sx, a = 0.6) => add(this.add.image(x, y, 'softglow').setBlendMode('ADD').setTint(tint).setScale(sx, sy).setAlpha(a));
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // gothic rooftops: gables, spires, a few lit windows
    const skyline = (color, baseY, hMin, hMax, s, lit = 0, litColor = 0xffb060) => {
      seed = s;
      const g = gfx();
      for (let x = L - 30; x < -L + 30;) {
        const w = 46 + rnd() * 70, h = hMin + rnd() * (hMax - hMin);
        g.fillStyle(color, 1);
        g.fillRect(x, baseY - h, w, bot - baseY + h + 10);
        g.fillTriangle(x - 6, baseY - h + 1, x + w / 2, baseY - h - 24 - rnd() * 40, x + w + 6, baseY - h + 1);
        if (rnd() < 0.35) { const sx = x + w * (0.2 + rnd() * 0.6); g.fillTriangle(sx - 7, baseY - h - 10, sx, baseY - h - 70 - rnd() * 70, sx + 7, baseY - h - 10); }
        if (lit) {
          for (let k = 0; k < 4; k++) if (rnd() < lit) {
            g.fillStyle(litColor, 0.55 + rnd() * 0.4);
            g.fillRect(x + 8 + rnd() * (w - 20), baseY - h + 20 + rnd() * (h - 30), 4, 7);
          }
        }
        x += w + rnd() * 12;
      }
      return g;
    };
    const embers = (x, y, w, power = 1, tint = [0xfff0c0, 0xffb050, 0xff6a20]) => add(this.add.particles(x, y, 'spark', {
      x: { min: -w / 2, max: w / 2 }, lifespan: { min: 1800, max: 3600 }, speedY: { min: -110 * power, max: -30 }, speedX: { min: -40, max: 50 },
      accelerationX: { min: -20, max: 20 }, scale: { start: 1.1 * power, end: 0 }, alpha: { start: 1, end: 0 }, tint, blendMode: 'ADD', frequency: 30, quantity: 1,
    }));
    const smoke = (x, y, w, tint = 0x120c14, a = 0.55) => add(this.add.particles(x, y, 'smoke', {
      x: { min: -w / 2, max: w / 2 }, lifespan: 5000, speedY: { min: -50, max: -20 }, speedX: { min: -10, max: 25 }, scale: { start: 1.4, end: 5 },
      alpha: { start: a, end: 0 }, tint, frequency: 110,
    }));
    const fire = (x, y, w, power = 1) => {
      glow(x, y - 40, 0xff4a10, w / 26, 3.4 * power, 0.55);
      glow(x, y - 20, 0xffb040, w / 50, 1.8 * power, 0.7);
      add(this.add.particles(x, y, 'spark', {
        x: { min: -w / 2, max: w / 2 }, lifespan: 1400, speedY: { min: -170 * power, max: -60 }, speedX: { min: -25, max: 25 },
        scale: { start: 2.6 * power, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xfff4c8, 0xffa040, 0xff5a1f], blendMode: 'ADD', frequency: 12, quantity: 2,
      }));
      embers(x, y - 40, w * 1.3, power);
      smoke(x, y - 110, w, 0x140c10, 0.5);
    };
    // a silhouette edged by the light behind it. The living man is only ever this:
    // his own outline (the Shade's shape, which is his) filled black, never a face.
    const sil = (key, x, y, scale, rimColor = 0xff7a30, body = 0x020103, rimDx = -3, rimA = 0.8) => {
      const [ox, oy] = feetOrigin(key);
      const rim = add(this.add.image(x + rimDx, y, key, 0).setOrigin(ox, oy).setTintFill(rimColor).setScale(scale).setAlpha(rimA));
      const fig = add(this.add.image(x, y, key, 0).setOrigin(ox, oy).setTintFill(body).setScale(scale));
      return [rim, fig];
    };
    const man = (x, y, scale, rimColor, body, rimDx, rimA) => sil('shade', x, y, scale, rimColor, body, rimDx, rimA);
    const crowd = (i, x, y, scale, rimColor, body, rimDx) => sil(i % 2 ? 'maren' : 'edrin', x, y, scale, rimColor, body, rimDx, 0.6);
    const shade = (x, y, scale, aura = 0.55) => {
      const [ox, oy] = feetOrigin('shade');
      const a = glow(x, y - 50 * scale, 0x7a4cff, scale * 2.4, scale * 3.4, aura);
      const fig = add(this.add.image(x, y, 'shade', 0).setOrigin(ox, oy).setScale(scale));
      this.tweens.add({ targets: a, alpha: aura * 0.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return [a, fig];
    };
    const motes = (x, y, w, h, tint, dir = -1) => add(this.add.particles(x, y, 'spark', {
      x: { min: -w / 2, max: w / 2 }, y: { min: -h / 2, max: h / 2 }, lifespan: 3000, speedY: { min: 10 * dir, max: 40 * dir }, speedX: { min: -12, max: 12 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, tint, blendMode: 'ADD', frequency: 70,
    }));
    const rays = (x, y, tint, n, spread, len, a = 0.08, angle = Math.PI / 2) => {
      const g = gfx().setBlendMode('ADD');
      for (let i = 0; i < n; i++) {
        const t0 = angle + (i / (n - 1) - 0.5) * spread, w = 0.02 + (i % 3) * 0.015;
        g.fillStyle(tint, a * (0.6 + (i % 2) * 0.6));
        g.fillTriangle(x, y, x + Math.cos(t0 - w) * len, y + Math.sin(t0 - w) * len, x + Math.cos(t0 + w) * len, y + Math.sin(t0 + w) * len);
      }
      return g;
    };
    const vignette = (a = 0.85, color = 0x000000) => {
      const g = gfx(), e = 220;
      g.fillGradientStyle(color, color, color, color, a, 0, a, 0); g.fillRect(L, top, e, ph);
      g.fillGradientStyle(color, color, color, color, 0, a, 0, a); g.fillRect(-L - e, top, e, ph);
      g.fillGradientStyle(color, color, color, color, a * 0.8, a * 0.8, 0, 0); g.fillRect(L, top, pw, 140);
      g.fillGradientStyle(color, color, color, color, 0, 0, a, a); g.fillRect(L, bot - 150, pw, 150);
    };

    // Painted panels: the picture fills the frame and drifts slowly; live light
    // (glow pulses, embers, motes) is layered on top so the still image breathes.
    if (this.textures.exists(`cut_${panel.art}`)) {
      const img = add(this.add.image(0, -40, `cut_${panel.art}`));
      const cover = Math.max(pw / img.width, ph / img.height) * 1.05;
      img.setScale(cover);
      const drift = panel.art === 'fire' || panel.art === 'memory' || panel.art === 'title' ? 18 : 10;
      img.x = -drift;
      this.tweens.add({ targets: img, x: drift, duration: 9000, ease: 'Sine.easeInOut' });
      const at = (u, v) => [L + u * pw, top + v * ph];
      const pulse = (o, a, ms) => this.tweens.add({ targets: o, alpha: a, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      switch (panel.art) {
        case 'fire': {
          const [fx, fy] = at(0.55, 0.68);
          pulse(glow(fx, fy, 0xff6a20, 7, 2.4, 0.22), 0.4, 420);
          embers(fx, fy, pw * 0.55, 1);
          embers(0, bot - 10, pw, 0.6);
          smoke(fx, fy - 140, pw * 0.4, 0x140c10, 0.3);
          break;
        }
        case 'doorway': {
          const [dx, dy] = at(0.48, 0.5);
          pulse(glow(dx, dy, 0xffb040, 2.2, 5, 0.2), 0.38, 360);
          embers(dx, bot, pw * 0.5, 1);
          embers(0, bot, pw, 0.5);
          break;
        }
        case 'split': {
          const [mx, my] = at(0.32, 0.60);
          const [sx, sy] = at(0.65, 0.44);
          pulse(glow(sx, sy, 0x7a4cff, 3, 4.5, 0.25), 0.45, 1600);
          embers(mx, my, 180, 0.85);
          motes(sx, sy, 360, 360, [0xb48cff, 0x7a4cff]);
          motes(0, -40, pw, ph, 0x9fb4ff, 1);
          break;
        }
        case 'lamp': {
          const [lx, ly] = at(0.57, 0.51);
          const [hx, hy] = at(0.71, 0.17);
          const [sx, sy] = at(0.34, 0.72);
          pulse(glow(lx, ly, 0xffb850, 2.6, 2.6, 0.24), 0.42, 900);
          pulse(glow(hx, hy, 0xe8c372, 3.2, 3.2, 0.16), 0.3, 1800);
          pulse(glow(sx, sy, 0x7a4cff, 2.2, 3.2, 0.18), 0.32, 1600);
          motes(lx, ly, 420, 380, [0xffe8a8, 0xe8c372], -1);
          motes(sx, sy, 220, 260, [0xb48cff, 0x7a4cff], -1);
          break;
        }
        case 'title': {
          const [lx, ly] = at(0.81, 0.65);
          pulse(glow(lx, ly, 0xff9a3d, 2.6, 2.6, 0.22), 0.38, 620);
          add(this.add.tileSprite(0, 60, pw, 260, 'fog_band').setTint(0x9a8cc0).setAlpha(0.22));
          motes(0, 0, pw, ph, [0xffd49a, 0xb48cff], -1);
          const t = add(this.add.text(0, -90, panel.title, { fontFamily: 'Cinzel, Georgia', fontSize: '86px', color: '#f1e6d2', letterSpacing: 16 }).setOrigin(0.5));
          t.setShadow(0, 0, '#9a6bff', 28, true, true);
          vignette(0.45);
          break;
        }
        case 'fragment': {
          const [gx, gy] = at(0.50, 0.24);
          const [fx, fy] = at(0.55, 0.53);
          const [sx, sy] = at(0.50, 0.76);
          pulse(glow(gx, gy, 0xe8c372, 3.4, 3.4, 0.2), 0.35, 1600);
          pulse(glow(fx, fy, 0xffd070, 2.0, 2.0, 0.28), 0.48, 800);
          pulse(glow(sx, sy, 0x7a4cff, 2.8, 3.4, 0.2), 0.35, 1500);
          add(this.add.particles(gx, gy + 20, 'spark', { x: { min: -40, max: 40 }, lifespan: 2200, speedY: { min: 70, max: 140 }, speedX: { min: -12, max: 12 }, scale: { start: 1.0, end: 0.2 }, tint: [0xffe8a8, 0xe8c372], blendMode: 'ADD', frequency: 40 }));
          motes(sx, sy, 320, 240, [0xb48cff, 0x9a6bff, 0xffe8a8], -1);
          break;
        }
        case 'memory': {
          const [cx, cy] = at(0.5, 0.42);
          pulse(glow(cx, cy, 0xffa040, 5, 5, 0.18), 0.34, 1400);
          embers(0, bot - 10, pw, 0.9);
          smoke(0, top + 60, pw, 0x1a0c06, 0.25);
          break;
        }
        case 'resist': {
          const [rx, ry] = at(0.48, 0.34);
          const [sx, sy] = at(0.32, 0.65);
          pulse(glow(rx, ry, 0xffd49a, 3.2, 3.2, 0.24), 0.42, 900);
          pulse(glow(sx, sy, 0x7a4cff, 2.6, 3.8, 0.22), 0.38, 1500);
          motes(rx, ry, 280, 280, [0xffe8a8, 0xb48cff, 0xe6dcff], -1);
          break;
        }
        case 'ability': {
          const [ax, ay] = at(0.70, 0.42);
          const [lx, ly] = at(0.26, 0.68);
          pulse(glow(ax, ay, 0x7a4cff, 2.8, 3.8, 0.24), 0.42, 1200);
          pulse(glow(lx, ly, 0xffa040, 2.4, 2.4, 0.18), 0.32, 900);
          motes(ax, ay, 240, 320, [0xb48cff, 0x9a6bff], -1);
          break;
        }
        default: break;
      }
      return;
    }

    switch (panel.art) {
      case 'fire': {
        // Tanner's Row at night, one house burning against a violet sky
        backdrop(0x070a1e, 0x2a0f16);
        glow(380, top + 90, 0x8ea8ff, 1.2, 1.2, 0.5);
        add(this.add.circle(380, top + 90, 26, 0xdfe6ff, 0.9));
        skyline(0x171633, 40, 140, 230, 11, 0.12, 0x7f8cff);
        glow(-20, 60, 0xff3a10, 14, 5, 0.45);
        skyline(0x0a0810, 120, 110, 200, 29, 0.25);
        fire(-25, 110, 220, 1.3);
        rays(-25, 60, 0xff7a30, 9, 1.4, 420, 0.05, -Math.PI / 2);
        for (let i = 0; i < 11; i++) {
          const x = -470 + i * 92 + (i % 3) * 9;
          crowd(i, x, 236, 1.5 + (i % 3) * 0.12, 0xff6a28, 0x040306, x < -25 ? 2 : -2);
        }
        const g = gfx(); g.fillStyle(0x040306, 1); g.fillRect(L, 228, pw, 40);
        embers(0, 200, pw, 0.7);
        vignette(0.8);
        break;
      }
      case 'doorway': {
        // seen from behind: the man stands in a burning doorway, facing it
        backdrop(0x0c0507, 0x1e0806);
        const g = gfx();
        g.fillGradientStyle(0xfff0b0, 0xfff0b0, 0xff5a14, 0xff5a14, 1); g.fillRect(-120, top + 70, 240, ph - 70);
        glow(0, 20, 0xff8a30, 9, 7, 0.7);
        glow(0, 60, 0xfff0c0, 3, 4, 0.6);
        fire(0, 200, 260, 1.7);
        const fr = gfx(); fr.fillStyle(0x060304, 1);
        fr.fillRect(L, top, 420, ph); fr.fillRect(-L - 420, top, 420, ph); fr.fillRect(-140, top, 280, 70);
        fr.fillRect(-140, top, 24, ph); fr.fillRect(116, top, 24, ph);
        // a fallen beam across the opening
        fr.fillPoints([{ x: -150, y: -120 }, { x: 150, y: -40 }, { x: 150, y: -22 }, { x: -150, y: -100 }], true);
        const edge = gfx(); edge.lineStyle(3, 0xff7a30, 0.6); edge.lineBetween(-116, top + 70, -116, bot); edge.lineBetween(116, top + 70, 116, bot);
        man(0, 226, 4.2, 0xffc060, 0x010001, 0, 0);
        glow(0, 222, 0xff6a20, 8, 0.6, 0.6);
        embers(0, 120, 360, 1.2);
        vignette(0.9);
        break;
      }
      case 'split': {
        // the man falls away as ash; the Shade peels off and stands
        backdrop(0x05040e, 0x120a26);
        glow(0, 60, 0x4a2aa0, 12, 6, 0.35);
        rays(-60, 200, 0x9a6bff, 11, 1.6, 520, 0.05, -Math.PI / 2);
        const [mRim, mFig] = man(-40, 222, 3.4, 0xff6a28, 0x0e0b10, -3, 0.7);
        [mRim, mFig].forEach((o) => o.setAngle(-8));
        const ash = add(this.add.particles(-40, 100, 'spark', {
          x: { min: -50, max: 50 }, y: { min: -140, max: 100 }, lifespan: 2400, speedX: { min: -90, max: -20 }, speedY: { min: -60, max: 10 },
          scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffb050, 0xff6a20, 0x6a5a60], blendMode: 'ADD', frequency: 25,
        }));
        const [aura, sh] = shade(-40, 220, 3.2, 0.7);
        this.tweens.add({ targets: [mRim, mFig], angle: -70, x: '-=120', alpha: 0.15, duration: 5000, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: ash, x: -160, duration: 5000, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: [sh, aura], x: '+=180', duration: 5000, ease: 'Sine.easeOut' });
        add(this.add.particles(0, 200, 'smoke', { x: { min: -260, max: 260 }, lifespan: 3600, speedY: { min: -40, max: -10 }, scale: { start: 1.2, end: 3.6 }, alpha: { start: 0.35, end: 0 }, tint: 0x2a1650, frequency: 110 }));
        motes(80, -20, 420, 420, [0xb48cff, 0x9a6bff, 0xe6dcff], -1);
        vignette(0.85);
        break;
      }
      case 'lamp': {
        // the Almoner, close and calm, in gold light; the Shade small below
        backdrop(0x05060f, 0x0c0a1c);
        const halo = glow(200, -80, 0xe8c372, 1, 1, 0.55);
        this.tweens.add({ targets: halo, scale: 7, duration: 5000, ease: 'Sine.easeOut' });
        rays(200, -100, 0xe8c372, 13, Math.PI * 2 - 0.3, 600, 0.035, Math.PI / 2);
        const tex = this.textures.exists('almoner_portrait') ? this.textures.get('almoner_portrait').getSourceImage() : null;
        let ent;
        if (tex && tex.width > 32 && tex.height > 32) {
          ent = add(this.add.image(200, -40, 'almoner_portrait').setOrigin(0.5, 0.5).setAlpha(0));
          ent.setScale(Math.min(ph / tex.height, 600 / tex.width) * 1.02);
          this.tweens.add({ targets: ent, alpha: 1, y: -50, duration: 3000, delay: 500, ease: 'Sine.easeOut' });
        } else {
          ent = add(this.add.image(160, 200, 'almoner', 0).setOrigin(0.5, 1).setScale(2).setAlpha(0));
          this.tweens.add({ targets: ent, alpha: 0.9, duration: 3000, delay: 800 });
        }
        motes(200, -40, 560, 480, [0xffe8a8, 0xe8c372], -1);
        shade(-330, 214, 1.4, 0.5);
        const fl = gfx(); fl.fillGradientStyle(0x05060f, 0x05060f, 0x05060f, 0x05060f, 0, 0, 1, 1); fl.fillRect(L, bot - 110, pw, 110);
        vignette(0.8);
        break;
      }
      case 'title': {
        backdrop(0x060818, 0x140c18);
        glow(0, top + 120, 0x7a8cff, 7, 2.4, 0.25);
        skyline(0x101026, 150, 60, 140, 41, 0.1, 0xffb060);
        add(this.add.tileSprite(0, 60, pw, 260, 'fog_band').setTint(0x9a8cc0).setAlpha(0.3));
        skyline(0x07060c, 200, 30, 90, 53, 0.2, 0xffa050);
        glow(0, 40, 0xff8a3d, 10, 1.6, 0.18);
        motes(0, 0, pw, ph, [0xffd49a, 0xb48cff], -1);
        const t = add(this.add.text(0, -90, panel.title, { fontFamily: 'Cinzel, Georgia', fontSize: '86px', color: '#f1e6d2', letterSpacing: 16 }).setOrigin(0.5));
        t.setShadow(0, 0, '#9a6bff', 28, true, true);
        vignette(0.8);
        break;
      }
      case 'fragment': {
        backdrop(0x04040c, 0x110a22);
        rays(0, top, 0xe8c372, 9, 0.7, 560, 0.06);
        add(this.add.image(0, -60, 'hourglass').setAlpha(0.45).setTint(0xd8c8ff));
        glow(0, -60, 0xe8c372, 3, 3, 0.35);
        add(this.add.particles(0, top + 20, 'spark', { x: { min: -60, max: 60 }, lifespan: 2400, speedY: { min: 80, max: 160 }, speedX: { min: -15, max: 15 }, scale: { start: 1.2, end: 0.2 }, tint: [0xffe8a8, 0xe8c372], blendMode: 'ADD', frequency: 35 }));
        shade(0, 214, 1.7, 0.7);
        motes(0, 120, 300, 200, [0xb48cff, 0x9a6bff], -1);
        vignette(0.85);
        break;
      }
      case 'memory': {
        // a memory flash: warm, loud, speed lines, the crowd; he is a black shape at the centre
        backdrop(0x2a0e06, 0x0c0404);
        const g = gfx().setBlendMode('ADD');
        for (let i = 0; i < 80; i++) {
          const a = (i / 80) * Math.PI * 2;
          g.lineStyle(1 + (i % 4), 0xffc890, 0.06 + (i % 3) * 0.04);
          g.lineBetween(Math.cos(a) * 160, -40 + Math.sin(a) * 160, Math.cos(a) * 900, -40 + Math.sin(a) * 900);
        }
        glow(0, -40, 0xffa050, 8, 6, 0.4);
        fire(0, 200, 700, 0.8);
        for (let i = 0; i < 11; i++) crowd(i, -450 + i * 90, 240, 1.9, 0xff8a3a, 0x0e0604, i < 5 ? 3 : -3);
        man(0, 220, 3.2, 0xffd08a, 0x000000, -3, 0.5);
        vignette(0.75, 0x0a0200);
        break;
      }
      case 'resist': {
        backdrop(0x0a0a1e, 0x14101e);
        glow(330, top + 40, 0xffd49a, 5, 5, 0.5);
        rays(330, top + 40, 0xffe0b0, 9, 0.9, 700, 0.07, Math.PI * 0.68);
        shade(-60, 210, 2, 0.8);
        motes(-60, 60, 260, 300, [0xb48cff, 0xe6dcff], -1);
        vignette(0.8);
        break;
      }
      case 'ability': {
        backdrop(0x07060e, 0x0c0a18);
        add(this.add.tileSprite(120, -40, 200, ph, 'stone_body').setTint(0x55527a));
        const g = gfx(); g.fillGradientStyle(0x9a6bff, 0x9a6bff, 0x9a6bff, 0x9a6bff, 0, 0.25, 0, 0.25); g.fillRect(-20, top, 40, ph);
        glow(10, -40, 0x7a4cff, 3, 4, 0.6);
        add(this.add.image(10, -40, 'shade', 0).setScale(1.8).setAngle(90));
        add(this.add.particles(20, -40, 'spark', { y: { min: -120, max: 120 }, lifespan: 1600, speedX: { min: -40, max: -10 }, speedY: { min: -20, max: 20 }, scale: { start: 0.8, end: 0 }, tint: [0xb48cff, 0x9a6bff], blendMode: 'ADD', frequency: 90 }));
        vignette(0.8);
        break;
      }
      default:
        add(this.add.rectangle(0, -40, pw, ph, 0x05040a));
    }
  }
}

// =====================================================================
// CUTSCENES: manhwa-style panels (design doc 5.3, Tier 2).
//
// Rendered at 2K internal resolution (2560x1440, 2x scale) so 2160x1040
// painted panels and serif typography display at native 1:1 pixel clarity.
// =====================================================================

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { CUTSCENES, SPEAKERS } from '../story.js';
import { AUDIO } from '../systems/audio.js';
import { feetOrigin } from '../art/characters.js';
import { addSoundToggle } from '../systems/soundToggle.js';

const SERIF = '"Cormorant Garamond", Georgia, serif';
const HI_RES = 2; // 2560x1440 framebuffer for 1:1 2160x1040 panel rendering
// Layout in 1280x720 view units: the panel sits near the top so the narration box
// below it has its own band and never covers the artwork.
const PANEL_TOP = 16;
const BOX_TOP = 556;

export class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  init(data) {
    this.panels = CUTSCENES[data.id] ?? [];
    this.next = data.next;
    this.index = -1;
    // Phaser reuses this scene object for every cutscene, so per-play state must
    // be reset here. A leftover `finished` from the intro blocked the Hollowmere card.
    this.finished = false;
    this.typing = null;
  }

  create() {
    const S = HI_RES;
    this.S = S;
    const W = TUNING.view.width * S, H = TUNING.view.height * S;
    this.W = W; this.H = H;
    if (this.scale.width !== W || this.scale.height !== H) {
      this.scale.setGameSize(W, H);
    }
    this.cameras.main.setViewport(0, 0, W, H).setZoom(1).setScroll(0, 0);
    this.cameras.main.setBackgroundColor('#000000');
    this.layer = this.add.container(0, 0);
    this.box = this.add.container(0, 0).setDepth(10);
    this.skip = this.add.text(W - 20 * S, H - 18 * S, 'E / Space  next      Esc  skip', {
      fontFamily: 'Inter, Arial', fontSize: `${13 * S}px`, color: '#6f6a82',
    }).setOrigin(1).setDepth(11);
    this.keys = this.input.keyboard.addKeys('E,ENTER,SPACE,ESC');
    this.input.on('pointerdown', () => this.advance());
    addSoundToggle(this, W - 40 * S, 36 * S, S);
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
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.next.scene === 'Game' || this.next.scene === 'End') {
        this.scale.setGameSize(TUNING.view.width, TUNING.view.height);
      }
      this.scene.start(this.next.scene, this.next.data);
    });
  }

  showPanel(panel) {
    const { W, H, S } = this;
    // old panel slides away
    const old = this.layer.list.slice();
    for (const o of old) this.tweens.add({ targets: o, alpha: 0, x: o.x - 60 * S, duration: 500, onComplete: () => o.destroy() });
    this.box.removeAll(true);

    const pw = 1080 * S, ph = 520 * S;
    // painters draw the panel centred at (0, -40) inside the frame
    const frameY = PANEL_TOP * S + ph / 2 + 40 * S;
    const frame = this.add.container(W / 2 + 80 * S, frameY).setAlpha(0);
    this.layer.add(frame);
    const inner = this.add.container(0, 0);
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(W / 2 - pw / 2, PANEL_TOP * S, pw, ph);
    inner.setMask(maskShape.createGeometryMask());
    frame.add(inner);
    this.paint(panel, inner, pw, ph);
    // panel border, slightly rotated like a comic page
    const border = this.add.rectangle(0, -40 * S, pw, ph).setStrokeStyle(6 * S, 0xe9e2f5, 0.9);
    frame.add(border);
    this.tweens.add({ targets: frame, alpha: 1, x: W / 2, duration: 650, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: inner, scale: 1.05, duration: 7000, ease: 'Sine.easeOut' });

    // narration box: below the panel, sized to its text, speaker name inside it
    const isVoice = !!panel.speaker;
    const boxW = 860 * S, boxTop = BOX_TOP * S, pad = 14 * S;
    const nameH = isVoice ? 24 * S : 0;
    const txt = this.add.text(W / 2, boxTop + pad + nameH, panel.text, {
      fontFamily: SERIF, fontStyle: isVoice ? 'italic' : 'normal', fontSize: `${28 * S}px`, color: isVoice ? '#e8c372' : '#14111a',
      align: 'center', wordWrap: { width: boxW - 60 * S },
    }).setOrigin(0.5, 0);
    const boxH = pad * 2 + nameH + txt.height; // measured with the full line, then typed out
    txt.setText('');
    const bg = this.add.rectangle(W / 2, boxTop, boxW, boxH, isVoice ? 0x0a0912 : 0xf3efe6, 0.96).setOrigin(0.5, 0).setStrokeStyle(2 * S, isVoice ? 0xe8c372 : 0x1a1620, 1);
    this.box.add([bg, txt]);
    if (isVoice) {
      const name = this.add.text(W / 2 - boxW / 2 + 20 * S, boxTop + 10 * S, SPEAKERS[panel.speaker].name, {
        fontFamily: 'Cinzel, Georgia', fontSize: `${15 * S}px`, color: '#e8c372', letterSpacing: 4 * S,
      });
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
    const S = this.S ?? 1;
    const add = (o) => { c.add(o); return o; };
    const top = -ph / 2 - 40 * S, bot = ph / 2 - 40 * S, L = -pw / 2;
    const gfx = () => add(this.add.graphics());
    // a vertical gradient over the whole panel (WebGL; canvas falls back to a flat fill)
    const backdrop = (cTop, cBot) => { const g = gfx(); g.fillGradientStyle(cTop, cTop, cBot, cBot, 1); g.fillRect(L, top, pw, ph); return g; };
    const glow = (x, y, tint, sx, sy = sx, a = 0.6) => add(this.add.image(x, y, 'softglow').setBlendMode('ADD').setTint(tint).setScale(sx * S, sy * S).setAlpha(a));
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // gothic rooftops: gables, spires, a few lit windows
    const skyline = (color, baseY, hMin, hMax, s, lit = 0, litColor = 0xffb060) => {
      seed = s;
      const g = gfx();
      for (let x = L - 30 * S; x < -L + 30 * S;) {
        const w = (46 + rnd() * 70) * S, h = (hMin + rnd() * (hMax - hMin)) * S;
        g.fillStyle(color, 1);
        g.fillRect(x, baseY * S - h, w, bot - baseY * S + h + 10 * S);
        g.fillTriangle(x - 6 * S, baseY * S - h + 1, x + w / 2, baseY * S - h - (24 + rnd() * 40) * S, x + w + 6 * S, baseY * S - h + 1);
        if (rnd() < 0.35) { const sx = x + w * (0.2 + rnd() * 0.6); g.fillTriangle(sx - 7 * S, baseY * S - h - 10 * S, sx, baseY * S - h - (70 + rnd() * 70) * S, sx + 7 * S, baseY * S - h - 10 * S); }
        if (lit) {
          for (let k = 0; k < 4; k++) if (rnd() < lit) {
            g.fillStyle(litColor, 0.55 + rnd() * 0.4);
            g.fillRect(x + 8 * S + rnd() * (w - 20 * S), baseY * S - h + 20 * S + rnd() * (h - 30 * S), 4 * S, 7 * S);
          }
        }
        x += w + rnd() * 12 * S;
      }
      return g;
    };
    const embers = (x, y, w, power = 1, tint = [0xfff0c0, 0xffb050, 0xff6a20]) => add(this.add.particles(x, y, 'spark', {
      x: { min: -w / 2, max: w / 2 }, lifespan: { min: 1800, max: 3600 }, speedY: { min: -110 * power * S, max: -30 * S }, speedX: { min: -40 * S, max: 50 * S },
      accelerationX: { min: -20 * S, max: 20 * S }, scale: { start: 1.1 * power * S, end: 0 }, alpha: { start: 1, end: 0 }, tint, blendMode: 'ADD', frequency: 30, quantity: 1,
    }));
    const smoke = (x, y, w, tint = 0x120c14, a = 0.55) => add(this.add.particles(x, y, 'smoke', {
      x: { min: -w / 2, max: w / 2 }, lifespan: 5000, speedY: { min: -50 * S, max: -20 * S }, speedX: { min: -10 * S, max: 25 * S }, scale: { start: 1.4 * S, end: 5 * S },
      alpha: { start: a, end: 0 }, tint, frequency: 110,
    }));
    const fire = (x, y, w, power = 1) => {
      glow(x, y - 40 * S, 0xff4a10, w / (26 * S), 3.4 * power, 0.55);
      glow(x, y - 20 * S, 0xffb040, w / (50 * S), 1.8 * power, 0.7);
      add(this.add.particles(x, y, 'spark', {
        x: { min: -w / 2, max: w / 2 }, lifespan: 1400, speedY: { min: -170 * power * S, max: -60 * S }, speedX: { min: -25 * S, max: 25 * S },
        scale: { start: 2.6 * power * S, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xfff4c8, 0xffa040, 0xff5a1f], blendMode: 'ADD', frequency: 12, quantity: 2,
      }));
      embers(x, y - 40 * S, w * 1.3, power);
      smoke(x, y - 110 * S, w, 0x140c10, 0.5);
    };
    const sil = (key, x, y, scale, rimColor = 0xff7a30, body = 0x020103, rimDx = -3, rimA = 0.8) => {
      const [ox, oy] = feetOrigin(key);
      const rim = add(this.add.image(x + rimDx * S, y, key, 0).setOrigin(ox, oy).setTintFill(rimColor).setScale(scale * S).setAlpha(rimA));
      const fig = add(this.add.image(x, y, key, 0).setOrigin(ox, oy).setTintFill(body).setScale(scale * S));
      return [rim, fig];
    };
    const man = (x, y, scale, rimColor, body, rimDx, rimA) => sil('shade', x, y, scale, rimColor, body, rimDx, rimA);
    const crowd = (i, x, y, scale, rimColor, body, rimDx) => sil(i % 2 ? 'maren' : 'edrin', x, y, scale, rimColor, body, rimDx, 0.6);
    const shade = (x, y, scale, aura = 0.55) => {
      const [ox, oy] = feetOrigin('shade');
      const a = glow(x, y - 50 * scale * S, 0x7a4cff, scale * 2.4, scale * 3.4, aura);
      const fig = add(this.add.image(x, y, 'shade', 0).setOrigin(ox, oy).setScale(scale * S));
      this.tweens.add({ targets: a, alpha: aura * 0.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return [a, fig];
    };
    const motes = (x, y, w, h, tint, dir = -1) => add(this.add.particles(x, y, 'spark', {
      x: { min: -w / 2, max: w / 2 }, y: { min: -h / 2, max: h / 2 }, lifespan: 3000, speedY: { min: 10 * dir * S, max: 40 * dir * S }, speedX: { min: -12 * S, max: 12 * S },
      scale: { start: 0.9 * S, end: 0 }, alpha: { start: 0.9, end: 0 }, tint, blendMode: 'ADD', frequency: 70,
    }));
    const rays = (x, y, tint, n, spread, len, a = 0.08, angle = Math.PI / 2) => {
      const g = gfx().setBlendMode('ADD');
      for (let i = 0; i < n; i++) {
        const t0 = angle + (i / (n - 1) - 0.5) * spread, w = 0.02 + (i % 3) * 0.015;
        g.fillStyle(tint, a * (0.6 + (i % 2) * 0.6));
        g.fillTriangle(x, y, x + Math.cos(t0 - w) * len * S, y + Math.sin(t0 - w) * len * S, x + Math.cos(t0 + w) * len * S, y + Math.sin(t0 + w) * len * S);
      }
      return g;
    };
    const vignette = (a = 0.85, color = 0x000000) => {
      const g = gfx(), e = 220 * S;
      g.fillGradientStyle(color, color, color, color, a, 0, a, 0); g.fillRect(L, top, e, ph);
      g.fillGradientStyle(color, color, color, color, 0, a, 0, a); g.fillRect(-L - e, top, e, ph);
      g.fillGradientStyle(color, color, color, color, a * 0.8, a * 0.8, 0, 0); g.fillRect(L, top, pw, 140 * S);
      g.fillGradientStyle(color, color, color, color, 0, 0, a, a); g.fillRect(L, bot - 150 * S, pw, 150 * S);
    };

    // Painted panels: 2160x1040 2K HD picture fills the 2160x1040 frame at 1:1 scale
    // and drifts slowly; live light (glow pulses, embers, motes) is layered on top.
    if (this.textures.exists(`cut_${panel.art}`)) {
      const img = add(this.add.image(0, -40 * S, `cut_${panel.art}`));
      const cover = Math.max(pw / img.width, ph / img.height) * 1.03;
      img.setScale(cover);
      const drift = (panel.art === 'fire' || panel.art === 'memory' || panel.art === 'title' ? 18 : 10) * S;
      img.x = -drift;
      this.tweens.add({ targets: img, x: drift, duration: 9000, ease: 'Sine.easeInOut' });
      const at = (u, v) => [L + u * pw, top + v * ph];
      const pulse = (o, a, ms) => this.tweens.add({ targets: o, alpha: a, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      switch (panel.art) {
        case 'fire': {
          const [fx, fy] = at(0.55, 0.68);
          pulse(glow(fx, fy, 0xff6a20, 7, 2.4, 0.22), 0.4, 420);
          embers(fx, fy, pw * 0.55, 1);
          embers(0, bot - 10 * S, pw, 0.6);
          smoke(fx, fy - 140 * S, pw * 0.4, 0x140c10, 0.3);
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
          embers(mx, my, 180 * S, 0.85);
          motes(sx, sy, 360 * S, 360 * S, [0xb48cff, 0x7a4cff]);
          motes(0, -40 * S, pw, ph, 0x9fb4ff, 1);
          break;
        }
        case 'lamp': {
          const [lx, ly] = at(0.57, 0.51);
          const [hx, hy] = at(0.71, 0.17);
          const [sx, sy] = at(0.34, 0.72);
          pulse(glow(lx, ly, 0xffb850, 2.6, 2.6, 0.24), 0.42, 900);
          pulse(glow(hx, hy, 0xe8c372, 3.2, 3.2, 0.16), 0.3, 1800);
          pulse(glow(sx, sy, 0x7a4cff, 2.2, 3.2, 0.18), 0.32, 1600);
          motes(lx, ly, 420 * S, 380 * S, [0xffe8a8, 0xe8c372], -1);
          motes(sx, sy, 220 * S, 260 * S, [0xb48cff, 0x7a4cff], -1);
          break;
        }
        case 'title': {
          const [lx, ly] = at(0.81, 0.65);
          pulse(glow(lx, ly, 0xff9a3d, 2.6, 2.6, 0.22), 0.38, 620);
          add(this.add.tileSprite(0, 60 * S, pw, 260 * S, 'fog_band').setTint(0x9a8cc0).setAlpha(0.22));
          motes(0, 0, pw, ph, [0xffd49a, 0xb48cff], -1);
          const t = add(this.add.text(0, -90 * S, panel.title, {
            fontFamily: 'Cinzel, Georgia', fontSize: `${86 * S}px`, color: '#f1e6d2', letterSpacing: 16 * S,
          }).setOrigin(0.5));
          t.setShadow(0, 0, '#9a6bff', 28 * S, true, true);
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
          add(this.add.particles(gx, gy + 20 * S, 'spark', {
            x: { min: -40 * S, max: 40 * S }, lifespan: 2200, speedY: { min: 70 * S, max: 140 * S }, speedX: { min: -12 * S, max: 12 * S },
            scale: { start: 1.0 * S, end: 0.2 * S }, tint: [0xffe8a8, 0xe8c372], blendMode: 'ADD', frequency: 40,
          }));
          motes(sx, sy, 320 * S, 240 * S, [0xb48cff, 0x9a6bff, 0xffe8a8], -1);
          break;
        }
        case 'memory': {
          const [cx, cy] = at(0.5, 0.42);
          pulse(glow(cx, cy, 0xffa040, 5, 5, 0.18), 0.34, 1400);
          embers(0, bot - 10 * S, pw, 0.9);
          smoke(0, top + 60 * S, pw, 0x1a0c06, 0.25);
          break;
        }
        case 'resist': {
          const [rx, ry] = at(0.48, 0.34);
          const [sx, sy] = at(0.32, 0.65);
          pulse(glow(rx, ry, 0xffd49a, 3.2, 3.2, 0.24), 0.42, 900);
          pulse(glow(sx, sy, 0x7a4cff, 2.6, 3.8, 0.22), 0.38, 1500);
          motes(rx, ry, 280 * S, 280 * S, [0xffe8a8, 0xb48cff, 0xe6dcff], -1);
          break;
        }
        case 'ability': {
          const [ax, ay] = at(0.70, 0.42);
          const [lx, ly] = at(0.26, 0.68);
          pulse(glow(ax, ay, 0x7a4cff, 2.8, 3.8, 0.24), 0.42, 1200);
          pulse(glow(lx, ly, 0xffa040, 2.4, 2.4, 0.18), 0.32, 900);
          motes(ax, ay, 240 * S, 320 * S, [0xb48cff, 0x9a6bff], -1);
          break;
        }
        default: break;
      }
      return;
    }

    // The final world's panels are composed here from the game's own art.
    const titleText = () => {
      const t = add(this.add.text(0, -60 * S, panel.title, { fontFamily: 'Cinzel, Georgia', fontSize: `${80 * S}px`, color: '#fff1d6', letterSpacing: 16 * S }).setOrigin(0.5));
      t.setShadow(0, 0, '#ff7a2a', 30 * S, true, true);
    };
    switch (panel.art) {
      case 'noon': {
        backdrop(0x2a0806, 0xd0501c);
        glow(0, top + 90 * S, 0xfff4d8, 14, 14, 0.9);
        glow(0, top + 90 * S, 0xffffff, 4, 4, 1);
        add(this.add.image(0, top + 90 * S, 'warden_halo').setBlendMode('ADD').setScale(1.2 * S).setAlpha(0.7));
        rays(0, top + 90 * S, 0xffe6b0, 9, 1.4, 640, 0.07);
        skyline(0x3a0c08, 170, 60, 150, 11, 0.3, 0xffa040);
        fire(-520 * S, 175 * S, 260 * S, 1.2); fire(380 * S, 180 * S, 300 * S, 1.4);
        skyline(0x140404, 215, 30, 110, 23, 0.15, 0xff8a30);
        embers(0, bot - 10 * S, pw, 1.1);
        smoke(0, top + 120 * S, pw, 0x2a0e08, 0.35);
        if (panel.title) titleText();
        vignette(0.55);
        return;
      }
      case 'warden': {
        backdrop(0x1a0505, 0x8a2810);
        // the Warden fills the panel; his halo and core sit where the painting puts them
        const ws = 1.3 * S, wx = 250 * S, wy = bot + 14 * S;
        const hx = wx + 20 * ws, hy = wy - 388 * ws;
        glow(hx, hy, 0xfff1c0, 9, 9, 0.75);
        const halo = add(this.add.image(hx, hy, 'warden_halo').setBlendMode('ADD').setScale(0.95 * ws).setAlpha(0.95));
        this.tweens.add({ targets: halo, angle: 40, duration: 9000 });
        rays(hx, hy, 0xfff1c0, 13, 2.2, 900, 0.06);
        add(this.add.image(wx, wy, 'warden_stand').setOrigin(0.5, 460 / 470).setScale(ws).setTint(0x9a7a70));
        add(this.add.image(wx + 26 * ws, wy - 270 * ws, 'warden_core').setBlendMode('ADD').setScale(0.7 * ws).setAlpha(0.8));
        embers(0, bot, pw, 0.9);
        man(-420 * S, bot - 6 * S, 1.1, 0xb48cff, 0x020103, 3, 0.9);
        vignette(0.6);
        return;
      }
      case 'ascend': {
        backdrop(0x0c0614, 0x5a1424);
        glow(0, 60 * S, 0x7a4cff, 10, 7, 0.5);
        shade(0, bot - 30 * S, 2.6, 0.75);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const f = add(this.add.image(Math.cos(a) * 330 * S, -40 * S + Math.sin(a) * 160 * S, 'remnant').setScale(1.6 * S).setBlendMode('ADD'));
          this.tweens.add({ targets: f, y: f.y - 30 * S, duration: 1600 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          glow(f.x, f.y, 0xc9a8ff, 1.6, 1.6, 0.5);
        }
        motes(0, -40 * S, pw, ph, [0xb48cff, 0x7a4cff, 0xfff1c0], -1);
        embers(0, bot, pw, 0.6, [0xc9a8ff, 0x7a4cff, 0x2a1450]);
        vignette(0.6);
        return;
      }
      case 'night': {
        backdrop(0x060a1a, 0x433762);
        add(this.add.image(-420 * S, top + 200 * S, 'moon').setScale(1.3 * S));
        glow(-420 * S, top + 200 * S, 0xffd8b0, 6, 6, 0.25);
        motes(0, top + 260 * S, pw, 480 * S, [0xffffff, 0xd8e0ff], 1);
        skyline(0x0d0a18, 200, 60, 150, 17, 0.08, 0xffa040);
        smoke(0, 180 * S, pw, 0x0a0812, 0.3);
        for (let i = 0; i < 7; i++) crowd(i, -360 * S + i * 120 * S, bot - 8 * S, 1.05, 0x9fb4ff, 0x020103, -2);
        vignette(0.7);
        return;
      }
      default: break;
    }

    // Procedural fallback if a texture is absent
    add(this.add.rectangle(0, -40 * S, pw, ph, 0x05040a));
  }
}

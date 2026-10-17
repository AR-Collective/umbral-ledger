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
      const name = this.add.text(W / 2 - boxW / 2 + 16, H - 150, SPEAKERS[panel.speaker].name, { fontFamily: 'Cinzel, Georgia', fontSize: '15px', color: '#e8c372', letterSpacing: 4 });
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
    const top = -ph / 2 - 40;
    const sky = (tex, alpha = 1) => add(this.add.image(0, -40, tex).setDisplaySize(pw, ph).setAlpha(alpha));
    const fire = (x, y, w, power = 1) => {
      add(this.add.image(x, y - 60, 'softglow').setBlendMode('ADD').setTint(0xff6a20).setScale(w / 40, 3 * power).setAlpha(0.8));
      add(this.add.particles(x, y, 'spark', {
        x: { min: -w / 2, max: w / 2 }, lifespan: 1600, speedY: { min: -160 * power, max: -60 }, speedX: { min: -30, max: 30 },
        scale: { start: 2.2 * power, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xfff0c0, 0xffa040, 0xff5a1f],
        blendMode: 'ADD', frequency: 14, quantity: 2,
      }));
      add(this.add.particles(x, y - 80, 'smoke', {
        x: { min: -w / 2, max: w / 2 }, lifespan: 4000, speedY: { min: -60, max: -30 }, scale: { start: 1.2, end: 4 },
        alpha: { start: 0.5, end: 0 }, tint: 0x1a1414, frequency: 90,
      }));
    };
    switch (panel.art) {
      case 'fire': {
        sky('sky_night');
        const g = add(this.add.graphics());
        g.fillStyle(0x0b0a12, 1);
        for (let i = 0; i < 6; i++) {
          const x0 = -480 + i * 170, h = 180 + (i % 2) * 40;
          g.fillRect(x0, 120 - h, 150, h);
          g.fillTriangle(x0 - 12, 120 - h + 1, x0 + 75, 120 - h - 70, x0 + 162, 120 - h + 1);
        }
        fire(-25, 120, 160, 1.2);
        for (let i = 0; i < 9; i++) add(this.add.image(-380 + i * 90, 230, i % 2 ? 'maren' : 'edrin').setOrigin(0.5, 1).setTintFill(0x050408).setScale(1.6));
        add(this.add.rectangle(0, 230, pw, 60, 0x050408).setOrigin(0.5, 0));
        break;
      }
      case 'doorway': {
        add(this.add.rectangle(0, -40, pw, ph, 0x0d0605));
        fire(0, 160, 400, 1.6);
        add(this.add.rectangle(-140, -40, 60, ph, 0x070405));
        add(this.add.rectangle(140, -40, 60, ph, 0x070405));
        add(this.add.rectangle(0, top + 30, 340, 60, 0x070405));
        add(this.add.image(0, 220, 'edrin').setOrigin(0.5, 1).setTintFill(0x020102).setScale(4.2));
        break;
      }
      case 'split': {
        add(this.add.rectangle(0, -40, pw, ph, 0x05040a));
        const man = add(this.add.image(-40, 220, 'edrin').setOrigin(0.5, 1).setTintFill(0x2a2430).setScale(3.6).setAngle(-8));
        const rim = add(this.add.image(-40, 220, 'shade_rim').setOrigin(0.5, 0.92).setScale(3.25).setBlendMode('ADD').setTint(0x9a6bff).setAlpha(0.7));
        const sh = add(this.add.image(-40, 220, 'shade').setOrigin(0.5, 1).setScale(3.2));
        this.tweens.add({ targets: man, angle: -70, x: -160, alpha: 0.2, duration: 5000, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: [sh, rim], x: 140, duration: 5000, ease: 'Sine.easeOut' });
        add(this.add.particles(0, 120, 'smoke', { x: { min: -200, max: 200 }, lifespan: 3000, speedY: { min: -40, max: -10 }, scale: { start: 1, end: 3 }, alpha: { start: 0.3, end: 0 }, tint: 0x1a1030, frequency: 120 }));
        break;
      }
      case 'lamp': {
        add(this.add.rectangle(0, -40, pw, ph, 0x030206));
        const glow = add(this.add.image(120, -40, 'softglow').setBlendMode('ADD').setTint(0xe8c372).setScale(1).setAlpha(0.7));
        this.tweens.add({ targets: glow, scale: 3.2, duration: 5000, ease: 'Sine.easeOut' });
        const ent = add(this.add.image(120, 200, 'entity').setOrigin(0.5, 1).setScale(2).setAlpha(0));
        this.tweens.add({ targets: ent, alpha: 0.85, duration: 3000, delay: 800 });
        add(this.add.image(-260, 210, 'shade_rim').setOrigin(0.5, 0.92).setScale(1.33).setBlendMode('ADD').setTint(0x9a6bff).setAlpha(0.6));
        add(this.add.image(-260, 210, 'shade').setOrigin(0.5, 1).setScale(1.3));
        break;
      }
      case 'title': {
        add(this.add.rectangle(0, -40, pw, ph, 0x07060c));
        add(this.add.tileSprite(0, -40, pw, ph, 'fog').setTint(0xc79a74).setAlpha(0.35));
        add(this.add.image(0, 40, 'softglow').setBlendMode('ADD').setTint(0xff8a3d).setScale(9, 2.2).setAlpha(0.25));
        add(this.add.text(0, -70, panel.title, { fontFamily: 'Cinzel, Georgia', fontSize: '86px', color: '#efe3cc', letterSpacing: 16 }).setOrigin(0.5));
        break;
      }
      case 'fragment': {
        add(this.add.rectangle(0, -40, pw, ph, 0x05040a));
        add(this.add.image(0, -40, 'hourglass').setAlpha(0.5));
        add(this.add.particles(0, -220, 'spark', { lifespan: 2000, speedY: { min: 60, max: 140 }, speedX: { min: -20, max: 20 }, scale: { start: 1, end: 0.2 }, tint: 0xe8c372, blendMode: 'ADD', frequency: 40 }));
        add(this.add.image(0, 200, 'shade_rim').setOrigin(0.5, 0.92).setScale(1.64).setBlendMode('ADD').setTint(0x9a6bff).setAlpha(0.8));
        add(this.add.image(0, 200, 'shade').setOrigin(0.5, 1).setScale(1.6));
        break;
      }
      case 'memory': {
        add(this.add.rectangle(0, -40, pw, ph, 0x1a0c06));
        // speed lines radiating from the center, a manhwa staple for a memory flash
        const g = add(this.add.graphics());
        for (let i = 0; i < 70; i++) {
          const a = (i / 70) * Math.PI * 2;
          g.lineStyle(2 + (i % 3), 0xffd0a0, 0.18);
          g.lineBetween(Math.cos(a) * 140, -40 + Math.sin(a) * 140, Math.cos(a) * 900, -40 + Math.sin(a) * 900);
        }
        fire(0, 200, 700, 0.8);
        for (let i = 0; i < 11; i++) add(this.add.image(-450 + i * 90, 240, i % 2 ? 'maren' : 'edrin').setOrigin(0.5, 1).setTintFill(0x120804).setScale(1.9));
        add(this.add.image(0, 210, 'edrin').setOrigin(0.5, 1).setTintFill(0x000000).setScale(3.2));
        break;
      }
      case 'resist': {
        add(this.add.rectangle(0, -40, pw, ph, 0x0a0812));
        add(this.add.image(260, -160, 'softglow').setBlendMode('ADD').setTint(0xffd49a).setScale(4).setAlpha(0.5));
        add(this.add.image(-60, 200, 'shade_rim').setOrigin(0.5, 0.92).setScale(2.04).setBlendMode('ADD').setTint(0xffb07a).setAlpha(0.5));
        add(this.add.image(-60, 200, 'shade').setOrigin(0.5, 1).setScale(2));
        break;
      }
      case 'ability': {
        add(this.add.rectangle(0, -40, pw, ph, 0x07060c));
        add(this.add.tileSprite(120, -40, 200, ph, 'tex_stone').setTint(0x6a6688));
        add(this.add.image(10, -40, 'shade_rim').setScale(1.84).setAngle(90).setBlendMode('ADD').setTint(0x9a6bff).setAlpha(0.6));
        add(this.add.image(10, -40, 'shade').setScale(1.8).setAngle(90));
        break;
      }
      default:
        add(this.add.rectangle(0, -40, pw, ph, 0x05040a));
    }
  }
}

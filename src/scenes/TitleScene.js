// Title screen. The first key press also unlocks audio (browsers require a gesture).

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { TITLE, CONTROLS, GAMEPAD_CONTROLS } from '../story.js';
import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { DEV } from '../dev/devFlags.js';

const HI_RES = 2; // 2K (2560x1440) title screen rendering for crisp key art and typography

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width: W, height: H } = TUNING.view;
    const S = HI_RES;
    if (this.scale.width !== W * S || this.scale.height !== H * S) {
      this.scale.setGameSize(W * S, H * S);
    }
    this.cameras.main.setViewport(0, 0, W * S, H * S).setZoom(S).centerOn(W / 2, H / 2);
    this.cameras.main.setBackgroundColor('#030208');
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    // Key art: the man and the shadow he leaves behind (a painted cutscene panel),
    // drifting slowly. Falls back to the hourglass if the image is missing.
    if (this.textures.exists('cut_split')) {
      const art = this.add.image(W / 2, H / 2, 'cut_split');
      const cover = Math.max(W / art.width, H / art.height) * 1.08;
      art.setScale(cover).setAlpha(0.9);
      this.tweens.add({ targets: art, scale: cover * 1.05, x: W / 2 - 24, duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.add.image(W / 2, H / 2 + 40, 'hourglass').setAlpha(0.12).setScale(1.4);
    }
    // darken the sky for the logo and the floor for the menu
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x030208, 0x030208, 0x030208, 0x030208, 0.92, 0.92, 0, 0);
    shade.fillRect(0, 0, W, 330);
    shade.fillGradientStyle(0x030208, 0x030208, 0x030208, 0x030208, 0, 0, 0.95, 0.95);
    shade.fillRect(0, H - 300, W, 300);
    shade.fillGradientStyle(0x030208, 0x030208, 0x030208, 0x030208, 0.7, 0, 0.7, 0);
    shade.fillRect(0, 0, 220, H);
    shade.fillGradientStyle(0x030208, 0x030208, 0x030208, 0x030208, 0, 0.7, 0, 0.7);
    shade.fillRect(W - 220, 0, 220, H);

    // embers rising from the fire he died in, and violet motes shed by the shadow
    this.add.particles(0, H + 10, 'spark', {
      x: { min: 0, max: W }, lifespan: 7000, speedY: { min: -70, max: -20 }, speedX: { min: -15, max: 25 },
      scale: { start: 1, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffb060, 0xff7a3a, 0xe8c372],
      blendMode: 'ADD', frequency: 70,
    });
    this.add.particles(W * 0.62, H * 0.5, 'spark', {
      x: { min: -220, max: 220 }, y: { min: -260, max: 260 }, lifespan: 4000, speedY: { min: -30, max: -8 }, speedX: { min: -10, max: 10 },
      scale: { start: 0.8, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xb48cff, 0x7a4cff], blendMode: 'ADD', frequency: 110,
    });
    this.add.particles(0, H, 'smoke', {
      x: { min: 0, max: W }, lifespan: 9000, speedY: { min: -25, max: -8 }, scale: { start: 1.5, end: 4 },
      alpha: { start: 0.3, end: 0 }, tint: 0x120c1c, frequency: 160,
    });

    // the logo: glowing letters, a gold rule with an hourglass, the three themes
    const logo = this.add.text(W / 2, 128, TITLE.name, { fontFamily: 'Cinzel, Georgia, serif', fontSize: '92px', fontStyle: 'bold', color: '#f1e6d2', letterSpacing: 14, resolution: S })
      .setOrigin(0.5).setShadow(0, 0, '#8a5cff', 26, false, true).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, y: 120, duration: 1800, ease: 'Sine.easeOut' });
    const glowPulse = this.add.image(W / 2, 120, 'softglow').setBlendMode('ADD').setTint(0x7a4cff).setScale(9, 1.6).setAlpha(0.18);
    this.tweens.add({ targets: glowPulse, alpha: 0.3, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const rule = this.add.graphics();
    rule.lineStyle(1.5, 0xe8c372, 0.75);
    rule.lineBetween(W / 2 - 260, 196, W / 2 - 24, 196);
    rule.lineBetween(W / 2 + 24, 196, W / 2 + 260, 196);
    rule.fillStyle(0xe8c372, 0.9);
    rule.fillCircle(W / 2 - 262, 196, 2.5); rule.fillCircle(W / 2 + 262, 196, 2.5);
    this.add.image(W / 2, 196, 'icon_sand').setScale(0.9);
    this.add.text(W / 2, 236, TITLE.tagline, { fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '30px', color: '#e8c372', fontStyle: 'italic', resolution: S })
      .setOrigin(0.5).setShadow(0, 0, '#000000', 10, false, true);
    this.add.text(W / 2, H - 26, TITLE.slice.toUpperCase(), { fontFamily: 'Inter, Arial, sans-serif', fontSize: '11px', color: '#7d7792', letterSpacing: 3, resolution: S }).setOrigin(0.5);

    this.press = this.add.text(W / 2, 560, 'Press any key', { fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '30px', color: '#e6dff2', resolution: S })
      .setOrigin(0.5).setShadow(0, 0, '#000000', 8, false, true);
    this.tweens.add({ targets: this.press, alpha: 0.3, duration: 1100, yoyo: true, repeat: -1 });

    this.items = [];
    this.sel = 0;
    this.stage = 'press';
    // controls page: actions on the left, keys on the right, inside a dark panel
    const col = { fontFamily: 'Inter, Arial, sans-serif', fontSize: '17px', lineSpacing: 7, resolution: S };
    this.info = this.add.container(0, 0).setVisible(false);
    this.info.add([
      this.add.rectangle(W / 2, 478, 760, 400, 0x05040a, 0.9).setStrokeStyle(1, 0xe8c372, 0.45),
      this.add.text(W / 2 - 16, 300, CONTROLS.map(([a]) => a).join('\n'), { ...col, color: '#a9a3bd', align: 'right' }).setOrigin(1, 0),
      this.add.text(W / 2 + 16, 300, CONTROLS.map(([, k]) => k).join('\n'), { ...col, color: '#efe3cc' }).setOrigin(0, 0),
      this.add.text(W / 2, 600, GAMEPAD_CONTROLS, { ...col, fontSize: '14px', color: '#8a849e', align: 'center', wordWrap: { width: 680 } }).setOrigin(0.5, 0),
      this.add.text(W / 2, 652, 'Press Esc to go back', { fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '22px', color: '#e8c372', fontStyle: 'italic', resolution: S }).setOrigin(0.5, 0),
    ]);
    if (TUNING.dev.enabled) this.add.text(W - 16, H - 14, 'Dev menu: ` (backtick)', { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#4f4a62', resolution: S }).setOrigin(1);

    this.keys = this.input.keyboard.addKeys('UP,DOWN,W,S,E,ENTER,SPACE,ESC');
    this.input.keyboard.on('keydown', () => this.onAny());
    this.input.on('pointerdown', () => this.onAny());
  }

  onAny() {
    if (this.stage !== 'press') return;
    AUDIO.unlock();
    AUDIO.setAmbience('title');
    this.stage = 'menu';
    this.press.destroy();
    this.buildMenu();
    for (const k of Object.values(this.keys)) Phaser.Input.Keyboard.JustDown(k);
  }

  buildMenu() {
    const { width: W } = TUNING.view;
    const hasSave = GAME.hasSave();
    this.entries = [];
    if (hasSave) this.entries.push(['Continue', () => this.continueGame()]);
    this.entries.push(['New game', () => this.newGame()]);
    this.entries.push(['Controls', () => this.showControls()]);
    this.items.forEach((t) => t.destroy());
    this.items = this.entries.map(([label], i) => this.add.text(W / 2, 520 + i * 48 - (this.entries.length - 2) * 24, label, {
      fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '32px', color: '#a9a3bd', resolution: HI_RES,
    }).setOrigin(0.5).setShadow(0, 0, '#000000', 8, false, true).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { this.sel = i; this.render(); })
      .on('pointerdown', () => { if (this.stage === 'menu') this.entries[i][1](); }));
    this.render();
  }

  render() {
    this.items.forEach((t, i) => t.setColor(i === this.sel ? '#e8c372' : '#a9a3bd').setScale(i === this.sel ? 1.06 : 1));
  }

  newGame() {
    AUDIO.play('uiSelect');
    GAME.newRun();
    GAME.enterWorld('prologue');
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (DEV.skipCutscenes) {
        this.scale.setGameSize(TUNING.view.width, TUNING.view.height);
        this.scene.start('Game', { world: 'prologue' });
      } else {
        this.scene.start('Cutscene', { id: 'intro', next: { scene: 'Game', data: { world: 'prologue' } } });
      }
    });
  }

  continueGame() {
    AUDIO.play('uiSelect');
    GAME.load();
    const cp = GAME.data.checkpoint;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scale.setGameSize(TUNING.view.width, TUNING.view.height);
      this.scene.start('Game', { world: GAME.data.world, spawn: cp && cp.world === GAME.data.world ? cp.id : null, fromDeath: true });
    });
  }

  showControls() {
    AUDIO.play('ui');
    this.stage = 'controls';
    this.items.forEach((t) => t.setVisible(false));
    this.info.setVisible(true);
  }

  update() {
    const k = this.keys;
    const J = Phaser.Input.Keyboard.JustDown;
    if (this.stage === 'menu') {
      if (J(k.UP) || J(k.W)) { this.sel = (this.sel + this.entries.length - 1) % this.entries.length; AUDIO.play('ui'); this.render(); }
      if (J(k.DOWN) || J(k.S)) { this.sel = (this.sel + 1) % this.entries.length; AUDIO.play('ui'); this.render(); }
      if (J(k.E) || J(k.ENTER) || J(k.SPACE)) this.entries[this.sel][1]();
    } else if (this.stage === 'controls') {
      if (J(k.ESC) || J(k.E) || J(k.ENTER)) {
        this.stage = 'menu';
        this.info.setVisible(false);
        this.items.forEach((t) => t.setVisible(true));
      }
    }
  }
}

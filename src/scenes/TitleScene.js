// Title screen. The first key press also unlocks audio (browsers require a gesture).

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { TITLE, CONTROLS, GAMEPAD_CONTROLS } from '../story.js';
import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { DEV } from '../dev/devFlags.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width: W, height: H } = TUNING.view;
    this.cameras.main.setBackgroundColor('#030208');
    this.add.image(W / 2, H / 2 + 40, 'hourglass').setAlpha(0.12).setScale(1.4);
    this.add.image(W / 2, H * 0.62, 'softglow').setBlendMode('ADD').setTint(0xff7a3a).setScale(7, 3).setAlpha(0.08);
    this.add.particles(0, H + 10, 'spark', {
      x: { min: 0, max: W }, lifespan: 7000, speedY: { min: -60, max: -20 }, speedX: { min: -15, max: 15 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffb060, 0xff7a3a, 0xe8c372],
      blendMode: 'ADD', frequency: 90,
    });
    this.add.particles(0, H, 'smoke', {
      x: { min: 0, max: W }, lifespan: 9000, speedY: { min: -25, max: -8 }, scale: { start: 1.5, end: 4 },
      alpha: { start: 0.25, end: 0 }, tint: 0x120c1c, frequency: 160,
    });
    // a small shadow figure standing at the edge of the light
    this.add.image(W / 2, H - 70, 'shade_rim').setOrigin(0.5, 0.92).setScale(1.33).setBlendMode('ADD').setTint(0x9a6bff).setAlpha(0.6);
    this.add.image(W / 2, H - 70, 'shade').setOrigin(0.5, 1).setScale(1.3);

    this.add.text(W / 2, 170, TITLE.name, { fontFamily: 'Cinzel, Georgia, serif', fontSize: '84px', color: '#efe3cc', letterSpacing: 10 }).setOrigin(0.5);
    this.add.text(W / 2, 250, TITLE.tagline, { fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '28px', color: '#e8c372', fontStyle: 'italic' }).setOrigin(0.5);
    this.add.text(W / 2, 290, TITLE.slice, { fontFamily: 'Inter, Arial, sans-serif', fontSize: '14px', color: '#6f6a82', letterSpacing: 2 }).setOrigin(0.5);

    this.press = this.add.text(W / 2, 420, 'Press any key', { fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '28px', color: '#cfc6e0' }).setOrigin(0.5);
    this.tweens.add({ targets: this.press, alpha: 0.3, duration: 1100, yoyo: true, repeat: -1 });

    this.items = [];
    this.sel = 0;
    this.stage = 'press';
    this.info = this.add.text(W / 2, 360, '', { fontFamily: 'Inter, Arial, sans-serif', fontSize: '17px', color: '#c8c2d8', align: 'left', lineSpacing: 6 }).setOrigin(0.5, 0).setVisible(false);
    if (TUNING.dev.enabled) this.add.text(W - 16, H - 14, 'Dev menu: ` (backtick)', { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#4f4a62' }).setOrigin(1);

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
    this.items = this.entries.map(([label], i) => this.add.text(W / 2, 390 + i * 50, label, {
      fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '32px', color: '#a9a3bd',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
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
      if (DEV.skipCutscenes) this.scene.start('Game', { world: 'prologue' });
      else this.scene.start('Cutscene', { id: 'intro', next: { scene: 'Game', data: { world: 'prologue' } } });
    });
  }

  continueGame() {
    AUDIO.play('uiSelect');
    GAME.load();
    const cp = GAME.data.checkpoint;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { world: GAME.data.world, spawn: cp && cp.world === GAME.data.world ? cp.id : null, fromDeath: true });
    });
  }

  showControls() {
    AUDIO.play('ui');
    this.stage = 'controls';
    this.items.forEach((t) => t.setVisible(false));
    this.info.setText(CONTROLS.map(([a, b]) => `${a.padEnd(26, ' ')}${b}`).join('\n') + `\n\n${GAMEPAD_CONTROLS}\n\nPress Esc to go back.`).setVisible(true);
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

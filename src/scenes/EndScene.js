// End of a world: either it was saved (end of the vertical slice) or it Fractured.

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { LEDGER_TEXT } from '../story.js';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.data_ = data;
  }

  create() {
    const { width: W, height: H } = TUNING.view;
    const d = GAME.data;
    const type = this.data_.type;
    this.cameras.main.setBackgroundColor('#040309').fadeIn(900, 0, 0, 0);
    AUDIO.setAmbience('title');
    const title = type === 'fractured' ? `${this.data_.name} is Fractured` : 'End of the vertical slice';
    this.add.text(W / 2, 90, title, { fontFamily: 'Cinzel, Georgia', fontSize: '40px', color: type === 'fractured' ? '#ff9a7a' : '#e8c372' }).setOrigin(0.5);
    const sub = type === 'fractured'
      ? 'You ran out of Threads. A Fractured world is remembered in the Ledger. You can try it again.'
      : 'Thank you for playing the Prologue and Hollowmere.';
    this.add.text(W / 2, 140, sub, { fontFamily: '"Cormorant Garamond", Georgia', fontStyle: 'italic', fontSize: '24px', color: '#cfc6e0', align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5);

    const ledger = d.ledger.map((k) => LEDGER_TEXT[k] ?? k).join('\n');
    this.add.text(W / 2, 200, `THE LEDGER\n\n${ledger || 'Nothing was written.'}`, {
      fontFamily: '"Cormorant Garamond", Georgia', fontSize: '23px', color: '#e9e2f5', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0);
    const s = d.stats;
    this.add.text(W / 2, H - 170,
      `Threads left: ${d.threads}     Deaths: ${s.deaths}     Times seen: ${s.seen}     Takedowns: ${s.takedowns}     Foresights: ${s.foresights}     Combos: ${d.codex.length}/2`,
      { fontFamily: 'Inter, Arial', fontSize: '15px', color: '#8f8aa3' }).setOrigin(0.5);

    this.entries = type === 'fractured'
      ? [['Try Hollowmere again', () => this.retry()], ['Title screen', () => this.scene.start('Title')]]
      : [['Title screen', () => this.scene.start('Title')]];
    this.sel = 0;
    this.items = this.entries.map(([label], i) => this.add.text(W / 2, H - 110 + i * 44, label, { fontFamily: '"Cormorant Garamond", Georgia', fontSize: '30px', color: '#a9a3bd' }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.entries[i][1]()));
    this.keys = this.input.keyboard.addKeys('UP,DOWN,W,S,E,ENTER,SPACE');
    this.render();
  }

  render() {
    this.items.forEach((t, i) => t.setColor(i === this.sel ? '#e8c372' : '#a9a3bd'));
  }

  retry() {
    AUDIO.play('uiSelect');
    GAME.enterWorld(this.data_.world);
    GAME.data.ledger.push(`${this.data_.name} Fractured once. You returned to it.`);
    GAME.save();
    this.scene.start('Game', { world: this.data_.world });
  }

  update() {
    const k = this.keys;
    const J = Phaser.Input.Keyboard.JustDown;
    if (J(k.UP) || J(k.W)) { this.sel = (this.sel + this.entries.length - 1) % this.entries.length; this.render(); }
    if (J(k.DOWN) || J(k.S)) { this.sel = (this.sel + 1) % this.entries.length; this.render(); }
    if (J(k.E) || J(k.ENTER) || J(k.SPACE)) this.entries[this.sel][1]();
  }
}

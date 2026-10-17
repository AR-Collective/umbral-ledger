// Boot: paint every texture, wait briefly for web fonts, then go to the title
// (or straight back to your last dev checkpoint if "auto resume" is on).

import Phaser from 'phaser';
import { generateTextures } from '../textures.js';
import { DEV, loadDev } from '../dev/devFlags.js';
import { TUNING } from '../tuning.js';
import { GAME } from '../systems/state.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    loadDev();
    this.registry.set('settings', { muted: false, shake: true, fullHud: false });
    this.registry.set('timeScale', 1);
    const text = this.add.text(640, 360, 'painting shadows...', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#6f6a82' }).setOrigin(0.5);

    // Give the canvas one frame to show the message, then do the heavy work.
    this.time.delayedCall(30, async () => {
      generateTextures(this);
      try {
        if (document.fonts) {
          await Promise.race([
            Promise.all([
              document.fonts.load('30px Cinzel'),
              document.fonts.load('italic 28px "Cormorant Garamond"'),
              document.fonts.load('28px "Cormorant Garamond"'),
              document.fonts.load('16px Inter'),
            ]),
            new Promise((r) => setTimeout(r, 2500)),
          ]);
        }
      } catch { /* offline: fallback fonts are fine */ }
      text.destroy();
      if (TUNING.dev.enabled && DEV.autoResume && DEV.lastJump && GAME.load()) {
        this.scene.start('Game', { world: DEV.lastJump.world, spawn: DEV.lastJump.spawn, fromDeath: true });
      } else {
        this.scene.start('Title');
      }
    });
  }
}

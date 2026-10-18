// Boot: paint every texture, wait briefly for web fonts, then go to the title
// (or straight back to your last dev checkpoint if "auto resume" is on).

import Phaser from 'phaser';
import { generateTextures } from '../textures.js';
import { DEV, loadDev } from '../dev/devFlags.js';
import { TUNING } from '../tuning.js';
import { GAME } from '../systems/state.js';
import { registerPipelines } from '../systems/fx.js';
import cutFire from '../assets/cutscenes/fire.jpg';
import cutDoorway from '../assets/cutscenes/doorway.jpg';
import cutSplit from '../assets/cutscenes/split.jpg';
import cutLamp from '../assets/cutscenes/lamp.jpg';
import cutTitle from '../assets/cutscenes/title.jpg';
import cutFragment from '../assets/cutscenes/fragment.jpg';
import cutMemory from '../assets/cutscenes/memory.jpg';
import cutResist from '../assets/cutscenes/resist.jpg';
import cutAbility from '../assets/cutscenes/ability.jpg';
import { AUDIO } from '../systems/audio.js';
import { loadSoundOn } from '../systems/soundToggle.js';

// Painted cutscene panels (2160x1040 2K HD). CutsceneScene uses 'cut_<art>' when
// it exists and falls back to its code-drawn painter otherwise.
const CUTSCENE_ART = {
  fire: cutFire,
  doorway: cutDoorway,
  split: cutSplit,
  lamp: cutLamp,
  title: cutTitle,
  fragment: cutFragment,
  memory: cutMemory,
  resist: cutResist,
  ability: cutAbility,
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const [art, url] of Object.entries(CUTSCENE_ART)) this.load.image(`cut_${art}`, url);
  }

  create() {
    for (const art of Object.keys(CUTSCENE_ART)) {
      const tex = this.textures.get(`cut_${art}`);
      if (tex && tex.setFilter) tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    loadDev();
    const soundOn = loadSoundOn();
    this.registry.set('settings', { muted: !soundOn, shake: true, fullHud: false });
    AUDIO.setMuted(!soundOn);
    this.registry.set('timeScale', 1);
    const text = this.add.text(640, 360, 'painting shadows...', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#6f6a82' }).setOrigin(0.5);

    // Give the canvas one frame to show the message, then do the heavy work.
    this.time.delayedCall(30, async () => {
      registerPipelines(this.game);
      generateTextures(this);
      try {
        if (document.fonts) {
          await Promise.race([
            Promise.all([
              document.fonts.load('30px Cinzel'),
              document.fonts.load('bold 30px Cinzel'),
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

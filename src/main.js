// Entry point: creates the Phaser game and (in dev builds) the dev panel.

import Phaser from 'phaser';
import { TUNING } from './tuning.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { EndScene } from './scenes/EndScene.js';
import { DevPanel } from './dev/DevPanel.js';
import { GAME } from './systems/state.js';
import { DEV } from './dev/devFlags.js';
import { AUDIO } from './systems/audio.js';

const config = {
  type: Phaser.AUTO, // WebGL when available (needed for the Foresight color effect), canvas otherwise
  parent: 'game',
  width: TUNING.view.width,
  height: TUNING.view.height,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: TUNING.physics.gravity }, debug: false } },
  input: { gamepad: true },
  fps: { target: 60 },
  scene: [BootScene, TitleScene, CutsceneScene, GameScene, HUDScene, EndScene],
};

const game = new Phaser.Game(config);
const devPanel = TUNING.dev.enabled ? new DevPanel(game) : null;

// Handy from the browser console, and used by the automated tests.
window.__umbral = { game, GAME, DEV, TUNING, AUDIO, devPanel };

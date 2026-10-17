// A shared event channel between the game world and the HUD.
// The game says "show this line", the HUD decides how it looks.
import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();

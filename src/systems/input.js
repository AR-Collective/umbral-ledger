// Keyboard + gamepad, turned into game actions.
//
// Why a wrapper: the player code asks "is jump pressed?" instead of "is the
// Space key down?". Remapping keys or adding a gamepad never touches gameplay code.

import Phaser from 'phaser';

const KEYS = 'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,K,E,F,Q,ESC,TAB,M,H,ENTER,R,X,Z';

export class Controls {
  constructor(scene) {
    this.scene = scene;
    this.k = scene.input.keyboard.addKeys(KEYS);
    scene.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,TAB');
    this.prevPad = {};
    this.state = {};
    this.prev = {};
    this.enabled = true;
  }

  pad() {
    const gp = this.scene.input.gamepad;
    return gp && gp.total > 0 ? gp.getPad(0) : null;
  }

  update() {
    const k = this.k;
    const p = this.pad();
    const stickX = p ? p.leftStick.x : 0;
    const stickY = p ? p.leftStick.y : 0;
    const s = {
      left: k.A.isDown || k.LEFT.isDown || (p && (p.left || stickX < -0.35)),
      right: k.D.isDown || k.RIGHT.isDown || (p && (p.right || stickX > 0.35)),
      down: k.S.isDown || k.DOWN.isDown || (p && (p.down || stickY > 0.55)),
      up: k.W.isDown || k.UP.isDown || (p && (p.up || stickY < -0.55)),
      jump: k.SPACE.isDown || k.W.isDown || k.UP.isDown || (p && p.A),
      strike: k.J.isDown || (p && p.X),
      dash: k.K.isDown || (p && p.B),
      interact: k.E.isDown || k.ENTER.isDown || (p && p.Y),
      foresight: k.F.isDown || (p && p.L2 > 0.4),
      command: k.Q.isDown || (p && p.R1),
      pause: k.ESC.isDown || (p && p.buttons[9] && p.buttons[9].pressed),
      ledger: k.TAB.isDown,
      mute: k.M.isDown,
      hud: k.H.isDown,
      reweave: k.R.isDown,
    };
    for (const key of Object.keys(s)) s[key] = !!s[key];
    if (!this.enabled) {
      for (const key of Object.keys(s)) if (key !== 'pause') s[key] = false;
    }
    this.prev = this.state;
    this.state = s;
  }

  held(name) { return !!this.state[name]; }
  pressed(name) { return !!this.state[name] && !this.prev[name]; }
  released(name) { return !this.state[name] && !!this.prev[name]; }
}

// For menus: any key or button pressed this frame.
export function anyKeyJustDown(scene, keys) {
  for (const key of keys) if (Phaser.Input.Keyboard.JustDown(key)) return true;
  return false;
}

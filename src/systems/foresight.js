// =====================================================================
// FORESIGHT (micro layer): stop time and watch a ghost replay of the next
// few seconds of every nearby watcher.
//
// How it works: each watcher's movement state is a plain object. We copy it
// and run the SAME movement rules forward (stepWatcherState). The ghosts show
// exactly what the watchers will do if nothing disturbs them. If you make a
// noise or get seen, the real future changes. That matches the honesty rule:
// Foresight never lies about what could happen, but it can be wrong about
// what will happen, because you are part of the future too.
// =====================================================================

import { stepWatcherState } from '../entities/Watcher.js';
import { TUNING } from '../tuning.js';

const SIM_DT = 1 / 30;
const GHOST_TINT = 0xcfe2ff;

export class Foresight {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.tracks = [];
    this.gfx = scene.add.graphics().setDepth(46);
    this.t = 0;
    this.horizon = 3;
  }

  begin(watchers, seconds, centerX) {
    this.active = true;
    this.t = 0;
    this.horizon = seconds;
    const steps = Math.ceil(seconds / SIM_DT);
    this.tracks = [];
    for (const w of watchers) {
      if (w.mode === 'down' || w.mode === 'dormant' || Math.abs(w.x - centerX) > 1500) continue;
      const s = JSON.parse(JSON.stringify(w.s));
      const frames = [];
      for (let i = 0; i < steps; i++) {
        stepWatcherState(s, w.cfg, SIM_DT);
        frames.push({ x: s.x, facing: s.facing });
      }
      const ghost = this.scene.add.image(w.x, w.groundY, w.type).setOrigin(0.5, 1).setDepth(46)
        .setTintFill(GHOST_TINT).setAlpha(0.42);
      const end = this.scene.add.image(frames[frames.length - 1].x, w.groundY, w.type).setOrigin(0.5, 1).setDepth(46)
        .setTintFill(GHOST_TINT).setAlpha(0.16).setFlipX(frames[frames.length - 1].facing < 0);
      this.tracks.push({ w, frames, ghost, end });
    }
  }

  // Returns the ghost time being shown, for the HUD label.
  update(dt) {
    if (!this.active) return 0;
    const F = TUNING.foresight;
    const loop = this.horizon + 0.8; // a short hold at the end of each loop
    this.t = (this.t + dt * F.playbackSpeed) % loop;
    const tp = Math.min(this.t, this.horizon);
    const g = this.gfx;
    g.clear();
    const lighting = this.scene.lighting;
    for (const tr of this.tracks) {
      const idx = Math.min(tr.frames.length - 1, Math.floor(tp / SIM_DT));
      const f = tr.frames[idx];
      tr.ghost.setPosition(f.x, tr.w.groundY).setFlipX(f.facing < 0);

      // dotted path of where it walks
      g.fillStyle(GHOST_TINT, 0.35);
      for (let i = 0; i < tr.frames.length; i += 6) g.fillCircle(tr.frames[i].x, tr.w.groundY - 4, 2);

      // the ghost's view cone, stopping at walls
      if (tr.w.cfg.lantern || tr.w.type === 'acolyte') {
        const eyeX = f.x + f.facing * 8, eyeY = tr.w.groundY - tr.w.cfg.eyeH;
        const pts = lighting.rayFan(eyeX, eyeY, f.facing > 0 ? 0 : Math.PI, (TUNING.stealth.cone * Math.PI) / 180, TUNING.stealth.range.light, 20);
        g.fillStyle(GHOST_TINT, 0.08);
        g.beginPath();
        g.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
        g.closePath();
        g.fillPath();
      }
    }
    return tp;
  }

  end() {
    for (const tr of this.tracks) { tr.ghost.destroy(); tr.end.destroy(); }
    this.tracks = [];
    this.gfx.clear();
    this.active = false;
  }
}

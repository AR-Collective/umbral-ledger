// =====================================================================
// CHARACTERS: every character is a little skeleton painted frame by frame.
//
// How it works: a pose is a handful of angles (thighs, shins, arms, lean).
// A walk cycle is just those angles as sine waves over one step. The painter
// solves where each joint lands, keeps the lowest foot on the ground (which
// gives a natural bob), then paints limbs, clothes, a hat or hood, and a
// moonlit rim. All frames are packed into one sheet per character and turned
// into Phaser animations, so characters actually walk instead of sliding.
//
// Characters face RIGHT. Phaser flips them for facing left.
// ANCHORS records, per frame, where the hand (lantern), the eyes and the head
// are, relative to the feet, so lanterns and crowns follow the body exactly.
//
// Each character's painter and animation list lives in art/chars/<name>.js;
// the shared skeleton maths lives in art/rig.js. This file packs them into
// sheets and hands them to Phaser.
// =====================================================================

import { buildSheet } from './paint.js';
import { ANCHORS, dashSmear } from './rig.js';
import { DEFS as SHADE } from './chars/shade.js';
import { DEFS as WATCHERS } from './chars/watchers.js';
import { DEFS as SURVIVORS } from './chars/survivors.js';
import { DEFS as WICK, buildWickTextures } from './chars/wickmother.js';
import { DEFS as ALMONER, STATUE, buildAlmonerPortrait } from './chars/almoner.js';

export { ANCHORS };
export const SHEETS = {};    // key -> { w, h, base, anims: { name: { start, count, rate, repeat } } }

// ---------------------------------------------------------------
// Character definitions: frame size + animations + pose functions
// ---------------------------------------------------------------
const DEFS = { ...SHADE, ...WATCHERS, ...SURVIVORS, ...WICK, ...ALMONER };

// Paints every sheet (no Phaser needed, so the art preview page can show them).
export function paintSheets() {
  const out = {};
  for (const [key, def] of Object.entries(DEFS)) {
    const frames = [];
    for (const [name, a] of Object.entries(def.anims)) {
      for (let i = 0; i < a.n; i++) frames.push({ name, a, t: a.n > 1 ? i / a.n : 0 });
    }
    const { sheet } = buildSheet(def.w, def.h, frames.length, (cv, i) => {
      const f = frames[i];
      const pose = f.a.pose(f.t);
      if (f.a.smear) dashSmear(cv, (tmp) => def.draw(tmp, pose, i));
      else def.draw(cv, pose, i);
    });
    out[key] = { sheet, def };
  }
  const statue = buildSheet(STATUE.w, STATUE.h, 1, (cv, i) => STATUE.draw(cv, i));
  out.statue = { sheet: statue.sheet, def: { w: STATUE.w, h: STATUE.h, base: STATUE.base, anims: {} } };
  return out;
}

// Builds every sheet, registers it with Phaser, and creates the animations.
export function buildCharacters(scene) {
  const painted = paintSheets();
  for (const [key, { sheet, def }] of Object.entries(painted)) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addSpriteSheet(key, sheet, { frameWidth: def.w, frameHeight: def.h });
    const anims = {};
    let start = 0;
    for (const [name, a] of Object.entries(def.anims)) {
      anims[name] = { start, count: a.n, rate: a.rate, repeat: a.repeat ?? -1 };
      const animKey = `${key}_${name}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers(key, { start, end: start + a.n - 1 }),
          frameRate: a.rate,
          repeat: a.repeat ?? -1,
        });
      }
      start += a.n;
    }
    SHEETS[key] = { w: def.w, h: def.h, base: def.base, anims };
  }
  // single images that belong to a character (cutscene portraits, boss props)
  buildAlmonerPortrait(scene);
  buildWickTextures(scene);
}

// Origin for a sprite of this character so (x, y) is the feet.
export function feetOrigin(key) {
  const s = SHEETS[key];
  return [0.5, (s.h - s.base) / s.h];
}

export function anchorFor(key, frame) {
  const list = ANCHORS[key];
  return (list && list[frame]) || { hand: { x: 0, y: -40 }, eye: { x: 0, y: -40 }, head: { x: 0, y: -40 } };
}

export function firstFrame(key, anim) {
  return SHEETS[key].anims[anim].start;
}

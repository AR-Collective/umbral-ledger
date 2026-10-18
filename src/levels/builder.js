// =====================================================================
// LEVEL BUILDER: the small vocabulary level files are written in.
//
// A level file says "a cobbled floor here, a lamp post there, a Lanternman
// patrolling between these two points". This file turns those words into
// physics bodies, light blockers, lights and painted art, so level files stay
// short and readable and never touch Phaser directly.
//
// DEPTHS (what draws over what)
//   0-9    sky and distant parallax layers
//   10-19  world art behind the action: walls, houses, pillars, props
//   20-24  floors and solid ground
//   25     THE LIGHT LAYER: everything below is lit by it
//   30-39  characters (silhouettes against the light, with their own glow)
//   40-49  the player, lanterns, flames, pickups
//   50-59  near fog and foreground silhouettes
//   60+    readable game info (cones, ?/! icons, prompts)
// =====================================================================

import Phaser from 'phaser';
import { Watcher } from '../entities/Watcher.js';
import { GAME } from '../systems/state.js';
import { paintHouse, paintPillar } from '../art/scenery.js';
import { addCanvasTexture } from '../art/paint.js';
import { feetOrigin, anchorFor } from '../art/characters.js';

const BODY = { earth: 'ground_body', stone: 'stone_body', hall: 'hall_stone', wood: 'wood_body', cellar: 'stone_body', rubble: 'stone_body' };
const TOP = { earth: 'top_grass', stone: 'top_cobble', hall: 'top_marble', wood: null, cellar: 'top_flag', rubble: null };

let HOUSE_ID = 0;

export class LevelBuilder {
  constructor(scene) {
    this.s = scene;
  }

  // ---------------- geometry ----------------

  // Solid ground or wall: you collide with it and it blocks light.
  // style: earth | stone | hall | wood | cellar | rubble.  top: cobble | grass | flag | marble | false
  solid(x, y, w, h, o = {}) {
    const s = this.s;
    const z = s.add.zone(x + w / 2, y + h / 2, w, h);
    s.physics.add.existing(z, true);
    s.solids.push(z);
    s.solidRects.push({ x, y, w, h });
    if (o.occlude !== false) s.lighting.addRectOccluder(x, y, w, h, 'solid');
    if (o.visible !== false) {
      const style = o.style ?? 'stone';
      const depth = o.depth ?? 20;
      const body = s.add.tileSprite(x, y, w, h, BODY[style] ?? 'stone_body').setOrigin(0).setDepth(depth);
      if (o.tint) body.setTint(o.tint);
      const top = o.top === undefined ? TOP[style] : o.top ? `top_${o.top}` : null;
      if (top && o.trim !== false) {
        const trim = s.add.tileSprite(x, y - 6, w, 44, top).setOrigin(0).setDepth(depth + 0.2);
        if (o.tint) trim.setTint(o.tint);
      }
      else if (o.trim !== false) s.add.rectangle(x, y, w, 2, 0x9fb4ff, 0.25).setOrigin(0).setDepth(depth + 0.2);
    }
    if (o.edge !== false && o.visible !== false) this.edge(x, y, w);
    return z;
  }

  // A thin platform you can jump up through and stand on. Blocks light like a shelf.
  ledge(x, y, w, o = {}) {
    const s = this.s;
    const h = o.h ?? 14;
    const z = s.add.zone(x + w / 2, y + h / 2, w, h);
    s.physics.add.existing(z, true);
    z.body.checkCollision.down = false;
    z.body.checkCollision.left = false;
    z.body.checkCollision.right = false;
    s.solids.push(z);
    if (o.occlude !== false) s.lighting.addRectOccluder(x, y, w, h, 'ledge');
    s.add.tileSprite(x, y, w, h, 'wood_body').setOrigin(0).setDepth(21);
    s.add.rectangle(x, y + h, w, 3, 0x000000, 0.5).setOrigin(0).setDepth(21);
    this.edge(x, y, w);
    return z;
  }

  // A faint moonlit line on top of every walkable surface, so platforming
  // stays readable even in total shade.
  edge(x, y, w) {
    this.s.edgeGfx.lineStyle(2, 0xa8b8ff, 0.22);
    this.s.edgeGfx.lineBetween(x + 1, y + 1, x + w - 1, y + 1);
  }

  // Blocks light but not movement. cover (default true) makes the inside a hiding spot.
  screen(x, y, w, h, o = {}) {
    return this.s.lighting.addRectOccluder(x, y, w, h, o.tag ?? 'screen', { cover: o.cover ?? true });
  }

  pillar(x, groundY, w, h) {
    const s = this.s;
    const key = `pillar_${w}x${h}`;
    if (!s.textures.exists(key)) addCanvasTexture(s, key, paintPillar(w, h));
    s.add.image(x - 14, groundY, key).setOrigin(0, 1).setDepth(14);
    this.screen(x, groundY - h, w, h, { tag: 'pillar' });
  }

  // A painted prop. occlude: true uses its bounds, or pass [dx, dy, w, h]
  // relative to its bottom-centre. solid: true also makes it collide.
  prop(key, x, feetY, o = {}) {
    const s = this.s;
    const img = s.add.image(x, feetY, key, o.frame).setOrigin(0.5, 1).setDepth(o.depth ?? 16);
    if (o.flip) img.setFlipX(true);
    if (o.scale) img.setScale(o.scale);
    if (o.tint) img.setTint(o.tint);
    if (o.alpha !== undefined) img.setAlpha(o.alpha);
    let rect = null;
    if (o.occlude === true) rect = [x - img.displayWidth / 2, feetY - img.displayHeight, img.displayWidth, img.displayHeight];
    else if (Array.isArray(o.occlude)) rect = [x + o.occlude[0], feetY + o.occlude[1], o.occlude[2], o.occlude[3]];
    // shape: a convex outline [dx0, dy0, dx1, dy1, ...] relative to the bottom-centre,
    // for props whose silhouette is not a box (it replaces the occlude rectangle).
    if (o.shape) {
      const pts = o.shape.map((v, i) => (i % 2 ? feetY + v : x + (o.flip ? -v : v)));
      const coverBox = rect ? { x: rect[0], y: rect[1], w: rect[2], h: rect[3] } : undefined;
      s.lighting.addPolyOccluder(pts, 'prop', { cover: o.cover ?? true, coverBox });
    } else if (rect) s.lighting.addRectOccluder(rect[0], rect[1], rect[2], rect[3], 'prop', { cover: o.cover ?? true });
    if (o.solid) {
      const r = rect ?? [x - img.displayWidth / 2, feetY - img.displayHeight, img.displayWidth, img.displayHeight];
      this.solid(r[0], r[1], r[2], r[3], { visible: false, occlude: false });
    }
    return img;
  }

  // Decoration only: no physics, no light blocking (trees behind the street, banners).
  decor(key, x, y, o = {}) {
    const img = this.s.add.image(x, y, key, o.frame).setOrigin(o.ox ?? 0.5, o.oy ?? 1).setDepth(o.depth ?? 12);
    if (o.flip) img.setFlipX(true);
    if (o.scale) img.setScale(o.scale);
    if (o.tint) img.setTint(o.tint);
    if (o.alpha !== undefined) img.setAlpha(o.alpha);
    if (o.scrollFactor !== undefined) img.setScrollFactor(o.scrollFactor, 1);
    return img;
  }

  // A house front. Lit windows become soft glow lights (they never burn).
  // solid: true makes the whole block a platform (for the rooftop route).
  house(x, groundY, w, h, o = {}) {
    const s = this.s;
    const key = `house_${HOUSE_ID++}`;
    const painted = paintHouse(w, h, { ...o, seed: o.seed ?? HOUSE_ID });
    addCanvasTexture(s, key, painted.canvas);
    s.add.image(x - painted.pad, groundY, key).setOrigin(0, 1).setDepth(o.depth ?? 12);
    for (const win of o.windows ?? []) {
      const [wx, wy, lit] = win;
      if (!lit || o.windowLights === false) continue;
      const ww = win[3] ?? 26, wh = win[4] ?? 32;
      this.light({ x: x + wx + ww / 2, y: groundY - h + wy + wh / 2, radius: o.windowRadius ?? 170, intensity: 0.9, color: [255, 168, 88], flicker: 0.03, kind: 'glow' });
      s.add.image(x + wx + ww / 2, groundY - h + wy + wh / 2, 'softglow').setDepth(26).setBlendMode('ADD').setTint(0xffa860).setScale(0.55).setAlpha(0.45);
    }
    // A flat roof is a slab painted on top of the walls, so you stand on the slab, not inside it.
    if (o.solid) {
      const top = groundY - h - (o.roof === 'flat' ? painted.roofH : 0);
      this.solid(x, top, w, groundY - top, { visible: false, style: 'stone' });
      this.edge(x - 6, top, w + 12);
    }
    if (o.roof !== 'flat' && o.smoke !== false && o.chimney !== false) {
      const cx = x + w * 0.7 + 9;
      const cy = groundY - h - painted.roofH * 0.75 - 30;
      s.add.particles(cx, cy, 'smoke', {
        lifespan: 4200, speedY: { min: -22, max: -12 }, speedX: { min: 4, max: 14 }, scale: { start: 0.3, end: 1.6 },
        alpha: { start: 0.18, end: 0 }, tint: 0x8a8aa8, frequency: 520,
      }).setDepth(11);
    }
    return key;
  }

  // ---------------- lights ----------------
  light(def) {
    return this.s.lighting.addLight(def);
  }

  flare(x, y, color = 0xffb060, scale = 0.5, alpha = 0.7, depth = 46) {
    const img = this.s.add.image(x, y, 'flare').setDepth(depth).setBlendMode('ADD').setTint(color).setScale(scale).setAlpha(alpha);
    this.s.flares.push(img);
    return img;
  }

  lamppost(x, groundY, o = {}) {
    this.prop('lamppost', x, groundY, { depth: 17 });
    const L = this.light({ x, y: groundY - 178, radius: o.radius ?? 270, intensity: o.intensity ?? 0.92, color: [255, 176, 96], flicker: 0.04 });
    this.flare(x, groundY - 180, 0xffb060, 0.7, 0.8);
    return L;
  }

  // A lantern on a chain that swings. The light and the sprite share one pivot.
  hangingLamp(px, py, o = {}) {
    const s = this.s;
    const L = this.light({
      x: px, y: py, radius: o.radius ?? 230, intensity: o.intensity ?? 0.92, color: [255, 170, 90], flicker: 0.05,
      swing: { length: o.length ?? 90, amp: o.amp ?? 38, period: o.period ?? 3.2, phase: o.phase ?? 0 },
    });
    const chain = s.add.graphics().setDepth(17);
    const lamp = s.add.image(px, py, 'chain_lamp').setDepth(41);
    const glow = this.flare(px, py, 0xffb060, 0.55, 0.75);
    s.swingers.push({ L, chain, lamp, glow, px, py });
    return L;
  }

  // Moonlight through a tall window: a shaft of light pointing down.
  windowBeam(x, y, o = {}) {
    const s = this.s;
    const L = this.light({
      x, y, radius: o.radius ?? 620, intensity: o.intensity ?? 0.9, color: o.color ?? [196, 210, 255],
      cone: { dir: o.dir ?? 100, spread: o.spread ?? 11 }, pulse: o.pulse ?? null, kind: 'beam',
    });
    // the window sits just below where the shaft starts
    if (o.window !== false) s.add.image(x, y - 34, 'hall_window').setOrigin(0.5, 0).setDepth(11).setScale(o.windowScale ?? 0.8);
    // dust drifting in the shaft
    s.add.particles(x, y + 200, 'spark', {
      lifespan: 6000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 6 }, scale: { min: 0.2, max: 0.5 },
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.8 }, tint: 0xd8e2ff, blendMode: 'ADD', frequency: 260,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-60, -160, 160, 360) },
    }).setDepth(26);
    return L;
  }

  // An open flame. kind 'burn' (default) is real fire; 'glow' is decoration that never burns.
  candle(x, y, o = {}) {
    const s = this.s;
    if (o.stick !== false) s.add.image(x, y, 'candle').setOrigin(0.5, 1).setDepth(17);
    const flame = s.add.image(x, y - 24, 'flame').setOrigin(0.5, 0.9).setDepth(42).setBlendMode('ADD').setScale(o.flameScale ?? 0.7);
    s.tweens.add({ targets: flame, scaleY: (o.flameScale ?? 0.7) * 1.2, scaleX: (o.flameScale ?? 0.7) * 0.88, duration: 120 + Math.random() * 80, yoyo: true, repeat: -1 });
    this.flare(x, y - 30, 0xff9a40, o.flare ?? 0.35, 0.8);
    return this.light({ x, y: y - 28, radius: o.radius ?? 140, intensity: o.intensity ?? 0.9, color: [255, 142, 62], flicker: 0.14, fire: (o.kind ?? 'burn') === 'burn', kind: o.kind ?? 'burn' });
  }

  // A brazier: a big open fire on a tripod. It burns, and Black Ember can snuff it.
  // Returns the snuffable record (level scripts watch it: o.onSnuff).
  brazier(x, groundY, o = {}) {
    const s = this.s;
    this.prop('brazier', x, groundY, { depth: o.depth ?? 17 });
    const fy = groundY - 96;
    const flames = [-14, 2, 16].map((dx, i) => {
      const f = s.add.image(x + dx, fy, 'flame').setOrigin(0.5, 0.9).setDepth(42).setBlendMode('ADD').setScale(i === 1 ? 1.25 : 0.85);
      s.tweens.add({ targets: f, scaleY: f.scaleY * 1.25, scaleX: f.scaleX * 0.85, duration: 110 + i * 37, yoyo: true, repeat: -1 });
      return f;
    });
    const flare = this.flare(x, fy - 20, 0xff9a40, 0.9, 0.85);
    const embers = s.add.particles(x, fy - 10, 'spark', {
      x: { min: -18, max: 18 }, lifespan: { min: 600, max: 1300 }, speedY: { min: -110, max: -40 }, speedX: { min: -16, max: 16 },
      scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xfff0c0, 0xffb050, 0xff6a20], blendMode: 'ADD', frequency: 60,
    }).setDepth(42);
    const light = this.light({ x, y: fy - 26, radius: o.radius ?? 230, intensity: 0.95, color: [255, 142, 62], flicker: 0.12, fire: true, kind: 'burn' });
    // the whole brazier is the target: a bolt thrown from the ground still puts it out
    const sn = { x, y: groundY - 60, r: 58, light, sprites: [...flames, flare], lit: true, burn: true, onSnuff: o.onSnuff };
    const off = sn.onSnuff;
    sn.onSnuff = (v) => { embers.stop(); off?.(v); };
    sn.relight = () => {
      sn.lit = true; light.enabled = true; embers.start();
      for (const f of flames) { f.setAlpha(1); f.setScale(f === flames[1] ? 1.25 : 0.85); }
      flare.setAlpha(0.85).setScale(0.9);
    };
    s.snuffables.push(sn);
    return sn;
  }

  // A shaft of the stopped sun burning down through the ash. It burns like any light.
  sunshaft(x, o = {}) {
    const s = this.s;
    const top = o.top ?? 0, len = o.length ?? 820;
    const L = this.light({ x, y: top, radius: len, intensity: o.intensity ?? 0.95, color: [255, 226, 176], cone: { dir: 90 + (o.lean ?? 0), spread: o.spread ?? 6 }, kind: 'beam' });
    s.add.particles(x, top + len * 0.5, 'spark', {
      lifespan: 4200, speedX: { min: -5, max: 5 }, speedY: { min: 6, max: 22 }, scale: { min: 0.2, max: 0.55 },
      alpha: { onEmit: () => 0, onUpdate: (pp, k, t) => Math.sin(t * Math.PI) * 0.8 }, tint: [0xfff1c0, 0xffc070], blendMode: 'ADD', frequency: 180,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-30, -len * 0.45, 60, len * 0.9) },
    }).setDepth(26);
    return L;
  }

  // A Remnant: a splinter of the man's soul. Taking one is a level-up (o.upgrade).
  remnant(def) {
    const s = this.s;
    if (GAME.data.remnants.includes(`${s.worldId}:${def.id}`)) return null;
    const img = s.add.image(def.x, def.y, 'remnant').setDepth(44);
    const glow = this.flare(def.x, def.y, 0x9a5cff, 0.9, 0.7, 44);
    s.tweens.add({ targets: [img], y: def.y - 10, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: [glow], alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    s.add.particles(def.x, def.y, 'spark', {
      lifespan: 1600, speed: { min: 6, max: 24 }, scale: { start: 0.7, end: 0 }, tint: [0xc9a8ff, 0xe8c372], blendMode: 'ADD', frequency: 90,
    }).setDepth(44);
    const item = { ...def, img, glow, kind: 'remnant' };
    s.pickups.push(item);
    return item;
  }

  // A standing candelabra with three flames.
  candelabra(x, groundY, o = {}) {
    this.prop('candelabra', x, groundY, { depth: 17 });
    for (const dx of [-20, 0, 20]) this.candle(x + dx, groundY - 70, { stick: false, kind: o.kind ?? 'glow', radius: o.radius ?? 150, intensity: 0.9, flameScale: 0.55, flare: 0.25 });
  }

  fog(x1, x2, density) {
    this.s.fogZones.push({ x1, x2, density });
  }

  // ---------------- actors and objects ----------------
  watcher(def) {
    const s = this.s;
    const d = { ...def };
    if (GAME.flag(`down:${def.id}`)) d.down = true;
    const w = new Watcher(s, d);
    s.watchers.push(w);
    return w;
  }

  stillpoint(def) {
    const s = this.s;
    const crystal = s.add.image(def.x, def.y - 76, 'stillpoint').setDepth(44);
    this.flare(def.x, def.y - 76, 0x9fc6ff, 1.0, 0.55, 43);
    s.tweens.add({ targets: crystal, y: def.y - 84, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Motionless dust: the visual signature of time standing still.
    s.add.particles(def.x, def.y - 76, 'spark', {
      lifespan: 4000, speed: 0, scale: 0.5,
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.9 },
      tint: 0xcfe2ff, blendMode: 'ADD', frequency: 240, quantity: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-70, -70, 140, 120) },
    }).setDepth(44);
    this.light({ x: def.x, y: def.y - 76, radius: 200, intensity: 0.7, color: [150, 190, 255], kind: 'safe' });
    const sp = { ...def, crystal };
    s.stillpoints.push(sp);
    return sp;
  }

  sand(def) {
    const s = this.s;
    if (GAME.flag(`sand:${def.id}`)) return null;
    const img = s.add.image(def.x, def.y, 'sand').setDepth(44).setBlendMode('ADD').setScale(1.5);
    const glow = this.flare(def.x, def.y, 0xe8c372, 0.4, 0.6, 44);
    s.tweens.add({ targets: [img, glow], y: def.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const item = { ...def, img, glow, kind: 'sand' };
    s.pickups.push(item);
    return item;
  }

  hourShard(def) {
    const s = this.s;
    if (GAME.data.hourShards[s.worldId]) return null;
    const img = s.add.image(def.x, def.y, 'hourshard').setDepth(44);
    const glow = this.flare(def.x, def.y, 0xffe6a8, 0.8, 0.6, 44);
    s.tweens.add({ targets: [img], angle: 360, duration: 6000, repeat: -1 });
    s.tweens.add({ targets: [glow], alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });
    const item = { ...def, img, glow, kind: 'shard' };
    s.pickups.push(item);
    return item;
  }

  // Rectangular area that runs dialogue lines and/or a named level event once.
  trigger(def) {
    this.s.triggers.push({ once: true, ...def });
  }

  // Something you press E at.
  interact(def) {
    this.s.interactables.push(def);
    return def;
  }

  survivor(def) {
    this.s.survivorDefs.push(def);
  }

  statue(x, groundY, o = {}) {
    const s = this.s;
    const [ox, oy] = feetOrigin('statue');
    const img = s.add.image(x, groundY, 'statue', 0).setOrigin(ox, oy).setDepth(15);
    if (o.flip) img.setFlipX(true);
    this.screen(x - 26, groundY - 196, 52, 196, { tag: 'statue' });
  }

  // The Almoner. Not an occluder: it casts no shadow.
  entityFigure(x, groundY) {
    const s = this.s;
    const [ox, oy] = feetOrigin('almoner');
    const body = s.add.sprite(x, groundY, 'almoner', 0).setOrigin(ox, oy).setDepth(15);
    body.play('almoner_idle');
    const lamp = s.add.image(x, groundY, 'lantern').setOrigin(0.5, 0.05).setDepth(41).setTint(0xffe8b0);
    const glow = this.flare(x, groundY, 0xe8c372, 0.9, 0.9);
    const follow = () => {
      const f = Number(body.frame.name) || 0;
      const a = anchorFor('almoner', f);
      lamp.setPosition(x + a.hand.x, groundY + a.hand.y - 6);
      glow.setPosition(x + a.hand.x, groundY + a.hand.y + 14);
    };
    s.events.on('update', follow);
    s.events.once('shutdown', () => s.events.off('update', follow));
    return { body, lamp, glow };
  }

  // A low stone wall or chimney stack: blocks light (a hiding spot when cover is on).
  stack(x, groundY, w, h, o = {}) {
    const s = this.s;
    s.add.tileSprite(x, groundY - h, w, h, 'stone_body').setOrigin(0).setDepth(o.depth ?? 17).setTint(o.tint ?? 0xb0aac0);
    s.add.rectangle(x - 3, groundY - h, w + 6, 6, 0x15121c).setOrigin(0).setDepth((o.depth ?? 17) + 0.1);
    s.add.rectangle(x - 3, groundY - h, w + 6, 1.5, 0x9fb4ff, 0.35).setOrigin(0).setDepth((o.depth ?? 17) + 0.2);
    return this.screen(x, groundY - h, w, h, { tag: 'stack', cover: o.cover ?? true });
  }

  // A wall seen behind an interior (cellars, the Hall), so the sky never shows through.
  backwall(x, y, w, h, key = 'stone_body', o = {}) {
    return this.s.add.tileSprite(x, y, w, h, key).setOrigin(0).setDepth(o.depth ?? 10).setTint(o.tint ?? 0x8a8496);
  }
}

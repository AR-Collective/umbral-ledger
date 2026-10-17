// =====================================================================
// LEVEL BUILDER: the small vocabulary level files are written in.
//
// A level file says "a stone floor here, a lamp post there, a Lanternman
// patrolling between these two points". This file turns those words into
// physics bodies, light occluders, lights and sprites, so level files stay
// short and readable and never touch Phaser directly.
// =====================================================================

import Phaser from 'phaser';
import { houseTexture, GLOW_PAD } from '../textures.js';
import { Watcher } from '../entities/Watcher.js';
import { GAME } from '../systems/state.js';

const STYLES = {
  stone: { tex: 'tex_stone', tint: 0xb8b4d0 },
  hall: { tex: 'tex_stone', tint: 0x9d94b8 },
  earth: { tex: 'tex_earth', tint: 0xc8bcc4 },
  wood: { tex: 'tex_wood', tint: 0xc0b0a0 },
  roof: { tex: 'tex_wood', tint: 0x8a86a8 },
  rubble: { tex: 'tex_stone', tint: 0x8a8098 },
};

export class LevelBuilder {
  constructor(scene) {
    this.s = scene;
  }

  // ---------------- geometry ----------------

  // Solid ground or wall: you collide with it and it blocks light.
  solid(x, y, w, h, o = {}) {
    const s = this.s;
    const z = s.add.zone(x + w / 2, y + h / 2, w, h);
    s.physics.add.existing(z, true);
    s.solids.push(z);
    s.solidRects.push({ x, y, w, h });
    if (o.occlude !== false) s.lighting.addRectOccluder(x, y, w, h, 'solid');
    if (o.visible !== false) {
      const st = STYLES[o.style ?? 'stone'];
      s.add.tileSprite(x, y, w, h, st.tex).setOrigin(0).setDepth(o.depth ?? 10).setTint(o.tint ?? st.tint);
      if (o.trim !== false) s.add.rectangle(x, y, w, 4, 0x2a2838).setOrigin(0).setDepth((o.depth ?? 10) + 0.1);
    }
    if (o.edge !== false) this.edge(x, y, w);
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
    const st = STYLES[o.style ?? 'wood'];
    s.add.tileSprite(x, y, w, h, st.tex).setOrigin(0).setDepth(11).setTint(o.tint ?? st.tint);
    this.edge(x, y, w);
    return z;
  }

  // The faint blue line on top of every surface. It is an outline, not light:
  // platforming must stay readable even in total shade.
  edge(x, y, w) {
    this.s.edgeGfx.lineStyle(2, 0x9fb4ff, 0.32);
    this.s.edgeGfx.lineBetween(x + 1, y + 1, x + w - 1, y + 1);
  }

  // Blocks light but not movement: pillars, statues, posts in the background.
  // Standing "in front of" one puts you in its shade.
  // cover (default true): the inside is a hiding spot in total shade.
  screen(x, y, w, h, o = {}) {
    return this.s.lighting.addRectOccluder(x, y, w, h, o.tag ?? 'screen', { cover: o.cover ?? true });
  }

  pillar(x, groundY, w, h, o = {}) {
    const s = this.s;
    this.screen(x, groundY - h, w, h, { tag: 'pillar' });
    s.add.tileSprite(x, groundY - h, w, h, 'tex_stone').setOrigin(0).setDepth(8).setTint(o.tint ?? 0x8a84a6);
    s.add.rectangle(x - 8, groundY - h, w + 16, 16, 0x221f2e).setOrigin(0).setDepth(8.1);
    s.add.rectangle(x - 6, groundY - 14, w + 12, 14, 0x221f2e).setOrigin(0).setDepth(8.1);
    // fluting
    for (let i = 1; i < 4; i++) s.add.rectangle(x + (w * i) / 4, groundY - h + 16, 2, h - 30, 0x14121c).setOrigin(0).setDepth(8.05);
  }

  // A decorative sprite. occlude: true uses its bounds, or pass [dx, dy, w, h]
  // relative to its bottom-center. solid: true also makes it collide.
  prop(key, x, feetY, o = {}) {
    const s = this.s;
    const img = s.add.image(x, feetY, key).setOrigin(0.5, 1).setDepth(o.depth ?? 12);
    if (o.flip) img.setFlipX(true);
    if (o.scale) img.setScale(o.scale);
    if (o.tint) img.setTint(o.tint);
    if (o.alpha !== undefined) img.setAlpha(o.alpha);
    let rect = null;
    if (o.occlude === true) rect = [x - img.displayWidth / 2, feetY - img.displayHeight, img.displayWidth, img.displayHeight];
    else if (Array.isArray(o.occlude)) rect = [x + o.occlude[0], feetY + o.occlude[1], o.occlude[2], o.occlude[3]];
    if (rect) s.lighting.addRectOccluder(rect[0], rect[1], rect[2], rect[3], 'prop', { cover: o.cover ?? true });
    if (o.solid) {
      const r = rect ?? [x - img.displayWidth / 2, feetY - img.displayHeight, img.displayWidth, img.displayHeight];
      this.solid(r[0], r[1], r[2], r[3], { visible: false, occlude: false });
    }
    return img;
  }

  // A house front. Lit windows become real lights. A door adds a deep-shade recess.
  // solid: true makes the whole block a platform (for the rooftop route).
  house(x, groundY, w, h, o = {}) {
    const s = this.s;
    const key = houseTexture(s, w, h, o);
    const tex = s.textures.get(key).getSourceImage();
    s.add.image(x - 10, groundY, key).setOrigin(0, 1).setDepth(o.depth ?? 5).setDisplaySize(tex.width, tex.height);
    for (const [wx, wy, lit] of o.windows ?? []) {
      if (!lit || o.windowLights === false) continue;
      this.light({ x: x + wx + 11, y: groundY - h + wy + 16, radius: o.windowRadius ?? 150, intensity: o.windowIntensity ?? 0.55, color: [255, 170, 90], flicker: 0.03, glow: 0.45 });
    }
    if (o.door) s.lighting.addShadeZone(x + o.door[0], groundY - 70, o.door[1], 70, 0.75);
    if (o.solid) this.solid(x, groundY - h, w, h, { visible: false, style: 'roof' });
    return key;
  }

  // ---------------- lights ----------------
  light(def) {
    return this.s.lighting.addLight(def);
  }

  lamppost(x, groundY, o = {}) {
    const s = this.s;
    this.prop('lamppost', x, groundY, { depth: 9 });
    const L = this.light({ x, y: groundY - 160, radius: o.radius ?? 250, intensity: o.intensity ?? 0.9, color: [255, 176, 96], flicker: 0.04, glow: 0.55, fire: false });
    s.add.image(x, groundY - 160, 'softglow').setDepth(31.5).setBlendMode('ADD').setTint(0xffb060).setScale(0.45).setAlpha(0.6);
    return L;
  }

  // A lantern on a chain that swings. The light and the sprite share one pivot.
  hangingLamp(px, py, o = {}) {
    const s = this.s;
    const L = this.light({
      x: px, y: py, radius: o.radius ?? 230, intensity: o.intensity ?? 0.9, color: [255, 170, 90], flicker: 0.05, glow: 0.55,
      swing: { length: o.length ?? 90, amp: o.amp ?? 38, period: o.period ?? 3.2, phase: o.phase ?? 0 },
    });
    const chain = s.add.graphics().setDepth(12);
    const lamp = s.add.image(px, py, 'chain_lamp').setDepth(12);
    const glow = s.add.image(px, py, 'softglow').setDepth(31.5).setBlendMode('ADD').setTint(0xffb060).setScale(0.4).setAlpha(0.55);
    s.swingers.push({ L, chain, lamp, glow, px, py });
    return L;
  }

  // Light through a high window: a cone pointing down. pulse makes clouds pass.
  windowBeam(x, y, o = {}) {
    const s = this.s;
    const L = this.light({
      x, y, radius: o.radius ?? 620, intensity: o.intensity ?? 0.9, color: o.color ?? [210, 220, 255],
      cone: { dir: o.dir ?? 100, spread: o.spread ?? 11 }, pulse: o.pulse ?? null, glow: o.glow ?? 0.35, falloff: 'beam',
    });
    s.add.rectangle(x - 22, y - 50, 44, 54, 0xcfd8ff, 0.18).setOrigin(0).setDepth(31.5).setBlendMode('ADD');
    return L;
  }

  candle(x, y, o = {}) {
    const s = this.s;
    s.add.image(x, y, 'candle').setOrigin(0.5, 1).setDepth(12);
    s.add.image(x, y - 18, 'softglow').setDepth(31.5).setBlendMode('ADD').setTint(0xff9a40).setScale(0.3).setAlpha(0.7);
    return this.light({ x, y: y - 18, radius: o.radius ?? 130, intensity: o.intensity ?? 0.85, color: [255, 140, 60], flicker: 0.14, fire: true, glow: 0.7 });
  }

  shade(x, y, w, h, strength = 0.6) {
    return this.s.lighting.addShadeZone(x, y, w, h, strength);
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
    const crystal = s.add.image(def.x, def.y - 70, 'stillpoint').setDepth(35);
    s.add.image(def.x, def.y - 70, 'softglow').setDepth(35).setBlendMode('ADD').setTint(0x9fc6ff).setScale(1.2).setAlpha(0.5);
    s.tweens.add({ targets: crystal, y: def.y - 78, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Motionless dust: the visual signature of time standing still.
    const dust = s.add.particles(def.x, def.y - 70, 'spark', {
      lifespan: 4000, speed: 0, scale: 0.5, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.9 },
      tint: 0xcfe2ff, blendMode: 'ADD', frequency: 260, quantity: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-70, -70, 140, 120) },
    }).setDepth(35);
    this.light({ x: def.x, y: def.y - 70, radius: 190, intensity: 0.6, color: [150, 190, 255], harmless: true, glow: 0.6 });
    const sp = { ...def, crystal, dust };
    s.stillpoints.push(sp);
    return sp;
  }

  sand(def) {
    const s = this.s;
    if (GAME.flag(`sand:${def.id}`)) return null;
    const img = s.add.image(def.x, def.y, 'sand').setDepth(35).setBlendMode('ADD').setScale(1.4);
    const glow = s.add.image(def.x, def.y, 'softglow').setDepth(35).setBlendMode('ADD').setTint(0xe8c372).setScale(0.35).setAlpha(0.6);
    s.tweens.add({ targets: [img, glow], y: def.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const item = { ...def, img, glow, kind: 'sand' };
    s.pickups.push(item);
    return item;
  }

  hourShard(def) {
    const s = this.s;
    if (GAME.data.hourShards[s.worldId]) return null;
    const img = s.add.image(def.x, def.y, 'hourshard').setDepth(35);
    const glow = s.add.image(def.x, def.y, 'softglow').setDepth(35).setBlendMode('ADD').setTint(0xffe6a8).setScale(0.7).setAlpha(0.55);
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
    this.prop('statue', x, groundY, { depth: 7, occlude: [-24, -170, 48, 170], flip: o.flip });
  }

  // The Almoner's figure. Not an occluder: it casts no shadow.
  entityFigure(x, groundY) {
    const s = this.s;
    const pad = GLOW_PAD.entity_rim ?? 18;
    const rim = s.add.image(x, groundY + pad, 'entity_rim').setOrigin(0.5, 1).setDepth(31.6).setBlendMode('ADD').setAlpha(0.35);
    const body = s.add.image(x, groundY, 'entity').setOrigin(0.5, 1).setDepth(7);
    const lampGlow = s.add.image(x + 30, groundY - 95, 'softglow').setDepth(31.6).setBlendMode('ADD').setTint(0xe8c372).setScale(0.6).setAlpha(0.8);
    s.tweens.add({ targets: [body, rim], y: '-=6', duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: lampGlow, alpha: 0.5, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return { body, rim, lampGlow };
  }
}

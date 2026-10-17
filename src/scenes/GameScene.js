// =====================================================================
// GAME SCENE: runs one level (the Prologue or Hollowmere).
//
// Order of work every frame (it matters, because light is computed from
// where things ARE this frame):
//   1. read input
//   2. move the player, survivors, watchers and the Wick-Mother
//   3. update lights (lanterns follow their carriers, flicker, swing)
//   4. measure the light at the player and survivors -> burn damage
//   5. watchers perceive targets (sight uses the same light values)
//   6. stillpoints, pickups, triggers, interactions
//   7. draw the light map, cones, debug overlays; update audio and HUD data
// =====================================================================

import Phaser from 'phaser';
import { TUNING } from '../tuning.js';
import { LightingSystem, SHADE, DIM, LIGHT } from '../systems/lighting.js';
import { Controls } from '../systems/input.js';
import { Player } from '../entities/Player.js';
import { Survivor } from '../entities/Survivor.js';
import { WickMother } from '../entities/WickMother.js';
import { Foresight } from '../systems/foresight.js';
import { LevelBuilder } from '../levels/builder.js';
import { LEVELS } from '../levels/index.js';
import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { bus } from '../systems/bus.js';
import { DEV, saveDev } from '../dev/devFlags.js';
import { hasShaders } from '../systems/fx.js';
import { LINES, DEATH_TEXT, THREAD_TEXT, TOASTS, COMBOS, BRANCH_TEXT, WHISPERS } from '../story.js';
import * as BR from '../systems/branches.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.worldId = data.world ?? GAME.data.world;
    this.spawnId = data.spawn ?? null;
    this.fromDeath = !!data.fromDeath;
    this.died = !!data.died;
  }

  create() {
    if (this.scale.width !== TUNING.view.width || this.scale.height !== TUNING.view.height) {
      this.scale.setGameSize(TUNING.view.width, TUNING.view.height);
    }
    const level = (this.level = LEVELS[this.worldId]);
    this.settings = this.registry.get('settings');

    // registries filled by the level builder
    this.solids = [];
    this.solidRects = [];
    this.watchers = [];
    this.stillpoints = [];
    this.pickups = [];
    this.triggers = [];
    this.interactables = [];
    this.survivorDefs = [];
    this.survivors = [];
    this.fogZones = [];
    this.swingers = [];
    this.flares = [];
    this.noiseRings = [];
    this.decor = {};
    this.drifters = [];

    this.simTime = 0;
    this.dying = false;
    this.modal = false;
    this.ended = false;
    this.lastRest = { id: null, t: -99 };
    this.prompt = null;

    this.physics.world.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setBackgroundColor('#000000');

    this.lighting = new LightingSystem({ worldW: level.width, worldH: level.height });
    this.buildBackground(level);
    this.edgeGfx = this.add.graphics().setDepth(21);

    const builder = new LevelBuilder(this);
    level.build(builder, this);
    this.lighting.attach(this, { depth: 25 });
    this.buildAtmosphere(level);

    // ---- spawn ----
    const spawn = this.findSpawn(this.spawnId);
    this.currentSpawn = spawn;
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.facing = spawn.facing ?? 1;

    // ---- survivors ----
    const following = GAME.flag('survivors') === 'follow';
    this.survivorDefs.forEach((def, i) => {
      const d = { ...def };
      if (following) { d.state = 'follow'; d.x = spawn.x - 50 - i * 40; d.y = spawn.y; }
      const sv = new Survivor(this, d, i);
      this.survivors.push(sv);
    });

    this.wick = level.wickMother ? new WickMother(this, -600, level.wickMother.groundY) : null;

    this.physics.add.collider(this.player.zone, this.solids);
    for (const sv of this.survivors) this.physics.add.collider(sv.zone, this.solids);

    // ---- camera ----
    // The camera follows a target that tracks the floor you stand on (not every
    // jump) and leads a little in the direction you face.
    const cam = this.cameras.main;
    const C = TUNING.camera;
    this.lookAhead = (spawn.facing ?? 1) * C.lookAhead * 0.35;
    this.camFocusY = spawn.y;
    this.camTarget = { x: spawn.x + this.lookAhead, y: spawn.y - C.offsetY };
    cam.startFollow(this.camTarget, false, C.lerpX, C.lerpY);
    // Colour grade (WebGL only; on the canvas fallback the game runs without it).
    this.grade = null;
    if (hasShaders(this)) {
      cam.setPostPipeline('Grade');
      const gp = cam.getPostPipeline('Grade');
      this.grade = Array.isArray(gp) ? gp[0] : gp;
      Object.assign(this.grade.params, level.grade ?? {});
    }
    this.shock = 0;

    this.controls = new Controls(this);
    this.foresight = new Foresight(this);
    this.coneGfx = this.add.graphics().setDepth(30);
    this.debugGfx = this.add.graphics().setDepth(60);
    this.debugText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9fffb0' }).setDepth(61).setScrollFactor(0);
    this.colliderDebug(DEV.colliders);

    // ---- HUD and events ----
    if (!this.scene.isActive('HUD')) this.scene.launch('HUD');
    this.scene.bringToTop('HUD');
    bus.emit('hud:reset');
    const onChoose = (id) => this.branchChoose(id);
    const onReweave = () => this.branchReweave();
    const onClose = () => this.branchClose();
    const onResume = () => this.resumeFromPause();
    const onUnravel = () => this.unravel();
    const onQuit = () => this.quitToTitle();
    bus.on('branch:choose', onChoose);
    bus.on('branch:reweave', onReweave);
    bus.on('branch:close', onClose);
    bus.on('pause:resume', onResume);
    bus.on('pause:unravel', onUnravel);
    bus.on('pause:quit', onQuit);
    this.events.once('shutdown', () => {
      bus.off('branch:choose', onChoose);
      bus.off('branch:reweave', onReweave);
      bus.off('branch:close', onClose);
      bus.off('pause:resume', onResume);
      bus.off('pause:unravel', onUnravel);
      bus.off('pause:quit', onQuit);
      this.player?.destroy();
    });

    AUDIO.setAmbience(level.ambience);
    level.onStart?.(this);

    // Spawning at a Stillpoint means resting there: it becomes the checkpoint
    // and refills Sand. (After a death the flags were already restored to it.)
    const sp = this.stillpoints.find((p) => p.id === spawn.id);
    if (sp) {
      GAME.touchStillpoint(this.worldId, sp.id);
      this.lastRest = { id: sp.id, t: this.simTime };
    }
    if (this.died && level.noThreads) this.say('entity', LINES.p_death.text);

    cam.fadeIn(700, 0, 0, 0);
    this.sampleLight();
  }

  // ------------------------------------------------------------------
  // Building helpers
  // ------------------------------------------------------------------
  // Typical camera scroll at floor level, used to place parallax layers so their
  // bottoms meet the horizon behind the street.
  baseScrollY() {
    const g = this.level.horizonY ?? this.level.height - 300;
    return g - TUNING.camera.offsetY - TUNING.view.height / 2;
  }

  // A horizontal layer that scrolls slower than the world (fx < 1) or faster (fx > 1).
  // bottom: where its bottom edge sits on screen at the typical scroll.
  layer(key, fx, fy, bottom, h, depth, o = {}) {
    const { width } = TUNING.view;
    const S0 = this.baseScrollY();
    const w = Math.ceil(Math.max(0, this.level.width - width) * fx + width + 64);
    const ts = this.add.tileSprite(-32, bottom - h + S0 * fy, w, h, key).setOrigin(0).setScrollFactor(fx, fy).setDepth(depth);
    if (o.tint !== undefined) ts.setTint(o.tint);
    if (o.alpha !== undefined) ts.setAlpha(o.alpha);
    if (o.blend) ts.setBlendMode(o.blend);
    if (o.drift) this.drifters.push({ ts, speed: o.drift });
    return ts;
  }

  buildBackground(level) {
    const { width, height } = TUNING.view;
    const sky = level.sky ?? 'night';
    const fogTint = 0xc79a74;
    if (sky === 'hall') {
      this.add.image(0, 0, 'sky_hall').setOrigin(0).setScrollFactor(0).setDisplaySize(width, height).setDepth(0);
      this.layer('hall_back', 0.45, 0.25, 720, 720, 2);
      // the Hall's back wall, in the world, between the vault and the floor
      this.add.tileSprite(0, level.wallTop ?? 150, level.width, (level.wallBottom ?? 700) - (level.wallTop ?? 150), 'hall_wall').setOrigin(0).setDepth(10);
      this.decor.layers = [];
      return;
    }
    this.decor.sky = this.add.image(0, 0, 'sky_night').setOrigin(0).setScrollFactor(0).setDisplaySize(width, height).setDepth(0);
    this.decor.dawnSky = this.add.image(0, 0, 'sky_dawn').setOrigin(0).setScrollFactor(0).setDisplaySize(width, height).setDepth(0.1).setAlpha(0);
    this.decor.stars = this.layer('stars', 0.02, 0.0, 380, 380, 0.5);
    const S0 = this.baseScrollY();
    this.decor.moonHalo = this.add.image(1010, 150 + S0 * 0.02, 'softglow').setScrollFactor(0.02).setDepth(0.7).setBlendMode('ADD').setTint(0xffd8b0).setScale(5.5).setAlpha(0.22);
    this.decor.moon = this.add.image(1010, 150 + S0 * 0.02, 'moon').setScrollFactor(0.02).setDepth(0.8).setScale(1.05);
    this.decor.sun = this.add.image(1100, 520 + S0 * 0.02, 'flare').setScrollFactor(0.02).setDepth(0.75).setBlendMode('ADD').setTint(0xffe2a0).setScale(4).setAlpha(0);
    this.decor.layers = [
      this.layer('clouds_a', 0.05, 0.02, 330, 300, 1, { drift: 6, alpha: 0.85 }),
      this.layer('hills_far', 0.1, 0.05, 520, 330, 2),
      this.layer('fog_band', 0.12, 0.06, 560, 220, 2.5, { tint: fogTint, alpha: 0.28, drift: 4 }),
      this.layer('forest_far', 0.18, 0.08, 560, 320, 3),
      this.layer('clouds_b', 0.09, 0.03, 260, 240, 3.2, { drift: 11, alpha: 0.5 }),
      this.layer('skyline_far', 0.27, 0.12, 575, 360, 4),
      this.layer('fog_band', 0.3, 0.14, 600, 220, 4.5, { tint: fogTint, alpha: 0.3, drift: 7 }),
      this.layer('skyline_near', 0.38, 0.18, 590, 420, 5),
      this.layer('trees_mid', 0.55, 0.3, 600, 480, 6),
      this.layer('fog_band', 0.6, 0.32, 610, 220, 6.5, { tint: fogTint, alpha: 0.32, drift: 10 }),
    ];
  }

  buildAtmosphere(level) {
    const { width } = TUNING.view;
    this.fogMul = 1;
    if (level.sky === 'hall') {
      // dark columns passing close to the camera give the Hall depth
      for (let x = 700; x < level.width + 600; x += 1500) {
        this.add.image(x, level.height + 20, `pillar_fg`).setOrigin(0.5, 1).setScrollFactor(1.35, 1).setDepth(55).setTint(0x020104);
      }
      this.decor.dust = this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: width }, y: { min: 100, max: 700 }, lifespan: 8000, speedX: { min: -4, max: 4 }, speedY: { min: -6, max: 3 },
        scale: { min: 0.15, max: 0.4 }, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.45 },
        tint: 0xcfd8ff, blendMode: 'ADD', frequency: 140,
      }).setScrollFactor(0).setDepth(26);
      return;
    }
    if (!level.fog) return;
    // fog drifting in front of the action, strongest where the level's fog is thickest
    this.decor.nearFog = [
      this.add.tileSprite(0, 330, width, 300, 'fog_band').setOrigin(0).setScrollFactor(0).setDepth(52).setTint(0xc79a74).setAlpha(0.12),
      this.add.tileSprite(0, 470, width, 260, 'fog_band').setOrigin(0).setScrollFactor(0).setDepth(52).setTint(0xb48a6c).setAlpha(0.1),
    ];
    // foreground grass, closest to the camera
    const G = level.horizonY ?? level.height - 300;
    const w = Math.ceil(level.width * 1.25 + width + 64);
    this.decor.fgGrass = this.add.tileSprite(-32, G + 118 - 130, w, 130, 'fg_grass').setOrigin(0).setScrollFactor(1.25, 1).setDepth(56);
    // ash and motes floating in the night air
    this.decor.motes = this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: width }, y: { min: 0, max: 720 }, lifespan: 9000, speedX: { min: 4, max: 14 }, speedY: { min: -4, max: 6 },
      scale: { min: 0.15, max: 0.45 }, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.4 },
      tint: [0xffd2a8, 0xd8e0ff], blendMode: 'ADD', frequency: 180,
    }).setScrollFactor(0).setDepth(53);
  }

  findSpawn(id) {
    const level = this.level;
    const all = this.allSpawns();
    let sp = id ? all.find((s) => s.id === id) : null;
    if (!sp) sp = all.find((s) => s.id === level.start) ?? all[0];
    return sp;
  }

  allSpawns() {
    const list = this.stillpoints.map((p) => ({ id: p.id, label: `Stillpoint: ${p.name}`, x: p.x + 46, y: p.y, facing: 1 }));
    for (const s of this.level.spawns ?? []) list.push(s);
    return list;
  }

  // ------------------------------------------------------------------
  // Queries other systems use
  // ------------------------------------------------------------------
  solidOverlaps(x, y, w, h) {
    for (const r of this.solidRects) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
    }
    return false;
  }

  fogAt(x) {
    let d = 0;
    for (const z of this.fogZones) {
      if (x < z.x1 - 200 || x > z.x2 + 200) continue;
      const edge = x < z.x1 ? 1 - (z.x1 - x) / 200 : x > z.x2 ? 1 - (x - z.x2) / 200 : 1;
      d = Math.max(d, z.density * edge);
    }
    return d * (this.fogMul ?? 1);
  }

  spatialFor(x) {
    const cam = this.cameras.main;
    return AUDIO.spatial(x, cam.worldView.centerX);
  }

  playerTarget() {
    const p = this.player;
    return {
      id: 'player', kind: 'player', x: p.x, y: p.y, feetY: p.feetY, light: p.lightInfo, merged: p.merged,
      moving: p.moving, hidden: false, alive: !p.dead && !DEV.invisible && !p.noclip,
      inCover: p.inCover, points: p.lightSamplePoints(),
    };
  }

  targets() {
    const list = [this.playerTarget()];
    for (const sv of this.survivors) if (sv.alive && !sv.hidden) list.push(sv.target());
    return list;
  }

  // Light at the player = the brightest of a couple of body points.
  sampleLight() {
    const p = this.player;
    let best = null;
    for (const [x, y] of p.lightSamplePoints()) {
      const info = this.lighting.getLightAt(x, y);
      if (!best || info.value > best.value) best = info;
    }
    return best;
  }

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(delta / 1000, 1 / 20) * (this.registry.get('timeScale') ?? 1);
    const c = this.controls;
    c.update();
    const cam = this.cameras.main;

    if (c.pressed('mute')) { this.settings.muted = !this.settings.muted; AUDIO.setMuted(this.settings.muted); }
    if (c.pressed('hud')) this.settings.fullHud = !this.settings.fullHud;

    if (this.modal) {
      this.lighting.render(cam);
      this.updateFx(dt);
      AUDIO.update(dt, { tension: 0, burn: 0, foresight: false });
      return;
    }

    if ((c.pressed('pause') || c.pressed('ledger')) && !this.dying && !this.ended) {
      this.openPause(c.pressed('ledger') ? 'ledger' : 'menu');
      return;
    }

    // ---- Foresight: time stops while you look ahead ----
    if (this.foresight.active) {
      if (!c.held('foresight') || this.dying) this.endForesight();
      else {
        const tp = this.foresight.update(dt);
        bus.emit('foresight:time', tp, this.foresight.horizon);
        this.drawStillpointHints();
        this.lighting.render(cam);
        this.updateFx(dt);
        AUDIO.update(dt, { foresight: true, tension: 0, burn: 0, hum: 0 });
        return;
      }
    } else if (c.pressed('foresight') && !this.dying && !this.ended) {
      this.beginForesight();
      if (this.foresight.active) return;
    }

    this.simTime += dt;
    const p = this.player;
    p.noclip = DEV.noclip;

    if (c.pressed('command') && !this.dying) this.commandSurvivors();
    this.updateInteract(c);

    p.update(dt, c);
    for (const sv of this.survivors) sv.update(dt, p);
    for (const w of this.watchers) w.step(dt);
    if (this.wick) this.wick.update(dt, p);
    this.level.onUpdate?.(this, dt);
    this.updateSwingers();

    this.lighting.update(this.simTime);

    // ---- light damage ----
    const info = this.sampleLight();
    const burn = p.updateLight(dt, info, GAME.data.fragments, DEV.god || this.dying || this.ended || p.noclip);
    if (p.substance <= 0 && !this.dying) this.killPlayer(info.fire ? 'fire' : 'burned');
    for (const sv of this.survivors) {
      sv.light = this.lighting.getLightAt(sv.x, sv.sampleY());
      sv.inCover = this.lighting.coverAt(sv.x, sv.sampleY());
    }
    p.inCover = this.lighting.coverAt(p.x, p.y);

    // ---- perception ----
    const targets = this.targets();
    if (!this.dying && !this.ended) for (const w of this.watchers) w.perceive(dt, targets);
    for (const w of this.watchers) w.syncVisuals(dt);

    this.checkStillpoints();
    this.checkPickups();
    this.checkTriggers();
    this.updateCamera(dt);
    this.updateDecor(dt);
    this.drawCones();
    this.lighting.render(cam);
    this.updateFx(dt);
    this.drawDebug();

    // ---- audio ----
    let tension = 0;
    for (const w of this.watchers) {
      if (Math.abs(w.x - p.x) > 1000) continue;
      const m = w.mode;
      tension = Math.max(tension, m === 'alert' ? 3 : m === 'search' ? 2 : m === 'suspicious' ? 1 : 0);
    }
    if (this.wick?.active) tension = Math.max(tension, 2);
    let hum = 0;
    for (const sp of this.stillpoints) hum = Math.max(hum, 1 - Math.hypot(sp.x - p.x, sp.y - p.feetY) / 520);
    const low = 1 - p.substance / TUNING.player.maxSubstance;
    AUDIO.update(dt, {
      tension, burn, low: low > 0.35 ? low : 0, foresight: false, hum: Math.max(0, hum),
      clock: !!this.clockOn, clockRate: this.clockRate ?? 0.5,
    });
  }

  // ------------------------------------------------------------------
  // Camera and decoration
  // ------------------------------------------------------------------
  updateCamera(dt) {
    const p = this.player;
    const C = TUNING.camera;
    const want = p.facing * C.lookAhead * Math.min(1, Math.abs(p.body.velocity.x) / 120 + 0.35);
    this.lookAhead += (want - this.lookAhead) * Math.min(1, dt * C.lookAheadRate);
    if (!C.groundFollow || p.onFloor || p.merged || p.noclip) this.camFocusY = p.feetY;
    else if (p.feetY > this.camFocusY + 30) this.camFocusY = p.feetY - 30;      // falling past the old floor
    else if (p.feetY < this.camFocusY - 200) this.camFocusY = p.feetY + 200;    // climbing high
    this.camTarget.x = p.x + this.lookAhead;
    this.camTarget.y = this.camFocusY - C.offsetY;
  }

  updateDecor(dt) {
    for (const d of this.drifters) d.ts.tilePositionX += d.speed * dt;
    const cam = this.cameras.main;
    if (this.decor.nearFog) {
      const fogHere = this.fogAt(cam.worldView.centerX);
      const [f1, f2] = this.decor.nearFog;
      f1.tilePositionX = cam.scrollX * 1.1 + this.simTime * 14;
      f2.tilePositionX = cam.scrollX * 1.25 + this.simTime * 24;
      f1.setAlpha(0.04 + fogHere * 0.14);
      f2.setAlpha(0.03 + fogHere * 0.12);
    }
  }

  // Per-frame shader values: Foresight greys the world, a burn tick shudders it.
  updateFx(dt) {
    this.shock = Math.max(0, this.shock - dt * 3);
    if (!this.grade) return;
    const g = this.grade.params;
    const targetDesat = this.foresight.active ? TUNING.foresight.desaturate : 0;
    g.desat += (targetDesat - g.desat) * Math.min(1, dt * 10);
    g.shock = this.shock;
  }

  updateSwingers() {
    for (const s of this.swingers) {
      const L = s.L;
      s.chain.clear();
      s.chain.lineStyle(2, 0x2a2420, 1);
      s.chain.lineBetween(s.px, s.py, L.cx, L.cy - 10);
      s.lamp.setPosition(L.cx, L.cy);
      s.glow.setPosition(L.cx, L.cy);
    }
  }

  // Vision cones are drawn near you so you can read the rules. The inner band
  // is the range at which they see you even in shade.
  drawCones() {
    const g = this.coneGfx;
    g.clear();
    const p = this.player;
    const S = TUNING.stealth;
    for (const w of this.watchers) {
      if (w.mode === 'down' || w.mode === 'dormant') continue;
      const near = Math.abs(w.x - p.x) < S.coneShowDistance && Math.abs(w.groundY - p.feetY) < 280;
      if (!near && !DEV.aiDebug) continue;
      const up = ((w.mode === 'alert' || w.mode === 'search' ? S.alertCone : S.cone) * Math.PI) / 180;
      const down = up + 0.4;
      // the same shape the watcher sees with: further down than up
      const a0 = w.s.facing > 0 ? -up : Math.PI - down;
      const a1 = w.s.facing > 0 ? down : Math.PI + up;
      const center = (a0 + a1) / 2, half = (a1 - a0) / 2;
      const fog = 1 - S.fogVision * this.fogAt(w.x);
      const col = w.mode === 'alert' ? 0xff4a3a : w.mode === 'suspicious' || w.mode === 'search' ? 0xffb347 : 0xfff0dc;
      const ex = w.eyeX(), ey = w.eyeY();
      const outer = this.lighting.rayFan(ex, ey, center, half, S.range.light * fog, 24);
      const inner = this.lighting.rayFan(ex, ey, center, half, S.range.shade * fog, 18);
      const fade = near ? 1 - Math.max(0, Math.abs(w.x - p.x) - S.coneShowDistance * 0.6) / (S.coneShowDistance * 0.4) : 0.6;
      g.fillStyle(col, 0.045 * fade);
      this.fillPoly(g, outer);
      g.fillStyle(col, 0.08 * fade);
      this.fillPoly(g, inner);
      g.lineStyle(1, col, 0.2 * fade);
      g.lineBetween(outer[0], outer[1], outer[2], outer[3]);
      g.lineBetween(outer[0], outer[1], outer[outer.length - 2], outer[outer.length - 1]);
      // the near-sense ring at his feet
      const N = S.near;
      g.fillStyle(col, 0.06 * fade);
      g.fillEllipse(w.x + (w.s.facing * (N.front - N.back)) / 2, w.groundY - 2, N.front + N.back, 14);
    }
  }

  fillPoly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fillPath();
  }

  drawStillpointHints() {
    // During Foresight, Stillpoints reveal themselves with a beam of cold light.
    const g = this.foresight.gfx;
    for (const sp of this.stillpoints) {
      if (Math.abs(sp.x - this.player.x) > 1600) continue;
      g.fillStyle(0x9fc6ff, 0.12);
      g.fillRect(sp.x - 6, sp.y - 900, 12, 900);
      g.fillStyle(0x9fc6ff, 0.5);
      g.fillCircle(sp.x, sp.y - 70, 10);
    }
    for (const it of this.pickups) {
      if (it.kind !== 'shard' || Math.abs(it.x - this.player.x) > 900) continue;
      g.lineStyle(2, 0xffe6a8, 0.6);
      g.strokeCircle(it.x, it.y, 26 + Math.sin(this.time.now / 200) * 4);
    }
  }

  // ------------------------------------------------------------------
  // Foresight
  // ------------------------------------------------------------------
  beginForesight() {
    const d = GAME.data;
    if (d.sand < 1 && !DEV.infiniteSand) {
      this.toast('No Sand left. Rest at a Stillpoint.');
      AUDIO.play('ui');
      return;
    }
    if (!DEV.infiniteSand) d.sand -= 1;
    d.stats.foresights += 1;
    const seconds = d.hourShards[this.worldId] ? TUNING.foresight.glimpseSeconds : TUNING.foresight.sipSeconds;
    this.physics.world.pause();
    for (const w of this.watchers) w.sprite.anims.pause();
    for (const sv of this.survivors) sv.sprite.anims.pause();
    this.player.sprite.anims.pause();
    this.foresight.begin(this.watchers, seconds, this.player.x);
    AUDIO.play('foresightIn');
    bus.emit('foresight:start', seconds);
    this.level.onForesight?.(this);
  }

  endForesight() {
    this.foresight.end();
    this.physics.world.resume();
    for (const w of this.watchers) w.sprite.anims.resume();
    for (const sv of this.survivors) sv.sprite.anims.resume();
    this.player.sprite.anims.resume();
    AUDIO.play('foresightOut');
    bus.emit('foresight:end');
  }

  // ------------------------------------------------------------------
  // Stealth events
  // ------------------------------------------------------------------
  emitNoise(x, y, radius, kind) {
    if (DEV.invisible || this.player.noclip || radius <= 0) return;
    for (const w of this.watchers) w.hear(x, y, radius);
    if (DEV.aiDebug) this.noiseRings.push({ x, y, r: radius, t: 0.5 });
  }

  watcherEvent(w, kind, target) {
    const sp = this.spatialFor(w.x);
    if (kind === 'suspicious') AUDIO.play('suspicious', sp);
    if (kind === 'alert') {
      AUDIO.play('alert', sp);
      GAME.data.stats.seen += 1;
      this.setFlag('seenSinceSquare', true);
      if (target && target.kind === 'survivor') {
        const sv = this.survivors.find((s) => s.id === target.id);
        sv?.bark('noticed', true);
      }
    }
    if (kind === 'lost') AUDIO.play('lost', sp);
    // A small reward for slipping away: the voice inside you notices.
    if (kind === 'gaveUp' && Math.abs(w.x - this.player.x) < 1000 && this.simTime - (this.lastGaveUp ?? -99) > 20) {
      this.lastGaveUp = this.simTime;
      const pick = WHISPERS.escaped[Math.floor(Math.random() * WHISPERS.escaped.length)];
      this.say('whisper', pick);
    }
  }

  alertNearby(source) {
    for (const w of this.watchers) {
      if (w === source || w.mode === 'down' || w.mode === 'alert') continue;
      if (Math.abs(w.x - source.x) > TUNING.stealth.callRadius || Math.abs(w.groundY - source.groundY) > 160) continue;
      w.s.lastX = source.s.lastX;
      w.targetId = source.targetId;
      w.becomeAlert(null, true);
    }
  }

  onCaught(w, target) {
    if (this.dying || this.ended) return;
    if (target.kind === 'player') {
      if (DEV.god) return;
      this.killPlayer('caught');
    } else {
      const sv = this.survivors.find((s) => s.id === target.id);
      if (sv) this.survivorTaken(sv);
    }
  }

  tryStrike(p) {
    let target = null, kind = null;
    for (const w of this.watchers) {
      if (!w.canBeTakenDown()) continue;
      const dx = w.x - p.x;
      const fromAbove = p.body.velocity.y > 60 && Math.abs(dx) < 46 && p.feetY < w.headY() + 30 && p.feetY > w.headY() - 120;
      const behind = (p.x - w.x) * w.s.facing < 0;
      const inReach = Math.abs(dx) <= TUNING.player.strikeRange + 8 && Math.abs(p.feetY - w.groundY) < 46 && Math.sign(dx) === p.facing;
      if (fromAbove) { target = w; kind = 'drop'; break; }
      if (behind && inReach) { target = w; kind = 'back'; break; }
    }
    if (!target) {
      this.emitNoise(p.x, p.y, TUNING.noise.whiff, 'whiff');
      AUDIO.play('whiff');
      return;
    }
    const ambush = p.sinceMerge < TUNING.player.ambushWindow;
    target.takeDown();
    this.setFlag(`down:${target.id}`, true);
    GAME.data.stats.takedowns += 1;
    AUDIO.play('takedown', this.spatialFor(target.x));
    if (this.settings.shake) this.cameras.main.shake(140, 0.004);
    this.add.particles(target.x, target.groundY - 40, 'smoke', {
      lifespan: 900, speed: { min: 20, max: 90 }, scale: { start: 0.4, end: 1.2 }, alpha: { start: 0.6, end: 0 },
      tint: 0x0d0918, quantity: 18, emitting: false,
    }).setDepth(43).explode(18);
    if (!ambush) this.emitNoise(target.x, target.groundY - 40, TUNING.noise.takedown, 'takedown');
    const combo = kind === 'drop' ? 'Drop Kill' : ambush ? 'Ambush' : null;
    if (combo && GAME.discoverCombo(combo)) this.toast(`${TOASTS.combo(combo)}. ${COMBOS[combo]}`);
    this.level.onTakedown?.(this, target);
  }

  // ------------------------------------------------------------------
  // Death and Threads
  // ------------------------------------------------------------------
  killPlayer(cause) {
    if (this.dying || this.ended) return;
    if (DEV.god && cause !== 'unravel') return;
    this.dying = true;
    if (this.foresight.active) this.endForesight();
    this.player.die(cause);
    AUDIO.play('death');
    if (this.settings.shake) this.cameras.main.shake(300, 0.006);
    bus.emit('death', DEATH_TEXT[cause] ?? DEATH_TEXT.caught);
    this.time.delayedCall(1500, () => this.afterDeath());
  }

  survivorTaken(sv) {
    if (this.dying || this.ended) return;
    if (DEV.god) return;
    this.dying = true;
    sv.alive = false;
    sv.animate();
    this.player.frozen = true;
    AUDIO.play('taken', this.spatialFor(sv.x));
    bus.emit('death', DEATH_TEXT.survivor(sv.name));
    this.time.delayedCall(1700, () => this.afterDeath());
  }

  afterDeath() {
    if (this.level.noThreads || DEV.infiniteThreads) {
      GAME.restoreCheckpointFlags();
      GAME.save();
      this.restartAtCheckpoint(900);
      return;
    }
    const ok = GAME.loseThread();
    AUDIO.play('thread');
    bus.emit('thread', ok ? THREAD_TEXT.snapped(GAME.data.threads) : THREAD_TEXT.fractured(this.level.name), GAME.data.threads);
    if (ok) this.restartAtCheckpoint(1700);
    else this.time.delayedCall(2200, () => this.fracture());
  }

  restartAtCheckpoint(delay) {
    this.time.delayedCall(delay, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const cp = GAME.data.checkpoint;
        this.scene.restart({ world: this.worldId, spawn: cp && cp.world === this.worldId ? cp.id : null, fromDeath: true, died: true });
      });
    });
  }

  fracture() {
    const d = GAME.data;
    d.fractured[this.worldId] = (d.fractured[this.worldId] ?? 0) + 1;
    GAME.save();
    this.scene.stop('HUD');
    this.scene.start('End', { type: 'fractured', world: this.worldId, name: this.level.name });
  }

  unravel() {
    // Pause menu: go back to the last Stillpoint. In worlds with Threads it costs one.
    this.scene.resume();
    this.modal = false;
    this.killPlayer('unravel');
  }

  // ------------------------------------------------------------------
  // Stillpoints, pickups, triggers, interactions
  // ------------------------------------------------------------------
  checkStillpoints() {
    const p = this.player;
    if (p.dead) return;
    for (const sp of this.stillpoints) {
      if (Math.abs(p.x - sp.x) > 46 || Math.abs(p.feetY - sp.y) > 90) continue;
      const fresh = this.lastRest.id !== sp.id;
      if (!fresh && this.simTime - this.lastRest.t < 4) continue;
      this.lastRest = { id: sp.id, t: this.simTime };
      if (!fresh && GAME.data.sand >= GAME.data.sandMax && p.substance >= TUNING.player.maxSubstance - 1) continue;
      GAME.touchStillpoint(this.worldId, sp.id);
      p.substance = TUNING.player.maxSubstance;
      AUDIO.play('stillpoint');
      this.toast(sp.hidden ? TOASTS.hiddenStill : TOASTS.stillpoint);
      const ring = this.add.circle(sp.x, sp.y - 70, 20, 0x9fc6ff, 0.5).setDepth(36).setBlendMode('ADD');
      this.tweens.add({ targets: ring, scale: 8, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
      this.level.onStillpoint?.(this, sp);
    }
  }

  checkPickups() {
    const p = this.player;
    if (p.dead) return;
    for (const it of this.pickups) {
      if (it.taken) continue;
      if (Math.abs(p.x - it.x) > 34 || Math.abs(p.y - it.y) > 50) continue;
      it.taken = true;
      this.tweens.add({ targets: [it.img, it.glow], alpha: 0, scale: 2, duration: 400, onComplete: () => { it.img.destroy(); it.glow.destroy(); } });
      if (it.kind === 'sand') {
        if (GAME.data.sandMax < TUNING.sand.max) GAME.data.sandMax += 1;
        GAME.data.sand = Math.min(GAME.data.sandMax, GAME.data.sand + 1);
        this.setFlag(`sand:${it.id}`, true);
        AUDIO.play('sand');
        this.toast(TOASTS.sand);
      } else if (it.kind === 'shard') {
        GAME.data.hourShards[this.worldId] = true;
        GAME.save();
        AUDIO.play('shard');
        this.toast(TOASTS.shard, 5000);
      }
      this.level.onPickup?.(this, it);
    }
  }

  checkTriggers() {
    const p = this.player;
    if (p.dead) return;
    for (const t of this.triggers) {
      const key = `trig:${t.id}`;
      if (t.once && GAME.flag(key)) continue;
      if (p.x < t.x || p.x > t.x + t.w || p.y < t.y || p.y > t.y + t.h) continue;
      if (t.requires && !GAME.flag(t.requires)) continue;
      if (t.unless && GAME.flag(t.unless)) continue;
      if (t.once) this.setFlag(key, true);
      if (t.lines) this.playLines(t.lines);
      if (t.event) this.level.events?.[t.event]?.(this, t);
    }
  }

  updateInteract(c) {
    const p = this.player;
    let best = null, bestD = TUNING.player.interactRange;
    if (!p.dead && !this.dying) {
      for (const it of this.interactables) {
        if (it.enabled && !it.enabled(this)) continue;
        const d = Math.hypot(it.x - p.x, (it.y - p.feetY) * 0.6);
        if (d < (it.range ?? bestD) && d < bestD + 40) { best = it; bestD = d; }
      }
    }
    this.prompt = best ? { text: `E  ${best.label}`, x: best.x, y: best.y - (best.promptH ?? 90) } : null;
    if (best && c.pressed('interact')) {
      AUDIO.play('interact');
      best.use(this, best);
    }
  }

  commandSurvivors() {
    // Q toggles between "wait here" and "follow me". Waiting is not saved:
    // after a reload, found survivors follow you again.
    const active = this.survivors.filter((s) => s.alive && (s.state === 'follow' || s.state === 'wait'));
    if (!active.length) return;
    const anyFollowing = active.some((s) => s.state === 'follow');
    for (const s of active) {
      if (anyFollowing) s.setState('wait');
      else if (Math.abs(s.x - this.player.x) < 700) s.setState('follow');
    }
    active[0].bark(anyFollowing ? 'wait' : 'follow', true);
  }

  // ------------------------------------------------------------------
  // Branches
  // ------------------------------------------------------------------
  openBranch(def) {
    const d = GAME.data;
    const text = BRANCH_TEXT[def.id];
    const mods = def.modifiers.map((m) => ({ id: m.id, label: text.modifiers[m.id], shift: m.shift, active: !!m.check(this) }));
    const shifts = mods.filter((m) => m.active).map((m) => m.shift);
    shifts.push(BR.badLuckShift(d.badLuck));
    const odds = BR.computeOdds(def.base, shifts);
    const hasShard = !!d.hourShards[this.worldId];
    const vision = hasShard ? BR.sampleVision(d.seed, def.id, odds, d.stats.foresights) : null;
    this.branch = { def, odds, attempt: 0, choice: null, outcome: null };
    this.modal = true;
    this.physics.world.pause();
    bus.emit('branch:open', {
      id: def.id, text, odds, mods, hasShard, vision,
      options: def.options,
    });
  }

  branchChoose(choiceId) {
    const b = this.branch;
    if (!b) return;
    const d = GAME.data;
    const opt = b.def.options.find((o) => o.id === choiceId);
    b.choice = choiceId;
    if (opt.rolled) {
      const forced = DEV.forceBell !== 'random' ? DEV.forceBell : null;
      b.outcome = forced ?? BR.rollHeavy(d.seed, b.def.id, b.odds, b.attempt);
      d.badLuck = BR.updateBadLuck(d.badLuck, b.outcome);
    } else {
      b.outcome = 'none';
    }
    d.branches[b.def.id] = { choice: choiceId, outcome: b.outcome, odds: b.odds, attempt: b.attempt };
    GAME.save();
    const canReweave = opt.rolled && b.outcome !== 'favorable' && (d.reweaves[this.worldId] ?? 0) > 0 && d.threads > 1;
    bus.emit('branch:result', { choice: choiceId, outcome: b.outcome, canReweave });
  }

  branchReweave() {
    const b = this.branch;
    const d = GAME.data;
    if (!b || (d.reweaves[this.worldId] ?? 0) <= 0) return;
    d.reweaves[this.worldId] -= 1;
    d.threads -= 1;
    b.attempt += 1;
    GAME.addLedger('reweave');
    b.outcome = DEV.forceBell !== 'random' ? DEV.forceBell : BR.rollHeavy(d.seed, b.def.id, b.odds, b.attempt);
    d.badLuck = BR.updateBadLuck(d.badLuck, b.outcome);
    d.branches[b.def.id] = { choice: b.choice, outcome: b.outcome, odds: b.odds, attempt: b.attempt };
    GAME.save();
    AUDIO.play('thread');
    bus.emit('branch:result', { choice: b.choice, outcome: b.outcome, canReweave: false, reweaved: true });
  }

  branchClose() {
    const b = this.branch;
    this.modal = false;
    this.physics.world.resume();
    if (b && b.choice) b.def.apply(this, b.choice, b.outcome);
    this.branch = null;
  }

  // ------------------------------------------------------------------
  // Pause
  // ------------------------------------------------------------------
  openPause(tab) {
    if (this.foresight.active) this.endForesight();
    this.scene.pause();
    bus.emit('pause:open', tab);
  }

  resumeFromPause() {
    this.scene.resume();
  }

  quitToTitle() {
    this.scene.stop('HUD');
    this.scene.start('Title');
  }

  // ------------------------------------------------------------------
  // Dialogue and HUD helpers
  // ------------------------------------------------------------------
  say(speaker, text, follow = null) {
    if (speaker === 'entity') AUDIO.play('voiceEntity');
    else if (speaker === 'whisper') AUDIO.play('voiceWhisper');
    else AUDIO.play('voiceNpc', follow ? this.spatialFor(follow.x) : {});
    bus.emit('line', { speaker, text, follow: follow ?? (speaker === 'whisper' ? this.player : null) });
  }

  playLines(ids, { force = false } = {}) {
    for (const id of ids) {
      const line = LINES[id];
      if (!line) continue;
      if (!force && GAME.lineSeen(id) && !line.repeat) continue;
      GAME.markLineSeen(id);
      const follow = line.speaker === 'maren' ? this.survivors.find((s) => s.id === 'maren')
        : line.speaker === 'edrin' ? this.survivors.find((s) => s.id === 'edrin')
          : line.speaker === 'whisper' ? this.player : null;
      bus.emit('line', { speaker: line.speaker, text: line.text, follow, queue: true, id });
    }
  }

  toast(text, ms = 3200) {
    bus.emit('toast', text, ms);
  }

  setFlag(name, value = true) {
    GAME.setFlag(name, value);
  }

  // A damage tick in the light: red pulse, a shudder, a sizzle.
  onBurnTick(damage, fire) {
    this.shock = 1;
    if (this.settings.shake) this.cameras.main.shake(110, 0.0035);
    AUDIO.play('burnTick', { vol: fire ? 1 : 0.85 });
    bus.emit('burnTick', damage, this.player.substance / TUNING.player.maxSubstance);
  }

  // Effects the player calls
  dashFx(p) {
    this.add.particles(p.x, p.y, 'smoke', {
      lifespan: 400, speedX: { min: -p.facing * 120, max: -p.facing * 40 }, speedY: { min: -20, max: 20 },
      scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.6, end: 0 }, tint: 0x241a3a, quantity: 10, emitting: false,
    }).setDepth(38).explode(10);
  }

  landFx(p, hard) {
    this.add.particles(p.x, p.feetY, 'smoke', {
      lifespan: 500, speedX: { min: -90, max: 90 }, speedY: { min: -30, max: -5 }, scale: { start: 0.3, end: 0.7 },
      alpha: { start: hard ? 0.4 : 0.25, end: 0 }, tint: 0x6a6070, quantity: hard ? 10 : 5, emitting: false,
    }).setDepth(38).explode(hard ? 10 : 5);
  }

  // ------------------------------------------------------------------
  // Win
  // ------------------------------------------------------------------
  completeWorld() {
    if (this.ended) return;
    this.ended = true;
    this.player.frozen = true;
    AUDIO.play('win');
  }

  // ------------------------------------------------------------------
  // Dev tools
  // ------------------------------------------------------------------
  colliderDebug(on) {
    const world = this.physics.world;
    if (on && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = on;
    if (world.debugGraphic) { world.debugGraphic.setVisible(on); world.debugGraphic.setDepth(62); if (!on) world.debugGraphic.clear(); }
  }

  drawDebug() {
    const g = this.debugGfx;
    g.clear();
    const p = this.player;
    if (DEV.lightDebug) {
      const v = this.cameras.main.worldView;
      const step = 32;
      for (let x = Math.floor(v.x / step) * step; x < v.right; x += step) {
        for (let y = Math.floor(v.y / step) * step; y < v.bottom; y += step) {
          const info = this.lighting.getLightAt(x, y);
          const col = info.state === LIGHT ? (info.fire ? 0xff3a1a : 0xffb347) : info.state === DIM ? 0x8aa0ff : 0x3a2a6a;
          g.fillStyle(col, 0.75);
          g.fillRect(x - 3, y - 3, 6, 6);
        }
      }
    }
    if (DEV.aiDebug) {
      for (const r of this.noiseRings) {
        r.t -= 1 / 60;
        g.lineStyle(2, 0x7fffd4, Math.max(0, r.t * 2));
        g.strokeCircle(r.x, r.y, r.r);
      }
      this.noiseRings = this.noiseRings.filter((r) => r.t > 0);
    }
    if (DEV.lightDebug || DEV.aiDebug) {
      const info = p.lightInfo;
      this.debugText.setText(
        `light ${info.value.toFixed(2)} ${info.state}${info.fire ? ' FIRE' : ''}  substance ${p.substance.toFixed(0)}  x ${p.x.toFixed(0)} y ${p.feetY.toFixed(0)}\n` +
        this.watchers.filter((w) => Math.abs(w.x - p.x) < 900).map((w) => `${w.id}: ${w.mode} meter ${Math.max(0, ...w.meters.values()).toFixed(2)}`).join('\n'),
      ).setPosition(12, 120).setVisible(true);
    } else {
      this.debugText.setVisible(false);
    }
  }

  // Used by the dev panel and the automated tests.
  devTeleport(x, feetY) {
    this.player.teleport(x, feetY);
  }

  devJump(worldId, spawnId) {
    const level = LEVELS[worldId];
    const spawn = (level.spawns ?? []).find((s) => s.id === spawnId);
    if (worldId !== GAME.data.world) GAME.enterWorld(worldId);
    GAME.data.world = worldId;
    GAME.data.flags = { ...(spawn?.flags ?? {}) };
    if (spawn?.setup) spawn.setup(GAME);
    GAME.data.checkpoint = { world: worldId, id: spawnId, flags: JSON.parse(JSON.stringify(GAME.data.flags)) };
    GAME.data.sandMax = Math.max(GAME.data.sandMax, TUNING.sand.max); // dev convenience: always arrive able to use Foresight
    GAME.data.threads = TUNING.threads.perWorld;                       // and with a full set of Threads
    GAME.data.sand = GAME.data.sandMax;
    GAME.save();
    DEV.lastJump = { world: worldId, spawn: spawnId };
    saveDev();
    this.scene.restart({ world: worldId, spawn: spawnId, fromDeath: true });
  }
}

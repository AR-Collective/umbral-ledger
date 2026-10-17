// =====================================================================
// LIGHTING: the physics of this game.
//
// The one rule from the design doc: "If it looks dark, it is dark."
// So there is exactly ONE description of the light in a level (the lights,
// the occluders that block them, and shade zones), and two readers of it:
//
//   render()        draws what the player SEES
//   getLightAt(x,y) tells the damage system and the enemy AI what IS
//
// Both use the same light positions, the same intensities (flicker included),
// the same falloff curve, the same occluders and the same blending maths,
// so they cannot disagree. tests/lighting.test.js checks that.
//
// Blending maths (shared by both readers):
//   each light contributes li = intensity * falloff(distance / radius)
//   lights combine as lit = 1 - (1 - l1)(1 - l2)...
//   shade zones then darken: lit = lit * (1 - s1)(1 - s2)...
//   the final value = ambient + (1 - ambient) * lit
// =====================================================================

import { TUNING } from '../tuning.js';

export const SHADE = 'shade';
export const DIM = 'dim';
export const LIGHT = 'light';

// ------------------------------------------------------------------
// Pure geometry helpers (no Phaser, so they can be unit tested)
// ------------------------------------------------------------------

// Distance t along a ray (origin + t * dir) to a segment AB, or Infinity.
export function raySegment(ox, oy, dx, dy, ax, ay, bx, by) {
  const sx = bx - ax, sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (denom > -1e-12 && denom < 1e-12) return Infinity;
  const qx = ax - ox, qy = ay - oy;
  const t = (qx * sy - qy * sx) / denom;
  const u = (qx * dy - qy * dx) / denom;
  if (t >= 0 && u >= 0 && u <= 1) return t;
  return Infinity;
}

// How light fades from the center (t = 0) to the edge of its radius (t = 1).
// 1 - t^2 keeps a bright pool with a fairly crisp edge, so "the edge of the
// light" is something you can see and plan around.
export function falloff(t) {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  return 1 - t * t;
}

// Window shafts stay strong along their length and only fade at the very end.
export function beamFalloff(t) {
  if (t <= 0.75) return 1;
  if (t >= 1) return 0;
  return 1 - (t - 0.75) / 0.25;
}

export function falloffOf(kind, t) {
  return kind === 'beam' ? beamFalloff(t) : falloff(t);
}

export function rectPoly(x, y, w, h) {
  return [x, y, x + w, y, x + w, y + h, x, y + h];
}

export function polySegments(poly) {
  const segs = [];
  const n = poly.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    segs.push({ ax: poly[i * 2], ay: poly[i * 2 + 1], bx: poly[j * 2], by: poly[j * 2 + 1] });
  }
  return segs;
}

export function pointInPolygon(x, y, poly) {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2], yi = poly[i * 2 + 1];
    const xj = poly[j * 2], yj = poly[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Andrew's monotone chain. Input [[x,y],...]. Output flat [x,y,x,y,...].
export function convexHull(points) {
  const pts = points.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (pts.length < 3) return pts.flat();
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper).flat();
}

// Classic 2D visibility polygon: cast rays at every segment endpoint (and just
// beside it) and keep the nearest hit. bounds is a box around the origin so
// every ray hits something.
export function visibilityPolygon(ox, oy, segments, bounds) {
  const all = segments.concat(polySegments(rectPoly(bounds.x, bounds.y, bounds.w, bounds.h)));
  const angles = [];
  const seen = new Set();
  for (const s of all) {
    for (let k = 0; k < 2; k++) {
      const px = k === 0 ? s.ax : s.bx;
      const py = k === 0 ? s.ay : s.by;
      const key = px * 73856093 + py * 19349663;
      if (seen.has(key)) continue;
      seen.add(key);
      const a = Math.atan2(py - oy, px - ox);
      angles.push(a - 0.0001, a, a + 0.0001);
    }
  }
  angles.sort((a, b) => a - b);
  const out = [];
  for (const a of angles) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = Infinity;
    for (const s of all) {
      const t = raySegment(ox, oy, dx, dy, s.ax, s.ay, s.bx, s.by);
      if (t < best) best = t;
    }
    if (best < Infinity) out.push(ox + dx * best, oy + dy * best);
  }
  return out;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// ------------------------------------------------------------------
// Spatial index: buckets segments by x so long levels stay fast.
// ------------------------------------------------------------------
class SegmentIndex {
  constructor(cell = 256) {
    this.cell = cell;
    this.cols = new Map();
    this.stamp = 0;
  }
  add(seg) {
    const c0 = Math.floor(Math.min(seg.ax, seg.bx) / this.cell);
    const c1 = Math.floor(Math.max(seg.ax, seg.bx) / this.cell);
    for (let c = c0; c <= c1; c++) {
      if (!this.cols.has(c)) this.cols.set(c, []);
      this.cols.get(c).push(seg);
    }
  }
  // Calls fn(seg) once for every segment whose box overlaps the query box.
  query(minx, miny, maxx, maxy, fn) {
    this.stamp++;
    const c0 = Math.floor(minx / this.cell);
    const c1 = Math.floor(maxx / this.cell);
    for (let c = c0; c <= c1; c++) {
      const list = this.cols.get(c);
      if (!list) continue;
      for (const s of list) {
        if (s._stamp === this.stamp) continue;
        s._stamp = this.stamp;
        if (s.maxx < minx || s.minx > maxx || s.maxy < miny || s.miny > maxy) continue;
        fn(s);
      }
    }
  }
}

function boxSeg(seg, occ) {
  seg.occ = occ;
  seg.minx = Math.min(seg.ax, seg.bx); seg.maxx = Math.max(seg.ax, seg.bx);
  seg.miny = Math.min(seg.ay, seg.by); seg.maxy = Math.max(seg.ay, seg.by);
  return seg;
}

// ------------------------------------------------------------------
// The lighting system used by a level
// ------------------------------------------------------------------
let NEXT_ID = 1;

export class LightingSystem {
  constructor({ ambient = 0.1, worldW = 4000, worldH = 1000 } = {}) {
    this.ambient = ambient;
    this.worldW = worldW;
    this.worldH = worldH;
    this.index = new SegmentIndex();
    this.occluders = [];
    this.dynamicOccluders = [];
    this.lights = [];
    this.shadeZones = [];
    this.sun = { enabled: false, elevation: 10, intensity: 0, cur: 0, dx: 1, dy: 0, reach: 3200, glow: 0.22, color: [255, 214, 160] };
    this.time = 0;
    this.dynVersion = 0;
    this.scene = null;
  }

  // ---------------- building the level ----------------

  // Static rectangle that blocks light (walls, floors, pillars, crates).
  // cover: true also makes its inside a hiding spot (total shade). Pillars,
  // statues, crates and carts are "cover": standing in front of one in 2D
  // means you are tucked behind it, so nothing lights or sees you there.
  addRectOccluder(x, y, w, h, tag = '', { cover = false } = {}) {
    if (cover) this.addShadeZone(x, y, w, h, 1, true);
    const poly = rectPoly(x, y, w, h);
    const occ = {
      id: NEXT_ID++, tag, poly, x, y, w, h, dynamic: false,
      contains: (px, py) => px > x && px < x + w && py > y && py < y + h,
    };
    occ.segments = polySegments(poly).map((s) => boxSeg(s, occ));
    for (const s of occ.segments) this.index.add(s);
    this.occluders.push(occ);
    return occ;
  }

  // Moving convex shapes (the mill wheel's spokes). Call setPolys() each frame.
  addDynamicOccluder(tag = '') {
    const occ = { id: NEXT_ID++, tag, dynamic: true, polys: [], segments: [] };
    occ.setPolys = (polys) => {
      occ.polys = polys;
      occ.segments = [];
      for (const p of polys) for (const s of polySegments(p)) occ.segments.push(boxSeg(s, occ));
      this.dynVersion++;
    };
    occ.contains = (px, py) => occ.polys.some((p) => pointInPolygon(px, py, p));
    this.dynamicOccluders.push(occ);
    return occ;
  }

  // A region that is always darker, e.g. a doorway recess. strength 0..1.
  addShadeZone(x, y, w, h, strength = 0.6, cover = false) {
    const z = { x, y, w, h, strength, cover };
    this.shadeZones.push(z);
    return z;
  }

  // True if (x, y) is tucked inside cover (used to draw you as hidden).
  coverAt(x, y) {
    for (const z of this.shadeZones) {
      if (z.cover && x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return true;
    }
    return false;
  }

  // def: { x, y, radius, intensity, color:[r,g,b], cone:{dir, spread} (degrees),
  //        fire, harmless, glow, flicker, swing:{length, amp, period, phase},
  //        pulse:{min, max, period, phase}, enabled }
  addLight(def) {
    const L = {
      id: NEXT_ID++,
      x: def.x, y: def.y,
      radius: def.radius ?? 200,
      intensity: def.intensity ?? 0.9,
      color: def.color ?? [255, 170, 90],
      cone: def.cone ? { dir: def.cone.dir, spread: def.cone.spread } : null,
      fire: !!def.fire,
      harmless: !!def.harmless,
      glow: def.glow ?? 0.55,
      flicker: def.flicker ?? 0,
      swing: def.swing ?? null,
      pulse: def.pulse ?? null,
      enabled: def.enabled ?? true,
      tag: def.tag ?? '',
      falloff: def.falloff ?? 'radial',
      cx: def.x, cy: def.y, cur: def.intensity ?? 0.9,
      poly: null, polyKey: '',
      seed: Math.random() * 100,
    };
    this.lights.push(L);
    return L;
  }

  removeLight(L) {
    const i = this.lights.indexOf(L);
    if (i >= 0) this.lights.splice(i, 1);
  }

  // The dawn sun: a directional light from the east (right side of the screen).
  setSun({ enabled, elevation, intensity }) {
    if (enabled !== undefined) this.sun.enabled = enabled;
    if (elevation !== undefined) {
      this.sun.elevation = elevation;
      const r = (elevation * Math.PI) / 180;
      this.sun.dx = Math.cos(r);   // direction pointing TOWARD the sun
      this.sun.dy = -Math.sin(r);
    }
    if (intensity !== undefined) this.sun.intensity = intensity;
  }

  // ---------------- per frame ----------------

  // Advances flicker, swings and cloud pulses. Call after moving entities
  // (which set light.x/light.y for carried lanterns) and before any query.
  update(timeSeconds) {
    this.time = timeSeconds;
    const t = timeSeconds;
    for (const L of this.lights) {
      let cur = L.intensity;
      if (L.flicker) {
        const n = Math.sin(t * 7.3 + L.seed) * 0.5 + Math.sin(t * 13.1 + L.seed * 2) * 0.3 + Math.sin(t * 23.7 + L.seed * 3) * 0.2;
        cur *= 1 + L.flicker * n;
      }
      if (L.pulse) {
        const p = 0.5 + 0.5 * Math.sin((t / L.pulse.period) * Math.PI * 2 + (L.pulse.phase ?? 0));
        cur *= L.pulse.min + (L.pulse.max - L.pulse.min) * p;
      }
      L.cur = Math.max(0, Math.min(1, cur));
      if (L.swing) {
        const th = ((L.swing.amp * Math.PI) / 180) * Math.sin((t / L.swing.period) * Math.PI * 2 + (L.swing.phase ?? 0));
        L.cx = L.x + Math.sin(th) * L.swing.length;
        L.cy = L.y + Math.cos(th) * L.swing.length;
      } else {
        L.cx = L.x;
        L.cy = L.y;
      }
    }
    this.sun.cur = this.sun.enabled ? this.sun.intensity : 0;
  }

  // ---------------- queries ----------------

  // Collect the segments that can block light inside a box, skipping any
  // occluder that contains the point (ex, ey). Why skip: a Lanternman walking
  // in front of a background pillar carries his lantern "inside" the pillar's
  // rectangle; without this rule his light would vanish.
  segmentsIn(minx, miny, maxx, maxy, ex, ey) {
    const out = [];
    const excluded = new Set();
    this.index.query(minx, miny, maxx, maxy, (s) => {
      const o = s.occ;
      if (excluded.has(o.id)) return;
      if (o.contains(ex, ey)) { excluded.add(o.id); return; }
      out.push(s);
    });
    for (const o of this.dynamicOccluders) {
      if (o.contains(ex, ey)) continue;
      for (const s of o.segments) {
        if (s.maxx < minx || s.minx > maxx || s.maxy < miny || s.miny > maxy) continue;
        out.push(s);
      }
    }
    return out;
  }

  // True if nothing blocks the straight line from (x1,y1) to (x2,y2).
  // Occluders that contain the START point are ignored (see segmentsIn).
  lineOfSight(x1, y1, x2, y2) {
    const segs = this.segmentsIn(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), x1, y1);
    const dx = x2 - x1, dy = y2 - y1;
    for (const s of segs) {
      const t = raySegment(x1, y1, dx, dy, s.ax, s.ay, s.bx, s.by);
      if (t > 1e-6 && t < 1 - 1e-6) return false;
    }
    return true;
  }

  sunBlocked(x, y) {
    const R = this.sun.reach;
    const ex = x + this.sun.dx * R, ey = y + this.sun.dy * R;
    const segs = this.segmentsIn(Math.min(x, ex), Math.min(y, ey), Math.max(x, ex), Math.max(y, ey), NaN, NaN);
    for (const s of segs) {
      const t = raySegment(x, y, this.sun.dx * R, this.sun.dy * R, s.ax, s.ay, s.bx, s.by);
      if (t > 1e-6 && t <= 1) return true;
    }
    return false;
  }

  // Contribution of one point light at (x, y), 0..1.
  contribution(L, x, y) {
    const dx = x - L.cx, dy = y - L.cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= L.radius * L.radius) return 0;
    if (L.cone) {
      const a = Math.atan2(dy, dx);
      if (angleDiff(a, (L.cone.dir * Math.PI) / 180) > (L.cone.spread * Math.PI) / 180) return 0;
    }
    if (!this.lineOfSight(L.cx, L.cy, x, y)) return 0;
    return L.cur * falloffOf(L.falloff, Math.sqrt(d2) / L.radius);
  }

  // THE query. Returns { value 0..1, state: shade|dim|light, fire: bool }.
  getLightAt(x, y) {
    let dark = 1;
    let fire = 0;
    if (this.sun.cur > 0 && !this.sunBlocked(x, y)) dark *= 1 - this.sun.cur;
    for (const L of this.lights) {
      if (!L.enabled || L.harmless || L.cur <= 0) continue;
      const li = this.contribution(L, x, y);
      if (li <= 0) continue;
      dark *= 1 - li;
      if (L.fire && li > fire) fire = li;
    }
    let lit = 1 - dark;
    for (const z of this.shadeZones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) lit *= 1 - z.strength;
    }
    const value = this.ambient + (1 - this.ambient) * lit;
    const state = value < TUNING.light.shadeMax ? SHADE : value < TUNING.light.dimMax ? DIM : LIGHT;
    return { value, state, fire: state === LIGHT && fire > 0.45 };
  }

  // Visibility polygon of a light, cached until the light or a moving occluder moves.
  polygonFor(L) {
    const key = `${Math.round(L.cx * 2)},${Math.round(L.cy * 2)},${this.dynVersion}`;
    if (L.poly && L.polyKey === key) return L.poly;
    const R = L.radius;
    const segs = this.segmentsIn(L.cx - R, L.cy - R, L.cx + R, L.cy + R, L.cx, L.cy);
    L.poly = visibilityPolygon(L.cx, L.cy, segs, { x: L.cx - R - 2, y: L.cy - R - 2, w: R * 2 + 4, h: R * 2 + 4 });
    L.polyKey = key;
    return L.poly;
  }

  // A fan of rays used to draw an enemy's vision cone that stops at walls.
  rayFan(ox, oy, dirRad, halfRad, range, rays = 28) {
    const segs = this.segmentsIn(ox - range, oy - range, ox + range, oy + range, ox, oy);
    const pts = [ox, oy];
    for (let i = 0; i <= rays; i++) {
      const a = dirRad - halfRad + (2 * halfRad * i) / rays;
      const dx = Math.cos(a), dy = Math.sin(a);
      let best = range;
      for (const s of segs) {
        const t = raySegment(ox, oy, dx, dy, s.ax, s.ay, s.bx, s.by);
        if (t < best) best = t;
      }
      pts.push(ox + dx * best, oy + dy * best);
    }
    return pts;
  }

  // ---------------- rendering (browser only) ----------------

  attach(scene, { darkColor = '#090c20' } = {}) {
    this.scene = scene;
    const { width, height } = TUNING.view;
    this.scale = TUNING.light.lightmapScale;
    this.cw = Math.ceil(width * this.scale);
    this.ch = Math.ceil(height * this.scale);
    this.darkColor = darkColor;

    const mk = (key) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      return scene.textures.createCanvas(key, this.cw, this.ch);
    };
    this.darkTex = mk('__lightmap_dark');
    this.glowTex = mk('__lightmap_glow');
    this.darkCtx = this.darkTex.getContext();
    this.glowCtx = this.glowTex.getContext();

    this.sunCanvas = document.createElement('canvas');
    this.sunCanvas.width = this.cw;
    this.sunCanvas.height = this.ch;
    this.sunCtx = this.sunCanvas.getContext('2d');

    this.darkImage = scene.add.image(0, 0, '__lightmap_dark').setOrigin(0).setScrollFactor(0)
      .setDisplaySize(width, height).setDepth(30);
    this.glowImage = scene.add.image(0, 0, '__lightmap_glow').setOrigin(0).setScrollFactor(0)
      .setDisplaySize(width, height).setDepth(31).setBlendMode('ADD');
    this.gradCache = new Map();
  }

  // Gradients sample the SAME falloff function the queries use (20 stops).
  alphaGradient(ctx, R, kind) {
    const key = `a${R}|${kind}`;
    let g = this.gradCache.get(key);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      for (let i = 0; i <= 20; i++) g.addColorStop(i / 20, `rgba(0,0,0,${falloffOf(kind, i / 20).toFixed(4)})`);
      this.gradCache.set(key, g);
    }
    return g;
  }

  colorGradient(ctx, R, color, kind) {
    const key = `c${R}|${color.join(',')}|${kind}`;
    let g = this.gradCache.get(key);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      for (let i = 0; i <= 20; i++) {
        g.addColorStop(i / 20, `rgba(${color[0]},${color[1]},${color[2]},${falloffOf(kind, i / 20).toFixed(4)})`);
      }
      this.gradCache.set(key, g);
    }
    return g;
  }

  renderSunMask(vx, vy, vw, vh) {
    const s = this.scale;
    const ctx = this.sunCtx;
    const c = this.sun.color;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(0, 0, this.cw, this.ch);
    ctx.setTransform(s, 0, 0, s, -vx * s, -vy * s);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    const R = this.sun.reach;
    const vxR = -this.sun.dx * R, vyR = -this.sun.dy * R; // shadow direction (away from sun)
    const shadowOf = (poly) => {
      const pts = [];
      for (let i = 0; i < poly.length; i += 2) {
        pts.push([poly[i], poly[i + 1]]);
        pts.push([poly[i] + vxR, poly[i + 1] + vyR]);
      }
      const hull = convexHull(pts);
      ctx.beginPath();
      ctx.moveTo(hull[0], hull[1]);
      for (let i = 2; i < hull.length; i += 2) ctx.lineTo(hull[i], hull[i + 1]);
      ctx.closePath();
      ctx.fill();
    };
    // Any occluder up to R away in the sun's direction can shade the view.
    const minx = vx - 40, maxx = vx + vw + R * Math.abs(this.sun.dx) + 40;
    for (const o of this.occluders) {
      if (o.x + o.w < minx || o.x > maxx) continue;
      if (o.y > vy + vh + 40) continue;
      shadowOf(o.poly);
    }
    for (const o of this.dynamicOccluders) for (const p of o.polys) shadowOf(p);
  }

  render(cam) {
    if (!this.scene) return;
    const s = this.scale;
    const vx = cam.worldView.x, vy = cam.worldView.y, vw = cam.worldView.width, vh = cam.worldView.height;
    const d = this.darkCtx, g = this.glowCtx;

    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.globalAlpha = 1;
    d.fillStyle = this.darkColor;
    d.fillRect(0, 0, this.cw, this.ch);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, this.cw, this.ch);

    if (this.sun.cur > 0) {
      this.renderSunMask(vx, vy, vw, vh);
      d.globalCompositeOperation = 'destination-out';
      d.globalAlpha = this.sun.cur;
      d.drawImage(this.sunCanvas, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = this.sun.cur * this.sun.glow;
      g.drawImage(this.sunCanvas, 0, 0);
    }

    d.globalCompositeOperation = 'destination-out';
    g.globalCompositeOperation = 'lighter';
    for (const L of this.lights) {
      if (!L.enabled || L.cur <= 0) continue;
      const R = L.radius;
      if (L.cx + R < vx || L.cx - R > vx + vw || L.cy + R < vy || L.cy - R > vy + vh) continue;
      const poly = this.polygonFor(L);
      if (poly.length < 6) continue;
      const targets = L.harmless ? [g] : [d, g];
      for (const ctx of targets) {
        ctx.save();
        ctx.setTransform(s, 0, 0, s, -vx * s, -vy * s);
        ctx.beginPath();
        ctx.moveTo(poly[0], poly[1]);
        for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
        ctx.closePath();
        ctx.clip();
        if (L.cone) {
          const a = (L.cone.dir * Math.PI) / 180, sp = (L.cone.spread * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(L.cx, L.cy);
          ctx.arc(L.cx, L.cy, R, a - sp, a + sp);
          ctx.closePath();
          ctx.clip();
        }
        ctx.translate(L.cx, L.cy);
        if (ctx === d) {
          ctx.globalAlpha = L.cur;
          ctx.fillStyle = this.alphaGradient(ctx, R, L.falloff);
        } else {
          ctx.globalAlpha = Math.min(1, L.cur * L.glow);
          ctx.fillStyle = this.colorGradient(ctx, R, L.color, L.falloff);
        }
        ctx.fillRect(-R, -R, R * 2, R * 2);
        ctx.restore();
      }
    }

    d.globalCompositeOperation = 'source-over';
    d.fillStyle = this.darkColor;
    d.setTransform(s, 0, 0, s, -vx * s, -vy * s);
    for (const z of this.shadeZones) {
      if (z.x + z.w < vx || z.x > vx + vw || z.y + z.h < vy || z.y > vy + vh) continue;
      d.globalAlpha = z.strength;
      d.fillRect(z.x, z.y, z.w, z.h);
    }
    d.globalAlpha = 1;
    d.setTransform(1, 0, 0, 1, 0, 0);

    this.darkImage.setAlpha(TUNING.light.darkMax * (1 - this.ambient));
    this.darkTex.refresh();
    this.glowTex.refresh();
  }

  destroy() {
    this.scene = null;
  }
}

// =====================================================================
// LIGHTING: the physics of this game.
//
// The one rule from the design doc: "If it looks dark, it is dark."
// There is exactly ONE description of the light in a level (the lights and
// the shapes that block them) and two readers of it:
//
//   render()        draws what the player SEES
//   getLightAt(x,y) tells the damage system and the enemy AI what IS
//
// Both read the same light positions, the same flicker, the same falloff
// curve and the same blocking shapes, so they cannot disagree.
// tests/lighting.test.js checks that with thousands of random points.
//
// HOW A LIGHT LOOKS AND WORKS
// A "burn" light (lantern, lamp, window shaft, fire) has a bright CORE with a
// visible edge, then a faint HALO. Core = Light (burns, seen from far away).
// Halo = Dim (safe, seen at mid range). Outside = Shade.
// A "glow" light (a lit window) is halo only: it can never burn you.
// A "safe" light (the cold blue Stillpoint glow) is ignored by gameplay.
//
// HOW LIGHTS ADD UP (same maths for both readers)
//   each light contributes c = intensity * falloff(distance / radius)
//   total = c1 + c2 + ...                       (capped at 1)
//   Light if the brightest single burn light >= burnAt, or total >= burnTotal
//   Dim   if total >= dimAt
//   Shade otherwise
//
// THE LIGHT LAYER IS PINNED TO THE WORLD
// It is drawn for the area around the camera (plus a margin) and placed at
// that world position. The camera finishes moving only when the frame is
// drawn, so a layer pinned to the screen would slide a few pixels behind the
// world. Pinned to the world, light can never drift off the thing it lights.
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
// Falloff curves (shared by the renderer and the queries)
// ------------------------------------------------------------------

function smooth(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Bright core, a short visible drop, then a faint halo.
export function coreHalo(t) {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  const S = TUNING.light.shape;
  if (t < S.coreEnd) {
    const k = t / S.coreEnd;
    return 1 - (1 - S.coreBottom) * k * k;
  }
  if (t < S.edgeEnd) {
    return S.coreBottom + (S.halo - S.coreBottom) * smooth(S.coreEnd, S.edgeEnd, t);
  }
  const u = (t - S.edgeEnd) / (1 - S.edgeEnd);
  return S.halo * Math.pow(1 - u, 1.6);
}

// Halo only, never above glowMax: a lit window, a candle seen through glass.
export function softGlow(t) {
  if (t <= 0) return TUNING.light.glowMax;
  if (t >= 1) return 0;
  return TUNING.light.glowMax * Math.pow(1 - t, 1.5);
}

// Window shafts stay strong along their length and fade only at the far end.
export function beamFalloff(t) {
  if (t <= 0.8) return 1;
  if (t >= 1) return 0;
  return 1 - (t - 0.8) / 0.2;
}

// The cold Stillpoint glow (drawn, but ignored by gameplay).
function safeFalloff(t) {
  if (t >= 1) return 0;
  return Math.pow(1 - Math.max(0, t), 1.4);
}

export function falloffOf(kind, t) {
  if (kind === 'glow') return softGlow(t);
  if (kind === 'beam') return beamFalloff(t);
  if (kind === 'safe') return safeFalloff(t);
  return coreHalo(t);
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
  constructor({ worldW = 4000, worldH = 1000 } = {}) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.index = new SegmentIndex();
    this.occluders = [];
    this.dynamicOccluders = [];
    this.lights = [];
    this.sun = { enabled: false, elevation: 10, intensity: 0, cur: 0, dx: 1, dy: 0, reach: 3200, color: [255, 206, 150] };
    this.time = 0;
    this.dynVersion = 0;
    this.scene = null;
  }

  // ---------------- building the level ----------------

  // A rectangle that blocks light. Light soaks a few pixels into it (the
  // "inset") so its surfaces get a lit rim instead of staying black.
  // cover: true marks it as a hiding place (crates, carts, pillars): merged
  // inside it you are hidden even from a watcher standing right next to you.
  addRectOccluder(x, y, w, h, tag = '', { cover = false, inset } = {}) {
    const ins = inset ?? Math.min(TUNING.light.occluderInset, w * 0.25, h * 0.25);
    const ix = x + ins, iy = y + ins, iw = w - ins * 2, ih = h - ins * 2;
    const poly = rectPoly(ix, iy, iw, ih);
    const occ = {
      id: NEXT_ID++, tag, cover, poly, x, y, w, h, ix, iy, iw, ih, dynamic: false,
      contains: (px, py) => px > ix && px < ix + iw && py > iy && py < iy + ih,
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

  // def: { x, y, radius, intensity, color:[r,g,b], kind: 'burn'|'glow'|'beam'|'safe',
  //        cone:{dir, spread} (degrees), fire, flicker, swing:{length, amp, period, phase},
  //        pulse:{min, max, period, phase}, enabled }
  addLight(def) {
    let kind = def.kind;
    if (!kind) kind = def.harmless ? 'safe' : def.falloff === 'beam' ? 'beam' : 'burn';
    const L = {
      id: NEXT_ID++,
      x: def.x, y: def.y,
      radius: def.radius ?? 200,
      intensity: def.intensity ?? 0.9,
      color: def.color ?? [255, 170, 90],
      cone: def.cone ? { dir: def.cone.dir, spread: def.cone.spread } : null,
      kind,
      fire: !!def.fire,
      flicker: def.flicker ?? 0,
      swing: def.swing ?? null,
      pulse: def.pulse ?? null,
      enabled: def.enabled ?? true,
      tag: def.tag ?? '',
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

  // Contribution of one light at (x, y), 0..1.
  contribution(L, x, y) {
    const dx = x - L.cx, dy = y - L.cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= L.radius * L.radius) return 0;
    if (L.cone) {
      const a = Math.atan2(dy, dx);
      if (angleDiff(a, (L.cone.dir * Math.PI) / 180) > (L.cone.spread * Math.PI) / 180) return 0;
    }
    if (!this.lineOfSight(L.cx, L.cy, x, y)) return 0;
    return L.cur * falloffOf(L.kind, Math.sqrt(d2) / L.radius);
  }

  // THE query. Returns { value 0..1, state: shade|dim|light, fire: bool, max }.
  getLightAt(x, y) {
    const C = TUNING.light;
    let total = 0;
    let max = 0;
    let fire = 0;
    if (this.sun.cur > 0 && !this.sunBlocked(x, y)) {
      total += this.sun.cur;
      max = Math.max(max, this.sun.cur);
    }
    for (const L of this.lights) {
      if (!L.enabled || L.kind === 'safe' || L.cur <= 0) continue;
      const c = this.contribution(L, x, y);
      if (c <= 0) continue;
      total += c;
      if (L.kind !== 'glow') {
        if (c > max) max = c;
        if (L.fire && c > fire) fire = c;
      }
    }
    const value = Math.min(1, total);
    const state = max >= C.burnAt || total >= C.burnTotal ? LIGHT : total >= C.dimAt ? DIM : SHADE;
    return { value, state, fire: state === LIGHT && fire >= C.burnAt, max };
  }

  // True if (x, y) is tucked inside cover (a crate, cart, pillar, statue).
  coverAt(x, y) {
    for (const o of this.occluders) {
      if (o.cover && x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true;
    }
    return false;
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

  // depth: where the light layer sits. World art below it gets lit; characters
  // above it stay as silhouettes against the light (and show their own glow).
  attach(scene, { depth = 25 } = {}) {
    this.scene = scene;
    const { width, height } = TUNING.view;
    const pad = TUNING.light.lightmapPad;
    this.scale = TUNING.light.lightmapScale;
    this.pad = pad;
    this.areaW = width + pad * 2;
    this.areaH = height + pad * 2;
    this.cw = Math.ceil(this.areaW * this.scale);
    this.ch = Math.ceil(this.areaH * this.scale);
    if (scene.textures.exists('__lightlayer')) scene.textures.remove('__lightlayer');
    this.tex = scene.textures.createCanvas('__lightlayer', this.cw, this.ch);
    this.ctx = this.tex.getContext();
    this.sunCanvas = document.createElement('canvas');
    this.sunCanvas.width = this.cw;
    this.sunCanvas.height = this.ch;
    this.sunCtx = this.sunCanvas.getContext('2d');
    this.image = scene.add.image(0, 0, '__lightlayer').setOrigin(0).setDepth(depth)
      .setDisplaySize(this.areaW, this.areaH).setBlendMode('ADD');
    this.gradCache = new Map();
  }

  gradient(ctx, R, color, kind) {
    const key = `${R}|${color.join(',')}|${kind}`;
    let g = this.gradCache.get(key);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        g.addColorStop(t, `rgba(${color[0]},${color[1]},${color[2]},${Math.min(1, falloffOf(kind, t) / (kind === 'glow' ? TUNING.light.glowMax : 1)).toFixed(4)})`);
      }
      this.gradCache.set(key, g);
    }
    return g;
  }

  renderSun(ox, oy) {
    const s = this.scale;
    const ctx = this.sunCtx;
    const c = this.sun.color;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(0, 0, this.cw, this.ch);
    ctx.setTransform(s, 0, 0, s, -ox * s, -oy * s);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    const R = this.sun.reach;
    const vxR = -this.sun.dx * R, vyR = -this.sun.dy * R; // shadow direction (away from the sun)
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
    const minx = ox - 40, maxx = ox + this.areaW + R * Math.abs(this.sun.dx) + 40;
    for (const o of this.occluders) {
      if (o.x + o.w < minx || o.x > maxx) continue;
      if (o.y > oy + this.areaH + 40) continue;
      shadowOf(o.poly);
    }
    for (const o of this.dynamicOccluders) for (const p of o.polys) shadowOf(p);
  }

  render(cam) {
    if (!this.scene) return;
    const s = this.scale;
    const ox = Math.floor(cam.worldView.x - this.pad);
    const oy = Math.floor(cam.worldView.y - this.pad);
    const W = this.areaW, H = this.areaH;
    const ctx = this.ctx;
    const gain = TUNING.light.visualGain;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.cw, this.ch);
    ctx.globalCompositeOperation = 'lighter';

    if (this.sun.cur > 0) {
      this.renderSun(ox, oy);
      ctx.globalAlpha = this.sun.cur * gain.sun;
      ctx.drawImage(this.sunCanvas, 0, 0);
    }

    for (const L of this.lights) {
      if (!L.enabled || L.cur <= 0) continue;
      const R = L.radius;
      if (L.cx + R < ox || L.cx - R > ox + W || L.cy + R < oy || L.cy - R > oy + H) continue;
      const poly = this.polygonFor(L);
      if (poly.length < 6) continue;
      ctx.save();
      ctx.setTransform(s, 0, 0, s, -ox * s, -oy * s);
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
      const kindGain = gain[L.kind] ?? gain.burn;
      const glowScale = L.kind === 'glow' ? TUNING.light.glowMax : 1;
      ctx.globalAlpha = Math.min(1, L.cur * kindGain * glowScale);
      ctx.fillStyle = this.gradient(ctx, R, L.color, L.kind);
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.restore();
    }

    this.image.setPosition(ox, oy);
    this.tex.refresh();
  }

  destroy() {
    this.scene = null;
  }
}

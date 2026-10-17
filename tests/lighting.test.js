// Checks the core promise: what is DRAWN as lit and what the game COMPUTES as lit agree,
// and that the light zones behave the way the player is told they do.
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LightingSystem, visibilityPolygon, pointInPolygon, raySegment, convexHull,
  coreHalo, softGlow, falloffOf, SHADE, DIM, LIGHT,
} from '../src/systems/lighting.js';
import { TUNING } from '../src/tuning.js';

function rng(seed) {
  let a = seed;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function sampleLevel() {
  const L = new LightingSystem({ worldW: 2000, worldH: 1000 });
  L.addRectOccluder(0, 700, 2000, 300);                       // ground
  L.addRectOccluder(400, 520, 60, 180, 'pillar', { cover: true }); // pillar (cover)
  L.addRectOccluder(700, 600, 200, 20);                       // ledge
  L.addRectOccluder(1100, 400, 40, 300);                      // tall wall
  return L;
}

test('raySegment finds a simple hit', () => {
  assert.equal(raySegment(0, 0, 1, 0, 5, -1, 5, 1), 5);
  assert.equal(raySegment(0, 0, -1, 0, 5, -1, 5, 1), Infinity);
});

test('the falloff has a bright core, a visible edge, and a faint halo', () => {
  const S = TUNING.light.shape;
  assert.equal(coreHalo(0), 1);
  assert.equal(coreHalo(1), 0);
  // the whole core of a normal lantern (intensity 0.9) burns
  assert.ok(0.9 * coreHalo(S.coreEnd - 0.001) >= TUNING.light.burnAt);
  // the halo never burns on its own
  assert.ok(coreHalo(S.edgeEnd) <= S.halo + 1e-9);
  assert.ok(S.halo < TUNING.light.burnAt);
  // and the edge between them is a real drop, not a gentle slope
  assert.ok(coreHalo(S.coreEnd) - coreHalo(S.edgeEnd) > 0.4);
});

test('glow lights can never burn, even two of them overlapping', () => {
  assert.ok(softGlow(0) <= TUNING.light.glowMax);
  assert.ok(2 * TUNING.light.glowMax < TUNING.light.burnTotal);
  const sys = new LightingSystem();
  sys.addLight({ x: 0, y: 0, radius: 200, intensity: 1, kind: 'glow' });
  sys.addLight({ x: 10, y: 0, radius: 200, intensity: 1, kind: 'glow' });
  sys.update(0);
  const r = sys.getLightAt(5, 0);
  assert.equal(r.state, DIM);
});

test('visibility polygon (what is drawn) matches line of sight (what is computed)', () => {
  const sys = sampleLevel();
  const ox = 600, oy = 560, R = 500;
  const segs = sys.segmentsIn(ox - R, oy - R, ox + R, oy + R, ox, oy);
  const poly = visibilityPolygon(ox, oy, segs, { x: ox - R, y: oy - R, w: R * 2, h: R * 2 });
  const r = rng(7);
  let checked = 0, mismatches = 0;
  for (let i = 0; i < 4000; i++) {
    const x = ox - R + 10 + r() * (R * 2 - 20);
    const y = oy - R + 10 + r() * (R * 2 - 20);
    const drawn = pointInPolygon(x, y, poly);
    const computed = sys.lineOfSight(ox, oy, x, y);
    checked++;
    if (drawn !== computed) mismatches++;
  }
  // Points within a fraction of a pixel of a shadow edge can round either way.
  assert.ok(mismatches / checked < 0.003, `mismatch rate ${mismatches}/${checked}`);
});

test('the drawn gradient uses the same falloff numbers as the query', () => {
  // The renderer samples falloffOf at 33 stops. Between stops the browser
  // interpolates linearly, so check the curve is smooth enough that linear
  // interpolation never misses the burn threshold by more than a sliver.
  for (const kind of ['burn', 'beam', 'glow']) {
    for (let i = 0; i < 32; i++) {
      const a = falloffOf(kind, i / 32), b = falloffOf(kind, (i + 1) / 32);
      const mid = falloffOf(kind, (i + 0.5) / 32);
      assert.ok(Math.abs(mid - (a + b) / 2) < 0.12, `${kind} stop ${i}`);
    }
  }
});

test('sun shadow hulls (what is drawn) match sunBlocked (what is computed)', () => {
  const sys = sampleLevel();
  sys.setSun({ enabled: true, elevation: 12, intensity: 0.9 });
  const R = sys.sun.reach;
  const hulls = sys.occluders.map((o) => {
    const pts = [];
    for (let i = 0; i < o.poly.length; i += 2) {
      pts.push([o.poly[i], o.poly[i + 1]]);
      pts.push([o.poly[i] - sys.sun.dx * R, o.poly[i + 1] - sys.sun.dy * R]);
    }
    return convexHull(pts);
  });
  const r = rng(11);
  let mismatches = 0;
  for (let i = 0; i < 3000; i++) {
    const x = r() * 2000, y = r() * 700;
    const drawnShadow = hulls.some((h) => pointInPolygon(x, y, h));
    if (drawnShadow !== sys.sunBlocked(x, y)) mismatches++;
  }
  assert.ok(mismatches < 6, `sun mismatches ${mismatches}`);
});

test('a lantern burns close, is dim further out, and a pillar hides you', () => {
  const sys = sampleLevel();
  sys.addLight({ x: 300, y: 620, radius: 300, intensity: 0.95 });
  sys.update(0);
  assert.equal(sys.getLightAt(340, 660).state, LIGHT);   // in the core
  assert.equal(sys.getLightAt(300, 400).state, DIM);     // in the halo (above, open air)
  assert.equal(sys.getLightAt(430, 650).state, SHADE);   // tucked in the middle of the pillar
  assert.equal(sys.getLightAt(490, 660).state, SHADE);   // behind the pillar
  assert.ok(sys.coverAt(430, 650));
  assert.ok(!sys.coverAt(340, 660));
});

test('surfaces facing a light get a lit rim, deeper inside stays dark', () => {
  const sys = sampleLevel();
  sys.addLight({ x: 600, y: 640, radius: 260, intensity: 0.95 });
  sys.update(0);
  assert.notEqual(sys.getLightAt(600, 705).state, SHADE); // 5 px into the ground: lit rim
  assert.equal(sys.getLightAt(600, 760).state, SHADE);    // 60 px into the ground: dark
});

test('a lantern lights the space at its bearer\'s feet (no hiding under it)', () => {
  const sys = sampleLevel();
  const lm = TUNING.enemies.lanternman.lantern;
  // lantern held at chest height in front of a watcher standing at x=1500
  sys.addLight({ x: 1530, y: 652, radius: lm.glowRadius, intensity: lm.glowIntensity });
  sys.update(0);
  // a merged player (centre about 13 px above the floor) right at his feet
  assert.equal(sys.getLightAt(1500, 687).state, LIGHT);
  assert.equal(sys.getLightAt(1480, 687).state, LIGHT);
});

test('a lantern carried in front of a pillar still shines (containing occluder is ignored)', () => {
  const sys = sampleLevel();
  sys.addLight({ x: 430, y: 600, radius: 250, intensity: 0.95 });
  sys.update(0);
  assert.equal(sys.getLightAt(470, 640).state, LIGHT);
});

test('safe (Stillpoint) light is ignored by gameplay', () => {
  const sys = new LightingSystem();
  sys.addLight({ x: 0, y: 0, radius: 200, intensity: 1, kind: 'safe' });
  sys.update(0);
  assert.equal(sys.getLightAt(10, 0).state, SHADE);
});

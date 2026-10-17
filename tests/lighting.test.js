// Checks the core promise: what is DRAWN as lit and what the game COMPUTES as lit agree.
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LightingSystem, visibilityPolygon, pointInPolygon, raySegment, convexHull, falloff, SHADE, LIGHT,
} from '../src/systems/lighting.js';

function rng(seed) {
  let a = seed;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function sampleLevel() {
  const L = new LightingSystem({ ambient: 0.1, worldW: 2000, worldH: 1000 });
  L.addRectOccluder(0, 700, 2000, 300);     // ground
  L.addRectOccluder(400, 520, 60, 180);     // pillar
  L.addRectOccluder(700, 600, 200, 20);     // ledge
  L.addRectOccluder(1100, 400, 40, 300);    // tall wall
  return L;
}

test('raySegment finds a simple hit', () => {
  const t = raySegment(0, 0, 1, 0, 5, -1, 5, 1);
  assert.equal(t, 5);
  assert.equal(raySegment(0, 0, -1, 0, 5, -1, 5, 1), Infinity);
});

test('falloff is 1 at the center and 0 at the edge', () => {
  assert.equal(falloff(0), 1);
  assert.equal(falloff(1), 0);
  assert.ok(falloff(0.5) > 0 && falloff(0.5) < 1);
});

test('visibility polygon (what is drawn) matches line of sight (what is computed)', () => {
  const sys = sampleLevel();
  const ox = 600, oy = 560, R = 500;
  const segs = sys.segmentsIn(ox - R, oy - R, ox + R, oy + R, ox, oy);
  const poly = visibilityPolygon(ox, oy, segs, { x: ox - R, y: oy - R, w: R * 2, h: R * 2 });
  const r = rng(7);
  let checked = 0, mismatches = 0;
  for (let i = 0; i < 3000; i++) {
    const x = ox - R + 10 + r() * (R * 2 - 20);
    const y = oy - R + 10 + r() * (R * 2 - 20);
    const drawn = pointInPolygon(x, y, poly);
    const computed = sys.lineOfSight(ox, oy, x, y);
    checked++;
    if (drawn !== computed) mismatches++;
  }
  // Points that sit within a fraction of a pixel of a shadow edge can round
  // either way, so allow a tiny tolerance.
  assert.ok(mismatches / checked < 0.003, `mismatch rate ${mismatches}/${checked}`);
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

test('a lantern lights what it faces and a pillar casts shade behind it', () => {
  const sys = sampleLevel();
  sys.addLight({ x: 300, y: 600, radius: 300, intensity: 0.95 });
  sys.update(0);
  const near = sys.getLightAt(330, 640);
  assert.equal(near.state, LIGHT);
  const behindPillar = sys.getLightAt(480, 660);
  assert.equal(behindPillar.state, SHADE);
  const insidePillar = sys.getLightAt(430, 650);
  assert.equal(insidePillar.state, SHADE);
});

test('a lantern carried in front of a pillar still shines (containing occluder is ignored)', () => {
  const sys = sampleLevel();
  sys.addLight({ x: 430, y: 600, radius: 250, intensity: 0.95 });
  sys.update(0);
  assert.equal(sys.getLightAt(470, 640).state, LIGHT);
});

test('shade zones darken the same way for both readers', () => {
  const sys = sampleLevel();
  sys.addLight({ x: 1500, y: 600, radius: 300, intensity: 0.95 });
  sys.update(0);
  const before = sys.getLightAt(1520, 650).value;
  sys.addShadeZone(1500, 620, 60, 80, 0.8);
  const after = sys.getLightAt(1520, 650).value;
  assert.ok(after < before);
});

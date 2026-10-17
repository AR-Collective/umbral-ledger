import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOdds, band, pickOutcome, rollHeavy, rollLight, updateBadLuck } from '../src/systems/branches.js';
import { freshState } from '../src/systems/state.js';

const BASE = { favorable: 50, mixed: 35, unfavorable: 15 };

test('odds always add up to 100', () => {
  for (const shifts of [[], [10], [15, 10], [-20], [60], [-80]]) {
    const o = computeOdds(BASE, shifts);
    assert.equal(o.favorable + o.mixed + o.unfavorable, 100);
  }
});

test('positive shifts take from Unfavorable first and never push below the minimum', () => {
  const o = computeOdds(BASE, [15]);
  assert.equal(o.favorable, 65);
  assert.equal(o.unfavorable, 5);
  assert.equal(o.mixed, 30);
  const big = computeOdds(BASE, [200]);
  assert.ok(big.unfavorable >= 5 && big.mixed >= 5);
});

test('bands read the way the UI promises', () => {
  assert.equal(band(65), 'Likely');
  assert.equal(band(30), 'Possible');
  assert.equal(band(10), 'Unlikely');
});

test('pickOutcome respects the odds boundaries', () => {
  const o = { favorable: 50, mixed: 35, unfavorable: 15 };
  assert.equal(pickOutcome(o, 0.0), 'favorable');
  assert.equal(pickOutcome(o, 0.49), 'favorable');
  assert.equal(pickOutcome(o, 0.5), 'mixed');
  assert.equal(pickOutcome(o, 0.86), 'unfavorable');
});

test('the same run seed always gives the same Heavy roll (reloading cannot re-roll)', () => {
  const a = rollHeavy(1234, 'hollowmere.bell', BASE);
  const b = rollHeavy(1234, 'hollowmere.bell', BASE);
  assert.equal(a, b);
  // A Reweave uses a different attempt number and therefore a new stream.
  const results = new Set();
  for (let i = 0; i < 20; i++) results.add(rollHeavy(1234, 'hollowmere.bell', BASE, i));
  assert.ok(results.size > 1);
});

test('rolls follow the odds over many runs', () => {
  const counts = { favorable: 0, mixed: 0, unfavorable: 0 };
  for (let seed = 1; seed <= 4000; seed++) counts[rollHeavy(seed, 'x', BASE)]++;
  assert.ok(Math.abs(counts.favorable / 4000 - 0.5) < 0.04);
  assert.ok(Math.abs(counts.unfavorable / 4000 - 0.15) < 0.03);
});

test('light branches pick from the variants', () => {
  const v = rollLight(99, 'hollowmere.fork', ['high', 'low']);
  assert.ok(v === 'high' || v === 'low');
});

test('bad luck protection grows after unlucky rolls and resets after a good one', () => {
  let c = 0;
  c = updateBadLuck(c, 'unfavorable');
  c = updateBadLuck(c, 'unfavorable');
  assert.equal(c, 2);
  c = updateBadLuck(c, 'mixed');
  assert.equal(c, 2);
  c = updateBadLuck(c, 'favorable');
  assert.equal(c, 0);
});

test('a fresh save starts with three Threads and an empty ledger', () => {
  const s = freshState(5);
  assert.equal(s.threads, 3);
  assert.deepEqual(s.ledger, []);
});

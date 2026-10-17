// Branch maths: odds, modifiers, bands and rolls. No Phaser here, so it can be unit tested.
//
// The three tiers from the design doc:
//   Light    : random, small flavor changes (which road a patrol walks).
//   Heavy    : weighted random with VISIBLE odds that your choices shift.
//   Keystone : never random. Not handled here on purpose.

import { TUNING } from '../tuning.js';
import { streamFor } from './rng.js';

export const OUTCOMES = ['favorable', 'mixed', 'unfavorable'];

// base: { favorable: 50, mixed: 35, unfavorable: 15 }
// shifts: array of numbers added to Favorable (positive = better luck for the player)
// The points are taken from Unfavorable first, then Mixed, never below minChance.
export function computeOdds(base, shifts = []) {
  const min = TUNING.branches.minChance;
  const odds = { ...base };
  for (const amount of shifts) {
    if (amount >= 0) {
      let left = amount;
      const fromUnf = Math.min(left, Math.max(0, odds.unfavorable - min));
      odds.unfavorable -= fromUnf; left -= fromUnf;
      const fromMix = Math.min(left, Math.max(0, odds.mixed - min));
      odds.mixed -= fromMix; left -= fromMix;
      odds.favorable += amount - left;
    } else {
      let left = -amount;
      const fromFav = Math.min(left, Math.max(0, odds.favorable - min));
      odds.favorable -= fromFav; left -= fromFav;
      odds.unfavorable += -amount - left;
    }
  }
  return normalize(odds);
}

function normalize(odds) {
  const total = odds.favorable + odds.mixed + odds.unfavorable;
  const f = Math.round((odds.favorable / total) * 100);
  const m = Math.round((odds.mixed / total) * 100);
  return { favorable: f, mixed: m, unfavorable: 100 - f - m };
}

// What the player sees without exact numbers.
export function band(percent) {
  if (percent >= 50) return 'Likely';
  if (percent >= 25) return 'Possible';
  return 'Unlikely';
}

// Pick an outcome from odds with a random number in [0, 1).
export function pickOutcome(odds, r) {
  const roll = r * 100;
  if (roll < odds.favorable) return 'favorable';
  if (roll < odds.favorable + odds.mixed) return 'mixed';
  return 'unfavorable';
}

// Roll a Heavy branch once. "attempt" changes the stream for a Reweave, so a
// Reweave is a genuinely new roll but still reproducible from the seed.
export function rollHeavy(runSeed, branchId, odds, attempt = 0) {
  const rng = streamFor(runSeed, `${branchId}#${attempt}`);
  return pickOutcome(odds, rng());
}

// Light branches: a plain random pick from a list of variants.
export function rollLight(runSeed, branchId, variants) {
  const rng = streamFor(runSeed, branchId);
  return variants[Math.floor(rng() * variants.length)];
}

// A Foresight "vision" shows ONE sampled possible outcome. It uses a different
// stream from the real roll, so the vision can differ from what actually happens.
// That is the Foresight honesty rule: it never shows an impossible future,
// but it can be wrong about which one will happen.
export function sampleVision(runSeed, branchId, odds, salt) {
  const rng = streamFor(runSeed, `${branchId}:vision:${salt}`);
  return pickOutcome(odds, rng());
}

// Bad-luck protection: unlucky Heavy rolls build a hidden bonus for the next one.
export function updateBadLuck(current, outcome) {
  if (outcome === 'unfavorable') return current + 1;
  if (outcome === 'favorable') return 0;
  return current;
}

export function badLuckShift(counter) {
  return counter * TUNING.branches.badLuckBonus;
}

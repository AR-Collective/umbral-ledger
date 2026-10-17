// Small seeded random number generator.
//
// Why seeded: the design doc requires that branch rolls are decided ONCE per
// world run and survive reloading a Stillpoint (anti save-scumming). A seed
// stored in the save file means the same run always produces the same rolls.

// mulberry32: tiny, fast, and good enough for games.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turns a string like "hollowmere.bell" into a number so each branch gets its
// own independent stream from the same run seed.
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function streamFor(runSeed, name) {
  return mulberry32((runSeed ^ hashString(name)) >>> 0);
}

export function newSeed() {
  return (Math.random() * 4294967296) >>> 0;
}

// SOLMAR — Streets of the Sun
// Seeded randomness. Every random choice in the game comes from one of these
// generators, never from Math.random, so a fixed seed plays the same game twice.

/** Mulberry32: a small, fast, well-behaved seeded generator. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** A whole number in [min, max] inclusive. */
export function rint(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of an array, picked uniformly. */
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** True with probability p (0..1). */
export function chance(rng, p) {
  return rng() < p;
}

/** A small angle nudge in radians, for wandering and spread. */
export function jitter(rng, amount) {
  return (rng() - 0.5) * 2 * amount;
}

/** A shuffled copy of an array (Fisher-Yates, driven by the same generator). */
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

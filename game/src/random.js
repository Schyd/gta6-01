// random.js — a small seeded random number generator (mulberry32): the same
// seed gives the same city, the same traffic and the same screenshot scenes,
// which is what makes the deterministic ?shot= scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of an array with a seeded random function.
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// An integer in [min, max] with a seeded random function.
export function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

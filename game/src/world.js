// SOLMAR — Streets of the Sun
// The world: one state object holding everything alive in the city, plus the
// collision helpers every system shares. Nothing here draws or listens to
// input; it only holds state and answers geometry questions.

import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';

/** A fresh world for one play session, driven by a single seed. */
export function createWorld(seed) {
  const rng = makeRng(seed);
  const city = buildCity();
  return {
    seed,
    rng,
    city,
    frame: 0,
    time: 0,
    state: 'title',
    paused: false,
    player: {
      x: 1600, y: 1150, angle: 0, aimAngle: 0,
      health: CONFIG.playerHealth, inCar: null,
      weapon: 'pistol', ammo: 0, reloadTimer: 0, shootTimer: 0,
      hurtFlash: 0,
    },
    cars: [],
    traffic: [],
    peds: [],
    cops: [],
    cruisers: [],
    bullets: [],
    enemies: [],
    particles: [],
    toasts: [],
    crates: [],
    money: CONFIG.startingMoney,
    totalEarned: 0,
    heat: 0,
    wanted: 0,
    unseenTimer: 0,
    mission: {
      index: 0, stage: 'idle', timer: 0,
      targetsLeft: 0, wave: 0,
      objective: 'Tekan Enter untuk mulai misi pertama.',
      marker: null,
    },
    completed: false,
    camera: { x: 1600, y: 1150 },
    mouse: { x: 0, y: 0, down: false },
    stats: { shotsFired: 0, carsStolen: 0, missionsDone: 0 },
  };
}

/** True when a circle overlaps an axis-aligned rectangle. */
export function circleRectOverlap(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/** True when a point sits inside a rectangle (edges inclusive). */
export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** True when two rectangles overlap. */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when a circle at (x, y) is blocked: a building, the sea, or the map edge. */
export function isBlocked(world, x, y, r) {
  if (x < r || y < r || x > CONFIG.worldWidth - r || y > CONFIG.worldHeight - r) return true;
  if (y > 2180 + 40) return true;
  for (const b of world.city.buildings) {
    if (circleRectOverlap(x, y, r, b)) return true;
  }
  return false;
}

/**
 * Push a circular entity out of every building it overlaps. Moves the entity
 * to the nearest free edge and returns true when anything collided.
 */
export function resolveBuildings(world, ent, r) {
  let hit = false;
  for (const b of world.city.buildings) {
    if (!circleRectOverlap(ent.x, ent.y, r, b)) continue;
    hit = true;
    const left = ent.x - (b.x - r);
    const right = (b.x + b.w + r) - ent.x;
    const top = ent.y - (b.y - r);
    const bottom = (b.y + b.h + r) - ent.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) ent.x = b.x - r;
    else if (m === right) ent.x = b.x + b.w + r;
    else if (m === top) ent.y = b.y - r;
    else ent.y = b.y + b.h + r;
  }
  return hit;
}

/** Clamp an entity inside the map bounds (walls, not the sea: the beach is open). */
export function clampToMap(ent, r) {
  ent.x = Math.max(r, Math.min(CONFIG.worldWidth - r, ent.x));
  ent.y = Math.max(r, Math.min(CONFIG.worldHeight - r, ent.y));
}

/** Keep the camera centred on a point while staying inside the map. */
export function clampCamera(camera, focusX, focusY, viewW, viewH) {
  const hw = viewW / 2;
  const hh = viewH / 2;
  camera.x = Math.max(hw, Math.min(CONFIG.worldWidth - hw, focusX));
  camera.y = Math.max(hh, Math.min(CONFIG.worldHeight - hh, focusY));
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Angle from (ax, ay) to (bx, by). */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest signed turn from angle a to angle b, in (-PI, PI]. */
export function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** A toast message on screen for a few seconds. */
export function toast(world, text, seconds = 3) {
  world.toasts.push({ text, left: seconds });
  if (world.toasts.length > 4) world.toasts.shift();
}

/** The player's position, on foot or in a car. */
export function playerPos(world) {
  const p = world.player;
  if (p.inCar) return { x: p.inCar.x, y: p.inCar.y };
  return { x: p.x, y: p.y };
}

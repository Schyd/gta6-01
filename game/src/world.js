// world.js — the city of Solmar Bay and the living game state. The city is
// generated once from a seed: a street grid, downtown towers, a park, a palm
// beach, a harbor and a mansion hill. This file owns the state object and the
// shared helpers (roads, collisions, spawning); the per-system updates live
// in vehicles.js, police.js and missions.js.

import { AVENUES, STREETS, ROAD_HALF, WORLD_W, WORLD_H, DISTRICTS, POIS, CAR_TYPES, PALETTE, clamp, dist2 } from './config.js';
import { createRandom, pick, randInt } from './random.js';

export const STEP = 1 / 60;

// Is a point on a road (including the sidewalk edge)? Roads are the avenues
// and streets, each ROAD_HALF wide on either side of its centre line.
export function onRoad(x, y) {
  for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_HALF + 14) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_HALF + 14) return true;
  return false;
}

// The nearest point on the road network to (x, y), for spawning and routing.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y: clamp(y, 40, WORLD_H - 40), axis: 'v' }; }
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x: clamp(x, 40, WORLD_W - 40), y: sy, axis: 'h' }; }
  }
  return best;
}

// Does a circle of radius r at (x, y) hit a building?
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Is a point inside the sea (the beach water strip) or the harbor basin?
export function inWater(x, y) {
  if (y > WORLD_H - 40) return true;
  const h = DISTRICTS.harbor;
  if (x > h.x + 180 && x < h.x + h.w && y > h.y + 120 && y < h.y + h.h) return true;
  return false;
}

// Build the city deterministically from a seed.
export function buildCity(seed) {
  const rng = createRandom(seed);
  const buildings = [];
  const trees = [];
  const palms = [];
  const lamps = [];

  const blocksX = [0, ...AVENUES, WORLD_W];
  const blocksY = [0, ...STREETS, WORLD_H];
  const roofColors = PALETTE.buildingRoof;

  for (let bi = 0; bi < blocksX.length - 1; bi += 1) {
    for (let bj = 0; bj < blocksY.length - 1; bj += 1) {
      const x0 = blocksX[bi] + (bi === 0 ? 20 : ROAD_HALF + 18);
      const x1 = blocksX[bi + 1] - (bi === blocksX.length - 2 ? 20 : ROAD_HALF + 18);
      const y0 = blocksY[bj] + (bj === 0 ? 20 : ROAD_HALF + 18);
      const y1 = blocksY[bj + 1] - (bj === blocksY.length - 2 ? 20 : ROAD_HALF + 18);
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 90 || h < 90) continue;
      // The park block stays green, the harbor block stays open water/docks,
      // the hill block holds the mansion, the beach strip stays sand.
      const cx = x0 + w / 2;
      const cy = y0 + h / 2;
      if (cx > DISTRICTS.park.x && cx < DISTRICTS.park.x + DISTRICTS.park.w &&
          cy > DISTRICTS.park.y && cy < DISTRICTS.park.y + DISTRICTS.park.h) {
        for (let t = 0; t < 26; t += 1) {
          trees.push({ x: x0 + 30 + rng() * (w - 60), y: y0 + 30 + rng() * (h - 60), r: 10 + rng() * 8 });
        }
        continue;
      }
      if (cx > DISTRICTS.harbor.x && cy > DISTRICTS.harbor.y && cy < DISTRICTS.harbor.y + DISTRICTS.harbor.h) continue;
      if (cx < DISTRICTS.hill.x + DISTRICTS.hill.w && cy < DISTRICTS.hill.y + DISTRICTS.hill.h) continue;
      if (y0 > DISTRICTS.beach.y - 60) continue;
      // One to four buildings per block, with a margin for sidewalks.
      const downtown = cx > DISTRICTS.downtown.x && cx < DISTRICTS.downtown.x + DISTRICTS.downtown.w &&
        cy > DISTRICTS.downtown.y && cy < DISTRICTS.downtown.y + DISTRICTS.downtown.h;
      const count = downtown ? (rng() < 0.5 ? 1 : 2) : (1 + Math.floor(rng() * 3));
      for (let n = 0; n < count; n += 1) {
        const bw = Math.min(w - 30, downtown ? 130 + rng() * 90 : 90 + rng() * 110);
        const bh = Math.min(h - 30, downtown ? 130 + rng() * 90 : 80 + rng() * 90);
        const bx = x0 + 15 + rng() * Math.max(1, w - bw - 30);
        const by = y0 + 15 + rng() * Math.max(1, h - bh - 30);
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: pick(rng, roofColors),
          tall: downtown && rng() < 0.6,
          windows: downtown,
        });
      }
      // A tree or two on grassy blocks.
      if (rng() < 0.6) {
        trees.push({ x: x0 + 20 + rng() * (w - 40), y: y0 + 20 + rng() * (h - 40), r: 9 + rng() * 6 });
      }
    }
  }

  // Palm trees along the beach promenade.
  for (let x = 80; x < WORLD_W - 80; x += 130) {
    palms.push({ x: x + randInt(rng, -20, 20), y: 2235 + randInt(rng, -8, 8), r: 12 });
  }
  // Trees and hedges around the mansion hill.
  for (let t = 0; t < 14; t += 1) {
    trees.push({ x: 20 + rng() * 300, y: 20 + rng() * 260, r: 10 + rng() * 8 });
  }
  // Street lamps at every intersection.
  for (const ax of AVENUES) {
    for (const sy of STREETS) lamps.push({ x: ax + ROAD_HALF + 6, y: sy + ROAD_HALF + 6 });
  }

  return { buildings, trees, palms, lamps, seed };
}

// A fresh game state. The player starts on foot near the garage district.
export function createGame(seed) {
  const rng = createRandom(seed);
  const city = buildCity(seed);
  const G = {
    seed,
    rng,
    city,
    time: 0,
    screen: 'title', // title | play | paused | shop | busted | wasted | finale
    shopKind: null,
    camera: { x: 1600, y: 1200 },
    player: {
      x: 2280, y: 1560, angle: -Math.PI / 2, hp: 100, money: 250,
      weapon: 'pistol', ammo: { pistol: 48, smg: 0, rifle: 0 }, mag: { pistol: 12, smg: 0, rifle: 0 },
      owned: ['pistol'], inCar: null, speed: 0, invuln: 0, reloading: 0, fireTimer: 0,
    },
    cars: [],
    peds: [],
    footCops: [],
    cruisers: [],
    enemies: [],
    bullets: [],
    particles: [],
    crates: [],
    wanted: 0,
    heat: 0,
    unseenTimer: 0,
    missionIndex: 0,
    mission: null,
    missionTimer: 0,
    missionDone: false,
    toasts: [],
    stats: { carsStolen: 0, shotsFired: 0, kills: 0, missionsDone: 0, moneyEarned: 0 },
    fireworks: [],
    finaleShown: false,
    saveNotice: '',
  };
  return G;
}

// Add a car to the world. driver: 'parked' | 'traffic' | 'player' | 'police'.
export function addCar(G, typeKey, x, y, angle, driver) {
  const type = CAR_TYPES.find((t) => t.key === typeKey);
  const car = {
    type, x, y, angle, speed: 0, driver, hp: 100, id: G.cars.length + 1,
    axis: Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle)) ? 'v' : 'h',
    dir: 1, turnTimer: 0, dead: false, sirenPhase: 0,
  };
  G.cars.push(car);
  return car;
}

// Add a pedestrian on a sidewalk near a road.
export function addPed(G, x, y) {
  const p = {
    x, y, angle: G.rng() * Math.PI * 2, speed: 40 + G.rng() * 30,
    color: ['#e8a0a0', '#a0c8e8', '#c8e8a0', '#e8d8a0', '#d8a0e8'][Math.floor(G.rng() * 5)],
    flee: 0, fleeX: 0, fleeY: 0, reportTimer: 0, reported: false, walkPhase: G.rng() * 6,
  };
  G.peds.push(p);
  return p;
}

// A toast message at the top of the screen (sized to its text by the HUD).
export function toast(G, text, seconds = 3.5) {
  G.toasts.push({ text, t: seconds });
  if (G.toasts.length > 3) G.toasts.shift();
}

// Spawn a burst of particles (sparks, smoke, blood, fireworks).
export function burst(G, x, y, color, count, speed = 160, life = 0.7) {
  for (let i = 0; i < count; i += 1) {
    const a = G.rng() * Math.PI * 2;
    const s = speed * (0.4 + G.rng() * 0.8);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: life * (0.5 + G.rng()), maxLife: life, size: 2 + G.rng() * 3 });
  }
  if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
}

// A gunshot noise: pedestrians flee, witnesses may report the crime.
export function gunshotNoise(G, x, y) {
  for (const p of G.peds) {
    const d2 = dist2(p.x, p.y, x, y);
    if (d2 < 320 * 320) {
      p.flee = 3;
      p.fleeX = x;
      p.fleeY = y;
    }
    if (d2 < 240 * 240 && !p.reported) {
      p.reportTimer = 2.5;
    }
  }
}

// SOLMAR — Streets of the Sun
// The city: a fixed street grid, five districts, buildings that block movement,
// parks, a beach with water, and the shops and mission landmarks. The layout is
// built from one constant seed, so every load draws the same city.

import { CONFIG } from './config.js';
import { makeRng, range, rint, pick } from './random.js';

/** The water's edge: everything south of this line is beach, then sea. */
export const SEA_LINE = 2180;

/** Build the whole city once. Pure: same input, same city, every time. */
export function buildCity() {
  const rng = makeRng(1337);
  const { worldWidth: W, worldHeight: H, avenues, streets, roadWidth } = CONFIG;
  const half = roadWidth / 2;

  // Buildings: one or two solid blocks inside each street block, with a roof
  // colour, a height for its drawn shadow, and a window pattern seed.
  const buildings = [];
  const blockColors = ['#c98f5f', '#b57a52', '#a86f4b', '#cfa06b', '#9c6b4a', '#bb8a5e'];
  for (let ax = 0; ax < avenues.length - 1; ax++) {
    for (let sy = 0; sy < streets.length - 1; sy++) {
      const x0 = avenues[ax] + half + 18;
      const x1 = avenues[ax + 1] - half - 18;
      const y0 = streets[sy] + half + 18;
      const y1 = streets[sy + 1] - half - 18;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // The mansion district keeps one big house per block, the rest get two.
      const mansionBlock = x0 > 2350 && y0 < 500;
      const count = mansionBlock ? 1 : rint(rng, 1, 2);
      for (let i = 0; i < count; i++) {
        const bw = mansionBlock ? x1 - x0 - 30 : range(rng, 90, (x1 - x0) / count - 24);
        const bh = mansionBlock ? y1 - y0 - 30 : range(rng, 80, y1 - y0 - 24);
        const bx = mansionBlock ? x0 + 15 : x0 + i * ((x1 - x0) / count) + 8;
        const by = y0 + 10 + (mansionBlock ? 0 : range(rng, 0, Math.max(0, y1 - y0 - bh - 16)));
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: mansionBlock ? '#e8dcc3' : pick(rng, blockColors),
          roof: pick(rng, ['#7a5a3a', '#5d6b7a', '#8a4a3a', '#6b7a52']),
          height: mansionBlock ? 26 : rint(rng, 10, 30),
          seed: rint(rng, 1, 99999),
        });
      }
    }
  }

  // Parks: soft green rectangles with trees, placed inside open blocks.
  const parks = [
    { x: 1060, y: 860, w: 320, h: 300, trees: 14 },
    { x: 1660, y: 1310, w: 300, h: 280, trees: 12 },
    { x: 460, y: 1310, w: 300, h: 280, trees: 10 },
  ];
  const trees = [];
  for (const park of parks) {
    for (let i = 0; i < park.trees; i++) {
      trees.push({
        x: range(rng, park.x + 20, park.x + park.w - 20),
        y: range(rng, park.y + 20, park.y + park.h - 20),
        r: range(rng, 9, 15),
      });
    }
  }

  // Shops and landmarks, placed on road corners so the player can reach them.
  const shops = {
    weapon: { x: 1010, y: 320, label: 'TOKO SENJATA' },
    clinic: { x: 2210, y: 770, label: 'KLINIK' },
    spray: { x: 1610, y: 2120, label: 'BENGKEL CAT' },
    garage: { x: 1580, y: 470, label: 'GARASI' },
  };
  const missionSpots = {
    falco: { x: 2230, y: 380 },
    turf: { x: 2450, y: 950, r: 320 },
    mansion: { x: 2650, y: 300, r: 260 },
    crates: [
      { x: 430, y: 380 }, { x: 1030, y: 830 }, { x: 1630, y: 1280 },
      { x: 2230, y: 1730 }, { x: 2830, y: 830 }, { x: 430, y: 1730 },
    ],
    courier: [
      { x: 430, y: 380 }, { x: 2830, y: 1730 }, { x: 1030, y: 2120 },
    ],
  };

  return {
    width: W, height: H, avenues, streets, roadWidth, half,
    buildings, parks, trees, shops, missionSpots,
  };
}

/** True when a point is on a road (not a sidewalk, not a block). */
export function onRoad(city, x, y) {
  const h = city.half;
  for (const ax of city.avenues) if (Math.abs(x - ax) < h) return true;
  for (const sy of city.streets) if (Math.abs(y - sy) < h) return true;
  return false;
}

/** True when a point is on a sidewalk ring beside a road. */
export function onSidewalk(city, x, y) {
  const h = city.half + CONFIG.sidewalkWidth;
  const r = city.half;
  for (const ax of city.avenues) {
    if (Math.abs(x - ax) < h && Math.abs(x - ax) >= r) return true;
  }
  for (const sy of city.streets) {
    if (Math.abs(y - sy) < h && Math.abs(y - sy) >= r) return true;
  }
  return false;
}

/** The nearest road centre point to (x, y), for snapping traffic onto roads. */
export function nearestRoadPoint(city, x, y) {
  let bestX = city.avenues[0];
  let bestD = Infinity;
  for (const ax of city.avenues) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; bestX = ax; }
  }
  let bestY = city.streets[0];
  bestD = Infinity;
  for (const sy of city.streets) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; bestY = sy; }
  }
  // Snap to whichever road axis is closer to the point.
  return Math.abs(x - bestX) < Math.abs(y - bestY)
    ? { x: bestX, y }
    : { x, y: bestY };
}

/** A point inside the sea (south of the beach line). */
export function inSea(x, y) {
  return y > SEA_LINE + 40;
}

/** The district name for a point, or 'Solmar Bay' when it matches none. */
export function districtAt(city, x, y) {
  for (const d of CONFIG.districts) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Solmar Bay';
}

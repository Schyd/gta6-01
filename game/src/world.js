// The city of Solmar Bay: a road grid, downtown towers, Coral Park, Palm Beach,
// the harbor, the Voss mansion hill, shops and street props. Everything is laid out
// once from the seed, then the game only reads it.
import { PAL, PARK_CENTER, ROAD_HALF, ROAD_X, ROAD_Y, SHOP_DEFS, WORLD_H, WORLD_W } from './config.js';
import { clamp, pick, range } from './random.js';

const PARK = { x0: 1000, y0: 1000, x1: 1400, y1: 1400 };
const BEACH_Y = 2200; // south of here is sand, then sea
const HARBOR_X = 3000; // east of here is docks, then sea
const MANSION_BLOCK = { x0: 200, y0: 200, x1: 600, y1: 600 };

export function buildCity(random) {
  const buildings = [];
  const trees = [];
  const palms = [];
  const lamps = [];

  function blockIsPark(x0, y0, x1, y1) {
    return x0 >= PARK.x0 && y0 >= PARK.y0 && x1 <= PARK.x1 && y1 <= PARK.y1;
  }
  function blockIsMansion(x0, y0, x1, y1) {
    return x0 >= MANSION_BLOCK.x0 && y0 >= MANSION_BLOCK.y0 && x1 <= MANSION_BLOCK.x1 && y1 <= MANSION_BLOCK.y1;
  }

  // Buildings fill every block that is not park, beach, harbor or the mansion hill.
  for (let ix = 0; ix < ROAD_X.length - 1; ix += 1) {
    for (let iy = 0; iy < ROAD_Y.length - 1; iy += 1) {
      const x0 = ROAD_X[ix] + ROAD_HALF + 14;
      const x1 = ROAD_X[ix + 1] - ROAD_HALF - 14;
      const y0 = ROAD_Y[iy] + ROAD_HALF + 14;
      const y1 = ROAD_Y[iy + 1] - ROAD_HALF - 14;
      if (y0 >= BEACH_Y || x0 >= HARBOR_X) continue;
      if (blockIsPark(x0, y0, x1, y1) || blockIsMansion(x0, y0, x1, y1)) continue;
      const downtown = x0 >= 1400 && x0 < 2200 && y0 >= 600 && y0 < 1400;
      const count = downtown ? 1 : 1 + Math.floor(random() * 3);
      for (let b = 0; b < count; b += 1) {
        const w = downtown ? range(random, 220, 300) : range(random, 90, 170);
        const h = downtown ? range(random, 220, 300) : range(random, 80, 150);
        const bx = range(random, x0, Math.max(x0 + 1, x1 - w));
        const by = range(random, y0, Math.max(y0 + 1, y1 - h));
        const tall = downtown && random() < 0.6;
        buildings.push({
          x: bx, y: by, w, h,
          color: pick(random, PAL.building),
          roof: pick(random, PAL.roof),
          tall,
          windows: tall ? 6 : 3,
        });
      }
    }
  }

  // Coral Park: trees, a pond and paths.
  for (let i = 0; i < 46; i += 1) {
    trees.push({ x: range(random, PARK.x0 + 30, PARK.x1 - 30), y: range(random, PARK.y0 + 30, PARK.y1 - 30), r: range(random, 12, 20) });
  }
  // Mansion hill: the Voss mansion plus garden trees.
  for (let i = 0; i < 14; i += 1) {
    trees.push({ x: range(random, 240, 560), y: range(random, 240, 560), r: range(random, 12, 18) });
  }
  // Palms along the beach and the harbor promenade.
  for (let x = 120; x < 3000; x += 130) palms.push({ x: x + range(random, -20, 20), y: 2245 + range(random, -8, 8) });
  for (let y = 120; y < 2200; y += 150) palms.push({ x: 3065 + range(random, -8, 8), y: y + range(random, -20, 20) });
  // Scattered street trees on block corners.
  for (let ix = 0; ix < ROAD_X.length; ix += 1) {
    for (let iy = 0; iy < ROAD_Y.length; iy += 1) {
      if (random() < 0.5) trees.push({ x: ROAD_X[ix] + 70, y: ROAD_Y[iy] + 70, r: range(random, 10, 16) });
    }
  }
  // Street lamps at intersections.
  for (const x of ROAD_X) for (const y of ROAD_Y) lamps.push({ x: x + 58, y: y - 58 });

  const shops = SHOP_DEFS.map((s) => ({ ...s, w: 120, h: 80 }));

  return { buildings, trees, palms, lamps, shops, park: PARK, beachY: BEACH_Y, harborX: HARBOR_X, mansionBlock: MANSION_BLOCK };
}

// --- Collision and road helpers (pure, used by vehicles, police and the player) ---

export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps; returns true when a push happened.
export function resolveBuildingCollision(city, body, r) {
  let pushed = false;
  for (const b of city.buildings) {
    const cx = clamp(body.x, b.x, b.x + b.w);
    const cy = clamp(body.y, b.y, b.y + b.h);
    let dx = body.x - cx;
    let dy = body.y - cy;
    let d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    pushed = true;
    if (d2 < 0.0001) {
      // Centre inside the rectangle: push out along the smallest penetration axis.
      const left = body.x - b.x;
      const right = b.x + b.w - body.x;
      const top = body.y - b.y;
      const bottom = b.y + b.h - body.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) body.x = b.x - r;
      else if (m === right) body.x = b.x + b.w + r;
      else if (m === top) body.y = b.y - r;
      else body.y = b.y + b.h + r;
    } else {
      const d = Math.sqrt(d2);
      body.x = cx + (dx / d) * r;
      body.y = cy + (dy / d) * r;
    }
  }
  return pushed;
}

export function onRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) <= ROAD_HALF) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) <= ROAD_HALF) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROAD_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y: clamp(y, 0, WORLD_H), axis: 'y', line: rx }; }
  }
  for (const ry of ROAD_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x: clamp(x, 0, WORLD_W), y: ry, axis: 'x', line: ry }; }
  }
  return best;
}

export function inWater(x, y) {
  return y > 2320 || x > 3120;
}

export function inPark(x, y) {
  return x >= PARK.x0 && x <= PARK.x1 && y >= PARK.y0 && y <= PARK.y1;
}

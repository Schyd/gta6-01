// The city of Solmar Bay: a road grid, blocks of buildings, parks, a beach
// and a harbour, all generated from one seed. Also the collision queries the
// cars, the player and the police all share.
import { BLOCK, H_ROADS, PALETTE, ROAD_W, V_ROADS, WORLD_H, WORLD_W } from './config.js';

const ROOFS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];

export function buildCity(rng) {
  const buildings = [];
  const trees = [];
  const parks = [];

  for (let vi = 0; vi < V_ROADS.length - 1; vi++) {
    for (let hi = 0; hi < H_ROADS.length - 1; hi++) {
      const x0 = V_ROADS[vi] + ROAD_W / 2 + 14;
      const x1 = V_ROADS[vi + 1] - ROAD_W / 2 - 14;
      const y0 = H_ROADS[hi] + ROAD_W / 2 + 14;
      const y1 = H_ROADS[hi + 1] - ROAD_W / 2 - 14;
      const bw = x1 - x0;
      const bh = y1 - y0;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const downtown = vi >= 2 && vi <= 4 && hi >= 1 && hi <= 3;
      // The south strip is beach, the east strip is the harbour.
      if (hi === H_ROADS.length - 2) continue;
      if (vi === V_ROADS.length - 2 && hi >= 3) continue;
      if (rng.chance(0.16)) {
        parks.push({ x: cx, y: cy, w: bw, h: bh });
        const n = Math.floor(rng.range(5, 9));
        for (let i = 0; i < n; i++) {
          trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(9, 15) });
        }
        continue;
      }
      const cols = downtown ? 2 : rng.chance(0.5) ? 2 : 1;
      const rows = rng.chance(0.5) ? 2 : 1;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const w = bw / cols - 18;
          const h = bh / rows - 18;
          const bx = x0 + (c + 0.5) * (bw / cols);
          const by = y0 + (r + 0.5) * (bh / rows);
          buildings.push({
            x: bx, y: by, w, h,
            color: rng.pick(ROOFS),
            tall: downtown && rng.chance(0.55),
            roofSeed: rng.next(),
          });
        }
      }
    }
  }

  // Palm-lined beach along the south edge, water beyond it.
  for (let x = 80; x < WORLD_W - 60; x += 90) {
    trees.push({ x: x + rng.range(-20, 20), y: WORLD_H - 130 + rng.range(-14, 14), r: rng.range(10, 14), palm: true });
  }

  const shops = [
    { kind: 'gun', name: 'SOLMAR ARMS', x: V_ROADS[1], y: H_ROADS[2] - 60 },
    { kind: 'clinic', name: 'CLINIC', x: V_ROADS[4], y: H_ROADS[1] + 60 },
    { kind: 'spray', name: 'SPRAY SHOP', x: V_ROADS[5], y: H_ROADS[4] - 60 },
    { kind: 'gun', name: 'SOLMAR ARMS', x: V_ROADS[2], y: H_ROADS[5] + 60 },
  ];
  const safehouse = { x: V_ROADS[0], y: H_ROADS[0] + 60, name: 'SAFEHOUSE' };

  return { buildings, trees, parks, shops, safehouse };
}

export function isOnRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of V_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of H_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}

function circleHitsRect(x, y, r, b) {
  const cx = Math.max(b.x - b.w / 2, Math.min(x, b.x + b.w / 2));
  const cy = Math.max(b.y - b.h / 2, Math.min(y, b.y + b.h / 2));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r < b.x - b.w / 2 || x - r > b.x + b.w / 2 || y + r < b.y - b.h / 2 || y - r > b.y + b.h / 2) continue;
    if (circleHitsRect(x, y, r, b)) return b;
  }
  return null;
}

export function inWorld(x, y, margin = 20) {
  return x > margin && x < WORLD_W - margin && y > margin && y < WORLD_H - margin;
}

// A random point on a road, at least `minDist` from (fx, fy) when given.
export function randomRoadPoint(rng, fx = null, fy = null, minDist = 0) {
  for (let tries = 0; tries < 40; tries++) {
    let x; let y;
    if (rng.chance(0.5)) {
      x = rng.pick(V_ROADS);
      y = rng.range(120, WORLD_H - 260);
    } else {
      x = rng.range(120, WORLD_W - 160);
      y = rng.pick(H_ROADS);
    }
    if (fx !== null && Math.hypot(x - fx, y - fy) < minDist) continue;
    return { x, y };
  }
  return { x: V_ROADS[3], y: H_ROADS[3] };
}

export function roadPointNear(rng, x, y, minDist, maxDist) {
  for (let tries = 0; tries < 40; tries++) {
    const p = randomRoadPoint(rng);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d >= minDist && d <= maxDist) return p;
  }
  return randomRoadPoint(rng, x, y, minDist);
}

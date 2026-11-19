// Pedestrians: they stroll the sidewalks, scatter from gunfire and crashes,
// and report crimes they witness — which is how a stolen car earns a star.
import { H_ROADS, V_ROADS } from './config.js';
import { randomRoadPoint } from './city.js';

const SHIRTS = ['#d95f4b', '#4b7dd9', '#e8b93a', '#7fb069', '#c77dff', '#f2f2f2', '#3aa7a3'];

export function spawnPedestrians(state, count) {
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(state.rng, state.player.x, state.player.y, 300);
    const vertical = state.rng.chance(0.5);
    state.peds.push({
      x: p.x + (vertical ? 52 : 0), y: p.y + (vertical ? 0 : 52),
      vertical, dir: state.rng.chance(0.5) ? 1 : -1,
      speed: 34 + state.rng.range(0, 26),
      shirt: state.rng.pick(SHIRTS),
      flee: 0, fleeX: 0, fleeY: 0,
      dead: false, t: state.rng.next() * 10,
    });
  }
}

export function scarePeds(state, x, y, radius) {
  for (const ped of state.peds) {
    if (ped.dead) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.flee = 2.2;
      ped.fleeX = (ped.x - x) / (d || 1);
      ped.fleeY = (ped.y - y) / (d || 1);
      // A witness calls it in: a crime in plain sight raises the heat.
      if (state.wanted < 1 && d < 260) state.wanted = 1;
    }
  }
}

export function updatePeds(state, dt) {
  for (const ped of state.peds) {
    if (ped.dead) continue;
    ped.t += dt;
    if (ped.flee > 0) {
      ped.flee -= dt;
      ped.x += ped.fleeX * 150 * dt;
      ped.y += ped.fleeY * 150 * dt;
      continue;
    }
    // Stroll along the sidewalk; turn at intersections, bounce at the edge.
    if (ped.vertical) {
      ped.y += ped.dir * ped.speed * dt;
      const onH = H_ROADS.some((ry) => Math.abs(ped.y - ry) < 8);
      if (onH && state.rng.chance(0.02)) { ped.vertical = false; ped.dir = state.rng.chance(0.5) ? 1 : -1; }
      if (ped.y < 60 || ped.y > 2160) ped.dir *= -1;
    } else {
      ped.x += ped.dir * ped.speed * dt;
      const onV = V_ROADS.some((rx) => Math.abs(ped.x - rx) < 8);
      if (onV && state.rng.chance(0.02)) { ped.vertical = true; ped.dir = state.rng.chance(0.5) ? 1 : -1; }
      if (ped.x < 60 || ped.x > 3060) ped.dir *= -1;
    }
  }
  // Keep the streets busy: replace peds that wandered far from the player.
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - state.player.x, ped.y - state.player.y) > 1100) {
      const p = randomRoadPoint(state.rng, state.player.x, state.player.y, 500);
      ped.x = p.x; ped.y = p.y; ped.dead = false;
    }
  }
}

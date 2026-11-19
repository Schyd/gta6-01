// SOLMAR — Streets of the Sun
// Pedestrians: they stroll the sidewalks, flee from danger, and some of them
// phone the police when they witness a crime.

import { CONFIG } from './config.js';
import { range, pick, rint } from './random.js';
import { onSidewalk, nearestRoadPoint } from './city.js';
import { dist, angleTo, resolveBuildings, clampToMap, toast } from './world.js';
import { addHeat } from './player.js';

/** Fill the sidewalks with strolling pedestrians. */
export function spawnPeds(world) {
  const rng = world.rng;
  const palette = ['#e07856', '#56a0e0', '#e0c956', '#9b6bd3', '#56c98a', '#e0568a', '#d8d3c3'];
  for (let i = 0; i < CONFIG.pedCount; i++) {
    const avenue = pick(rng, world.city.avenues);
    const street = pick(rng, world.city.streets);
    const onAvenue = rng() < 0.5;
    const x = onAvenue ? avenue + (rng() < 0.5 ? 82 : -82) : range(rng, 250, 2950);
    const y = onAvenue ? range(rng, 250, 2100) : street + (rng() < 0.5 ? 82 : -82);
    world.peds.push({
      x, y, angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 55, 95),
      color: pick(rng, palette),
      state: 'walk', target: null, reportTimer: 0, reported: false,
      fleeX: 0, fleeY: 0, walkTimer: range(rng, 0, 3),
    });
  }
}

/** One step for every pedestrian. */
export function updatePeds(world, dt) {
  for (const ped of world.peds) {
    if (ped.state === 'dead') continue;
    const danger = nearestDanger(world, ped);
    if (danger && ped.state !== 'flee') {
      ped.state = 'flee';
      ped.fleeX = ped.x - danger.x;
      ped.fleeY = ped.y - danger.y;
    }
    if (ped.state === 'flee') {
      const len = Math.hypot(ped.fleeX, ped.fleeY) || 1;
      ped.x += (ped.fleeX / len) * 190 * dt;
      ped.y += (ped.fleeY / len) * 190 * dt;
      ped.angle = Math.atan2(ped.fleeY, ped.fleeX);
      // The danger may be gone by now (a car drove off, a shot faded):
      // a fleeing pedestrian calms down when nothing threatens them.
      if (!danger || dist(ped.x, ped.y, danger.x, danger.y) > 320) ped.state = 'walk';
    } else if (ped.state === 'report') {
      ped.reportTimer -= dt;
      if (ped.reportTimer <= 0) {
        ped.state = 'walk';
        if (!ped.reported) {
          ped.reported = true;
          addHeat(world, CONFIG.heatPerReport, 'Saksi menelepon polisi!');
        }
      }
    } else {
      // Stroll: pick a nearby sidewalk point, walk to it, then pick another.
      ped.walkTimer -= dt;
      if (!ped.target || ped.walkTimer <= 0 || dist(ped.x, ped.y, ped.target.x, ped.target.y) < 24) {
        ped.target = pickWalkTarget(world, ped);
        ped.walkTimer = range(world.rng, 2, 5);
      }
      const want = angleTo(ped.x, ped.y, ped.target.x, ped.target.y);
      ped.angle = want;
      ped.x += Math.cos(want) * ped.speed * dt;
      ped.y += Math.sin(want) * ped.speed * dt;
      // A witness starts phoning when a fresh crime happened nearby.
      const crime = world.lastCrime;
      if (crime && world.time - crime.time < 2.5 && dist(ped.x, ped.y, crime.x, crime.y) < 260) {
        ped.state = 'report';
        ped.reportTimer = 1.5;
      }
    }
    resolveBuildings(world, ped, 12);
    clampToMap(ped, 12);
  }
  world.peds = world.peds.filter((p) => p.state !== 'dead');
}

/** The nearest danger to a pedestrian: a gunshot, or a fast car close by. */
function nearestDanger(world, ped) {
  const shot = world.lastShot;
  if (shot && world.time - shot.time < 0.8 && dist(ped.x, ped.y, shot.x, shot.y) < 300) {
    return { x: shot.x, y: shot.y };
  }
  const all = world.cars.concat(world.traffic, world.cruisers);
  for (const car of all) {
    if (Math.abs(car.speed) > 170 && dist(ped.x, ped.y, car.x, car.y) < 130) {
      return { x: car.x, y: car.y };
    }
  }
  return null;
}

/** A nearby point on the same road's sidewalk, for a stroll target. */
function pickWalkTarget(world, ped) {
  const rng = world.rng;
  const p = nearestRoadPoint(world.city, ped.x, ped.y);
  const along = range(rng, -260, 260);
  const side = pick(rng, [-82, 82]);
  if (Math.abs(ped.x - p.x) < 4) {
    return { x: p.x + side, y: Math.max(60, Math.min(2140, p.y + along)) };
  }
  return { x: Math.max(60, Math.min(3140, p.x + along)), y: p.y + side };
}

/** How many pedestrians are still alive and walking the city. */
export function countAlivePeds(world) {
  return world.peds.filter((p) => p.state !== 'dead').length;
}

/** A fast car hitting a pedestrian: the pedestrian falls, heat rises. */
export function checkPedHits(world) {
  const all = world.cars.concat(world.traffic, world.cruisers);
  for (const ped of world.peds) {
    if (ped.state === 'dead') continue;
    for (const car of all) {
      if (car.driver !== 'player' || Math.abs(car.speed) < 140) continue;
      if (dist(ped.x, ped.y, car.x, car.y) < 34) {
        ped.state = 'dead';
        world.lastCrime = { x: ped.x, y: ped.y, time: world.time };
        addHeat(world, CONFIG.heatPerPedHit, 'Kamu menabrak pejalan kaki!');
        spawnBurst(world, ped.x, ped.y, '#e07856');
        break;
      }
    }
  }
}

/** A small burst of particles (a hit, a fall, a pickup). */
export function spawnBurst(world, x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = world.rng() * Math.PI * 2;
    const sp = 60 + world.rng() * 140;
    world.particles.push({
      kind: 'spark', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5, max: 0.5, size: 3, color,
    });
  }
}

/** Move and age particles; drop the dead ones. */
export function updateParticles(world, dt) {
  for (const pt of world.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.kind === 'smoke') pt.size += 14 * dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
}

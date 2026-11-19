// SOLMAR — Streets of the Sun
// Vehicles: the seven car types, arcade driving physics with a little drift,
// traffic that follows the road grid, parked cars, damage, smoke and breakdown.

import { CONFIG } from './config.js';
import { range, pick, rint } from './random.js';
import { resolveBuildings, clampToMap, dist, angleDelta, angleTo } from './world.js';

/** Build one car of a type at a spot, facing an angle. */
export function makeCar(typeKey, x, y, angle, driver = 'parked') {
  const type = CONFIG.carTypes.find((t) => t.key === typeKey);
  return {
    typeKey, typeName: type.name,
    topSpeed: type.topSpeed, accel: type.accel, turn: type.turn,
    length: type.length, width: type.width,
    body: type.body, roof: type.roof,
    x, y, angle, speed: 0, vx: 0, vy: 0,
    health: 100, driver, parked: driver === 'parked',
    wasTraffic: false, route: null, routeIndex: 0,
    brakeLight: false, smokeTimer: 0, broken: false,
    // When this car last took impact damage; impacts closer than
    // the cooldown count as the same crash, not a new one.
    lastHitAt: -99,
  };
}

/** Park a spread of cars along the roads for the player to steal. */
export function spawnParkedCars(world) {
  const rng = world.rng;
  const spots = [];
  for (const ax of world.city.avenues) {
    for (const sy of world.city.streets) {
      spots.push({ x: ax + 95, y: sy + 55 });
      spots.push({ x: ax - 95, y: sy - 55 });
    }
  }
  for (let i = 0; i < 12; i++) {
    const spot = spots.splice(Math.floor(rng() * spots.length), 1)[0];
    if (!spot) break;
    const type = pick(rng, CONFIG.carTypes);
    const angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    world.cars.push(makeCar(type.key, spot.x, spot.y, angle, 'parked'));
  }
  // The Falco GT for mission one waits near the marina corner.
  const falco = makeCar('falco', world.city.missionSpots.falco.x, world.city.missionSpots.falco.y, Math.PI / 2, 'parked');
  world.cars.push(falco);
  world.falcoCar = falco;
}

/** Fill the roads with traffic cars that loop around the grid. */
export function spawnTraffic(world) {
  const rng = world.rng;
  for (let i = 0; i < CONFIG.trafficCount; i++) {
    const type = pick(rng, CONFIG.carTypes);
    const avenue = pick(rng, world.city.avenues);
    const street = pick(rng, world.city.streets);
    const onAvenue = rng() < 0.5;
    const car = makeCar(type.key, onAvenue ? avenue : range(rng, 300, 2900), onAvenue ? range(rng, 300, 2100) : street, onAvenue ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI), 'traffic');
    car.body = pick(rng, CONFIG.trafficColors);
    car.roof = '#2c2c34';
    car.wasTraffic = true;
    car.route = buildRoute(world, car.x, car.y);
    car.routeIndex = 0;
    car.cruise = range(rng, 150, 240);
    world.traffic.push(car);
  }
}

/** A loop of road intersections for a traffic car to follow. */
function buildRoute(world, x, y) {
  const rng = world.rng;
  const points = [];
  let cx = x;
  let cy = y;
  for (let i = 0; i < 8; i++) {
    const avenue = pick(rng, world.city.avenues);
    const street = pick(rng, world.city.streets);
    if (i % 2 === 0) points.push({ x: avenue, y: cy });
    else points.push({ x: cx, y: street });
    cx = points[points.length - 1].x;
    cy = points[points.length - 1].y;
  }
  return points;
}

/** Drive the player's car for one step. */
export function updatePlayerCar(world, input, dt) {
  const car = world.player.inCar;
  if (!car || car.broken) return;
  const accelInput = input.up ? 1 : input.down ? -0.55 : 0;
  car.speed += accelInput * car.accel * dt;
  if (accelInput === 0) car.speed -= car.speed * 0.9 * dt;
  if (car.speed > car.topSpeed) car.speed = car.topSpeed;
  if (car.speed < -car.topSpeed * 0.45) car.speed = -car.topSpeed * 0.45;
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 12) {
    car.angle += steer * car.turn * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 160);
  }
  // A little drift: velocity chases the heading instead of snapping to it.
  const targetVx = Math.cos(car.angle) * car.speed;
  const targetVy = Math.sin(car.angle) * car.speed;
  const grip = 1 - Math.exp(-6 * dt);
  car.vx += (targetVx - car.vx) * grip;
  car.vy += (targetVy - car.vy) * grip;
  const oldX = car.x;
  const oldY = car.y;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  const r = car.length * 0.42;
  if (resolveBuildings(world, car, r)) {
    // One crash, one hit: without the cooldown a wall scrape at speed
    // would charge 8 damage every frame and total the car in a blink.
    if (Math.abs(car.speed) > 260 && world.time - car.lastHitAt > 0.6) {
      damageCar(world, car, 8, true);
      car.lastHitAt = world.time;
    }
    car.speed *= 0.45;
    car.vx *= 0.4;
    car.vy *= 0.4;
    car.x = Math.max(0, car.x);
    car.y = Math.max(0, car.y);
  }
  clampToMap(car, r);
  // Cars may cruise the sand, but the sea stops them.
  if (car.y > 2220) {
    car.y = 2220;
    car.speed *= 0.5;
    car.vy = Math.min(0, car.vy);
  }
  if (car.x === oldX && car.y === oldY && Math.abs(car.speed) > 40) {
    car.speed *= 0.5;
  }
  car.brakeLight = input.down;
  updateCarSmoke(world, car, dt);
}

/** Move every traffic car along its route, slowing for the car ahead. */
export function updateTraffic(world, dt) {
  for (const car of world.traffic) {
    if (car.broken) continue;
    const target = car.route[car.routeIndex];
    const want = angleTo(car.x, car.y, target.x, target.y);
    const turn = angleDelta(car.angle, want);
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn));
    const ahead = carAhead(world, car, 90);
    const cruise = ahead ? Math.max(0, car.cruise - 120) : car.cruise;
    car.speed += (cruise - car.speed) * Math.min(1, 1.6 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const r = car.length * 0.42;
    resolveBuildings(world, car, r);
    clampToMap(car, r);
    if (dist(car.x, car.y, target.x, target.y) < 60) {
      car.routeIndex = (car.routeIndex + 1) % car.route.length;
    }
    updateCarSmoke(world, car, dt);
  }
}

/** The car directly ahead of this one on a similar heading, or null. */
function carAhead(world, car, rangeAhead) {
  const all = world.cars.concat(world.traffic);
  for (const other of all) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < rangeAhead && d > 1) {
      const facing = Math.cos(car.angle) * (dx / d) + Math.sin(car.angle) * (dy / d);
      if (facing > 0.86) return other;
    }
  }
  return null;
}

/** Push apart cars that overlap, and hurt both a little on hard hits. */
export function resolveCarCollisions(world) {
  const all = world.cars.concat(world.traffic, world.cruisers);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (a.length + b.length) * 0.32;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 220) {
          // One crash, one hit per car: two cars grinding together would
          // otherwise charge damage every frame and total both in a second.
          if (world.time - a.lastHitAt > 0.6) {
            damageCar(world, a, 4, false);
            a.lastHitAt = world.time;
          }
          if (world.time - b.lastHitAt > 0.6) {
            damageCar(world, b, 4, false);
            b.lastHitAt = world.time;
          }
        }
      }
    }
  }
}

/** Hurt a car; at zero health it breaks down and cannot drive. */
export function damageCar(world, car, amount, noisy) {
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    car.broken = true;
    car.speed = 0;
    if (car.driver === 'player' && noisy) {
      world.player.inCar = null;
    }
  }
}

/** Smoke puffs from a damaged car, on a timer. */
function updateCarSmoke(world, car, dt) {
  if (car.health >= 45 || car.broken) return;
  car.smokeTimer -= dt;
  if (car.smokeTimer <= 0) {
    car.smokeTimer = 0.12;
    world.particles.push({
      kind: 'smoke', x: car.x - Math.cos(car.angle) * car.length * 0.4,
      y: car.y - Math.sin(car.angle) * car.length * 0.4,
      vx: 0, vy: -24, life: 0.9, max: 0.9, size: 10,
    });
  }
}

// Vehicles: the seven stealable car types, arcade driving physics, traffic AI
// that follows the road grid, and car/car and car/building collisions.
import { CAR_TYPES, ROAD_HALF, ROAD_X, ROAD_Y, WORLD_H, WORLD_W } from './config.js';
import { clamp, dist, pick, range, turnToward } from './random.js';
import { circleHitsBuilding, inWater, resolveBuildingCollision } from './world.js';

let nextCarId = 1;

export function makeCar(type, x, y, angle, opts = {}) {
  const def = CAR_TYPES[type];
  return {
    id: nextCarId += 1,
    type,
    name: def.name,
    color: opts.color || def.color,
    x, y,
    angle,
    speed: 0,
    maxSpeed: def.maxSpeed,
    accel: def.accel,
    brake: def.brake,
    grip: def.grip,
    len: def.len,
    wid: def.wid,
    traffic: !!opts.traffic,
    police: !!opts.police,
    target: opts.target || null, // traffic: {axis, line, pos, dir}
    flash: 0, // police light phase
    stuck: 0,
  };
}

// Arcade driving: forward accel, reverse, steering that scales with speed,
// drag, and a hard push out of buildings.
export function driveCar(city, car, throttle, steer, dt) {
  const def = CAR_TYPES[car.type];
  if (throttle > 0) car.speed += def.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed += def.brake * throttle * dt;
    else car.speed += def.accel * 0.55 * throttle * dt; // reverse
  }
  car.speed -= car.speed * 0.55 * dt; // drag
  if (Math.abs(car.speed) < 2 && throttle === 0) car.speed = 0;
  car.speed = clamp(car.speed, -def.maxSpeed * 0.45, def.maxSpeed);
  const steerPower = car.grip * clamp(Math.abs(car.speed) / 120, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.angle += steer * steerPower * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx;
  car.y = ny;
  car.x = clamp(car.x, 30, WORLD_W - 30);
  car.y = clamp(car.y, 30, WORLD_H - 30);
  if (inWater(car.x, car.y)) {
    car.x = clamp(car.x, 30, WORLD_W - 30);
    car.y = clamp(car.y, 30, 2300);
    car.speed *= 0.5;
  }
  if (resolveBuildingCollision(city, car, car.len * 0.42)) {
    car.speed *= 0.55;
    return true; // crashed
  }
  return false;
}

function carRadius(car) {
  return car.len * 0.45;
}

// Soft circle repulsion between two cars; returns true when they touched.
export function collideCars(a, b) {
  const r = carRadius(a) + carRadius(b) - 10;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r || d2 < 0.01) return false;
  const d = Math.sqrt(d2);
  const push = (r - d) / 2;
  const ux = dx / d;
  const uy = dy / d;
  a.x -= ux * push;
  a.y -= uy * push;
  b.x += ux * push;
  b.y += uy * push;
  const exchange = (a.speed - b.speed) * 0.3;
  a.speed -= exchange;
  b.speed += exchange;
  return true;
}

// --- Traffic: cars that cruise the road grid and turn at intersections ---

export function spawnTrafficCar(random, city) {
  const vertical = random() < 0.5;
  const type = pick(random, ['sedan', 'sedan', 'taxi', 'pickup', 'van', 'coupe']);
  let car;
  if (vertical) {
    const line = pick(random, ROAD_X);
    const dir = random() < 0.5 ? 1 : -1;
    car = makeCar(type, line + (dir > 0 ? -22 : 22), range(random, 100, WORLD_H - 100), dir > 0 ? Math.PI / 2 : -Math.PI / 2, { traffic: true });
    car.target = { axis: 'y', line, pos: car.y, dir };
  } else {
    const line = pick(random, ROAD_Y);
    const dir = random() < 0.5 ? 1 : -1;
    car = makeCar(type, range(random, 100, WORLD_W - 100), line + (dir > 0 ? -22 : 22), dir > 0 ? 0 : Math.PI, { traffic: true });
    car.target = { axis: 'x', line, pos: car.x, dir };
  }
  car.speed = range(random, 120, 200);
  return car;
}

export function updateTrafficCar(random, city, car, dt, others) {
  const t = car.target;
  if (!t) return;
  // Slow down for a car ahead on the same lane.
  let slow = false;
  for (const o of others) {
    if (o === car || !o.target) continue;
    if (o.target.axis !== t.axis || o.target.line !== t.line || o.target.dir !== t.dir) continue;
    const along = t.axis === 'x' ? o.x - car.x : o.y - car.y;
    if (along * t.dir > 0 && along * t.dir < 90) { slow = true; break; }
  }
  const want = slow ? 60 : 170;
  car.speed += clamp(want - car.speed, -260 * dt, 200 * dt);
  const goalAngle = t.axis === 'x' ? (t.dir > 0 ? 0 : Math.PI) : (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  car.angle += turnToward(car.angle, goalAngle, 2.2 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (t.axis === 'x') t.pos = car.x; else t.pos = car.y;
  // At an intersection, sometimes turn onto the crossing road.
  const lines = t.axis === 'x' ? ROAD_Y : ROAD_X;
  for (const line of lines) {
    const pos = t.axis === 'x' ? car.x : car.y;
    if (Math.abs(pos - line) < 6 && random() < 0.35) {
      const newDir = random() < 0.5 ? 1 : -1;
      const newAxis = t.axis === 'x' ? 'y' : 'x';
      car.target = { axis: newAxis, line, pos: newAxis === 'x' ? car.x : car.y, dir: newDir };
      if (newAxis === 'x') car.y = line + (newDir > 0 ? -22 : 22);
      else car.x = line + (newDir > 0 ? -22 : 22);
      break;
    }
  }
  // Wrap around the map edges so traffic never runs out.
  if (car.x < 60) { car.x = WORLD_W - 80; car.target.pos = car.x; }
  if (car.x > WORLD_W - 60) { car.x = 80; car.target.pos = car.x; }
  if (car.y < 60) { car.y = WORLD_H - 80; car.target.pos = car.y; }
  if (car.y > WORLD_H - 60) { car.y = 80; car.target.pos = car.y; }
  if (resolveBuildingCollision(city, car, car.len * 0.42)) car.speed *= 0.6;
}

export function nearestParkedCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function carIsEmpty(car, player) {
  return player.car !== car;
}

export { circleHitsBuilding };

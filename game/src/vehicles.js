// Cars: the player's driving physics, traffic that follows the road grid,
// and the shared collision between cars and buildings.
import { CAR_TYPES, H_ROADS, V_ROADS, WORLD_H, WORLD_W } from './config.js';
import { hitsBuilding, inWorld, randomRoadPoint } from './city.js';

let nextId = 1;

export function createCar(type, x, y, angle, rng = null) {
  const spec = CAR_TYPES[type];
  const roll = rng ? () => rng.next() : Math.random;
  return {
    id: nextId++, type, spec,
    x, y, angle, speed: 0,
    color: type === 'taxi' ? spec.color : pickPaint(type, roll),
    health: 100,
    isPlayer: false,
    // Traffic state: which road it follows and which way along it.
    vertical: roll() < 0.5,
    dir: roll() < 0.5 ? 1 : -1,
    targetSpeed: 150,
    stuck: 0,
    dead: false,
  };
}

const PAINTS = ['#7d8aa0', '#c23b3b', '#3f6d4e', '#d9a441', '#5b7d9c', '#8a6f8e', '#e8e2d2', '#2e4a6b'];
function pickPaint(type, roll) {
  if (type === 'police') return '#22262e';
  return PAINTS[Math.floor(roll() * PAINTS.length)];
}

export function moveWithCollision(city, car, nx, ny, radius) {
  // Axis-separated movement: slide along walls instead of sticking to them.
  if (!hitsBuilding(city, nx, car.y, radius) && inWorld(nx, car.y, 24)) car.x = nx;
  if (!hitsBuilding(city, car.x, ny, radius) && inWorld(car.x, ny, 24)) car.y = ny;
}

export function drivePlayerCar(state, car, input, dt) {
  const spec = car.spec;
  const axis = input.axis();
  const forward = -axis.y; // W is forward
  const steer = axis.x;

  if (forward > 0) car.speed += spec.accel * dt;
  else if (forward < 0) {
    if (car.speed > 20) car.speed -= spec.brake * dt;
    else car.speed -= spec.accel * 0.55 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 260 * dt);
  }
  car.speed = Math.max(-170, Math.min(spec.maxSpeed, car.speed));

  const speedRatio = Math.abs(car.speed) / spec.maxSpeed;
  const turnRate = spec.turn * (0.35 + 0.65 * speedRatio) * Math.sign(car.speed || 1);
  car.angle += steer * turnRate * dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  moveWithCollision(state.city, car, nx, ny, 16);
  // Cars are solid: bumping another car shoves both and costs speed.
  for (const other of state.cars) {
    if (other === car || other.dead) continue;
    const dx = car.x - other.x;
    const dy = car.y - other.y;
    const d = Math.hypot(dx, dy);
    if (d < 42 && d > 0.01) {
      const push = (42 - d) / 2;
      const ax = dx / d;
      const ay = dy / d;
      car.x += ax * push;
      car.y += ay * push;
      if (!other.isCop) { other.x -= ax * push; other.y -= ay * push; }
      if (Math.abs(car.speed) > 150) {
        state.audio.crash();
        car.health -= Math.abs(car.speed) * 0.015;
        other.health -= Math.abs(car.speed) * 0.01;
        state.effects.push({ kind: 'spark', x: car.x, y: car.y, t: 0, life: 0.3 });
      }
      car.speed *= 0.55;
    }
  }
  const hitWall = Math.hypot(car.x - before.x, car.y - before.y) < Math.abs(car.speed) * dt * 0.4;
  if (hitWall && Math.abs(car.speed) > 120) {
    state.audio.crash();
    car.health -= Math.abs(car.speed) * 0.02;
    state.effects.push({ kind: 'smoke', x: car.x, y: car.y, t: 0, life: 0.7 });
    car.speed *= 0.35;
    if (state.wanted < 1) state.wanted = 1;
  }
  state.audio.setEngine(Math.abs(car.speed) / spec.maxSpeed, true);
  return hitWall;
}

function carAhead(state, car) {
  const look = 70;
  const ax = car.x + Math.cos(car.angle) * look;
  const ay = car.y + Math.sin(car.angle) * look;
  for (const other of state.cars) {
    if (other === car || other.dead) continue;
    if (Math.hypot(other.x - ax, other.y - ay) < 46) return other;
  }
  return null;
}

export function updateTraffic(state, dt) {
  const player = state.playerCar;
  for (const car of state.cars) {
    if (car.isPlayer || car.dead || car.isCop) continue;
    // Pick a speed and a lane; slow down for the car ahead.
    const ahead = carAhead(state, car);
    const want = ahead ? 0 : car.targetSpeed;
    car.speed += (want - car.speed) * Math.min(1, 2.2 * dt);
    if (car.speed < 4 && want === 0) car.stuck += dt; else car.stuck = 0;

    // At an intersection, sometimes turn onto the crossing road.
    const onV = V_ROADS.some((rx) => Math.abs(car.x - rx) < 6);
    const onH = H_ROADS.some((ry) => Math.abs(car.y - ry) < 6);
    if (onV && onH && state.rng.chance(0.012)) {
      car.vertical = !car.vertical;
      car.dir = state.rng.chance(0.5) ? 1 : -1;
      car.angle = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    } else {
      const target = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      let diff = target - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += diff * Math.min(1, 6 * dt);
    }

    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    moveWithCollision(state.city, car, nx, ny, 15);

    // Reaching the city edge turns the car around instead of leaving town.
    if (car.x < 90 || car.x > WORLD_W - 90 || car.y < 90 || car.y > WORLD_H - 260) {
      car.dir *= -1;
      car.angle += Math.PI;
    }
    // Keep a little distance from the player's car.
    if (player && Math.hypot(car.x - player.x, car.y - player.y) < 40) {
      const push = 40 - Math.hypot(car.x - player.x, car.y - player.y);
      const a = Math.atan2(car.y - player.y, car.x - player.x);
      car.x += Math.cos(a) * push;
      car.y += Math.sin(a) * push;
    }
  }
}

export function spawnTraffic(state, count) {
  const types = ['sedan', 'sedan', 'taxi', 'truck', 'van', 'muscle', 'sedan'];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(state.rng, state.player.x, state.player.y, 420);
    const car = createCar(types[i % types.length], p.x, p.y, 0, state.rng);
    car.vertical = state.rng.chance(0.5);
    car.dir = state.rng.chance(0.5) ? 1 : -1;
    car.angle = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    car.targetSpeed = 130 + state.rng.range(0, 80);
    state.cars.push(car);
  }
}

// A parked car the player can steal, placed on a road near a point.
export function spawnParkedCar(state, type, x, y, angle) {
  const car = createCar(type, x, y, angle, state.rng);
  car.targetSpeed = 0;
  state.cars.push(car);
  return car;
}

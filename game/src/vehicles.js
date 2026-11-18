// vehicles.js — cars: driving physics, stealing, traffic AI and car-car
// collisions. A car is driven by the player, by traffic following the road
// grid, or by the police. Physics are arcade: accelerate, brake, steer with
// grip, and slide a little when turning hard.

import { AVENUES, STREETS, ROAD_HALF, WORLD_W, WORLD_H, CAR_TYPES, clamp, angleDiff, dist2 } from './config.js';
import { hitsBuilding, onRoad, nearestRoadPoint, burst, toast, addCar, addPed } from './world.js';

// Drive one car one step. input: {throttle: -1..1, steer: -1..1}.
export function driveCar(G, car, input, dt) {
  const t = car.type;
  if (input.throttle > 0) car.speed += t.accel * input.throttle * dt;
  else if (input.throttle < 0) {
    if (car.speed > 20) car.speed -= t.accel * 1.6 * dt; // brake
    else car.speed += t.accel * 0.55 * input.throttle * dt; // reverse
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt); // drag
  }
  car.speed = clamp(car.speed, -t.maxSpeed * 0.45, t.maxSpeed);
  const steerAuthority = clamp(Math.abs(car.speed) / t.maxSpeed, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.angle += input.steer * t.grip * 0.55 * steerAuthority * dt * (Math.abs(car.speed) > 5 ? 1 : 0);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const r = t.len * 0.42;
  if (hitsBuilding(G.city, nx, ny, r)) {
    if (Math.abs(car.speed) > 180) {
      burst(G, nx, ny, '#ffcc44', 10, 200, 0.5);
      car.hp -= 4;
    }
    car.speed *= 0.4;
    car.angle += (G.rng() - 0.5) * 0.12;
  } else if (nx < 30 || nx > WORLD_W - 30 || ny < 30 || ny > WORLD_H - 30) {
    car.speed *= 0.4;
  } else {
    car.x = nx;
    car.y = ny;
  }
}

// Traffic: follow the road grid, turn at intersections, keep off the player.
export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.driver !== 'traffic' || car.dead) continue;
    // Target speed: cruise, slower near the player to avoid piling up.
    const target = 150 + ((car.id * 37) % 60);
    if (car.speed < target) car.speed += 120 * dt;
    else car.speed -= 120 * dt;
    car.turnTimer -= dt;
    const nearCrossing = isNearCrossing(car.x, car.y);
    if (nearCrossing && car.turnTimer <= 0) {
      car.turnTimer = 1.2;
      const roll = G.rng();
      if (roll < 0.3) {
        // Turn onto the crossing road.
        if (car.axis === 'v') {
          car.axis = 'h';
          car.dir = G.rng() < 0.5 ? 1 : -1;
          car.y = nearestStreet(car.y);
          car.angle = car.dir > 0 ? 0 : Math.PI;
        } else {
          car.axis = 'v';
          car.dir = G.rng() < 0.5 ? 1 : -1;
          car.x = nearestAvenue(car.x);
          car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      } else if (roll < 0.38) {
        // U-turn.
        car.dir *= -1;
        car.angle += Math.PI;
      }
    }
    // Ease the heading toward the axis direction.
    const want = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    car.angle += angleDiff(car.angle, want) * Math.min(1, 3 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!hitsBuilding(G.city, nx, ny, car.type.len * 0.42) && nx > 30 && nx < WORLD_W - 30 && ny > 30 && ny < WORLD_H - 30) {
      car.x = nx;
      car.y = ny;
    } else {
      car.dir *= -1;
      car.angle += Math.PI;
      car.turnTimer = 1.5;
    }
    // Keep traffic flowing: recycle a car that drifted far from the player.
    const p = G.player;
    if (dist2(car.x, car.y, p.x, p.y) > 1600 * 1600) {
      const rp = nearestRoadPoint(p.x + (G.rng() - 0.5) * 1200, p.y + (G.rng() - 0.5) * 900);
      car.x = rp.x;
      car.y = rp.y;
      car.axis = rp.axis;
      car.dir = G.rng() < 0.5 ? 1 : -1;
      car.angle = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    }
  }
}

function isNearCrossing(x, y) {
  let onAvenue = false;
  let onStreet = false;
  for (const ax of AVENUES) if (Math.abs(x - ax) < 34) onAvenue = true;
  for (const sy of STREETS) if (Math.abs(y - sy) < 34) onStreet = true;
  return onAvenue && onStreet;
}

function nearestStreet(y) {
  let best = STREETS[0];
  for (const sy of STREETS) if (Math.abs(y - sy) < Math.abs(y - best)) best = sy;
  return best;
}

function nearestAvenue(x) {
  let best = AVENUES[0];
  for (const ax of AVENUES) if (Math.abs(x - ax) < Math.abs(x - best)) best = ax;
  return best;
}

// Car-car collisions: push apart, slow both down, spark and damage on hard hits.
export function resolveCarCollisions(G) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (b.dead) continue;
      const ra = a.type.len * 0.45;
      const rb = b.type.len * 0.45;
      const d2 = dist2(a.x, a.y, b.x, b.y);
      const min = ra + rb;
      if (d2 >= min * min || d2 < 0.01) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const ux = (b.x - a.x) / d;
      const uy = (b.y - a.y) / d;
      a.x -= ux * push;
      a.y -= uy * push;
      b.x += ux * push;
      b.y += uy * push;
      const rel = Math.abs(a.speed - b.speed);
      if (rel > 120) {
        burst(G, (a.x + b.x) / 2, (a.y + b.y) / 2, '#ffcc44', 8, 180, 0.4);
        a.hp -= 3;
        b.hp -= 3;
      }
      // Rear-end push: the faster car shoves the slower one along instead
      // of both cars stopping dead in a pile-up.
      if (a.speed > b.speed + 40) {
        b.speed = a.speed * 0.9;
        a.speed *= 0.92;
      } else if (b.speed > a.speed + 40) {
        a.speed = b.speed * 0.9;
        b.speed *= 0.92;
      } else {
        a.speed *= 0.85;
        b.speed *= 0.85;
      }
    }
  }
}

// The player tries to enter the nearest car. Stealing a car the player does
// not own raises the wanted level: someone always sees it.
export function tryEnterCar(G) {
  const p = G.player;
  if (p.inCar) {
    // Exit: step out beside the car.
    const car = p.inCar;
    p.x = car.x - Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y - Math.sin(car.angle + Math.PI / 2) * 34;
    p.angle = car.angle;
    car.driver = 'parked';
    car.speed = 0;
    p.inCar = null;
    return 'exit';
  }
  let best = null;
  let bestD = 70 * 70;
  for (const car of G.cars) {
    if (car.dead || car.driver === 'police') continue;
    const d2 = dist2(p.x, p.y, car.x, car.y);
    if (d2 < bestD) { bestD = d2; best = car; }
  }
  if (!best) return null;
  const wasOwned = best.driver === 'player';
  best.driver = 'player';
  p.inCar = best;
  p.x = best.x;
  p.y = best.y;
  if (!wasOwned) {
    G.stats.carsStolen += 1;
    raiseWanted(G, 1);
    toast(G, `You stole the ${best.type.name}! The law noticed.`);
  }
  return 'enter';
}

export function raiseWanted(G, level) {
  if (G.wanted < level) {
    G.wanted = Math.min(5, level);
    G.unseenTimer = 0;
  }
}

// A destroyed car: explosion, smoke, and it stops being drivable.
export function destroyCar(G, car) {
  if (car.dead) return;
  car.dead = true;
  car.speed = 0;
  burst(G, car.x, car.y, '#ff8833', 26, 260, 0.9);
  burst(G, car.x, car.y, '#444444', 18, 120, 1.4);
  if (G.player.inCar === car) {
    G.player.inCar = null;
    G.player.x = car.x + 40;
    G.player.y = car.y + 40;
    G.player.hp -= 25;
  }
}

// Parked and traffic cars scattered around the city at the start.
export function populateCars(G) {
  const rng = G.rng;
  const spots = [
    ['falco', 1750, 500, 0],
    ['coupe', 1010, 1260, Math.PI / 2],
    ['sedan', 1610, 810, 0],
    ['taxi', 2210, 1260, Math.PI],
    ['pickup', 410, 1710, Math.PI / 2],
    ['van', 2810, 2160, 0],
    ['sedan', 1010, 2160, Math.PI / 2],
    ['coupe', 2210, 360, Math.PI],
    ['truck', 1610, 1710, 0],
    ['taxi', 410, 810, Math.PI / 2],
  ];
  for (const [key, x, y, a] of spots) addCar(G, key, x, y, a, 'parked');
  // Rolling traffic.
  for (let i = 0; i < 10; i += 1) {
    const rp = nearestRoadPoint(400 + rng() * 2400, 300 + rng() * 1800);
    const type = CAR_TYPES[2 + Math.floor(rng() * 5)];
    const car = addCar(G, type.key, rp.x, rp.y, 0, 'traffic');
    car.axis = rp.axis;
    car.dir = rng() < 0.5 ? 1 : -1;
    car.angle = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    car.speed = 140 + rng() * 60;
  }
}

// Pedestrians scattered on sidewalks near the player start and downtown.
export function populatePeds(G) {
  const rng = G.rng;
  for (let i = 0; i < 16; i += 1) {
    const rp = nearestRoadPoint(600 + rng() * 2200, 300 + rng() * 1600);
    const off = (ROAD_HALF + 14) * (rng() < 0.5 ? 1 : -1);
    if (rp.axis === 'v') {
      const x = rp.x + off;
      const y = clamp(rp.y, 60, WORLD_H - 60);
      if (!hitsBuilding(G.city, x, y, 12)) addPed(G, x, y);
    } else {
      const x = clamp(rp.x, 60, WORLD_W - 60);
      const y = rp.y + off;
      if (!hitsBuilding(G.city, x, y, 12)) addPed(G, x, y);
    }
  }
}

// The wanted system: heat builds from crime, stars set the response, patrol
// cars and foot officers chase the player, and getting caught means busted.
import { CAR_TYPES } from './config.js';
import { clamp, dist, pick, range, turnToward } from './random.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

// Heat thresholds for each star level.
const STAR_HEAT = [0, 20, 40, 60, 80, 95];

export function heatToStars(heat) {
  let stars = 0;
  for (let s = 0; s < STAR_HEAT.length; s += 1) if (heat >= STAR_HEAT[s]) stars = s;
  return stars;
}

export function addHeat(g, amount) {
  g.heat = clamp(g.heat + amount, 0, 100);
  const stars = heatToStars(g.heat);
  if (stars > g.wanted) {
    g.wanted = stars;
    g.toast(`Wanted level ${stars} star${stars > 1 ? 's' : ''}!`, '#ff5a4e');
    if (g.audio) g.audio.setSiren(stars >= 2);
  }
}

export function clearWanted(g) {
  g.heat = 0;
  g.wanted = 0;
  if (g.audio) g.audio.setSiren(false);
}

// How many officers and patrol cars the current stars call for.
export function wantedForce(stars) {
  return {
    cops: Math.min(stars * 2, 10),
    patrols: stars >= 2 ? Math.min(stars - 1, 4) : 0,
  };
}

export function makeCop(x, y) {
  return {
    x, y, angle: 0, speed: 0, hp: 60, state: 'chase',
    arrest: 0, // seconds spent touching the player
    flash: 0,
  };
}

function spawnPointNear(random, g, minD, maxD) {
  for (let tries = 0; tries < 12; tries += 1) {
    const p = nearestRoadPoint(
      g.player.x + range(random, -maxD, maxD),
      g.player.y + range(random, -maxD, maxD),
    );
    if (!p) continue;
    const d = dist(p.x, p.y, g.player.x, g.player.y);
    if (d >= minD && d <= maxD) return { x: p.x, y: p.y };
  }
  return { x: g.player.x + 700, y: g.player.y };
}

export function maintainPolice(random, g, dt) {
  const force = wantedForce(g.wanted);
  // Foot cops.
  while (g.cops.length < force.cops) {
    const p = spawnPointNear(random, g, 420, 900);
    g.cops.push(makeCop(p.x, p.y));
  }
  while (g.cops.length > force.cops) g.cops.pop();
  // Patrol cars.
  while (g.patrols.length < force.patrols) {
    const p = spawnPointNear(random, g, 500, 950);
    const car = makeCar('patrol', p.x, p.y, 0, { police: true });
    car.speed = 200;
    g.patrols.push(car);
    g.cars.push(car);
  }
  while (g.patrols.length > force.patrols) {
    const car = g.patrols.pop();
    const idx = g.cars.indexOf(car);
    if (idx >= 0) g.cars.splice(idx, 1);
  }
}

export function updateCop(g, cop, dt) {
  const px = g.player.car ? g.player.car.x : g.player.x;
  const py = g.player.car ? g.player.car.y : g.player.y;
  const d = dist(cop.x, cop.y, px, py);
  const speed = g.wanted >= 4 ? 205 : 175;
  if (d > 26) {
    const ang = Math.atan2(py - cop.y, px - cop.x);
    cop.angle += turnToward(cop.angle, ang, 5 * dt);
    cop.x += Math.cos(cop.angle) * speed * dt;
    cop.y += Math.sin(cop.angle) * speed * dt;
    cop.arrest = 0;
  } else if (!g.player.car) {
    // On foot and caught: the arrest timer runs.
    cop.arrest += dt;
    if (cop.arrest > 1.2) g.busted = true;
  }
  cop.flash += dt;
}

export function updatePatrol(g, car, dt) {
  const px = g.player.car ? g.player.car.x : g.player.x;
  const py = g.player.car ? g.player.car.y : g.player.y;
  const d = dist(car.x, car.y, px, py);
  const def = CAR_TYPES.patrol;
  // Ram the player's car (or the player on foot) with a slight intercept lead.
  const lead = 0.35;
  const tx = px + (g.player.car ? Math.cos(g.player.car.angle) * g.player.car.speed * lead : 0);
  const ty = py + (g.player.car ? Math.sin(g.player.car.angle) * g.player.car.speed * lead : 0);
  const wantAngle = Math.atan2(ty - car.y, tx - car.x);
  car.angle += turnToward(car.angle, wantAngle, 2.8 * dt);
  const target = d > 700 ? def.maxSpeed : def.maxSpeed * 0.85;
  car.speed += clamp(target - car.speed, -def.brake * dt, def.accel * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.flash += dt;
  // A patrol car that gets too far behind respawns closer (keeps the chase hot).
  if (d > 1400) {
    const p = spawnPointNear(g.random, g, 500, 800);
    car.x = p.x;
    car.y = p.y;
    car.speed = 240;
  }
}

export function decayHeat(g, dt) {
  if (g.wanted === 0) return;
  // Heat cools only while no officer can see the player.
  let seen = false;
  const px = g.player.car ? g.player.car.x : g.player.x;
  const py = g.player.car ? g.player.car.y : g.player.y;
  for (const cop of g.cops) if (dist(cop.x, cop.y, px, py) < 620) { seen = true; break; }
  if (!seen) for (const car of g.patrols) if (dist(car.x, car.y, px, py) < 700) { seen = true; break; }
  if (!seen) {
    g.heat = Math.max(0, g.heat - 3.2 * dt);
    const stars = heatToStars(g.heat);
    if (stars < g.wanted) {
      g.wanted = stars;
      if (stars === 0) {
        g.toast('You lost the heat.', '#8be28b');
        if (g.audio) g.audio.setSiren(false);
      }
    }
  }
}

export { pick, range };

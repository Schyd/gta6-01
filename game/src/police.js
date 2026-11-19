// SOLMAR — Streets of the Sun
// The wanted level and the police: heat that rises with crime and decays out
// of sight, foot officers who chase and arrest, and cruisers that intercept
// and ram.

import { CONFIG } from './config.js';
import { range, pick } from './random.js';
import { dist, angleTo, playerPos, resolveBuildings, clampToMap, toast } from './world.js';
import { makeCar, damageCar } from './vehicles.js';

/** A short label for the current heat, for the HUD. */
export function wantedLabel(world) {
  if (world.wanted === 0) return 'Aman';
  if (world.wanted <= 2) return 'Diburu';
  if (world.wanted <= 4) return 'Buron';
  return 'Paling Dicari';
}

/** One step of the whole wanted system: decay, spawn, chase, arrest. */
export function updateWanted(world, dt) {
  const pos = playerPos(world);
  const seen = policeCanSee(world, pos);
  if (seen) world.unseenTimer = 0;
  else world.unseenTimer += dt;
  if (world.unseenTimer > CONFIG.heatDecaySightSeconds && world.heat > 0) {
    world.heat = Math.max(0, world.heat - CONFIG.heatDecayPerSecond * dt);
    world.wanted = Math.floor(world.heat);
  }

  const wantCops = world.wanted >= 1 ? Math.min(2, world.wanted) : 0;
  const wantCruisers = world.wanted >= 2 ? Math.min(3, world.wanted - 1) : 0;
  while (world.cops.length < wantCops) spawnFootCop(world, pos);
  while (world.cruisers.length < wantCruisers) spawnCruiser(world, pos);
  while (world.cops.length > wantCops) world.cops.pop();
  while (world.cruisers.length > wantCruisers) world.cruisers.pop();

  for (const cop of world.cops) updateFootCop(world, cop, pos, dt);
  for (const cruiser of world.cruisers) updateCruiser(world, cruiser, pos, dt);
}

/** True when any officer is close enough to see the player. */
function policeCanSee(world, pos) {
  for (const cop of world.cops) {
    if (dist(cop.x, cop.y, pos.x, pos.y) < 420) return true;
  }
  for (const cruiser of world.cruisers) {
    if (dist(cruiser.x, cruiser.y, pos.x, pos.y) < 460) return true;
  }
  return false;
}

/** A foot officer appears at a road point near the player, off screen. */
function spawnFootCop(world, pos) {
  const rng = world.rng;
  const avenue = pick(rng, world.city.avenues);
  const street = pick(rng, world.city.streets);
  const spot = rng() < 0.5
    ? { x: avenue, y: pos.y + (rng() < 0.5 ? 520 : -520) }
    : { x: pos.x + (rng() < 0.5 ? 520 : -520), y: street };
  world.cops.push({
    x: Math.max(40, Math.min(3160, spot.x)),
    y: Math.max(40, Math.min(2140, spot.y)),
    angle: 0, holdTimer: 0,
  });
}

/** A patrol cruiser appears on a road near the player. */
function spawnCruiser(world, pos) {
  const rng = world.rng;
  const avenue = pick(rng, world.city.avenues);
  const street = pick(rng, world.city.streets);
  const onAvenue = rng() < 0.5;
  const car = makeCar('komodo', onAvenue ? avenue : pos.x + (rng() < 0.5 ? 560 : -560), onAvenue ? pos.y + (rng() < 0.5 ? 560 : -560) : street, 0, 'police');
  car.body = '#20242e';
  car.roof = '#20242e';
  car.cruise = CONFIG.cruiserTopSpeed;
  car.holdTimer = 0;
  world.cruisers.push(car);
}

/** A foot officer runs at the player and holds on to arrest. */
function updateFootCop(world, cop, pos, dt) {
  const d = dist(cop.x, cop.y, pos.x, pos.y);
  cop.angle = angleTo(cop.x, cop.y, pos.x, pos.y);
  if (d > 30) {
    cop.x += Math.cos(cop.angle) * CONFIG.footCopSpeed * dt;
    cop.y += Math.sin(cop.angle) * CONFIG.footCopSpeed * dt;
    cop.holdTimer = 0;
  } else {
    cop.holdTimer += dt;
    if (cop.holdTimer > CONFIG.arrestHoldSeconds) {
      world.state = 'busted';
      toast(world, 'Ditangkap polisi!');
    }
  }
  resolveBuildings(world, cop, 14);
  clampToMap(cop, 14);
}

/** A cruiser drives at the player and rams; touch on foot means arrest. */
function updateCruiser(world, cruiser, pos, dt) {
  const d = dist(cruiser.x, cruiser.y, pos.x, pos.y);
  const want = angleTo(cruiser.x, cruiser.y, pos.x, pos.y);
  let turn = want - cruiser.angle;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn <= -Math.PI) turn += Math.PI * 2;
  cruiser.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, turn));
  cruiser.speed += (cruiser.cruise - cruiser.speed) * Math.min(1, 1.4 * dt);
  const oldX = cruiser.x;
  const oldY = cruiser.y;
  cruiser.x += Math.cos(cruiser.angle) * cruiser.speed * dt;
  cruiser.y += Math.sin(cruiser.angle) * cruiser.speed * dt;
  const r = cruiser.length * 0.42;
  resolveBuildings(world, cruiser, r);
  clampToMap(cruiser, r);
  // Stuck on a building corner (the straight line to the player cuts a
  // block): snap to the road axis that points most directly at the player,
  // so the cruiser goes around the block instead of grinding the wall.
  if (cruiser.speed > 60 && dist(cruiser.x, cruiser.y, oldX, oldY) < cruiser.speed * dt * 0.3) {
    const dx = pos.x - cruiser.x;
    const dy = pos.y - cruiser.y;
    cruiser.angle = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  if (d < 46) {
    const p = world.player;
    if (p.inCar) {
      damageCar(world, p.inCar, CONFIG.cruiserRamDamage * dt * 2, false);
      p.inCar.speed *= 0.96;
    } else {
      cruiser.holdTimer += dt;
      if (cruiser.holdTimer > 0.8) {
        world.state = 'busted';
        toast(world, 'Ditangkap polisi!');
      }
    }
  } else {
    cruiser.holdTimer = 0;
  }
}

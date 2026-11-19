// SOLMAR — Streets of the Sun
// The player on foot: walking, running, aiming, entering cars, and using the
// three shops. Driving itself lives in vehicles.js; this file owns the body.

import { CONFIG } from './config.js';
import { resolveBuildings, clampToMap, dist, toast, playerPos } from './world.js';

/** Move the player on foot for one step. Returns nothing. */
export function updatePlayerOnFoot(world, input, dt) {
  const p = world.player;
  if (p.inCar) return;
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    const speed = input.run ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const nx = p.x + (mx / len) * speed * dt;
    const ny = p.y + (my / len) * speed * dt;
    const oldX = p.x;
    const oldY = p.y;
    p.x = nx;
    if (resolveBuildings(world, p, CONFIG.playerRadius)) {
      // Sliding: if the new spot is still blocked on one axis, keep the other.
      p.x = oldX;
      p.y = ny;
      resolveBuildings(world, p, CONFIG.playerRadius);
      if (isStuck(world, p)) { p.x = oldX; p.y = oldY; }
    } else {
      p.y = ny;
      resolveBuildings(world, p, CONFIG.playerRadius);
    }
    clampToMap(p, CONFIG.playerRadius);
    p.angle = Math.atan2(my, mx);
  }
  if (p.hurtFlash > 0) p.hurtFlash -= dt;
}

/** True when the player is wedged inside a building after a slide attempt. */
function isStuck(world, p) {
  for (const b of world.city.buildings) {
    if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) return true;
  }
  return false;
}

/** The nearest car to the player within reach, or null. */
export function nearestCar(world, maxDist = 78) {
  const p = world.player;
  let best = null;
  let bestD = maxDist;
  const all = world.cars.concat(world.traffic);
  for (const car of all) {
    if (car.driver === 'player') continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

/** Step into the nearest car: it becomes the player's car. */
export function enterCar(world, car) {
  const p = world.player;
  p.inCar = car;
  car.driver = 'player';
  car.parked = false;
  if (car.wasTraffic) {
    car.wasTraffic = false;
    world.traffic = world.traffic.filter((c) => c !== car);
    world.cars.push(car);
  }
  world.stats.carsStolen += 1;
  addHeat(world, CONFIG.heatPerCarTheft, 'Mencuri mobil!');
  toast(world, `Mengendarai ${car.typeName} — tekan E untuk keluar.`, 2.5);
}

/** Step out of the car where it stands. */
export function exitCar(world) {
  const p = world.player;
  const car = p.inCar;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 46;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 46;
  p.inCar = null;
}

/** The prompt to show when the player can press E: a car, a shop, or nothing. */
export function nearInteractable(world) {
  const pos = playerPos(world);
  const shops = world.city.shops;
  const near = (spot, range = 95) => dist(pos.x, pos.y, spot.x, spot.y) < range;
  if (near(shops.weapon)) return 'E — Beli senjata';
  if (near(shops.clinic)) return 'E — Klinik ($150)';
  if (near(shops.spray)) return 'E — Bengkel cat ($300)';
  if (!world.player.inCar && nearestCar(world, 78)) return 'E — Naik mobil';
  if (world.player.inCar) return 'E — Keluar mobil';
  return null;
}

/** Add wanted heat, clamped to the maximum, and show the reason. */
export function addHeat(world, amount, reason) {
  world.heat = Math.min(CONFIG.maxWanted, world.heat + amount);
  world.wanted = Math.floor(world.heat);
  if (reason) toast(world, reason, 2);
}

/** Use a shop when the player stands near it and presses E. */
export function tryShop(world) {
  const pos = playerPos(world);
  const shops = world.city.shops;
  const near = (spot, range = 95) => dist(pos.x, pos.y, spot.x, spot.y) < range;
  if (near(shops.weapon)) {
    buyWeapon(world);
    return true;
  }
  if (near(shops.clinic)) {
    if (world.money >= CONFIG.clinicPrice && world.player.health < CONFIG.playerHealth) {
      world.money -= CONFIG.clinicPrice;
      world.player.health = Math.min(CONFIG.playerHealth, world.player.health + CONFIG.clinicHeal);
      toast(world, `Klinik: kesehatan +${CONFIG.clinicHeal} ($${CONFIG.clinicPrice}).`);
    } else if (world.player.health >= CONFIG.playerHealth) {
      toast(world, 'Kesehatanmu sudah penuh.');
    } else {
      toast(world, `Klinik butuh $${CONFIG.clinicPrice} — uangmu tidak cukup.`);
    }
    return true;
  }
  if (near(shops.spray)) {
    if (world.money >= CONFIG.sprayPrice && world.wanted > 0) {
      world.money -= CONFIG.sprayPrice;
      world.heat = 0;
      world.wanted = 0;
      toast(world, 'Bengkel cat: jejakmu hilang. Wanted bersih!');
    } else if (world.wanted === 0) {
      toast(world, 'Tidak ada wanted untuk dibersihkan.');
    } else {
      toast(world, `Bengkel cat butuh $${CONFIG.sprayPrice} — uangmu tidak cukup.`);
    }
    return true;
  }
  return false;
}

/** Buy the next weapon at the weapon shop, when the player can afford it. */
function buyWeapon(world) {
  const p = world.player;
  const order = ['pistol', 'smg', 'shotgun'];
  const idx = order.indexOf(p.weapon);
  if (idx >= order.length - 1) {
    toast(world, 'Kamu sudah punya senjata terbaik.');
    return;
  }
  const next = CONFIG.weapons[idx + 1];
  if (world.money < next.price) {
    toast(world, `${next.name} harganya $${next.price} — uangmu $${world.money}.`);
    return;
  }
  world.money -= next.price;
  p.weapon = next.key;
  p.ammo = next.mag;
  toast(world, `Membeli ${next.name} seharga $${next.price}.`);
}

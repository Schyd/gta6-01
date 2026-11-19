// The player on foot: walking, aiming with the mouse, getting in and out of
// cars, and using the city's shops.
import { AMMO_COST, HEAL_COST, SPRAY_COST } from './config.js';
import { hitsBuilding, inWorld } from './city.js';
import { raiseWanted } from './police.js';
import { clearWanted } from './police.js';
import { fireBullet } from './combat.js';
import { scarePeds } from './pedestrians.js';

export function updatePlayerOnFoot(state, input, dt) {
  const player = state.player;
  const axis = input.axis();
  const speed = 175;
  const nx = player.x + axis.x * speed * dt;
  const ny = player.y + axis.y * speed * dt;
  if (!hitsBuilding(state.city, nx, player.y, 13) && inWorld(nx, player.y, 16)) player.x = nx;
  if (!hitsBuilding(state.city, player.x, ny, 13) && inWorld(player.x, ny, 16)) player.y = ny;
  if (axis.x || axis.y) player.angle = Math.atan2(axis.y, axis.x);

  // Aim at the mouse in world coordinates.
  const cam = state.camera;
  const wx = (input.mouse.x - state.viewW / 2) / cam.zoom + cam.x;
  const wy = (input.mouse.y - state.viewH / 2) / cam.zoom + cam.y;
  player.aimAngle = Math.atan2(wy - player.y, wx - player.x);

  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (player.reload > 0) {
    player.reload -= dt;
    if (player.reload <= 0) {
      const take = Math.min(12, player.mag);
      player.ammo = take;
      player.mag -= take;
    }
  }
  if (input.shooting() && player.fireCooldown <= 0 && player.reload <= 0) {
    if (player.ammo > 0) fireBullet(state);
    else if (player.mag > 0) player.reload = 1.1;
  }
}

export function nearestCar(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(state, car) {
  const player = state.player;
  if (car.isCop) return;
  state.playerCar = car;
  car.isPlayer = true;
  car.targetSpeed = 0;
  player.x = car.x; player.y = car.y;
  // Stealing a car that is not yours is a crime — unless it is the one you
  // already owned. Witnesses and patrols notice.
  if (!car.owned) {
    raiseWanted(state, 1);
    scarePeds(state, car.x, car.y, 300);
    state.message = 'Car stolen — the heat is on';
    state.messageT = 2.5;
  }
  car.owned = true;
  state.audio.ensure();
}

export function exitCar(state) {
  const car = state.playerCar;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  state.playerCar = null;
  const a = car.angle + Math.PI / 2;
  state.player.x = car.x + Math.cos(a) * 34;
  state.player.y = car.y + Math.sin(a) * 34;
}

export function nearestShop(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const shop of state.city.shops) {
    const d = Math.hypot(shop.x - state.player.x, shop.y - state.player.y);
    if (d < bestD) { bestD = d; best = shop; }
  }
  return best;
}

export function useShop(state, shop) {
  if (shop.kind === 'gun') {
    if (state.cash >= AMMO_COST) {
      state.cash -= AMMO_COST;
      state.player.mag += 24;
      state.message = 'Bought 24 rounds — $50';
      state.audio.pickup();
    } else state.message = 'Not enough cash for ammo ($50)';
    state.messageT = 2;
  } else if (shop.kind === 'clinic') {
    if (state.cash >= HEAL_COST) {
      state.cash -= HEAL_COST;
      state.player.health = 100;
      state.message = 'Patched up — $100';
      state.audio.pickup();
    } else state.message = 'Not enough cash for treatment ($100)';
    state.messageT = 2;
  } else if (shop.kind === 'spray') {
    if (state.playerCar) {
      if (state.cash >= SPRAY_COST && state.wanted > 0) {
        state.cash -= SPRAY_COST;
        clearWanted(state);
        state.playerCar.color = '#c96f4a';
        state.message = 'New paint, clean slate — $300';
        state.audio.pickup();
      } else if (state.wanted === 0) state.message = 'No heat to lose right now';
      else state.message = 'Not enough cash for a respray ($300)';
      state.messageT = 2;
    } else state.message = 'Drive a car into the spray shop';
  }
}

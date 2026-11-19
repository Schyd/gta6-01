// The wanted system: stars, police pursuit cars, foot cops, and getting
// busted. Heat rises with crimes and cools when no officer can see the player.
import { WANTED_DECAY_SECONDS } from './config.js';
import { roadPointNear } from './city.js';
import { createCar, moveWithCollision } from './vehicles.js';

export function raiseWanted(state, stars) {
  state.wanted = Math.min(5, Math.max(state.wanted, stars));
  state.wantedTimer = 0;
}

export function updateWanted(state, dt) {
  // Cool down only when no cop is close enough to keep eyes on the player.
  const copNear = state.cars.some((c) => c.isCop && !c.dead && Math.hypot(c.x - state.player.x, c.y - state.player.y) < 420);
  if (state.wanted > 0 && !copNear) {
    state.wantedTimer += dt;
    if (state.wantedTimer >= WANTED_DECAY_SECONDS) {
      state.wanted -= 1;
      state.wantedTimer = 0;
    }
  } else {
    state.wantedTimer = 0;
  }

  const wantCops = state.wanted === 0 ? 0 : Math.min(6, state.wanted + 1);
  const liveCops = state.cars.filter((c) => c.isCop && !c.dead).length;
  if (liveCops < wantCops) {
    const p = roadPointNear(state.rng, state.player.x, state.player.y, 500, 900);
    const cop = createCar('police', p.x, p.y, 0, state.rng);
    cop.isCop = true;
    cop.isPlayer = false;
    cop.targetSpeed = 0;
    state.cars.push(cop);
    state.audio.setSiren(true);
  }
  if (state.wanted === 0 && liveCops === 0) state.audio.setSiren(false);
}

export function updateCops(state, dt) {
  const player = state.player;
  const playerCar = state.playerCar;
  const target = playerCar || player;
  for (const cop of state.cars) {
    if (!cop.isCop || cop.dead) continue;
    const dx = target.x - cop.x;
    const dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Pursuit: steer hard, accelerate; reverse out when wedged on a wall.
    if (cop.stuck > 0.7) {
      cop.speed -= 300 * dt;
      cop.angle -= diff * 2 * dt;
      cop.stuck -= dt;
      if (cop.speed < -120) cop.stuck = 0;
    } else {
      cop.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff * 3 * dt));
      const accel = cop.spec.accel * (dist > 500 ? 1 : 0.85);
      cop.speed = Math.min(cop.spec.maxSpeed, cop.speed + accel * dt);
    }
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    const bx = cop.x; const by = cop.y;
    // Cops slide along walls like every other car — they never drive through
    // a building, they go around the block.
    moveWithCollision(state.city, cop, nx, ny, 16);
    if (Math.hypot(cop.x - bx, cop.y - by) < Math.abs(cop.speed) * dt * 0.3) {
      cop.stuck += dt;
      cop.speed *= 0.5;
    }
    // Ram the player's car; on foot, close in and make the arrest.
    if (dist < 46) {
      if (playerCar) {
        playerCar.health -= 14 * dt;
        playerCar.speed *= (1 - 0.6 * dt);
        if (state.rng.chance(dt * 2)) {
          state.effects.push({ kind: 'spark', x: cop.x, y: cop.y, t: 0, life: 0.3 });
          state.audio.crash();
        }
        if (playerCar.health <= 0) {
          playerCar.dead = true;
          state.playerCar = null;
          player.x = playerCar.x; player.y = playerCar.y;
          player.health -= 25;
        }
      } else {
        state.bustedTimer += dt;
        if (state.bustedTimer > 1.4) {
          state.screen = 'busted';
          state.audio.busted();
        }
      }
    } else {
      state.bustedTimer = Math.max(0, state.bustedTimer - dt * 2);
    }
  }
  // Foot cops join the chase from three stars up.
  if (state.wanted >= 3) {
    const footCops = state.footCops.filter((c) => !c.dead).length;
    if (footCops < state.wanted - 1 && state.rng.chance(dt * 0.5)) {
      const p = roadPointNear(state.rng, player.x, player.y, 260, 520);
      state.footCops.push({ x: p.x, y: p.y, speed: 165, dead: false });
    }
  }
  for (const cop of state.footCops) {
    if (cop.dead) continue;
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const d = Math.hypot(dx, dy) || 1;
    cop.x += (dx / d) * cop.speed * dt;
    cop.y += (dy / d) * cop.speed * dt;
    if (!playerCar && d < 30) {
      state.bustedTimer += dt;
      if (state.bustedTimer > 1.4) {
        state.screen = 'busted';
        state.audio.busted();
      }
    }
  }
}

export function clearWanted(state) {
  state.wanted = 0;
  state.wantedTimer = 0;
  for (const car of state.cars) if (car.isCop) car.dead = true;
  state.footCops.length = 0;
  state.audio.setSiren(false);
}

// Combat: the pistol, bullets, damage to peds, cops and gang members, and
// the pickups (cash, ammo, health) the city leaves behind.
import { raiseWanted } from './police.js';
import { scarePeds } from './pedestrians.js';

export function fireBullet(state) {
  const player = state.player;
  if (player.ammo <= 0 || player.reload > 0) return;
  player.ammo -= 1;
  const angle = player.aimAngle;
  state.bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    life: 0.7,
  });
  state.effects.push({ kind: 'muzzle', x: player.x + Math.cos(angle) * 24, y: player.y + Math.sin(angle) * 24, t: 0, life: 0.08 });
  state.audio.gunshot();
  scarePeds(state, player.x, player.y, 320);
  raiseWanted(state, 2);
  player.fireCooldown = 0.22;
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Hit a pedestrian.
    for (const ped of state.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 13) {
        ped.dead = true;
        b.life = 0;
        state.effects.push({ kind: 'hit', x: ped.x, y: ped.y, t: 0, life: 0.5 });
        state.pickups.push({ kind: 'cash', x: ped.x, y: ped.y, amount: 20, t: 0 });
        raiseWanted(state, 2);
        break;
      }
    }
    // Hit a foot cop.
    for (const cop of state.footCops) {
      if (cop.dead) continue;
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < 14) {
        cop.dead = true;
        b.life = 0;
        state.effects.push({ kind: 'hit', x: cop.x, y: cop.y, t: 0, life: 0.5 });
        raiseWanted(state, 3);
        break;
      }
    }
    // Hit a gang member (mission targets).
    for (const g of state.gang) {
      if (g.dead) continue;
      if (Math.hypot(g.x - b.x, g.y - b.y) < 15) {
        g.health -= 34;
        b.life = 0;
        state.effects.push({ kind: 'hit', x: g.x, y: g.y, t: 0, life: 0.4 });
        if (g.health <= 0) {
          g.dead = true;
          state.cash += 60;
          state.pickups.push({ kind: 'ammo', x: g.x, y: g.y, amount: 12, t: 0 });
          raiseWanted(state, 2);
        }
        break;
      }
    }
    // Hit a police car: it takes damage and keeps coming.
    for (const car of state.cars) {
      if (!car.isCop || car.dead) continue;
      if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
        car.health -= 12;
        b.life = 0;
        state.effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0, life: 0.25 });
        if (car.health <= 0) {
          car.dead = true;
          state.effects.push({ kind: 'smoke', x: car.x, y: car.y, t: 0, life: 1.2 });
          state.cash += 100;
          raiseWanted(state, 3);
        }
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

export function updatePickups(state, dt) {
  const player = state.player;
  for (const p of state.pickups) {
    p.t += dt;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 26) {
      if (p.kind === 'cash') { state.cash += p.amount; state.message = `+$${p.amount}`; state.messageT = 1.4; }
      if (p.kind === 'ammo') { player.ammo += p.amount; state.message = `+${p.amount} ammo`; state.messageT = 1.4; }
      if (p.kind === 'health') { player.health = Math.min(100, player.health + 40); state.message = '+40 health'; state.messageT = 1.4; }
      p.t = 99;
      state.audio.pickup();
    }
  }
  state.pickups = state.pickups.filter((p) => p.t < 25);
}

export function updateEffects(state, dt) {
  for (const e of state.effects) e.t += dt;
  state.effects = state.effects.filter((e) => e.t < e.life);
}

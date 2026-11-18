// police.js — the wanted system: foot police who chase and arrest, patrol
// cruisers that ram and intercept, and heat that cools when the player
// stays out of sight. Wanted stars 0-5 scale the response.

import { WORLD_W, WORLD_H, WANTED_MAX, clamp, dist2, angleTo, angleDiff } from './config.js';
import { nearestRoadPoint, burst, toast, hitsBuilding, addCar } from './world.js';
import { destroyCar } from './vehicles.js';

// How many foot cops and cruisers a wanted level fields.
export function policeTargets(wanted) {
  return {
    foot: Math.min(wanted, 4),
    cruisers: wanted >= 2 ? Math.min(wanted - 1, 3) : 0,
  };
}

// Keep the police presence matched to the wanted level, spawning just out
// of the player's immediate view.
export function maintainPolice(G, dt) {
  const t = policeTargets(G.wanted);
  // Foot cops.
  while (G.footCops.length < t.foot) {
    const p = G.player;
    const a = G.rng() * Math.PI * 2;
    const r = 800 + G.rng() * 300;
    const x = clamp(p.x + Math.cos(a) * r, 60, WORLD_W - 60);
    const y = clamp(p.y + Math.sin(a) * r, 60, WORLD_H - 60);
    G.footCops.push({ x, y, hp: 60, speed: 205 + G.wanted * 12, angle: 0, shootTimer: 1 + G.rng() });
  }
  while (G.footCops.length > t.foot) G.footCops.pop();
  // Cruisers.
  const aliveCruisers = G.cars.filter((c) => c.driver === 'police' && !c.dead).length;
  if (aliveCruisers < t.cruisers) {
    const p = G.player;
    const rp = nearestRoadPoint(p.x + (G.rng() - 0.5) * 1400, p.y + (G.rng() - 0.5) * 1000);
    const car = addCar(G, 'sedan', rp.x, rp.y, 0, 'police');
    car.color = '#1a2a4a';
    car.hp = 120;
    car.speed = 200;
    car.axis = rp.axis;
    car.dir = 1;
    car.angle = car.axis === 'v' ? Math.PI / 2 : 0;
  }
  // Heat: if no police can see the player, the wanted level cools down.
  let seen = false;
  for (const cop of G.footCops) {
    if (dist2(cop.x, cop.y, G.player.x, G.player.y) < 620 * 620) { seen = true; break; }
  }
  if (!seen) {
    for (const car of G.cars) {
      if (car.driver === 'police' && !car.dead && dist2(car.x, car.y, G.player.x, G.player.y) < 700 * 700) { seen = true; break; }
    }
  }
  if (seen) {
    G.unseenTimer = 0;
  } else if (G.wanted > 0) {
    G.unseenTimer += dt;
    if (G.unseenTimer > 14) {
      G.wanted -= 1;
      G.unseenTimer = 0;
      toast(G, G.wanted === 0 ? 'You lost the heat. Clean.' : `Heat cooling down — ${G.wanted} star${G.wanted === 1 ? '' : 's'} left.`);
    }
  }
}

// Foot cops run at the player; touching the player on foot busts them.
// At 3+ stars they also shoot.
export function updateFootCops(G, dt) {
  const p = G.player;
  for (const cop of G.footCops) {
    const d = Math.sqrt(dist2(cop.x, cop.y, p.x, p.y));
    cop.angle = angleTo(cop.x, cop.y, p.x, p.y);
    if (d > 26) {
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
    }
    if (G.wanted >= 3 && !p.inCar && d < 420 && d > 60) {
      cop.shootTimer -= dt;
      if (cop.shootTimer <= 0) {
        cop.shootTimer = 1.3 + G.rng() * 0.7;
        fireBullet(G, cop.x, cop.y, cop.angle + (G.rng() - 0.5) * 0.25, 14, 'police');
      }
    }
    if (!p.inCar && d < 26 && p.invuln <= 0) {
      G.screen = 'busted';
      return;
    }
  }
}

// Cruisers steer toward the player and ram; a hard ram damages the player's car.
export function updateCruisers(G, dt) {
  const p = G.player;
  const tx = p.inCar ? p.inCar.x : p.x;
  const ty = p.inCar ? p.inCar.y : p.y;
  for (const car of G.cars) {
    if (car.driver !== 'police' || car.dead) continue;
    car.sirenPhase += dt * 6;
    const want = angleTo(car.x, car.y, tx, ty);
    const diff = angleDiff(car.angle, want);
    const steer = clamp(diff * 1.4, -1, 1);
    const speedTarget = 330 + G.wanted * 18;
    const throttle = car.speed < speedTarget ? 1 : 0;
    car.speed += (throttle ? 260 : -160) * dt;
    car.speed = clamp(car.speed, 0, 460);
    car.angle += steer * 2.6 * dt * clamp(Math.abs(car.speed) / 300, 0.2, 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const r = car.type.len * 0.42;
    if (!hitsBuilding(G.city, nx, ny, r) && nx > 30 && nx < WORLD_W - 30 && ny > 30 && ny < WORLD_H - 30) {
      car.x = nx;
      car.y = ny;
    } else {
      car.speed *= 0.5;
      car.angle += 0.6;
    }
    // Ram the player's car.
    if (p.inCar) {
      const d2 = dist2(car.x, car.y, p.inCar.x, p.inCar.y);
      if (d2 < 52 * 52) {
        p.inCar.hp -= 14 * dt * 60 / 60;
        p.inCar.speed *= 0.94;
        burst(G, (car.x + p.inCar.x) / 2, (car.y + p.inCar.y) / 2, '#ffcc44', 2, 120, 0.3);
        if (p.inCar.hp <= 0) destroyCar(G, p.inCar);
      }
    }
    if (car.hp <= 0) destroyCar(G, car);
  }
}

// A bullet fired by anyone. owner: 'player' | 'enemy' | 'police'.
export function fireBullet(G, x, y, angle, damage, owner) {
  G.bullets.push({
    x: x + Math.cos(angle) * 22, y: y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * 950, vy: Math.sin(angle) * 950,
    damage, owner, life: 0.9,
  });
}

// Move bullets, resolve hits on players, enemies, cops, cars and buildings.
export function updateBullets(G, dt) {
  const p = G.player;
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && hitsBuilding(G.city, b.x, b.y, 2)) {
      burst(G, b.x, b.y, '#c8c8c8', 3, 90, 0.3);
      dead = true;
    }
    if (!dead && b.owner !== 'player') {
      if (p.invuln <= 0 && dist2(b.x, b.y, p.x, p.y) < 14 * 14) {
        p.hp -= b.damage;
        p.invuln = 0.25;
        burst(G, p.x, p.y, '#e33', 6, 140, 0.4);
        dead = true;
        if (p.hp <= 0) G.screen = 'wasted';
      }
    }
    if (!dead && b.owner === 'player') {
      for (const e of G.enemies) {
        if (e.hp > 0 && dist2(b.x, b.y, e.x, e.y) < 16 * 16) {
          e.hp -= b.damage;
          burst(G, e.x, e.y, '#e33', 6, 140, 0.4);
          dead = true;
          if (e.hp <= 0) {
            G.stats.kills += 1;
            burst(G, e.x, e.y, '#e33', 16, 220, 0.8);
          }
          break;
        }
      }
      if (!dead) {
        for (const cop of G.footCops) {
          if (dist2(b.x, b.y, cop.x, cop.y) < 14 * 14) {
            cop.hp -= b.damage;
            burst(G, cop.x, cop.y, '#e33', 6, 140, 0.4);
            dead = true;
            if (cop.hp <= 0) {
              G.stats.kills += 1;
              G.footCops.splice(G.footCops.indexOf(cop), 1);
              burst(G, cop.x, cop.y, '#e33', 16, 220, 0.8);
            }
            break;
          }
        }
      }
      if (!dead) {
        for (const car of G.cars) {
          if (car.dead || car.driver === 'player') continue;
          if (dist2(b.x, b.y, car.x, car.y) < 26 * 26) {
            car.hp -= b.damage;
            burst(G, b.x, b.y, '#ffcc44', 4, 120, 0.3);
            dead = true;
            if (car.hp <= 0) destroyCar(G, car);
            break;
          }
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

export { WANTED_MAX };

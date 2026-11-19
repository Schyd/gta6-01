// SOLMAR — Streets of the Sun
// Combat: the player's shots, enemy fire, bullets, reloads, muzzle flashes,
// and damage. Bullets are simple fast points with a short life.

import { CONFIG } from './config.js';
import { jitter } from './random.js';
import { dist, angleTo, circleRectOverlap, playerPos, toast } from './world.js';
import { addHeat } from './player.js';
import { damageCar } from './vehicles.js';
import { spawnBurst } from './pedestrians.js';

/** The player's weapon definition, from the config table. */
export function currentWeapon(world) {
  return CONFIG.weapons.find((w) => w.key === world.player.weapon);
}

/** Start a manual reload (R key), when the weapon has a magazine. */
export function startReload(world) {
  const p = world.player;
  const weapon = currentWeapon(world);
  if (weapon.mag === 0 || p.reloadTimer > 0 || p.ammo >= weapon.mag) return;
  p.reloadTimer = weapon.reload;
  p.ammo = 0;
}

/** Fire the player's weapon toward the aim angle, if it is ready. */
export function playerShoot(world) {
  const p = world.player;
  const weapon = currentWeapon(world);
  if (p.shootTimer > 0 || p.reloadTimer > 0) return;
  if (weapon.mag > 0 && p.ammo <= 0) {
    p.reloadTimer = weapon.reload;
    toast(world, 'Mengisi ulang…', 1);
    return;
  }
  const pos = playerPos(world);
  const pellets = weapon.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const spread = jitter(world.rng, weapon.spread);
    world.bullets.push({
      x: pos.x + Math.cos(p.aimAngle) * 26,
      y: pos.y + Math.sin(p.aimAngle) * 26,
      vx: Math.cos(p.aimAngle + spread) * CONFIG.bulletSpeed,
      vy: Math.sin(p.aimAngle + spread) * CONFIG.bulletSpeed,
      life: 0.9, owner: 'player', damage: weapon.damage,
    });
  }
  p.shootTimer = weapon.rate;
  p.muzzle = 0.07;
  if (weapon.mag > 0) p.ammo -= 1;
  world.stats.shotsFired += 1;
  world.lastShot = { x: pos.x, y: pos.y, time: world.time };
  world.lastCrime = { x: pos.x, y: pos.y, time: world.time };
  addHeat(world, CONFIG.heatPerShot, null);
  if (world.audio) world.audio.shot();
}

/** One step for every bullet: move, hit walls, cars, enemies, peds, player. */
export function updateBullets(world, dt) {
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    let dead = false;
    for (const building of world.city.buildings) {
      if (circleRectOverlap(b.x, b.y, 2, building)) {
        spawnBurst(world, b.x, b.y, '#ffd27a');
        dead = true;
        break;
      }
    }
    if (dead) { b.life = 0; continue; }
    if (b.owner === 'player') {
      for (const enemy of world.enemies) {
        if (enemy.health > 0 && dist(b.x, b.y, enemy.x, enemy.y) < 20) {
          hurtEnemy(world, enemy, b.damage);
          spawnBurst(world, b.x, b.y, '#ff5a4a');
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (const car of world.cars.concat(world.traffic, world.cruisers)) {
          if (car.driver === 'player') continue;
          if (dist(b.x, b.y, car.x, car.y) < car.length * 0.45) {
            damageCar(world, car, b.damage * 0.4, false);
            spawnBurst(world, b.x, b.y, '#ffd27a');
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (const ped of world.peds) {
          if (ped.state !== 'dead' && dist(b.x, b.y, ped.x, ped.y) < 14) {
            ped.state = 'dead';
            world.lastCrime = { x: ped.x, y: ped.y, time: world.time };
            addHeat(world, CONFIG.heatPerPedHit, 'Kamu menembak pejalan kaki!');
            spawnBurst(world, b.x, b.y, '#e07856');
            dead = true;
            break;
          }
        }
      }
    } else {
      const pos = playerPos(world);
      if (dist(b.x, b.y, pos.x, pos.y) < 18) {
        hurtPlayer(world, b.damage);
        dead = true;
      }
    }
    if (dead) b.life = 0;
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
}

/** Hurt an enemy; at zero health it falls and the mission counts it. */
export function hurtEnemy(world, enemy, amount) {
  enemy.health -= amount;
  enemy.flash = 0.12;
  if (enemy.health <= 0) {
    enemy.health = 0;
    spawnBurst(world, enemy.x, enemy.y, '#c94f43');
    world.enemies = world.enemies.filter((e) => e !== enemy);
    if (world.mission.stage === 'clear' || world.mission.stage === 'finale') {
      world.mission.targetsLeft = Math.max(0, world.mission.targetsLeft - 1);
    }
  }
}

/** Hurt the player; at zero health the run ends wasted. */
export function hurtPlayer(world, amount) {
  const p = world.player;
  p.health -= amount;
  p.hurtFlash = 0.25;
  if (world.audio) world.audio.hurt();
  if (p.health <= 0) {
    p.health = 0;
    world.state = 'wasted';
  }
}

/** Spawn a rival Viper (or the finale boss) at a spot. */
export function spawnEnemy(world, x, y, boss = false) {
  const enemy = {
    x, y, angle: 0,
    health: boss ? CONFIG.bossHealth : CONFIG.enemyHealth,
    maxHealth: boss ? CONFIG.bossHealth : CONFIG.enemyHealth,
    speed: boss ? 150 : 185,
    shootTimer: 0.6 + world.rng() * 0.8,
    flash: 0, boss,
  };
  world.enemies.push(enemy);
  return enemy;
}

/** One step for every enemy: close in, keep range, and shoot back. */
export function updateEnemies(world, dt) {
  const pos = playerPos(world);
  for (const enemy of world.enemies) {
    if (enemy.flash > 0) enemy.flash -= dt;
    const d = dist(enemy.x, enemy.y, pos.x, pos.y);
    enemy.angle = angleTo(enemy.x, enemy.y, pos.x, pos.y);
    if (d > 300) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
    } else if (d < 170) {
      enemy.x -= Math.cos(enemy.angle) * enemy.speed * 0.6 * dt;
      enemy.y -= Math.sin(enemy.angle) * enemy.speed * 0.6 * dt;
    }
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && d < 560) {
      enemy.shootTimer = CONFIG.enemyShotInterval * (enemy.boss ? 0.7 : 1);
      const spread = jitter(world.rng, 0.12);
      world.bullets.push({
        x: enemy.x + Math.cos(enemy.angle) * 24,
        y: enemy.y + Math.sin(enemy.angle) * 24,
        vx: Math.cos(enemy.angle + spread) * 720,
        vy: Math.sin(enemy.angle + spread) * 720,
        life: 1.1, owner: 'enemy', damage: CONFIG.enemyShotDamage,
      });
      enemy.muzzle = 0.06;
    }
    if (enemy.muzzle > 0) enemy.muzzle -= dt;
  }
}

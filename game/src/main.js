// SOLMAR — Streets of the Sun: boot and the one loop. Input is read every frame,
// the world advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, playing, paused, busted, wasted, finale.
// ?seed=N fixes the city. ?shot=start|play|chase|end&seed=1 stages that scene,
// settles it for a fixed number of steps and sets window.__shotReady.
import { CAR_TYPES, FONT, GARAGE, PLAYER_START, ROAD_X, ROAD_Y, SHOP_DEFS, STEP, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { clamp, createRandom, dist, pick, range } from './random.js';
import { buildCity, inWater, resolveBuildingCollision } from './world.js';
import { createAudio } from './audio.js';
import { createInput, ACT_CONFIRM, ACT_INTERACT, ACT_PAUSE, ACT_RELOAD, ACT_WEAPON_NEXT } from './input.js';
import { collideCars, driveCar, makeCar, nearestParkedCar, spawnTrafficCar, updateTrafficCar } from './vehicles.js';
import { addHeat, clearWanted, decayHeat, maintainPolice, updateCop, updatePatrol } from './police.js';
import { makeEnemy, missionMarker, startMission, updateMission } from './missions.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);
const hud = createHud(canvas);

function announce(message) {
  statusEl.textContent = message;
}

function createGame(seedValue) {
  const random = createRandom(seedValue);
  const city = buildCity(random);
  const g = {
    random,
    city,
    audio,
    time: 0,
    playTime: 0,
    screen: 'title',
    shotMode: false,
    camera: { x: 1800, y: 1000 },
    money: 250,
    heat: 0,
    wanted: 0,
    player: {
      x: PLAYER_START.x, y: PLAYER_START.y, angle: -Math.PI / 2, aimAngle: 0,
      hp: 100, car: null, weapon: 'pistol', owned: ['pistol'],
      ammo: 12, reserve: 48, reloading: false, reloadT: 0, fireCd: 0,
    },
    cars: [],
    peds: [],
    cops: [],
    patrols: [],
    enemies: [],
    bullets: [],
    particles: [],
    crates: [],
    mission: null,
    toasts: [],
    fireworks: [],
    nearShop: null,
    nearCar: null,
    busted: false,
    wasted: false,
    bustedLoss: 0,
    wastedLoss: 0,
    saveData: loadSave(),
  };
  g.toast = (message, color = '#ffffff') => {
    g.toasts.push({ message, color, life: 3.4 });
    if (g.toasts.length > 3) g.toasts.shift();
  };
  g.missionMarker = () => missionMarker(g);
  g.saveGame = () => {
    writeSave({
      money: g.money,
      missionIndex: g.mission ? g.mission.index : 0,
      owned: g.player.owned,
      hp: g.player.hp,
    });
  };
  g.finale = () => {
    g.screen = 'finale';
    g.fireworks = [];
    for (let i = 0; i < 6; i += 1) g.fireworks.push({ x: 150 + i * 110, y: 160 + (i % 2) * 100, t: g.time + i * 0.5, hue: i });
    audio.mission();
    announce('King of Solmar. You own the bay.');
  };

  // Parked cars along the avenues.
  for (let i = 0; i < 14; i += 1) {
    const vertical = random() < 0.5;
    const type = pick(random, ['sedan', 'sedan', 'taxi', 'pickup', 'van', 'coupe']);
    let car;
    if (vertical) {
      const line = pick(random, ROAD_X);
      car = makeCar(type, line + 24, range(random, 150, WORLD_H - 150), Math.PI / 2);
    } else {
      const line = pick(random, ROAD_Y);
      car = makeCar(type, range(random, 150, WORLD_W - 150), line + 24, 0);
    }
    g.cars.push(car);
  }
  // A sedan waiting near the player's start, for the first steal.
  g.cars.push(makeCar('sedan', 1000, 1750, 0));
  // Traffic.
  for (let i = 0; i < 10; i += 1) g.cars.push(spawnTrafficCar(random, city));
  // Pedestrians on the sidewalks.
  const pedColors = ['#e8b4b8', '#a8c8e8', '#d9c9a8', '#b8e8c8', '#e8d27a', '#c9a8e8'];
  for (let i = 0; i < 26; i += 1) {
    const vertical = random() < 0.5;
    const x = vertical ? pick(random, ROAD_X) + 62 : range(random, 150, WORLD_W - 150);
    const y = vertical ? range(random, 150, WORLD_H - 150) : pick(random, ROAD_Y) + 62;
    g.peds.push({
      x, y, angle: range(random, 0, Math.PI * 2), speed: range(random, 40, 70),
      color: pick(random, pedColors), state: 'walk', tx: x, ty: y, wait: 0, dead: false, fleeT: 0,
    });
  }
  return g;
}

const g = createGame(seed);

function screenToWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  const px = sx - rect.left;
  const py = sy - rect.top;
  return {
    x: g.camera.x + (px - window.innerWidth / 2) / renderer.view.zoom,
    y: g.camera.y + (py - window.innerHeight / 2) / renderer.view.zoom,
  };
}

function addParticles(x, y, count, color, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = g.random() * Math.PI * 2;
    const s = range(g.random, speed * 0.3, speed);
    g.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0, maxLife: range(g.random, 0.3, 0.7), r: range(g.random, 2, 4.5), color,
    });
  }
}

function fireBullet(from, x, y, angle, damage, speed) {
  g.bullets.push({ x, y, angle, speed, damage, from, life: 0, maxLife: 1.4 });
}

function playerShoot() {
  const p = g.player;
  const w = WEAPONS[p.weapon];
  if (p.reloading || p.fireCd > 0) return;
  if (p.ammo <= 0) {
    startReload();
    return;
  }
  p.fireCd = w.rate;
  p.ammo -= 1;
  const spread = (g.random() - 0.5) * 2 * w.spread;
  const angle = p.aimAngle + spread;
  const ox = p.car ? p.car.x : p.x;
  const oy = p.car ? p.car.y : p.y;
  fireBullet('player', ox + Math.cos(angle) * 26, oy + Math.sin(angle) * 26, angle, w.damage, w.bulletSpeed);
  addParticles(ox + Math.cos(angle) * 30, oy + Math.sin(angle) * 30, 3, 'rgba(255,220,130,A)', 120);
  audio.shoot();
  // Gunfire draws attention.
  for (const ped of g.peds) {
    if (!ped.dead && dist(ped.x, ped.y, ox, oy) < 320) {
      ped.state = 'flee';
      ped.fleeT = 2.5;
    }
  }
  addHeat(g, 4);
}

function startReload() {
  const p = g.player;
  const w = WEAPONS[p.weapon];
  if (p.reloading || p.ammo === w.mag || p.reserve <= 0) return;
  p.reloading = true;
  p.reloadT = w.reload;
}

function useShop(shop) {
  const p = g.player;
  if (shop.kind === 'clinic') {
    if (g.money < 100) { g.toast('Not enough cash for the clinic ($100).', '#ff5a4e'); return; }
    if (p.hp >= 100) { g.toast('You are already at full health.', '#e8e8e8'); return; }
    g.money -= 100;
    p.hp = 100;
    g.toast('Patched up — full health.', '#8be28b');
    audio.pickup();
  } else if (shop.kind === 'spray') {
    if (g.money < 300) { g.toast('Not enough cash for a respray ($300).', '#ff5a4e'); return; }
    if (g.wanted === 0) { g.toast('No heat to lose right now.', '#e8e8e8'); return; }
    g.money -= 300;
    clearWanted(g);
    g.toast('Fresh paint — the heat is gone.', '#8be28b');
    audio.pickup();
  } else if (shop.kind === 'weapons') {
    const order = ['smg', 'rifle'];
    const next = order.find((name) => !p.owned.includes(name));
    if (next) {
      const price = WEAPONS[next].price;
      if (g.money < price) { g.toast(`The ${WEAPONS[next].name} costs $${price}.`, '#ff5a4e'); return; }
      g.money -= price;
      p.owned.push(next);
      p.weapon = next;
      p.ammo = WEAPONS[next].mag;
      p.reserve = WEAPONS[next].mag * 3;
      g.toast(`Bought the ${WEAPONS[next].name}!`, '#8be28b');
      audio.cash();
    } else {
      if (g.money < 50) { g.toast('Ammo costs $50.', '#ff5a4e'); return; }
      g.money -= 50;
      p.reserve += WEAPONS[p.weapon].mag * 2;
      g.toast('Ammo restocked.', '#8be28b');
      audio.pickup();
    }
  } else if (shop.kind === 'garage') {
    g.toast('Rico Garage — bring the Falco GT here for mission 1.', '#e8e8e8');
  }
}

function enterOrExitCar() {
  const p = g.player;
  if (p.car) {
    // Step out beside the car.
    p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 34;
    p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 34;
    p.angle = p.car.angle;
    p.car = null;
    audio.click();
    return;
  }
  const car = nearestParkedCar(g.cars, p.x, p.y, 70);
  if (car) {
    if (car.traffic) {
      // Stealing a moving car is not allowed; only parked ones.
      g.toast('That car is moving — wait for a parked one.', '#e8e8e8');
      return;
    }
    if (car.police) {
      g.toast('You cannot steal a patrol cruiser.', '#ff5a4e');
      return;
    }
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    addHeat(g, 22);
    g.toast(`You took the ${car.name}!`, '#ffd98a');
    audio.click();
  }
}

function updatePlayer(input, dt) {
  const p = g.player;
  p.fireCd = Math.max(0, p.fireCd - dt);
  if (p.reloading) {
    p.reloadT -= dt;
    if (p.reloadT <= 0) {
      const w = WEAPONS[p.weapon];
      const need = w.mag - p.ammo;
      const take = Math.min(need, p.reserve);
      p.ammo += take;
      p.reserve -= take;
      p.reloading = false;
    }
  }
  // Aim follows the mouse.
  const m = input.mouse;
  const world = screenToWorld(m.x, m.y);
  const ox = p.car ? p.car.x : p.x;
  const oy = p.car ? p.car.y : p.y;
  p.aimAngle = Math.atan2(world.y - oy, world.x - ox);

  const axes = input.moveAxes();
  if (p.car) {
    const crashed = driveCar(g.city, p.car, axes.fwd, axes.strafe, dt);
    if (crashed) audio.crash();
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    audio.setEngine(Math.abs(p.car.speed) / p.car.maxSpeed);
    if (m.down) playerShoot();
  } else {
    audio.setEngine(0);
    const speed = 205;
    // Movement is world-aligned: W = north, S = south, A = west, D = east.
    const vx = axes.strafe * speed;
    const vy = axes.fwd > 0 ? -speed : axes.fwd < 0 ? speed : 0;
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      p.x += (vx / len) * speed * dt;
      p.y += (vy / len) * speed * dt;
      p.angle = Math.atan2(vy, vx);
    }
    p.x = clamp(p.x, 30, WORLD_W - 30);
    p.y = clamp(p.y, 30, WORLD_H - 30);
    if (inWater(p.x, p.y)) {
      p.y = Math.min(p.y, 2310);
      p.x = Math.min(p.x, 3110);
    }
    resolveBuildingCollision(g.city, p, 12);
    if (m.down) playerShoot();
  }
}

function updateEnemies(dt) {
  const px = g.player.car ? g.player.car.x : g.player.x;
  const py = g.player.car ? g.player.car.y : g.player.y;
  for (const e of g.enemies) {
    const d = dist(e.x, e.y, px, py);
    e.shootCd -= dt;
    if (d < 520) {
      const ang = Math.atan2(py - e.y, px - e.x);
      e.angle = ang;
      if (d > 180) {
        e.x += Math.cos(ang) * e.speed * dt;
        e.y += Math.sin(ang) * e.speed * dt;
      }
      if (e.shootCd <= 0 && d < 480) {
        e.shootCd = range(g.random, 1.1, 2.0);
        const spread = (g.random() - 0.5) * 0.3;
        fireBullet('enemy', e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20, ang + spread, 9, 620);
        audio.enemyShot();
      }
    } else {
      // Wander near the post.
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        e.wanderT = range(g.random, 2, 5);
        e.wander = { x: e.x + range(g.random, -120, 120), y: e.y + range(g.random, -120, 120) };
      }
      const ang = Math.atan2(e.wander.y - e.y, e.wander.x - e.x);
      if (dist(e.x, e.y, e.wander.x, e.wander.y) > 12) {
        e.angle = ang;
        e.x += Math.cos(ang) * e.speed * 0.5 * dt;
        e.y += Math.sin(ang) * e.speed * 0.5 * dt;
      }
    }
    resolveBuildingCollision(g.city, e, 12);
  }
}

function updatePeds(dt) {
  for (const ped of g.peds) {
    if (ped.dead) continue;
    if (ped.state === 'flee') {
      ped.fleeT -= dt;
      const px = g.player.car ? g.player.car.x : g.player.x;
      const py = g.player.car ? g.player.car.y : g.player.y;
      const ang = Math.atan2(ped.y - py, ped.x - px);
      ped.angle = ang;
      ped.x += Math.cos(ang) * 150 * dt;
      ped.y += Math.sin(ang) * 150 * dt;
      if (ped.fleeT <= 0) ped.state = 'walk';
    } else {
      ped.wait -= dt;
      if (ped.wait <= 0) {
        ped.wait = range(g.random, 2, 6);
        const vertical = g.random() < 0.5;
        if (vertical) {
          ped.tx = pick(g.random, ROAD_X) + 62;
          ped.ty = range(g.random, 150, WORLD_H - 150);
        } else {
          ped.tx = range(g.random, 150, WORLD_W - 150);
          ped.ty = pick(g.random, ROAD_Y) + 62;
        }
      }
      const d = dist(ped.x, ped.y, ped.tx, ped.ty);
      if (d > 10) {
        const ang = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
        ped.angle = ang;
        ped.x += Math.cos(ang) * ped.speed * dt;
        ped.y += Math.sin(ang) * ped.speed * dt;
      }
    }
    ped.x = clamp(ped.x, 30, WORLD_W - 30);
    ped.y = clamp(ped.y, 30, WORLD_H - 30);
    resolveBuildingCollision(g.city, ped, 10);
  }
}

function updateBullets(dt) {
  for (let i = g.bullets.length - 1; i >= 0; i -= 1) {
    const b = g.bullets[i];
    b.life += dt;
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    let dead = b.life > b.maxLife || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H;
    if (!dead && g.city.buildings.length) {
      // Cheap building hit: sample the bullet tip against building rects.
      for (const bd of g.city.buildings) {
        if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) {
          addParticles(b.x, b.y, 4, 'rgba(255,220,130,A)', 90);
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'player') {
      for (let j = g.enemies.length - 1; j >= 0; j -= 1) {
        const e = g.enemies[j];
        if (dist(b.x, b.y, e.x, e.y) < 16) {
          e.hp -= b.damage;
          addParticles(b.x, b.y, 5, 'rgba(255,90,78,A)', 110);
          audio.hit();
          dead = true;
          if (e.hp <= 0) {
            g.enemies.splice(j, 1);
            g.money += 40;
            addParticles(e.x, e.y, 14, 'rgba(255,90,78,A)', 200);
            addHeat(g, 8);
          }
          break;
        }
      }
      if (!dead) {
        for (const ped of g.peds) {
          if (!ped.dead && dist(b.x, b.y, ped.x, ped.y) < 14) {
            ped.dead = true;
            addParticles(ped.x, ped.y, 10, 'rgba(255,90,78,A)', 160);
            g.money += 20;
            addHeat(g, 40);
            g.toast('A bystander went down — the heat is on you.', '#ff5a4e');
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (const cop of g.cops) {
          if (dist(b.x, b.y, cop.x, cop.y) < 14) {
            cop.hp -= b.damage;
            addParticles(b.x, b.y, 5, 'rgba(255,90,78,A)', 110);
            audio.hit();
            dead = true;
            if (cop.hp <= 0) {
              const idx = g.cops.indexOf(cop);
              if (idx >= 0) g.cops.splice(idx, 1);
              g.money += 60;
              addHeat(g, 60);
              g.toast('You dropped an officer — 5 stars will follow.', '#ff5a4e');
            }
            break;
          }
        }
      }
    }
    if (!dead && b.from === 'enemy') {
      const px = g.player.car ? g.player.car.x : g.player.x;
      const py = g.player.car ? g.player.car.y : g.player.y;
      if (dist(b.x, b.y, px, py) < (g.player.car ? 24 : 14)) {
        g.player.hp -= b.damage;
        addParticles(b.x, b.y, 5, 'rgba(255,90,78,A)', 110);
        audio.hit();
        dead = true;
        if (g.player.hp <= 0) {
          g.player.hp = 0;
          g.wasted = true;
        }
      }
    }
    if (dead) g.bullets.splice(i, 1);
  }
}

function updateTraffic(dt) {
  const cars = g.cars;
  for (const car of cars) {
    if (!car.traffic) continue;
    updateTrafficCar(g.random, g.city, car, dt, cars);
  }
  // Car-car collisions.
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (dist(a.x, a.y, b.x, b.y) < 60 && collideCars(a, b)) {
        if ((a === g.player.car || b === g.player.car) && Math.abs(a.speed - b.speed) > 120) audio.crash();
      }
    }
  }
  // A patrol car ramming the player's car hurts the player a little.
  if (g.player.car) {
    for (const car of g.patrols) {
      if (dist(car.x, car.y, g.player.car.x, g.player.car.y) < 40 && Math.abs(car.speed) > 200) {
        g.player.hp = Math.max(0, g.player.hp - 2);
      }
    }
  }
}

function updateCamera(dt) {
  const px = g.player.car ? g.player.car.x : g.player.x;
  const py = g.player.car ? g.player.car.y : g.player.y;
  const lead = g.player.car ? 60 : 0;
  const tx = px + (g.player.car ? Math.cos(g.player.car.angle) * lead : 0);
  const ty = py + (g.player.car ? Math.sin(g.player.car.angle) * lead : 0);
  g.camera.x += (tx - g.camera.x) * Math.min(1, 5 * dt);
  g.camera.y += (ty - g.camera.y) * Math.min(1, 5 * dt);
  g.camera.x = clamp(g.camera.x, 350, WORLD_W - 500);
  g.camera.y = clamp(g.camera.y, 300, WORLD_H - 380);
}

function updateToasts(dt) {
  for (let i = g.toasts.length - 1; i >= 0; i -= 1) {
    g.toasts[i].life -= dt;
    if (g.toasts[i].life <= 0) g.toasts.splice(i, 1);
  }
  for (let i = g.particles.length - 1; i >= 0; i -= 1) {
    const p = g.particles[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.life >= p.maxLife) g.particles.splice(i, 1);
  }
}

function nearestShop() {
  for (const s of g.city.shops) {
    if (dist(g.player.x, g.player.y, s.x, s.y) < 110) return s;
  }
  return null;
}

function stepPlaying(input, dt) {
  g.time += dt;
  g.playTime += dt;
  updatePlayer(input, dt);
  updateEnemies(dt);
  updatePeds(dt);
  updateBullets(dt);
  updateTraffic(dt);
  for (const cop of g.cops) updateCop(g, cop, dt);
  for (const car of g.patrols) updatePatrol(g, car, dt);
  maintainPolice(g.random, g, dt);
  decayHeat(g, dt);
  updateMission(g, dt);
  updateCamera(dt);
  updateToasts(dt);

  g.nearShop = g.player.car ? null : nearestShop();
  g.nearCar = g.player.car ? null : nearestParkedCar(g.cars.filter((c) => !c.traffic && !c.police), g.player.x, g.player.y, 70);

  const actions = input.takeActions();
  if (actions & ACT_INTERACT) {
    if (g.nearShop) useShop(g.nearShop);
    else enterOrExitCar();
  }
  if (actions & ACT_RELOAD) startReload();
  if (actions & ACT_WEAPON_NEXT) {
    const idx = g.player.owned.indexOf(g.player.weapon);
    const next = g.player.owned[(idx + 1) % g.player.owned.length];
    g.player.weapon = next;
    g.player.ammo = Math.min(g.player.ammo, WEAPONS[next].mag);
    g.player.reloading = false;
    g.toast(`Weapon: ${WEAPONS[next].name}`, '#e8e8e8');
  }
  if (actions & ACT_PAUSE) {
    g.screen = 'paused';
    announce('Paused.');
  }
  if (input.takeMouseClick()) audio.unlock();

  // Busted / wasted transitions.
  if (g.busted) {
    g.busted = false;
    g.bustedLoss = Math.min(g.money, 200);
    g.money -= g.bustedLoss;
    clearWanted(g);
    g.cops = [];
    g.patrols = [];
    g.cars = g.cars.filter((c) => !c.police);
    respawnAtClinic();
    g.screen = 'busted';
    announce('Busted.');
    return;
  }
  if (g.wasted) {
    g.wasted = false;
    g.wastedLoss = Math.min(g.money, 300);
    g.money -= g.wastedLoss;
    clearWanted(g);
    g.cops = [];
    g.patrols = [];
    g.cars = g.cars.filter((c) => !c.police);
    g.enemies = [];
    respawnAtClinic();
    g.screen = 'wasted';
    announce('Wasted.');
  }
}

function respawnAtClinic() {
  const clinic = g.city.shops.find((s) => s.kind === 'clinic');
  g.player.car = null;
  g.player.x = clinic ? clinic.x : PLAYER_START.x;
  g.player.y = clinic ? clinic.y + 120 : PLAYER_START.y;
  g.player.hp = 100;
  g.player.ammo = WEAPONS[g.player.weapon].mag;
  g.camera.x = g.player.x;
  g.camera.y = g.player.y;
  g.saveGame();
}

function startNewGame() {
  g.money = 250;
  g.heat = 0;
  g.wanted = 0;
  g.player.hp = 100;
  g.player.car = null;
  g.player.x = PLAYER_START.x;
  g.player.y = PLAYER_START.y;
  g.player.weapon = 'pistol';
  g.player.owned = ['pistol'];
  g.player.ammo = 12;
  g.player.reserve = 48;
  g.enemies = [];
  g.cops = [];
  g.patrols = [];
  g.cars = g.cars.filter((c) => !c.police);
  g.playTime = 0;
  g.screen = 'playing';
  audio.unlock();
  audio.startMusic();
  startMission(g, 0);
  announce('Playing. Mission 1: Hot Wheels.');
}

function continueGame() {
  const s = g.saveData;
  if (s) {
    g.money = typeof s.money === 'number' ? s.money : 250;
    g.player.owned = Array.isArray(s.owned) && s.owned.length ? s.owned : ['pistol'];
    g.player.weapon = g.player.owned[0];
    g.player.hp = typeof s.hp === 'number' ? s.hp : 100;
    const idx = typeof s.missionIndex === 'number' ? s.missionIndex : 0;
    g.screen = 'playing';
    audio.unlock();
    audio.startMusic();
    startMission(g, idx);
    announce(`Playing. Mission ${idx + 1}.`);
  } else {
    startNewGame();
  }
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function handleTitleActions() {
    const actions = input.takeActions();
    if (actions & ACT_CONFIRM) {
      if (g.saveData) continueGame();
      else startNewGame();
    }
    if (input.takeMouseClick()) {
      audio.unlock();
      if (g.saveData) continueGame();
      else startNewGame();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (g.screen === 'title') {
      handleTitleActions();
      // Ambient title backdrop: traffic cruises, camera drifts over downtown.
      g.time += STEP;
      updateTraffic(STEP);
      g.camera.x = 1800 + Math.sin(g.time * 0.05) * 220;
      g.camera.y = 1000 + Math.cos(g.time * 0.04) * 160;
      updateToasts(STEP);
      renderer.drawWorld(g);
      hud.draw(g);
      return;
    }
    if (g.screen === 'paused') {
      const actions = input.takeActions();
      if (actions & (ACT_PAUSE | ACT_CONFIRM)) {
        g.screen = 'playing';
        announce('Playing.');
      }
      renderer.drawWorld(g);
      hud.draw(g);
      return;
    }
    if (g.screen === 'busted' || g.screen === 'wasted') {
      const actions = input.takeActions();
      if (actions & ACT_CONFIRM) {
        g.screen = 'playing';
        announce('Playing.');
      }
      renderer.drawWorld(g);
      hud.draw(g);
      return;
    }
    if (g.screen === 'finale') {
      g.time += STEP;
      updateToasts(STEP);
      // Firework bursts.
      if (g.random() < 0.06) {
        const fx = 150 + g.random() * 500;
        const fy = 120 + g.random() * 220;
        const cols = ['rgba(255,90,78,A)', 'rgba(255,217,138,A)', 'rgba(79,195,247,A)', 'rgba(139,226,139,A)'];
        addParticles(fx, fy, 22, cols[Math.floor(g.random() * cols.length)], 260);
      }
      updateCamera(STEP);
      const actions = input.takeActions();
      if (actions & ACT_CONFIRM) {
        g.screen = 'playing';
        g.mission = null;
        announce('Free roam.');
      }
      renderer.drawWorld(g);
      hud.draw(g);
      return;
    }
    // playing
    while (accumulator >= STEP) {
      stepPlaying(input, STEP);
      accumulator -= STEP;
      if (g.screen !== 'playing') break;
    }
    renderer.drawWorld(g);
    hud.draw(g);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && g.screen === 'playing') {
      g.screen = 'paused';
      announce('Paused.');
    }
  });
  window.addEventListener('resize', () => {
    renderer.resize();
    hud.resize(window.innerWidth, window.innerHeight);
  });
  renderer.resize();
  hud.resize(window.innerWidth, window.innerHeight);
  announce('Solmar — Streets of the Sun. Press Enter to start.');
  requestAnimationFrame(frame);
}

function runShot(name) {
  stageShot(g, name);
  // Settle the scene for a fixed number of steps so traffic, lights and
  // particles are mid-motion and the frame is the same every run.
  for (let i = 0; i < 90; i += 1) {
    g.time += STEP;
    if (g.screen === 'playing') {
      updateTraffic(STEP);
      for (const car of g.patrols) car.flash += STEP;
      updateToasts(STEP);
    }
  }
  renderer.resize();
  hud.resize(window.innerWidth, window.innerHeight);
  let painted = 0;
  function paint() {
    renderer.drawWorld(g);
    hud.draw(g);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

// Exposed for the headless smoke test (not part of the game UI).
window.__solmar = {
  game: g,
  startNewGame,
  continueGame,
  version: 'solmar-1',
};

if (shot) runShot(shot);
else runGame();

export { FONT, GARAGE, SHOP_DEFS, CAR_TYPES };

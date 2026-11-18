// main.js — boot and the one loop for SOLMAR: Streets of the Sun. Input is
// read every frame, the world advances in fixed 1/60 s steps, and the
// renderer paints what is there. Screens: title, play, paused, shop, busted,
// wasted, finale.
//
// ?seed=N fixes the city. ?shot=start|play|chase|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, WEAPONS, WEAPON_ORDER, SPRAY_PRICE, CLINIC_PRICE, POIS, clamp, dist2, angleTo } from './config.js';
import { createGame, hitsBuilding, inWater, toast, burst, gunshotNoise, STEP } from './world.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_INTERACT, ACTION_SWITCH, ACTION_RELOAD } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { driveCar, updateTraffic, resolveCarCollisions, tryEnterCar, raiseWanted, destroyCar, populateCars, populatePeds } from './vehicles.js';
import { maintainPolice, updateFootCops, updateCruisers, updateBullets, fireBullet } from './police.js';
import { startMission, updateMission, updateEnemies, completeMission } from './missions.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

// Advance the whole world one fixed step. `drive` overrides the player's
// driving input (used by the screenshot autopilot); when it is null the
// real keyboard input drives. Exported for shots.js.
export function stepWorld(G, input, dt, drive) {
  G.time += dt;
  const p = G.player;

  // Toasts and particles always tick.
  for (let i = G.toasts.length - 1; i >= 0; i -= 1) {
    G.toasts[i].t -= dt;
    if (G.toasts[i].t <= 0) G.toasts.splice(i, 1);
  }
  for (let i = G.particles.length - 1; i >= 0; i -= 1) {
    const pt = G.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.fireworks.length - 1; i >= 0; i -= 1) {
    const f = G.fireworks[i];
    f.life -= dt;
    if (f.life <= 0) G.fireworks.splice(i, 1);
  }

  // The next mission starts after its breather.
  if (G.pendingMission && G.time >= G.nextMissionAt) {
    const n = G.pendingMission;
    G.pendingMission = null;
    startMission(G, n);
  }

  if (G.screen === 'play') {
    // --- Player movement ---
    if (p.inCar) {
      const car = p.inCar;
      const d = drive || {
        throttle: (input.up() ? 1 : 0) + (input.down() ? -1 : 0),
        steer: (input.right() ? 1 : 0) - (input.left() ? 1 : 0),
      };
      driveCar(G, car, d, dt);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      audio.engine(Math.abs(car.speed) / car.type.maxSpeed);
      if (car.hp <= 0) destroyCar(G, car);
    } else {
      audio.engine(0);
      let mx = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
      let my = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        mx /= len;
        my /= len;
        const speed = 215;
        const nx = p.x + mx * speed * dt;
        const ny = p.y + my * speed * dt;
        if (!hitsBuilding(G.city, nx, p.y, 12) && !inWater(nx, p.y)) p.x = clamp(nx, 30, WORLD_W - 30);
        if (!hitsBuilding(G.city, p.x, ny, 12) && !inWater(p.x, ny)) p.y = clamp(ny, 30, WORLD_H - 30);
      }
      // Face the mouse.
      const mouse = input.mouse();
      const off = renderer.viewOffset(G);
      p.angle = angleTo(p.x, p.y, mouse.x + off.x, mouse.y + off.y);
    }

    // --- Shooting ---
    p.fireTimer -= dt;
    if (p.reloading > 0) {
      p.reloading -= dt;
      if (p.reloading <= 0) {
        const w = WEAPONS[p.weapon];
        const take = Math.min(w.mag, p.ammo[p.weapon]);
        p.mag[p.weapon] = take;
        p.ammo[p.weapon] -= take;
      }
    } else if (input.firing() && p.fireTimer <= 0) {
      const w = WEAPONS[p.weapon];
      if (p.mag[p.weapon] > 0) {
        p.fireTimer = w.rate;
        p.mag[p.weapon] -= 1;
        G.stats.shotsFired += 1;
        const mouse = input.mouse();
        const off = renderer.viewOffset(G);
        const aim = angleTo(p.x, p.y, mouse.x + off.x, mouse.y + off.y) + (G.rng() - 0.5) * w.spread * 2;
        fireBullet(G, p.x, p.y, aim, w.damage, 'player');
        gunshotNoise(G, p.x, p.y);
        audio.shot();
        burst(G, p.x + Math.cos(aim) * 24, p.y + Math.sin(aim) * 24, '#ffe94a', 3, 120, 0.2);
      } else if (p.ammo[p.weapon] > 0) {
        p.reloading = w.reload;
      }
    }

    // --- Pedestrians ---
    for (const ped of G.peds) {
      ped.walkPhase += dt * 6;
      if (ped.flee > 0) {
        ped.flee -= dt;
        const a = angleTo(ped.fleeX, ped.fleeY, ped.x, ped.y);
        ped.x += Math.cos(a) * 150 * dt;
        ped.y += Math.sin(a) * 150 * dt;
        ped.angle = a;
      } else {
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
        if (hitsBuilding(G.city, ped.x, ped.y, 10) || ped.x < 40 || ped.x > WORLD_W - 40 || ped.y < 40 || ped.y > WORLD_H - 40) {
          ped.angle += Math.PI / 2 + (G.rng() - 0.5);
        }
      }
      if (ped.reportTimer > 0) {
        ped.reportTimer -= dt;
        if (ped.reportTimer <= 0 && !ped.reported) {
          ped.reported = true;
          raiseWanted(G, Math.min(5, G.wanted + 1));
          toast(G, 'A witness called the police!');
        }
      }
    }

    // --- Systems ---
    updateTraffic(G, dt);
    resolveCarCollisions(G);
    maintainPolice(G, dt);
    updateFootCops(G, dt);
    updateCruisers(G, dt);
    updateEnemies(G, dt);
    updateBullets(G, dt);
    updateMission(G, dt);

    // A wanted level that cooled to zero clears witness reports.
    if (G.wanted === 0) {
      for (const ped of G.peds) ped.reported = false;
    }

    // Interaction hint: nearest car or shop.
    G.nearHint = nearHint(G);
  } else {
    // Ambient world on the title screen: traffic and pedestrians move.
    updateTraffic(G, dt);
    for (const ped of G.peds) {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (hitsBuilding(G.city, ped.x, ped.y, 10)) ped.angle += Math.PI / 2;
    }
  }

  if (p.invuln > 0) p.invuln -= dt;
}

function nearHint(G) {
  const p = G.player;
  if (p.inCar) return '[E] Exit car';
  let bestD = 70 * 70;
  let best = null;
  for (const car of G.cars) {
    if (car.dead || car.driver === 'police') continue;
    const d2 = dist2(p.x, p.y, car.x, car.y);
    if (d2 < bestD) { bestD = d2; best = car; }
  }
  if (best) return `[E] Steal the ${best.type.name}`;
  for (const [key, poi] of Object.entries(POIS)) {
    if (key === 'gunShop' || key === 'clinic' || key === 'sprayShop') {
      if (dist2(p.x, p.y, poi.x + 55, poi.y + 35) < 110 * 110) return `[E] Enter ${poi.name}`;
    }
  }
  return null;
}

function nearestShop(G) {
  const p = G.player;
  for (const key of ['gunShop', 'clinic', 'sprayShop']) {
    const poi = POIS[key];
    if (dist2(p.x, p.y, poi.x + 55, poi.y + 35) < 110 * 110) return key === 'gunShop' ? 'gun' : key === 'clinic' ? 'clinic' : 'spray';
  }
  return null;
}

function buyFromShop(G, key) {
  const p = G.player;
  const kind = G.shopKind;
  const spend = (amount) => {
    if (p.money < amount) { toast(G, 'Not enough money.'); return false; }
    p.money -= amount;
    return true;
  };
  if (kind === 'gun') {
    if (key === 'Digit1') {
      if (p.owned.includes('smg')) { toast(G, 'You already own the SMG.'); return; }
      if (spend(WEAPONS.smg.price)) { p.owned.push('smg'); p.ammo.smg += 30; toast(G, 'Bought the SMG!'); audio.cash(); }
    } else if (key === 'Digit2') {
      if (p.owned.includes('rifle')) { toast(G, 'You already own the Rifle.'); return; }
      if (spend(WEAPONS.rifle.price)) { p.owned.push('rifle'); p.ammo.rifle += 8; toast(G, 'Bought the Rifle!'); audio.cash(); }
    } else if (key === 'Digit3') {
      if (spend(WEAPONS.pistol.ammoPrice)) { p.ammo.pistol += 24; toast(G, '+24 pistol ammo'); }
    } else if (key === 'Digit4') {
      if (spend(WEAPONS.smg.ammoPrice)) { p.ammo.smg += 30; toast(G, '+30 SMG ammo'); }
    } else if (key === 'Digit5') {
      if (spend(WEAPONS.rifle.ammoPrice)) { p.ammo.rifle += 8; toast(G, '+8 rifle ammo'); }
    }
  } else if (kind === 'clinic') {
    if (key === 'Digit1' && spend(CLINIC_PRICE)) {
      p.hp = 100;
      toast(G, 'Patched up. Full health.');
      audio.pickup();
    }
  } else if (kind === 'spray') {
    if (key === 'Digit1' && spend(SPRAY_PRICE)) {
      G.wanted = 0;
      G.footCops = [];
      toast(G, 'Fresh paint — the heat is gone.');
      audio.pickup();
    }
  }
}

function respawn(G, keepPlaying) {
  const p = G.player;
  p.hp = 100;
  p.invuln = 1;
  G.wanted = 0;
  G.footCops = [];
  for (const car of G.cars) {
    if (car.driver === 'police') car.dead = true;
  }
  if (p.inCar) {
    p.inCar.driver = 'parked';
    p.inCar = null;
  }
  p.x = POIS.garage.x + 120;
  p.y = POIS.garage.y + 60;
  G.screen = 'play';
  if (keepPlaying) toast(G, 'Back on the streets.');
}

let renderer = null;

function runShot(name) {
  const G = stageShot(name, seed);
  renderer = createRenderer(canvas);
  window.__game = G;
  let painted = 0;
  function paint() {
    renderer.draw(G, { x: 640, y: 400 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  renderer = createRenderer(canvas);
  const G = createGame(seed);
  window.__game = G;
  populateCars(G);
  populatePeds(G);
  let screen = 'title';
  G.screen = screen;
  let accumulator = 0;
  let last = performance.now();
  let started = false;

  const saved = loadSave();
  if (saved) {
    G.saveNotice = `Save found: $${saved.money}, mission ${Math.min(6, (saved.missionIndex || 0) + 1)} — press Enter to continue.`;
  }

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.resume();
    audio.startMusic();
    if (!started) {
      started = true;
      if (saved) {
        G.player.money = saved.money || 250;
        G.player.owned = saved.owned || ['pistol'];
        G.player.ammo = { pistol: 48, smg: 0, rifle: 0, ...(saved.ammo || {}) };
        const missionToStart = Math.min(6, Math.max(1, (saved.missionIndex || 0) + 1));
        startMission(G, missionToStart);
      } else {
        startMission(G, 1);
      }
    }
    screen = 'play';
    G.screen = screen;
    accumulator = 0;
    announce('Playing. Follow the yellow marker.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === 'title' || screen === 'busted' || screen === 'wasted' || screen === 'finale') {
      if (actions & ACTION_CONFIRM) {
        if (screen === 'busted' || screen === 'wasted') respawn(G, true);
        startGame();
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        G.screen = screen;
        announce('Paused.');
      } else if (screen === 'paused') {
        screen = 'play';
        G.screen = screen;
        announce('Playing.');
      } else if (screen === 'shop') {
        screen = 'play';
        G.screen = screen;
      }
      return;
    }
    if (screen === 'shop') {
      if (actions & ACTION_INTERACT) {
        screen = 'play';
        G.screen = screen;
      }
      return;
    }
    if (screen !== 'play') return;
    if (actions & ACTION_INTERACT) {
      const shop = nearestShop(G);
      if (shop && !G.player.inCar) {
        screen = 'shop';
        G.screen = screen;
        G.shopKind = shop;
        audio.resume();
      } else {
        const result = tryEnterCar(G);
        if (result === 'enter') audio.pickup();
      }
    }
    if (actions & ACTION_SWITCH) {
      const owned = WEAPON_ORDER.filter((k) => G.player.owned.includes(k));
      const idx = owned.indexOf(G.player.weapon);
      G.player.weapon = owned[(idx + 1) % owned.length];
      G.player.reloading = 0;
    }
    if (actions & ACTION_RELOAD) {
      const w = WEAPONS[G.player.weapon];
      if (G.player.ammo[G.player.weapon] > 0 && G.player.mag[G.player.weapon] < w.mag) {
        G.player.reloading = w.reload;
      }
    }
  }

  // Shop number keys are read directly (they are not part of the action flags).
  window.addEventListener('keydown', (event) => {
    if (screen === 'shop' && ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(event.code)) {
      buyFromShop(G, event.code);
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'play' || screen === 'title') {
      while (accumulator >= STEP && (screen === 'play' || screen === 'title')) {
        stepWorld(G, input, STEP, null);
        accumulator -= STEP;
        if (G.screen !== screen) {
          screen = G.screen;
          if (screen === 'busted' || screen === 'wasted') {
            writeSave(G);
            announce(screen === 'busted' ? 'Busted by the police.' : 'Wasted.');
          } else if (screen === 'finale') {
            writeSave(G);
            announce('King of Solmar!');
          }
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(G, input.mouse());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (screen === 'play') {
        screen = 'paused';
        G.screen = screen;
        announce('Paused.');
      }
      writeSave(G);
    }
  });

  announce('SOLMAR: Streets of the Sun. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

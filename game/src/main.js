// SOLMAR — Streets of the Sun
// The entry: input, the fixed-step loop, state changes, saving, the debug
// handle for play-testing, and the deterministic screenshot path.

import { CONFIG } from './config.js';
import { createWorld, clampCamera, playerPos, toast } from './world.js';
import { updatePlayerOnFoot, nearestCar, enterCar, exitCar, tryShop } from './player.js';
import { spawnParkedCars, spawnTraffic, updatePlayerCar, updateTraffic, resolveCarCollisions } from './vehicles.js';
import { spawnPeds, updatePeds, checkPedHits, updateParticles } from './pedestrians.js';
import { updateWanted } from './police.js';
import { playerShoot, updateBullets, updateEnemies, startReload } from './combat.js';
import { startMission, updateMission, saveGame, loadGame } from './missions.js';
import { drawGame } from './render.js';
import { drawHUD, drawMenu } from './hud.js';
import { AudioSys } from './audio.js';
import { applyShot } from './shots.js';

const DT = 1 / 60;
const VIEW_W = CONFIG.viewWidth;
const VIEW_H = CONFIG.viewHeight;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const SHOT_MODE = shotName !== null;
const seed = Number.isFinite(seedParam) ? seedParam : (Date.now() % 2147483647);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = createWorld(seed);
world.audio = SHOT_MODE ? null : new AudioSys();
spawnParkedCars(world);
spawnTraffic(world);
spawnPeds(world);
loadGame(world);
if (world.mission.index > 0 && !world.completed) {
  world.mission.objective = `Tekan Enter untuk misi ${world.mission.index + 1}: ${CONFIG.missions[world.mission.index].title}.`;
}

const input = {
  up: false, down: false, left: false, right: false, run: false,
};

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const mapped = KEYMAP[event.code];
  if (mapped) {
    input[mapped] = true;
    event.preventDefault();
    return;
  }
  if (event.code === 'Enter') onEnter();
  if (event.code === 'KeyE') onInteract();
  if (event.code === 'KeyR') startReload(world);
  if (event.code === 'KeyP') togglePause();
  if (event.code === 'KeyM') {
    if (world.audio) world.audio.setMuted(!world.audio.muted);
  }
});

window.addEventListener('keyup', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) input[mapped] = false;
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  world.mouse.x = event.clientX - rect.left;
  world.mouse.y = event.clientY - rect.top;
});

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  world.mouse.down = true;
  if (world.audio) world.audio.ensure();
  if (world.state === 'title') onEnter();
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) world.mouse.down = false;
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

/** Enter: start the game, start a mission, or retry after an ending. */
function onEnter() {
  if (world.audio) world.audio.ensure();
  if (world.state === 'title') {
    world.state = 'play';
    if (world.mission.stage === 'idle') startMission(world, world.mission.index);
    return;
  }
  if (world.state === 'busted' || world.state === 'wasted') {
    retryRun();
    return;
  }
  if (world.state === 'finale') {
    window.location.reload();
    return;
  }
  if (world.state === 'play' && world.mission.stage === 'idle') {
    startMission(world, world.mission.index);
  }
}

/** E: enter or exit a car, or use a shop. */
function onInteract() {
  if (world.state !== 'play') return;
  const p = world.player;
  if (p.inCar) {
    exitCar(world);
    return;
  }
  const car = nearestCar(world, 78);
  if (car) {
    enterCar(world, car);
    return;
  }
  tryShop(world);
}

/** P: pause and resume. */
function togglePause() {
  if (world.state === 'play') world.paused = !world.paused;
}

/** After busted or wasted: restore the player and let them retry the mission. */
function retryRun() {
  const p = world.player;
  p.health = CONFIG.playerHealth;
  p.inCar = null;
  p.x = 1600;
  p.y = 1150;
  world.heat = 0;
  world.wanted = 0;
  world.cops = [];
  world.cruisers = [];
  world.enemies = [];
  world.bullets = [];
  world.mission.stage = 'idle';
  world.mission.objective = `Tekan Enter untuk mengulang misi ${world.mission.index + 1}.`;
  world.state = 'play';
}

/** One fixed step of the living world. */
function stepWorld(w, inp, dt) {
  w.frame += 1;
  w.time += dt;
  const p = w.player;
  if (p.shootTimer > 0) p.shootTimer -= dt;
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) {
      const weapon = CONFIG.weapons.find((x) => x.key === p.weapon);
      p.ammo = weapon.mag;
    }
  }
  if (p.muzzle > 0) p.muzzle -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;

  // The title screen keeps traffic and pedestrians moving behind the menu.
  if (w.state === 'title') {
    updateTraffic(w, dt);
    updatePeds(w, dt);
    updateParticles(w, dt);
    return;
  }
  if (w.state !== 'play' || w.paused) return;

  // Aim follows the mouse.
  const aimWorldX = w.mouse.x + w.camera.x - VIEW_W / 2;
  const aimWorldY = w.mouse.y + w.camera.y - VIEW_H / 2;
  p.aimAngle = Math.atan2(aimWorldY - (p.inCar ? p.inCar.y : p.y), aimWorldX - (p.inCar ? p.inCar.x : p.x));

  if (p.inCar) {
    const beforeSpeed = p.inCar.speed;
    updatePlayerCar(w, inp, dt);
    // A sharp speed drop while accelerating means a wall hit: crash sound.
    if (w.audio && inp.up && Math.abs(beforeSpeed) > 200 && Math.abs(p.inCar.speed) < Math.abs(beforeSpeed) - 120) {
      w.audio.crash();
    }
  } else updatePlayerOnFoot(w, inp, dt);
  if (w.mouse.down) playerShoot(w);
  updateTraffic(w, dt);
  updatePeds(w, dt);
  checkPedHits(w);
  updateWanted(w, dt);
  updateEnemies(w, dt);
  updateBullets(w, dt);
  updateMission(w, dt);
  resolveCarCollisions(w);
  updateParticles(w, dt);
  for (const t of w.toasts) t.left -= dt;
  w.toasts = w.toasts.filter((t) => t.left > 0);

  const pos = playerPos(w);
  const targetX = pos.x;
  const targetY = pos.y;
  w.camera.x += (targetX - w.camera.x) * CONFIG.cameraLerp;
  w.camera.y += (targetY - w.camera.y) * CONFIG.cameraLerp;
  clampCamera(w.camera, w.camera.x, w.camera.y, VIEW_W, VIEW_H);

  if (w.audio) {
    const speed01 = p.inCar ? Math.abs(p.inCar.speed) / p.inCar.topSpeed : 0;
    w.audio.updateEngine(speed01);
  }
}

/** Draw the current state: the world, the HUD, and any menu on top. */
function render() {
  drawGame(ctx, world, VIEW_W, VIEW_H);
  if (world.state === 'play' || world.state === 'busted' || world.state === 'wasted' || world.state === 'finale') {
    drawHUD(ctx, world, VIEW_W, VIEW_H);
  }
  if (world.state === 'title') drawMenu(ctx, world, VIEW_W, VIEW_H, 'title');
  else if (world.paused) drawMenu(ctx, world, VIEW_W, VIEW_H, 'paused');
  else if (world.state === 'busted') drawMenu(ctx, world, VIEW_W, VIEW_H, 'busted');
  else if (world.state === 'wasted') drawMenu(ctx, world, VIEW_W, VIEW_H, 'wasted');
  else if (world.state === 'finale') drawMenu(ctx, world, VIEW_W, VIEW_H, 'finale');
}

// Debug handle for play-testing: state inspection and mission control.
window.__solmar = {
  world,
  input,
  startMission: (i) => startMission(world, i),
  teleport: (x, y) => {
    const p = world.player;
    if (p.inCar) { p.inCar.x = x; p.inCar.y = y; }
    else { p.x = x; p.y = y; }
  },
  giveMoney: (n) => { world.money += n; },
  killEnemies: () => {
    for (const e of world.enemies.slice()) {
      e.health = 0;
      world.enemies = world.enemies.filter((x) => x !== e);
      world.mission.targetsLeft = Math.max(0, world.mission.targetsLeft - 1);
    }
  },
  save: () => saveGame(world),
  version: 'round3',
};

if (SHOT_MODE) {
  // Deterministic screenshots: no audio, no animation loop, a fixed number of
  // steps with a per-pose synthetic input, then one render and a ready flag.
  world.shotInput = { up: false, down: false, left: false, right: false, run: false };
  applyShot(world, shotName);
  if (shotName === '1-chase') world.shotInput.up = true;
  const steps = CONFIG.shotWarmupFrames;
  for (let i = 0; i < steps; i++) stepWorld(world, world.shotInput, DT);
  render();
  window.__shotReady = true;
} else {
  // The live game: fixed-step simulation under requestAnimationFrame.
  let last = performance.now();
  let acc = 0;
  function loop(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    let n = 0;
    while (acc >= DT && n < 5) {
      stepWorld(world, input, DT);
      acc -= DT;
      n += 1;
    }
    render();
    requestAnimationFrame(loop);
  }
  render();
  requestAnimationFrame(loop);
}

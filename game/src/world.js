// The world: one state object, the fixed-step update that ties every system
// together, and the save file.
import { SAVE_KEY, STEP, WORLD_H, WORLD_W } from './config.js';
import { createRandom } from './random.js';
import { buildCity, randomRoadPoint } from './city.js';
import { createAudio } from './audio.js';
import { createCar, drivePlayerCar, spawnTraffic, updateTraffic } from './vehicles.js';
import { spawnPedestrians, updatePeds } from './pedestrians.js';
import { clearWanted, updateCops, updateWanted } from './police.js';
import { updateBullets, updateEffects, updatePickups } from './combat.js';
import { startMission, updateEnemyBullets, updateMission } from './missions.js';
import { enterCar, exitCar, nearestCar, nearestShop, updatePlayerOnFoot, useShop } from './player.js';
import { ACTION_ENTER, ACTION_RELOAD } from './input.js';

export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const audio = createAudio();
  const state = {
    seed, rng, city, audio,
    time: 0,
    screen: 'title',
    viewW: 1280, viewH: 800,
    camera: { x: 1500, y: 1150, zoom: 1 },
    player: {
      x: 1500, y: 1150, angle: 0, aimAngle: 0,
      health: 100, ammo: 12, mag: 48, reload: 0, fireCooldown: 0,
    },
    playerCar: null,
    cars: [], peds: [], footCops: [], gang: [],
    bullets: [], pickups: [], effects: [],
    cash: 150,
    wanted: 0, wantedTimer: 0, bustedTimer: 0,
    mission: null, missionIndex: 0, missionFailed: -1, completed: [],
    message: '', messageT: 0,
    stats: { carsStolen: 0, shotsFired: 0, missionsDone: 0 },
    paused: false,
  };
  // Jax starts on foot downtown, next to a parked sedan he can take.
  const start = createCar('sedan', 1500, 1080, Math.PI / 2, rng);
  start.targetSpeed = 0;
  state.cars.push(start);
  spawnTraffic(state, 14);
  spawnPedestrians(state, 26);
  return state;
}

export function resetRun(state) {
  const fresh = createWorld(state.seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, missionIndex: state.missionIndex,
      completed: state.completed, health: state.player.health,
      ammo: state.player.ammo, mag: state.player.mag,
    }));
  } catch { /* storage off: the run lasts this visit only */ }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function applySave(state, save) {
  state.cash = save.cash ?? 150;
  state.missionIndex = save.missionIndex ?? 0;
  state.completed = save.completed ?? [];
  state.player.health = save.health ?? 100;
  state.player.ammo = save.ammo ?? 12;
  state.player.mag = save.mag ?? 48;
}

function updateCamera(state, dt) {
  const target = state.playerCar || state.player;
  const wantZoom = state.playerCar ? 0.82 : 1;
  state.camera.zoom += (wantZoom - state.camera.zoom) * Math.min(1, 2 * dt);
  state.camera.x += (target.x - state.camera.x) * Math.min(1, 5 * dt);
  state.camera.y += (target.y - state.camera.y) * Math.min(1, 5 * dt);
  const vw = state.viewW / 2 / state.camera.zoom;
  const vh = state.viewH / 2 / state.camera.zoom;
  state.camera.x = Math.max(vw - 100, Math.min(WORLD_W - vw + 100, state.camera.x));
  state.camera.y = Math.max(vh - 100, Math.min(WORLD_H - vh + 100, state.camera.y));
}

export function stepWorld(state, input, dt, actions = null) {
  state.time += dt;
  if (state.messageT > 0) state.messageT -= dt;

  // One edge-triggered action set per frame, handed in by the caller: the
  // menu handler reads the same set, so the world must not read it again.
  if (actions === null) actions = input.takeActions();
  if (actions & ACTION_ENTER) {
    if (state.playerCar) exitCar(state);
    else {
      const car = nearestCar(state, 64);
      if (car) {
        enterCar(state, car);
        state.stats.carsStolen += 1;
      } else {
        const shop = nearestShop(state, 70);
        if (shop) useShop(state, shop);
      }
    }
  }
  if (actions & ACTION_RELOAD) {
    const p = state.player;
    if (!state.playerCar && p.ammo < 12 && p.mag > 0 && p.reload <= 0) p.reload = 1.1;
  }

  if (state.playerCar) {
    drivePlayerCar(state, state.playerCar, input, dt);
    state.player.x = state.playerCar.x;
    state.player.y = state.playerCar.y;
    if (state.playerCar.health <= 0) {
      state.playerCar.dead = true;
      state.effects.push({ kind: 'smoke', x: state.playerCar.x, y: state.playerCar.y, t: 0, life: 1.4 });
      state.playerCar = null;
      state.player.health -= 20;
    }
  } else {
    updatePlayerOnFoot(state, input, dt);
    state.audio.setEngine(0, false);
  }

  updateTraffic(state, dt);
  updatePeds(state, dt);
  updateWanted(state, dt);
  updateCops(state, dt);
  updateBullets(state, dt);
  updateEnemyBullets(state, dt);
  updatePickups(state, dt);
  updateEffects(state, dt);
  updateMission(state, dt);

  // The player's car takes damage from hard hits; the player takes it on foot.
  if (state.player.health <= 0 && state.screen === 'play') {
    state.screen = 'wasted';
    state.audio.fail();
  }

  // Keep traffic topped up near the player.
  const liveTraffic = state.cars.filter((c) => !c.isPlayer && !c.isCop && !c.dead).length;
  if (liveTraffic < 12) spawnTraffic(state, 1);

  updateCamera(state, dt);
  saveGame(state);

  // The next mission (or a retry after a failure) starts by itself shortly
  // after the last one ends, so the story keeps moving without a menu dive.
  if (!state.mission && state.missionIndex < 6 && state.screen === 'play') {
    state.nextMissionIn = (state.nextMissionIn ?? 3) - dt;
    if (state.nextMissionIn <= 0) {
      state.nextMissionIn = 3;
      startMission(state, state.missionIndex);
    }
  }
}

export function startFreeRoam(state) {
  state.screen = 'play';
}

export { STEP };

// shots.js — the deterministic screenshot scenes behind ?shot=start|play|
// chase|end (with &seed=N). Each scene builds the real game from a fresh
// state and plays it forward with a simple autopilot, so the frame is what
// a short game really looks like and the same seed always gives the same
// frame. start is the title over the city, play is driving fast with a
// mission running, chase is a 3-star police intercept, end is the finale.

import { POIS, DISTRICTS } from './config.js';
import { createGame, addCar, addPed } from './world.js';
import { populateCars, populatePeds } from './vehicles.js';
import { startMission, spawnVipers } from './missions.js';
import { raiseWanted } from './vehicles.js';
import { stepWorld } from './main.js';

// Drive the player's car toward the shot's drive target (a point down an
// open road), steering around the road's centre line: a simple autopilot
// for the play and chase scenes.
function autopilotDrive(G) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return { throttle: 0, steer: 0 };
  const t = G.shotDriveTarget || (G.mission && G.mission.marker) || { x: 1600, y: 1200 };
  const tx = t.x;
  const ty = t.y;
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { throttle: 1, steer: Math.max(-1, Math.min(1, diff * 2)) };
}

// Run the world forward n fixed steps with a fake input.
function runSteps(G, n, inputFn) {
  for (let i = 0; i < n; i += 1) {
    const fake = { up: () => false, down: () => false, left: () => false, right: () => false, mouse: () => ({ x: 640, y: 400 }), firing: () => false, takeActions: () => 0 };
    stepWorld(G, fake, 1 / 60, inputFn ? inputFn(G) : null);
  }
}

// Set a fresh game to the named scene and return the screen to draw.
export function stageShot(name, seed) {
  const G = createGame(seed);
  populateCars(G);
  populatePeds(G);
  G.screen = 'play';

  if (name === 'start') {
    // Title over a living city: traffic and pedestrians moving.
    G.screen = 'title';
    G.camera = { x: 1000, y: 800 };
    runSteps(G, 60 * 6, null);
    G.player.x = 1600;
    G.player.y = 1200;
    return G;
  }

  if (name === 'play') {
    // Mission 1 active, player driving the stolen Falco GT fast down
    // Avenue 1600 toward the garage district.
    startMission(G, 1);
    const falco = G.cars.find((c) => c.type.key === 'falco');
    G.player.inCar = falco;
    falco.driver = 'player';
    G.player.x = falco.x;
    G.player.y = falco.y;
    G.mission.stage = 1;
    G.mission.marker = { x: POIS.garage.x, y: POIS.garage.y, label: 'Rico Garage' };
    falco.x = 1600;
    falco.y = 700;
    falco.angle = Math.PI / 2;
    falco.speed = 340;
    G.player.money = 750;
    G.shotDriveTarget = { x: 1600, y: 2100 };
    runSteps(G, 60 * 2, autopilotDrive);
    return G;
  }

  if (name === 'chase') {
    // 3 wanted stars, two cruisers closing in with flashing lights, and a
    // foot cop ahead; the player is mid-getaway east along Street 1250.
    startMission(G, 5);
    raiseWanted(G, 3);
    G.missionTimer = 63;
    const coupe = G.cars.find((c) => c.type.key === 'coupe');
    G.player.inCar = coupe;
    coupe.driver = 'player';
    coupe.x = 1400;
    coupe.y = 1250;
    coupe.angle = 0;
    coupe.speed = 340;
    G.player.x = coupe.x;
    G.player.y = coupe.y;
    G.player.money = 2150;
    G.shotDriveTarget = { x: 2600, y: 1250 };
    // Two cruisers trailing behind on the same street, lights flashing.
    const c1 = addCar(G, 'sedan', 1180, 1250, 0, 'police');
    c1.color = '#1a2a4a';
    c1.speed = 300;
    const c2 = addCar(G, 'sedan', 1060, 1250, 0, 'police');
    c2.color = '#1a2a4a';
    c2.speed = 290;
    G.footCops.push({ x: 1900, y: 1180, hp: 60, speed: 220, angle: 0, shootTimer: 1 });
    runSteps(G, 60, autopilotDrive);
    return G;
  }

  // end: the finale — KING OF SOLMAR with fireworks over the mansion.
  G.screen = 'finale';
  G.player.x = POIS.mansion.x + 220;
  G.player.y = POIS.mansion.y + 200;
  G.player.money = 8300;
  G.stats.missionsDone = 6;
  G.stats.moneyEarned = 9500;
  G.stats.carsStolen = 14;
  G.stats.kills = 23;
  G.missionIndex = 6;
  G.mission = { id: 6, name: 'King of Solmar', brief: 'Storm Villa Del Sol. Three waves guard the mansion.', reward: 5000, stage: 0, progress: 0, target: 3, marker: null, done: true, wave: 3 };
  for (let i = 0; i < 60; i += 1) {
    const a = G.rng() * Math.PI * 2;
    const r = 60 + G.rng() * 220;
    G.fireworks.push({
      x: POIS.mansion.x + 100 + Math.cos(a) * r,
      y: POIS.mansion.y + 100 + Math.sin(a) * r * 0.6,
      vx: 0, vy: 0,
      color: ['#ffd94a', '#ff6b6b', '#7dff8a', '#7db8ff'][i % 4],
      life: 1.2, maxLife: 1.2, size: 4 + G.rng() * 4,
    });
  }
  runSteps(G, 30, null);
  return G;
}

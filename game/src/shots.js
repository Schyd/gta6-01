// Deterministic screenshot scenes: ?shot=start|play|chase|end&seed=1 stages a
// fixed moment of the game so the screenshots are repeatable.
import { CAR_TYPES } from './config.js';
import { makeCar } from './vehicles.js';
import { startMission } from './missions.js';

function placePlayerInCar(g, type, x, y, angle, speed) {
  const car = makeCar(type, x, y, angle);
  car.speed = speed;
  g.cars.push(car);
  g.player.car = car;
  g.player.x = x;
  g.player.y = y;
  g.player.angle = angle;
}

export function stageShot(g, name) {
  g.shotMode = true;
  if (name === 'start') {
    // Title screen over downtown at golden hour, traffic cruising below.
    g.screen = 'title';
    g.camera.x = 2200;
    g.camera.y = 1500;
    return;
  }
  if (name === 'play') {
    // Driving the Falco fast down the main avenue, mission 1 active.
    g.screen = 'playing';
    startMission(g, 0);
    placePlayerInCar(g, 'falco', 1400, 1000, 0, 520);
    g.camera.x = 1400;
    g.camera.y = 1000;
    g.money = 1250;
    return;
  }
  if (name === 'chase') {
    // Three wanted stars, two patrol cruisers closing in with lights flashing.
    g.screen = 'playing';
    startMission(g, 4);
    g.mission.stage = 'survive';
    g.mission.timer = 61;
    g.heat = 65;
    g.wanted = 3;
    placePlayerInCar(g, 'coupe', 1800, 1400, 0, 480);
    const p1 = makeCar('patrol', 1560, 1400, 0, { police: true });
    p1.speed = 520;
    p1.flash = 0.2;
    const p2 = makeCar('patrol', 1620, 1452, 0, { police: true });
    p2.speed = 500;
    p2.flash = 0.7;
    g.patrols.push(p1, p2);
    g.cars.push(p1, p2);
    g.camera.x = 1800;
    g.camera.y = 1400;
    g.money = 2340;
    if (g.audio) g.audio.setSiren(true);
    return;
  }
  if (name === 'end') {
    // Finale: KING OF SOLMAR over the mansion, fireworks in the sky.
    g.screen = 'finale';
    g.camera.x = 400;
    g.camera.y = 400;
    g.money = 8750;
    g.fireworks = [];
    for (let i = 0; i < 5; i += 1) {
      g.fireworks.push({ x: 200 + i * 100, y: 180 + (i % 2) * 90, t: i * 0.4, hue: i });
    }
    return;
  }
  g.screen = 'title';
}

export function shotNameList() {
  return ['start', 'play', 'chase', 'end'];
}

export { CAR_TYPES };

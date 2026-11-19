// Deterministic screenshot staging: ?shot=start|play|chase|end (with &seed=N)
// sets the world up as a still from the game, paints it twice and sets
// window.__shotReady. The screenshots are real renders of the game's own code.
import { createCar, spawnParkedCar } from './vehicles.js';
import { startMission } from './missions.js';
import { enterCar } from './player.js';
import { clearWanted } from './police.js';

function placeTraffic(state, spots) {
  // Clear the random traffic and put cars exactly where the shot needs them.
  state.cars = state.cars.filter((c) => c.isPlayer);
  const types = ['sedan', 'taxi', 'truck', 'van', 'muscle', 'sedan'];
  spots.forEach((s, i) => {
    const car = createCar(types[i % types.length], s.x, s.y, s.angle, state.rng);
    car.targetSpeed = 150;
    state.cars.push(car);
  });
}

function putPlayerInSportsCar(state, x, y, angle) {
  const car = spawnParkedCar(state, 'sports', x, y, angle);
  car.color = '#c23b3b';
  car.owned = true;
  state.player.x = x;
  state.player.y = y;
  enterCar(state, car);
  return car;
}

export function stageShot(name, state) {
  if (name === 'start') {
    state.screen = 'title';
    state.camera.x = 1500;
    state.camera.y = 1150;
    state.camera.zoom = 0.62;
    placeTraffic(state, [
      { x: 1500, y: 850, angle: Math.PI / 2 },
      { x: 1100, y: 1150, angle: 0 },
      { x: 1900, y: 1150, angle: Math.PI },
      { x: 1500, y: 1450, angle: -Math.PI / 2 },
      { x: 700, y: 850, angle: Math.PI / 2 },
    ]);
    const car = spawnParkedCar(state, 'sports', 1560, 1210, Math.PI / 2);
    car.color = '#c23b3b';
    state.player.x = 1500;
    state.player.y = 1150;
    return 'title';
  }

  if (name === 'play') {
    state.screen = 'play';
    clearWanted(state);
    startMission(state, 0);
    // Step 1 (steal the Falco) is done by the staging: Jax already has it.
    // Drop the staged Falco itself so it does not double up on the player's car.
    state.cars = state.cars.filter((c) => c !== state.mission.falco);
    state.mission.step = 1;
    state.mission.marker = { x: 2300, y: 550 };
    putPlayerInSportsCar(state, 1500, 1150, 0);
    state.playerCar.speed = 320;
    placeTraffic(state, [
      { x: 1500, y: 850, angle: Math.PI / 2 },
      { x: 1100, y: 1150, angle: 0 },
      { x: 1900, y: 1150, angle: Math.PI },
      { x: 1500, y: 1450, angle: -Math.PI / 2 },
      { x: 700, y: 1150, angle: 0 },
      { x: 2300, y: 850, angle: Math.PI / 2 },
    ]);
    // Keep the player's car in the traffic list (placeTraffic filtered it out).
    if (!state.cars.includes(state.playerCar)) state.cars.push(state.playerCar);
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    state.camera.zoom = 0.85;
    return 'play';
  }

  if (name === 'chase') {
    state.screen = 'play';
    startMission(state, 4);
    const car = putPlayerInSportsCar(state, 1500, 1150, 0);
    car.speed = 380;
    placeTraffic(state, [
      { x: 1100, y: 1150, angle: 0 },
      { x: 1900, y: 850, angle: Math.PI / 2 },
    ]);
    if (!state.cars.includes(state.playerCar)) state.cars.push(state.playerCar);
    // Two interceptors tight on Jax's tail, lights flashing.
    const cop1 = createCar('police', 1380, 1180, 0, state.rng);
    cop1.isCop = true;
    cop1.speed = 420;
    const cop2 = createCar('police', 1330, 1120, 0, state.rng);
    cop2.isCop = true;
    cop2.speed = 400;
    state.cars.push(cop1, cop2);
    state.audio.setSiren(true);
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    state.camera.zoom = 0.85;
    return 'play';
  }

  if (name === 'end') {
    state.screen = 'finale';
    state.cash = 12480;
    state.completed = [1, 2, 3, 4, 5, 6];
    state.stats.carsStolen = 23;
    // The finale looks over downtown, where the city is densest.
    state.camera.x = 1500;
    state.camera.y = 1150;
    state.camera.zoom = 0.62;
    placeTraffic(state, [
      { x: 1500, y: 850, angle: Math.PI / 2 },
      { x: 1100, y: 1150, angle: 0 },
      { x: 1900, y: 1150, angle: Math.PI },
      { x: 1500, y: 1450, angle: -Math.PI / 2 },
      { x: 700, y: 850, angle: Math.PI / 2 },
    ]);
    // Fireworks over downtown.
    const colors = ['rgba(255,210,58,0.95)', 'rgba(255,90,90,0.95)', 'rgba(90,200,255,0.95)', 'rgba(140,255,140,0.95)'];
    for (let i = 0; i < 8; i++) {
      state.effects.push({
        kind: 'firework',
        x: 1500 + (i - 4) * 170 + (i % 2 ? 60 : -40),
        y: 1150 - 260 - (i % 3) * 110,
        t: 0, life: 2.2, color: colors[i % colors.length],
      });
    }
    return 'finale';
  }

  return 'title';
}

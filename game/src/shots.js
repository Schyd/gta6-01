// SOLMAR — Streets of the Sun
// Screenshot poses: four deterministic scenes for the entry's images. Each
// pose sets the world to a fixed state, then the game advances a fixed number
// of steps so the render is identical every time it runs.

import { CONFIG } from './config.js';
import { startMission } from './missions.js';
import { spawnEnemy } from './combat.js';
import { makeCar } from './vehicles.js';

/** The four poses, in filename order. The first is the cover. */
export const SHOT_NAMES = ['1-chase', '2-play', '3-start', '4-finale'];

/**
 * Set the world to one pose. Poses place the player, cars, police and enemies
 * at fixed spots and start the right mission, so the frame is composed.
 */
export function applyShot(world, name) {
  if (!SHOT_NAMES.includes(name)) throw new Error(`unknown shot: ${name}`);
  const city = world.city;
  if (name === '3-start') {
    world.state = 'title';
    world.camera.x = 1600;
    world.camera.y = 1150;
    return;
  }
  world.state = 'play';
  if (name === '2-play') {
    // On foot downtown, traffic and pedestrians around, mission one waiting.
    world.player.x = 1600;
    world.player.y = 1150;
    world.player.aimAngle = -0.5;
    world.camera.x = 1600;
    world.camera.y = 1150;
    startMission(world, 0);
    return;
  }
  if (name === '1-chase') {
    // The cover: the player in the Falco GT, wanted level three, cruisers on
    // the tail, the minimap and the speed panel visible. The car starts
    // far west on street 1250 so the warmup drive ends mid-city, clear of
    // the map edge, with the cruisers right behind it on the same road.
    const falco = world.falcoCar;
    falco.x = 1200;
    falco.y = 1250;
    falco.angle = 0;
    falco.speed = 520;
    falco.vx = 520;
    falco.vy = 0;
    falco.driver = 'player';
    world.player.inCar = falco;
    world.player.x = falco.x;
    world.player.y = falco.y;
    world.heat = 3;
    world.wanted = 3;
    for (let i = 0; i < 2; i++) {
      const cruiser = makeCar('komodo', 1200 - 180 - i * 120, 1250 + (i === 0 ? 40 : -40), 0, 'police');
      cruiser.body = '#20242e';
      cruiser.roof = '#20242e';
      cruiser.cruise = CONFIG.cruiserTopSpeed;
      cruiser.speed = 500;
      cruiser.holdTimer = 0;
      world.cruisers.push(cruiser);
    }
    world.mission.objective = 'Lari dari polisi — bawa Falco GT ke garasi!';
    world.mission.marker = { x: city.shops.garage.x, y: city.shops.garage.y };
    world.camera.x = 1200;
    world.camera.y = 1250;
    return;
  }
  if (name === '4-finale') {
    // The mansion finale: the player on foot among rivals, the boss in view.
    world.player.x = 2650;
    world.player.y = 520;
    world.player.aimAngle = -Math.PI / 2;
    world.camera.x = 2650;
    world.camera.y = 420;
    startMission(world, 5);
    // Skip to the second wave so the frame is busy: clear the first wave's
    // grunts, then place the second wave and the boss by hand.
    world.enemies = [];
    world.mission.wave = 2;
    world.mission.targetsLeft = CONFIG.finaleWaves[1];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      spawnEnemy(world, 2650 + Math.cos(a) * 170, 300 + Math.sin(a) * 120, false);
    }
    spawnEnemy(world, 2650, 240, true);
    world.mission.objective = 'Finale mansion — gelombang 2 dari 3.';
  }
}

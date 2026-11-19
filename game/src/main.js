// SOLMAR — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between title, play, paused, busted, wasted and finale.
//
// ?seed=N fixes the city. ?shot=start|play|chase|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createInput, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE } from './input.js';
import { applySave, createWorld, loadSave, resetRun, saveGame, stepWorld } from './world.js';
import { createRenderer } from './render.js';
import { drawHud, drawScreen } from './hud.js';
import { stageShot } from './shots.js';
import { startMission } from './missions.js';
import { clearWanted } from './police.js';
import { BUSTED_FINE } from './config.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const ctx = renderer.ctx;

function fitCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  return { w, h };
}

let view = fitCanvas();
window.addEventListener('resize', () => { view = fitCanvas(); });

const world = createWorld(seed);
world.viewW = view.w;
world.viewH = view.h;
// Debug handle: lets an automated smoke test read the live state.
window.__solmar = world;

function announce(message) {
  status.textContent = message;
}

function draw(screen) {
  world.viewW = view.w;
  world.viewH = view.h;
  renderer.drawWorld(world);
  if (screen === 'play') drawHud(world, ctx);
  else drawScreen(world, ctx, screen);
}

function runShot(name) {
  const screen = stageShot(name, world);
  // Let the traffic and the pursuit settle for a second of staged time.
  const dummy = {
    axis: () => ({ x: 0, y: 0 }),
    takeActions: () => 0,
    shooting: () => false,
    mouse: { x: view.w / 2, y: view.h / 2 },
  };
  if (screen === 'play') {
    for (let i = 0; i < 60; i++) stepWorld(world, dummy, STEP);
    world.screen = 'play';
    // The staged drive reads at speed: hold the speedometer where the scene
    // set it instead of showing the car coasting to a stop.
    if (world.playerCar) world.playerCar.speed = 380;
  }
  let painted = 0;
  function paint() {
    draw(screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    const save = loadSave();
    resetRun(world);
    if (save) applySave(world, save);
    world.screen = 'play';
    screen = 'play';
    world.audio.ensure();
    if (world.missionIndex < 6) startMission(world, world.missionIndex);
    announce('Playing SOLMAR. Steal a car with E, follow the yellow marker.');
  }

  function backToTitle() {
    resetRun(world);
    world.screen = 'title';
    screen = 'title';
    announce('Title screen.');
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = world.audio.setMuted(!world.audio.isMuted());
      world.message = muted ? 'Sound off (M to turn back on)' : 'Sound on';
      world.messageT = 1.5;
    }
    if (screen === 'title') {
      if (actions & ACTION_CONFIRM) {
        world.audio.ensure();
        world.audio.click();
        startGame();
      }
    } else if (screen === 'play') {
      if (actions & ACTION_PAUSE) {
        screen = 'paused';
        world.screen = 'paused';
        announce('Paused.');
      }
    } else if (screen === 'paused') {
      if (actions & ACTION_PAUSE) {
        screen = 'play';
        world.screen = 'play';
        announce('Playing.');
      } else if (actions & ACTION_CONFIRM) backToTitle();
    } else if (screen === 'busted' || screen === 'wasted') {
      if (actions & ACTION_CONFIRM) {
        if (screen === 'busted') {
          const fine = Math.min(world.cash, BUSTED_FINE);
          world.cash -= fine;
        }
        clearWanted(world);
        world.player.health = 100;
        world.player.x = world.city.safehouse.x;
        world.player.y = world.city.safehouse.y;
        world.playerCar = null;
        world.bustedTimer = 0;
        world.screen = 'play';
        screen = 'play';
        announce('Back on the streets.');
      }
    } else if (screen === 'finale') {
      if (actions & ACTION_CONFIRM) {
        world.screen = 'play';
        screen = 'play';
        announce('Free roam.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    // The world itself can move the screen (busted, wasted, finale).
    if (world.screen !== screen && (world.screen === 'busted' || world.screen === 'wasted' || world.screen === 'finale')) {
      screen = world.screen;
    }
    if (screen === 'play') {
      // The frame's actions go to the first fixed step only; later steps in
      // the same frame get none, so one E press never enters and exits a car.
      let firstStep = true;
      while (accumulator >= STEP && screen === 'play') {
        stepWorld(world, input, STEP, firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
        if (world.screen !== 'play') { screen = world.screen; break; }
      }
    } else if (screen === 'title') {
      // The title idles over the living city: traffic keeps moving.
      while (accumulator >= STEP) {
        stepWorld(world, {
          axis: () => ({ x: 0, y: 0 }),
          takeActions: () => 0,
          shooting: () => false,
          mouse: { x: view.w / 2, y: view.h / 2 },
        }, STEP);
        accumulator -= STEP;
        break;
      }
      accumulator = 0;
    } else {
      accumulator = 0;
    }
    draw(screen);
  }

  announce('SOLMAR. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

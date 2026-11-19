// Missions: the story of Jax Marín, getaway driver for the fixer Madame Luz,
// against the Viper gang. Each mission is a chain of steps; the HUD points at
// the current one and the city reacts to it.
import { H_ROADS, V_ROADS } from './config.js';
import { randomRoadPoint } from './city.js';
import { spawnParkedCar } from './vehicles.js';
import { raiseWanted } from './police.js';

export const MISSIONS = [
  {
    id: 1, name: 'First Job', giver: 'Madame Luz',
    brief: 'Steal the red Falco GT parked downtown and bring it to the garage.',
    reward: 500,
    steps: [
      { type: 'steal', text: 'Steal the red Falco GT', target: 'falco' },
      { type: 'deliver', text: 'Deliver the Falco to the garage', target: 'garage' },
    ],
  },
  {
    id: 2, name: 'The Pickup', giver: 'Madame Luz',
    brief: 'Pick up the courier at the harbour and get him across town in 90 seconds.',
    reward: 800,
    steps: [
      { type: 'goto', text: 'Pick up the courier at the harbour', target: 'harbour', radius: 70 },
      { type: 'timed', text: 'Drive the courier to the rooftop bar — fast!', target: 'bar', time: 90, radius: 70 },
    ],
  },
  {
    id: 3, name: 'Harbour Lights', giver: 'Madame Luz',
    brief: 'Six crates came in on the night boat. Collect them all, then bring them to the warehouse.',
    reward: 600,
    steps: [
      { type: 'collect', text: 'Collect the crates at the harbour (0/6)', target: 'crates', count: 6 },
      { type: 'deliver', text: 'Deliver the crates to the warehouse', target: 'warehouse' },
    ],
  },
  {
    id: 4, name: 'Viper Nest', giver: 'Madame Luz',
    brief: 'The Vipers torched one of our cars. Wipe out eight of them in the Barrio.',
    reward: 1200,
    steps: [
      { type: 'eliminate', text: 'Take out the Vipers in the Barrio (0/8)', target: 'barrio', count: 8 },
      { type: 'escape', text: 'Lose the heat — get your wanted level to zero', target: 'escape' },
    ],
  },
  {
    id: 5, name: 'The Getaway', giver: 'Madame Luz',
    brief: 'The bank job went loud. Three stars and the whole Solmar PD is on you — reach the safehouse in 90 seconds.',
    reward: 1500,
    steps: [
      { type: 'chase', text: 'Outrun the police — reach the safehouse', target: 'safehouse', time: 90 },
    ],
  },
  {
    id: 6, name: 'King of Solmar', giver: 'Madame Luz',
    brief: 'Viper himself is at the mansion. Take the hill in three waves, end it, and the city is yours.',
    reward: 5000,
    steps: [
      { type: 'goto', text: 'Drive up to the mansion hill', target: 'mansion', radius: 90 },
      { type: 'waves', text: 'Clear the mansion — wave 1 of 3', target: 'mansion', waves: [3, 4, 3] },
    ],
  },
];

const POINTS = {
  garage: { x: 2300, y: 550 },
  harbour: { x: 2900, y: 1750 },
  bar: { x: 700, y: 250 },
  warehouse: { x: 1100, y: 1450 },
  barrio: { x: 700, y: 1450 },
  safehouse: null, // from the city
  mansion: { x: 2700, y: 250 },
};

export function startMission(state, index) {
  const def = MISSIONS[index];
  if (!def) return;
  state.missionIndex = index;
  state.mission = { def, step: 0, timer: 0, collected: 0, eliminated: 0, falco: null, crates: [], wave: 0, waveSpawned: 0 };
  state.message = `${def.name} — ${def.brief}`;
  state.messageT = 5;
  setupStep(state);
}

function spawnWave(state) {
  const m = state.mission;
  const step = m.def.steps[m.step];
  const base = POINTS.mansion;
  const count = step.waves[m.wave];
  const isLast = m.wave === step.waves.length - 1;
  for (let i = 0; i < count; i++) {
    const boss = isLast && i === 0;
    state.gang.push({
      x: base.x + state.rng.range(-170, 170),
      y: base.y + state.rng.range(-130, 130),
      health: boss ? 220 : 100, dead: false,
      shootT: state.rng.range(1, 3), boss,
    });
  }
  m.waveSpawned += count;
  m.marker = { x: base.x, y: base.y };
}

function setupStep(state) {
  const m = state.mission;
  const step = m.def.steps[m.step];
  m.timer = step.time || 0;
  if (step.type === 'steal') {
    m.falco = spawnParkedCar(state, 'sports', 1500, 1150, Math.PI / 2);
    m.falco.color = '#c23b3b';
    m.marker = { x: 1500, y: 1150 };
  } else if (step.type === 'collect') {
    m.crates = [];
    for (let i = 0; i < step.count; i++) {
      m.crates.push({ x: 2820 + (i % 3) * 90, y: 1640 + Math.floor(i / 3) * 90, taken: false });
    }
    m.marker = { x: 2910, y: 1685 };
  } else if (step.type === 'eliminate') {
    state.gang.length = 0;
    const base = step.target === 'mansion' ? POINTS.mansion : POINTS.barrio;
    for (let i = 0; i < step.count; i++) {
      state.gang.push({
        x: base.x + state.rng.range(-160, 160),
        y: base.y + state.rng.range(-120, 120),
        health: 100, dead: false, shootT: state.rng.range(1, 3),
      });
    }
    m.marker = { x: base.x, y: base.y };
  } else if (step.type === 'waves') {
    state.gang.length = 0;
    m.wave = 0;
    m.waveSpawned = 0;
    spawnWave(state);
  } else if (step.type === 'chase') {
    raiseWanted(state, 3);
    m.marker = { x: state.city.safehouse.x, y: state.city.safehouse.y };
  } else if (step.type === 'escape') {
    m.marker = { x: state.player.x, y: state.player.y };
  } else {
    const p = step.target === 'safehouse' ? state.city.safehouse : POINTS[step.target];
    m.marker = { x: p.x, y: p.y };
  }
}

export function missionObjective(state) {
  if (!state.mission) return state.missionIndex >= MISSIONS.length ? 'Story complete — free roam' : 'Visit Madame Luz (L)';
  const step = state.mission.def.steps[state.mission.step];
  let text = step.text;
  if (step.type === 'collect') text = `Collect the crates at the harbour (${state.mission.collected}/${step.count})`;
  if (step.type === 'eliminate') text = `${step.text.split('(')[0]}(${state.mission.eliminated}/${step.count})`;
  if (step.type === 'waves') {
    const total = step.waves.reduce((a, b) => a + b, 0);
    const done = state.gang.filter((g) => g.dead).length;
    text = `Clear the mansion — wave ${state.mission.wave + 1} of ${step.waves.length} (${done}/${total} down)`;
  }
  if (state.mission.timer > 0) text += ` — ${Math.ceil(state.mission.timer)}s`;
  return text;
}

function completeStep(state) {
  const m = state.mission;
  m.step += 1;
  state.audio.pickup();
  if (m.step >= m.def.steps.length) {
    state.cash += m.def.reward;
    state.completed.push(m.def.id);
    state.message = `Mission complete: ${m.def.name} — +$${m.def.reward}`;
    state.messageT = 4;
    state.audio.jingle();
    state.mission = null;
    state.missionIndex += 1;
    state.nextMissionIn = 3;
    if (state.missionIndex >= MISSIONS.length) {
      state.screen = 'finale';
      state.audio.jingle();
    }
  } else {
    setupStep(state);
  }
}

function failMission(state, why) {
  state.message = `Mission failed: ${why}`;
  state.messageT = 4;
  state.audio.fail();
  state.mission = null;
  state.missionFailed = state.missionIndex;
  state.nextMissionIn = 3;
}

export function updateMission(state, dt) {
  const m = state.mission;
  if (!m) return;
  const step = m.def.steps[m.step];
  const player = state.player;
  const px = player.x; const py = player.y;

  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(state, 'Out of time'); return; }
  }

  if (step.type === 'steal') {
    if (state.playerCar === m.falco) completeStep(state);
  } else if (step.type === 'goto' || step.type === 'timed' || step.type === 'deliver' || step.type === 'chase') {
    const target = step.type === 'chase' ? state.city.safehouse : (step.target === 'safehouse' ? state.city.safehouse : POINTS[step.target]);
    const radius = step.radius || 80;
    if (Math.hypot(px - target.x, py - target.y) < radius) {
      if (step.type === 'chase' && state.wanted > 0) {
        state.message = 'Lose the cops first — then slip into the safehouse';
        state.messageT = 2;
        return;
      }
      completeStep(state);
    }
  } else if (step.type === 'collect') {
    for (const c of m.crates) {
      if (!c.taken && Math.hypot(px - c.x, py - c.y) < 40) {
        c.taken = true;
        m.collected += 1;
        state.audio.pickup();
      }
    }
    if (m.collected >= step.count) completeStep(state);
  } else if (step.type === 'eliminate') {
    m.eliminated = state.gang.filter((g) => g.dead).length;
    if (m.eliminated >= step.count) completeStep(state);
  } else if (step.type === 'waves') {
    const dead = state.gang.filter((g) => g.dead).length;
    if (dead >= m.waveSpawned) {
      if (m.wave + 1 < step.waves.length) {
        m.wave += 1;
        state.message = `Wave ${m.wave + 1} — more guards coming!`;
        state.messageT = 3;
        state.audio.fail();
        spawnWave(state);
      } else {
        completeStep(state);
      }
    }
  } else if (step.type === 'escape') {
    if (state.wanted === 0) completeStep(state);
  }

  // Gang members shoot back at the player.
  for (const g of state.gang) {
    if (g.dead) continue;
    const d = Math.hypot(g.x - px, g.y - py);
    if (d < 420) {
      g.shootT -= dt;
      if (g.shootT <= 0) {
        g.shootT = 1.6 + state.rng.next();
        const a = Math.atan2(py - g.y, px - g.x);
        state.bullets.push({ x: g.x, y: g.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.1, enemy: true });
        state.effects.push({ kind: 'muzzle', x: g.x, y: g.y, t: 0, life: 0.08 });
        state.audio.gunshot();
      }
      // They strafe slowly toward the player.
      g.x += ((px - g.x) / (d || 1)) * 26 * dt;
      g.y += ((py - g.y) / (d || 1)) * 26 * dt;
    }
  }
}

// Enemy bullets hurt the player (handled in world step via this helper).
export function updateEnemyBullets(state, dt) {
  const player = state.player;
  for (const b of state.bullets) {
    if (!b.enemy) continue;
    if (Math.hypot(b.x - player.x, b.y - player.y) < 15) {
      b.life = 0;
      player.health -= 9;
      state.effects.push({ kind: 'hit', x: player.x, y: player.y, t: 0, life: 0.4 });
      if (player.health <= 0) state.screen = 'wasted';
    }
  }
}

export function startNextMission(state) {
  if (state.missionIndex < MISSIONS.length) startMission(state, state.missionIndex);
}

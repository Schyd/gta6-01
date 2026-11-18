// missions.js — the six-mission story of SOLMAR. Each mission is a small
// state machine with an objective marker, a timer or a counter, and a cash
// reward. Completing one starts the next; finishing the sixth triggers the
// finale screen.

import { MISSION_DEFS, POIS, DISTRICTS, clamp, dist2 } from './config.js';
import { toast, burst, addPed, addCar } from './world.js';
import { raiseWanted } from './vehicles.js';

// Start mission number n (1-based). Sets up its markers, crates or enemies.
export function startMission(G, n) {
  const def = MISSION_DEFS[n - 1];
  if (!def) return;
  G.missionIndex = n;
  G.missionTimer = 0;
  G.mission = { id: n, name: def.name, brief: def.brief, reward: def.reward, stage: 0, progress: 0, target: 0, marker: null, done: false };
  if (n === 1) {
    G.mission.marker = { x: POIS.falcoSpot.x, y: POIS.falcoSpot.y, label: 'Falco GT' };
    toast(G, `Mission 1 — ${def.name}: steal the red Falco GT downtown.`, 5);
  } else if (n === 2) {
    G.missionTimer = 95;
    G.mission.marker = { x: POIS.courierDrop.x, y: POIS.courierDrop.y, label: 'Harbor Drop' };
    toast(G, `Mission 2 — ${def.name}: 95 seconds to the harbor!`, 5);
  } else if (n === 3) {
    G.crates = crateSpots(G);
    G.mission.target = 6;
    G.mission.marker = { x: G.crates[0].x, y: G.crates[0].y, label: 'Crate' };
    toast(G, `Mission 3 — ${def.name}: collect 6 crates.`, 5);
  } else if (n === 4) {
    spawnVipers(G, DISTRICTS.park, 8);
    G.mission.target = 8;
    G.stats.killsAtMissionStart = G.stats.kills;
    G.mission.marker = { x: DISTRICTS.park.x + DISTRICTS.park.w / 2, y: DISTRICTS.park.y + DISTRICTS.park.h / 2, label: 'Vipers' };
    toast(G, `Mission 4 — ${def.name}: 8 Vipers in the park.`, 5);
  } else if (n === 5) {
    raiseWanted(G, 3);
    G.missionTimer = 90;
    toast(G, `Mission 5 — ${def.name}: survive 90 seconds at 3 stars!`, 5);
  } else if (n === 6) {
    G.mission.wave = 0;
    G.mission.target = 3;
    spawnViperWave(G, 1);
    G.mission.marker = { x: POIS.mansion.x, y: POIS.mansion.y, label: 'Villa Del Sol' };
    toast(G, `Mission 6 — ${def.name}: storm the mansion. Wave 1 of 3.`, 5);
  }
}

// Six crate spots around the park and downtown.
function crateSpots(G) {
  return [
    { x: 1150, y: 950, taken: false },
    { x: 1450, y: 1150, taken: false },
    { x: 1300, y: 850, taken: false },
    { x: 1750, y: 600, taken: false },
    { x: 2100, y: 450, taken: false },
    { x: 1550, y: 950, taken: false },
  ];
}

// Spawn count Vipers inside a district rectangle.
export function spawnVipers(G, rect, count) {
  for (let i = 0; i < count; i += 1) {
    G.enemies.push({
      x: rect.x + 40 + G.rng() * (rect.w - 80),
      y: rect.y + 40 + G.rng() * (rect.h - 80),
      hp: 70, angle: 0, shootTimer: 1 + G.rng() * 2, speed: 120 + G.rng() * 40,
      wave: 0,
    });
  }
}

// One finale wave at the mansion: 4 + wave Vipers around the villa.
export function spawnViperWave(G, wave) {
  const count = 3 + wave;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    G.enemies.push({
      x: POIS.mansion.x + Math.cos(a) * (120 + G.rng() * 80),
      y: POIS.mansion.y + Math.sin(a) * (120 + G.rng() * 80),
      hp: 80, angle: 0, shootTimer: 1 + G.rng(), speed: 130 + G.rng() * 40,
      wave,
    });
  }
}

// Advance the active mission one step. Returns 'complete' when it finishes.
export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || m.done) return null;
  const p = G.player;

  if (m.id === 1) {
    if (m.stage === 0) {
      // Stage 0: reach and steal the Falco GT.
      const falco = G.cars.find((c) => c.type.key === 'falco' && c.driver === 'player');
      if (falco) {
        m.stage = 1;
        m.marker = { x: POIS.garage.x, y: POIS.garage.y, label: 'Rico Garage' };
        toast(G, 'Got it! Deliver the Falco GT to Rico Garage.');
      }
    } else if (m.stage === 1) {
      const falco = G.cars.find((c) => c.type.key === 'falco' && c.driver === 'player');
      if (falco && dist2(falco.x, falco.y, POIS.garage.x, POIS.garage.y) < 110 * 110) {
        return completeMission(G);
      }
    }
  } else if (m.id === 2) {
    G.missionTimer -= dt;
    if (dist2(p.x, p.y, POIS.courierDrop.x, POIS.courierDrop.y) < 90 * 90) {
      return completeMission(G);
    }
    if (G.missionTimer <= 0) {
      toast(G, 'Too slow! The courier run failed — try again.', 4);
      G.missionTimer = 95;
    }
  } else if (m.id === 3) {
    for (const c of G.crates) {
      if (!c.taken && dist2(p.x, p.y, c.x, c.y) < 46 * 46) {
        c.taken = true;
        m.progress += 1;
        burst(G, c.x, c.y, '#ffd94a', 12, 160, 0.6);
        toast(G, `Crate ${m.progress} of 6 collected.`);
        const next = G.crates.find((k) => !k.taken);
        m.marker = next ? { x: next.x, y: next.y, label: 'Crate' } : null;
      }
    }
    if (m.progress >= 6) return completeMission(G);
  } else if (m.id === 4) {
    m.progress = G.stats.kills - (G.stats.killsAtMissionStart || 0);
    if (G.enemies.length === 0) return completeMission(G);
  } else if (m.id === 5) {
    G.missionTimer -= dt;
    if (G.wanted < 3) raiseWanted(G, 3);
    if (G.missionTimer <= 0) return completeMission(G);
  } else if (m.id === 6) {
    if (G.enemies.length === 0) {
      if (m.wave >= 3) return completeMission(G);
      m.wave += 1;
      spawnViperWave(G, m.wave);
      toast(G, `Wave ${m.wave} of 3 — they keep coming!`, 4);
    }
  }
  return null;
}

// Pay out the mission, bank the reward, and queue the next one.
export function completeMission(G) {
  const m = G.mission;
  m.done = true;
  G.player.money += m.reward;
  G.stats.moneyEarned += m.reward;
  G.stats.missionsDone += 1;
  toast(G, `Mission complete: ${m.name} — +$${m.reward}`, 5);
  burst(G, G.player.x, G.player.y, '#ffd94a', 24, 240, 1.0);
  if (m.id === 6) {
    G.screen = 'finale';
    G.finaleShown = true;
    return 'finale';
  }
  // The next mission starts after a short breather.
  G.nextMissionAt = G.time + 3;
  G.pendingMission = m.id + 1;
  return 'complete';
}

// Vipers chase the player and shoot when close enough.
export function updateEnemies(G, dt) {
  const p = G.player;
  for (let i = G.enemies.length - 1; i >= 0; i -= 1) {
    const e = G.enemies[i];
    if (e.hp <= 0) {
      G.enemies.splice(i, 1);
      continue;
    }
    const d = Math.sqrt(dist2(e.x, e.y, p.x, p.y));
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (d > 280) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (d < 180) {
      e.x -= Math.cos(e.angle) * e.speed * 0.6 * dt;
      e.y -= Math.sin(e.angle) * e.speed * 0.6 * dt;
    }
    if (d < 460) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1.1 + G.rng() * 0.9;
        // Enemy fire is deliberately less accurate than the player's.
        const aim = e.angle + (G.rng() - 0.5) * 0.3;
        G.bullets.push({
          x: e.x + Math.cos(aim) * 22, y: e.y + Math.sin(aim) * 22,
          vx: Math.cos(aim) * 700, vy: Math.sin(aim) * 700,
          damage: 9, owner: 'enemy', life: 0.9,
        });
      }
    }
  }
}

// Snapshot the kill count when a kill-count mission starts, so progress is exact.
export function markKillsBaseline(G) {
  G.stats.killsAtMissionStart = G.stats.kills;
}

export { clamp };

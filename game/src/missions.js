// SOLMAR — Streets of the Sun
// Missions: six sequential story jobs with objectives, markers, timers and
// rewards. Each mission is a small state machine; finishing one pays out and
// unlocks the next.

import { CONFIG } from './config.js';
import { dist, toast, playerPos } from './world.js';
import { spawnEnemy } from './combat.js';

/** A short progress line for the HUD and the debug handle. */
export function missionProgress(world) {
  const m = world.mission;
  if (world.completed) return 'Semua misi selesai';
  if (m.stage === 'idle') return `Misi ${m.index + 1} dari ${CONFIG.missions.length} — siap dimulai`;
  const left = m.targetsLeft > 0 ? ` — sisa ${m.targetsLeft}` : '';
  return `Misi ${m.index + 1} dari ${CONFIG.missions.length}${left}`;
}

/** Begin a mission by index, setting its stage, marker and objective. */
export function startMission(world, index) {
  const m = world.mission;
  const def = CONFIG.missions[index];
  if (!def) return;
  m.index = index;
  m.timer = 0;
  m.targetsLeft = 0;
  m.wave = 0;
  const spots = world.city.missionSpots;
  if (index === 0) {
    m.stage = 'steal';
    m.objective = 'Curi Falco GT emas, lalu bawa ke garasi.';
    m.marker = { x: spots.falco.x, y: spots.falco.y };
  } else if (index === 1) {
    m.stage = 'courier';
    m.checkpoints = spots.courier.slice();
    m.checkpointIndex = 0;
    m.timer = CONFIG.courierSeconds;
    m.objective = 'Antar 3 paket sebelum waktu habis!';
    m.marker = { x: spots.courier[0].x, y: spots.courier[0].y };
  } else if (index === 2) {
    m.stage = 'crates';
    world.crates = spots.crates.map((c) => ({ x: c.x, y: c.y, taken: false }));
    m.targetsLeft = CONFIG.cratesToCollect;
    m.objective = `Kumpulkan ${CONFIG.cratesToCollect} peti di seluruh kota.`;
    m.marker = { x: spots.crates[0].x, y: spots.crates[0].y };
  } else if (index === 3) {
    m.stage = 'clear';
    m.targetsLeft = CONFIG.vipersToClear;
    spawnTurfVipers(world);
    m.objective = `Bersihkan ${CONFIG.vipersToClear} Viper dari turf.`;
    m.marker = { x: spots.turf.x, y: spots.turf.y };
  } else if (index === 4) {
    m.stage = 'getaway';
    world.heat = CONFIG.getawayStars;
    world.wanted = CONFIG.getawayStars;
    m.timer = CONFIG.getawaySeconds;
    m.objective = `Bertahan ${CONFIG.getawaySeconds} detik dengan ${CONFIG.getawayStars} bintang!`;
    m.marker = null;
  } else if (index === 5) {
    m.stage = 'finale';
    m.wave = 1;
    m.targetsLeft = CONFIG.finaleWaves[0];
    spawnFinaleWave(world, CONFIG.finaleWaves[0], false);
    m.objective = 'Finale mansion — gelombang 1 dari 3.';
    m.marker = { x: spots.mansion.x, y: spots.mansion.y };
  }
  toast(world, `Misi ${index + 1}: ${def.title} — $${def.reward}`, 4);
}

/** Eight rivals posted around the turf circle. */
function spawnTurfVipers(world) {
  const spots = world.city.missionSpots.turf;
  for (let i = 0; i < CONFIG.vipersToClear; i++) {
    const a = (i / CONFIG.vipersToClear) * Math.PI * 2;
    const r = 60 + world.rng() * 200;
    spawnEnemy(world, spots.x + Math.cos(a) * r, spots.y + Math.sin(a) * r, false);
  }
}

/** One finale wave: grunts, or the boss after the third wave. */
function spawnFinaleWave(world, count, boss) {
  const spots = world.city.missionSpots.mansion;
  if (boss) {
    spawnEnemy(world, spots.x, spots.y - 60, true);
    return;
  }
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + world.rng();
    spawnEnemy(world, spots.x + Math.cos(a) * 180, spots.y + Math.sin(a) * 140, false);
  }
}

/** One step of the active mission. */
export function updateMission(world, dt) {
  const m = world.mission;
  if (m.stage === 'idle' || m.stage === 'done' || world.completed) return;
  const pos = playerPos(world);

  if (m.stage === 'steal') {
    const inFalco = world.player.inCar === world.falcoCar;
    if (inFalco) {
      m.objective = 'Bawa Falco GT ke garasi!';
      m.marker = { x: world.city.shops.garage.x, y: world.city.shops.garage.y };
      if (dist(pos.x, pos.y, m.marker.x, m.marker.y) < 90) completeMission(world);
    }
  } else if (m.stage === 'courier') {
    m.timer -= dt;
    const cp = m.checkpoints[m.checkpointIndex];
    if (cp && dist(pos.x, pos.y, cp.x, cp.y) < 80) {
      m.checkpointIndex += 1;
      toast(world, `Paket ${m.checkpointIndex} dari 3 terkirim!`);
      if (m.checkpointIndex >= m.checkpoints.length) {
        completeMission(world);
        return;
      }
      m.marker = { x: m.checkpoints[m.checkpointIndex].x, y: m.checkpoints[m.checkpointIndex].y };
    }
    if (m.timer <= 0) failMission(world, 'Waktu habis! Paket terlambat.');
  } else if (m.stage === 'crates') {
    for (const crate of world.crates) {
      if (!crate.taken && dist(pos.x, pos.y, crate.x, crate.y) < 46) {
        crate.taken = true;
        m.targetsLeft -= 1;
        toast(world, `Peti didapat! Sisa ${m.targetsLeft}.`);
        const next = world.crates.find((c) => !c.taken);
        m.marker = next ? { x: next.x, y: next.y } : null;
      }
    }
    if (m.targetsLeft <= 0) completeMission(world);
  } else if (m.stage === 'clear') {
    if (m.targetsLeft <= 0) completeMission(world);
  } else if (m.stage === 'getaway') {
    m.timer -= dt;
    m.objective = `Bertahan! Sisa ${Math.ceil(Math.max(0, m.timer))} detik.`;
    if (m.timer <= 0) completeMission(world);
  } else if (m.stage === 'finale') {
    if (m.targetsLeft <= 0 && world.enemies.length === 0) {
      if (m.wave < 3) {
        m.wave += 1;
        m.targetsLeft = CONFIG.finaleWaves[m.wave - 1];
        spawnFinaleWave(world, m.targetsLeft, false);
        m.objective = `Finale mansion — gelombang ${m.wave} dari 3.`;
        toast(world, `Gelombang ${m.wave} datang!`);
      } else if (m.wave === 3) {
        m.wave = 4;
        m.targetsLeft = 1;
        spawnFinaleWave(world, 1, true);
        m.objective = 'Bos Viper muncul! Kalahkan dia!';
        toast(world, 'BOS VIPER MUNCUL!', 4);
      } else {
        completeMission(world);
      }
    }
  }
}

/** Pay out, advance, and save. The last mission completes the game. */
function completeMission(world) {
  const m = world.mission;
  const def = CONFIG.missions[m.index];
  world.money += def.reward;
  world.totalEarned += def.reward;
  world.stats.missionsDone += 1;
  toast(world, `Misi selesai! +$${def.reward}.`, 4);
  if (world.audio) world.audio.mission();
  if (m.index + 1 >= CONFIG.missions.length) {
    m.stage = 'done';
    world.completed = true;
    world.state = 'finale';
    return;
  }
  m.stage = 'idle';
  m.index += 1;
  m.objective = `Tekan Enter untuk misi ${m.index + 1}: ${CONFIG.missions[m.index].title}.`;
  m.marker = null;
  saveGame(world);
}

/** A failed mission resets to idle so the player can retry. */
function failMission(world, reason) {
  const m = world.mission;
  toast(world, `${reason} Tekan Enter untuk mencoba lagi.`, 4);
  m.stage = 'idle';
  m.objective = `Tekan Enter untuk mengulang misi ${m.index + 1}.`;
  m.marker = null;
}

/** Save money and mission progress to the browser. */
export function saveGame(world) {
  try {
    const data = {
      money: world.money,
      totalEarned: world.totalEarned,
      nextMission: world.completed ? CONFIG.missions.length : world.mission.index,
      missionsDone: world.stats.missionsDone,
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  } catch (err) {
    // Storage may be unavailable (private mode); the game plays on regardless.
  }
}

/** Load a save, if one exists; returns true when something was loaded. */
export function loadGame(world) {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    world.money = data.money || 0;
    world.totalEarned = data.totalEarned || 0;
    world.mission.index = Math.min(data.nextMission || 0, CONFIG.missions.length - 1);
    world.stats.missionsDone = data.missionsDone || 0;
    if (data.nextMission >= CONFIG.missions.length) {
      world.completed = true;
    }
    return true;
  } catch (err) {
    return false;
  }
}

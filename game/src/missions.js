// The story: six sequential missions for Rico's crew, from stealing the Falco GT
// to the finale at the Voss Mansion. Each mission owns its setup and its win check.
import { COURIER_POINTS, CRATE_SPOTS, GARAGE, HIDEOUT, MANSION, MISSION_DEFS, PARK_CENTER } from './config.js';
import { dist, range } from './random.js';
import { makeCar } from './vehicles.js';

export function makeEnemy(x, y, opts = {}) {
  return {
    x, y,
    angle: range(Math.random, 0, Math.PI * 2),
    hp: opts.hp || 60,
    speed: opts.speed || 150,
    shootCd: range(Math.random, 0.5, 1.5),
    gang: !!opts.gang,
    wander: { x, y },
    wanderT: 0,
  };
}

function spawnGang(g, count, cx, cy, radius) {
  for (let i = 0; i < count; i += 1) {
    const a = g.random() * Math.PI * 2;
    const r = g.random() * radius;
    g.enemies.push(makeEnemy(cx + Math.cos(a) * r, cy + Math.sin(a) * r, { gang: true, hp: 70 }));
  }
}

export function startMission(g, index) {
  const def = MISSION_DEFS[index];
  if (!def) return;
  g.mission = {
    index,
    def,
    stage: 'go',
    timer: 0,
    collected: 0,
    killed: 0,
    wave: 0,
    checkpoint: 0,
    targetCar: null,
  };
  if (index === 0) {
    // The red Falco GT waits downtown, on the avenue by the arms shop.
    const falco = makeCar('falco', 1800, 820, 0, { color: '#c22a2a' });
    g.cars.push(falco);
    g.mission.targetCar = falco;
    g.mission.stage = 'steal';
  } else if (index === 1) {
    g.mission.timer = 75;
  } else if (index === 2) {
    g.crates = CRATE_SPOTS.map((s) => ({ ...s, taken: false }));
  } else if (index === 3) {
    spawnGang(g, 8, PARK_CENTER.x, PARK_CENTER.y, 160);
  } else if (index === 4) {
    g.heat = 65; // three stars, locked in by the timer below
    g.wanted = 3;
    if (g.audio) g.audio.setSiren(true);
    g.mission.timer = 90;
    g.mission.stage = 'survive';
  } else if (index === 5) {
    g.mission.wave = 1;
    spawnGang(g, 4, MANSION.x, MANSION.y, 120);
  }
  g.toast(`Mission ${def.id}: ${def.title}`, '#ffd98a');
  g.toast(def.brief, '#e8e8e8');
  if (g.audio) g.audio.mission();
}

export function missionMarker(g) {
  const m = g.mission;
  if (!m) return null;
  if (m.index === 0) {
    if (m.stage === 'steal' && m.targetCar) return { x: m.targetCar.x, y: m.targetCar.y, label: 'Falco GT' };
    return { x: GARAGE.x, y: GARAGE.y, label: 'Rico Garage' };
  }
  if (m.index === 1) {
    const p = COURIER_POINTS[m.checkpoint];
    return p ? { x: p.x, y: p.y, label: `Drop ${m.checkpoint + 1}/3` } : null;
  }
  if (m.index === 2) {
    const next = g.crates.find((c) => !c.taken);
    return next ? { x: next.x, y: next.y, label: `Crates ${m.collected}/6` } : null;
  }
  if (m.index === 3) {
    return g.enemies.length ? { x: g.enemies[0].x, y: g.enemies[0].y, label: `Vipers left: ${g.enemies.length}` } : null;
  }
  if (m.index === 4) {
    if (m.stage === 'survive') return null;
    return { x: HIDEOUT.x, y: HIDEOUT.y, label: 'Hideout' };
  }
  if (m.index === 5) {
    return g.enemies.length ? { x: g.enemies[0].x, y: g.enemies[0].y, label: `Wave ${m.wave}/3 — ${g.enemies.length} left` } : { x: MANSION.x, y: MANSION.y, label: 'Voss Mansion' };
  }
  return null;
}

export function missionObjective(g) {
  const m = g.mission;
  if (!m) return 'Free roam — press E near a car to drive it.';
  if (m.index === 0) return m.stage === 'steal' ? 'Steal the red Falco GT downtown' : 'Deliver the Falco GT to Rico Garage';
  if (m.index === 1) return `Courier: reach drop ${m.checkpoint + 1}/3 — ${Math.ceil(m.timer)}s left`;
  if (m.index === 2) return `Collect the supply crates — ${m.collected}/6`;
  if (m.index === 3) return `Clear the Viper gang in Coral Park — ${g.enemies.length} left`;
  if (m.index === 4) return m.stage === 'survive' ? `Survive the heat — ${Math.ceil(m.timer)}s left` : 'Lose the tail: reach the hideout';
  if (m.index === 5) return `Finale: clear wave ${m.wave}/3 at the Voss Mansion`;
  return '';
}

function completeMission(g) {
  const m = g.mission;
  g.money += m.def.reward;
  g.toast(`Mission complete! +$${m.def.reward}`, '#8be28b');
  if (g.audio) g.audio.cash();
  g.saveGame();
  const next = m.index + 1;
  if (next >= MISSION_DEFS.length) {
    g.mission = null;
    g.finale();
    return;
  }
  startMission(g, next);
}

export function updateMission(g, dt) {
  const m = g.mission;
  if (!m) return;
  const px = g.player.car ? g.player.car.x : g.player.x;
  const py = g.player.car ? g.player.car.y : g.player.y;

  if (m.index === 0) {
    if (m.stage === 'steal' && g.player.car === m.targetCar) {
      m.stage = 'deliver';
      g.toast('Got the Falco! Take it to Rico Garage.', '#ffd98a');
    } else if (m.stage === 'deliver' && g.player.car === m.targetCar && dist(px, py, GARAGE.x, GARAGE.y) < 110) {
      completeMission(g);
    }
  } else if (m.index === 1) {
    m.timer -= dt;
    const p = COURIER_POINTS[m.checkpoint];
    if (p && dist(px, py, p.x, p.y) < 80) {
      m.checkpoint += 1;
      g.toast(`Drop ${m.checkpoint}/3 delivered`, '#8be28b');
      if (g.audio) g.audio.pickup();
      if (m.checkpoint >= COURIER_POINTS.length) completeMission(g);
    } else if (m.timer <= 0) {
      g.toast('Courier run failed — too slow. Try again.', '#ff5a4e');
      startMission(g, 1);
    }
  } else if (m.index === 2) {
    for (const c of g.crates) {
      if (!c.taken && dist(px, py, c.x, c.y) < 55) {
        c.taken = true;
        m.collected += 1;
        g.toast(`Crate ${m.collected}/6 collected`, '#8be28b');
        if (g.audio) g.audio.pickup();
      }
    }
    if (m.collected >= 6) completeMission(g);
  } else if (m.index === 3) {
    if (g.enemies.length === 0) completeMission(g);
  } else if (m.index === 4) {
    if (m.stage === 'survive') {
      // Keep the heat pinned at three stars while the timer runs.
      if (g.heat < 60) g.heat = 60;
      m.timer -= dt;
      if (m.timer <= 0) {
        m.stage = 'hideout';
        g.toast('You made it through! Now reach the hideout.', '#ffd98a');
      }
    } else if (dist(px, py, HIDEOUT.x, HIDEOUT.y) < 90) {
      completeMission(g);
    }
  } else if (m.index === 5) {
    if (g.enemies.length === 0) {
      if (m.wave >= 3) {
        completeMission(g);
      } else {
        m.wave += 1;
        g.toast(`Wave ${m.wave}/3 incoming!`, '#ff5a4e');
        spawnGang(g, 4, MANSION.x, MANSION.y, 140);
      }
    }
  }
}

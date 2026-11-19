// SOLMAR — Streets of the Sun
// Rendering: everything the player sees, drawn with canvas shapes in a warm
// golden-hour palette. Deterministic: the same world state draws the same
// pixels, since nothing here reads the clock or an unseeded generator.

import { CONFIG } from './config.js';

/** A deterministic 0..1 value from an integer seed (for window patterns). */
function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Draw the whole game view: world, entities, effects, warm light. */
export function drawGame(ctx, world, viewW, viewH) {
  const cam = world.camera;
  ctx.save();
  ctx.clearRect(0, 0, viewW, viewH);
  // Sky-warm backdrop, then the camera transform for the world itself.
  ctx.fillStyle = '#e8b06a';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.translate(viewW / 2 - cam.x, viewH / 2 - cam.y);
  drawGround(ctx, world);
  drawRoads(ctx, world);
  drawParks(ctx, world);
  drawBuildings(ctx, world);
  drawShops(ctx, world);
  drawCrates(ctx, world);
  drawMissionMarker(ctx, world);
  drawCars(ctx, world);
  drawPeds(ctx, world);
  drawEnemies(ctx, world);
  drawPlayer(ctx, world);
  drawBullets(ctx, world);
  drawParticles(ctx, world);
  ctx.restore();
  drawWarmLight(ctx, viewW, viewH);
}

/** Grass, sand and sea under everything. */
function drawGround(ctx, world) {
  ctx.fillStyle = '#8fae5d';
  ctx.fillRect(0, 0, CONFIG.worldWidth, CONFIG.worldHeight);
  // Beach band, then the sea with a few deterministic wave lines.
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(0, 2140, CONFIG.worldWidth, 80);
  ctx.fillStyle = '#3f7f9e';
  ctx.fillRect(0, 2220, CONFIG.worldWidth, CONFIG.worldHeight - 2220);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const y = 2240 + i * 14;
    const wob = Math.sin(world.frame * 0.02 + i * 1.7) * 8;
    ctx.beginPath();
    ctx.moveTo(0, y + wob);
    for (let x = 0; x <= CONFIG.worldWidth; x += 160) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + wob);
    }
    ctx.stroke();
  }
  // The pier reaching into the sea.
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(1500, 2180, 90, 220);
  ctx.fillStyle = '#6d5433';
  for (let y = 2190; y < 2380; y += 22) ctx.fillRect(1500, y, 90, 4);
}

/** Roads, lane dashes and sidewalks. */
function drawRoads(ctx, world) {
  const city = world.city;
  const half = city.half;
  for (const ax of city.avenues) {
    ctx.fillStyle = '#b9ac8f';
    ctx.fillRect(ax - half - CONFIG.sidewalkWidth, 0, (half + CONFIG.sidewalkWidth) * 2, CONFIG.worldHeight);
    ctx.fillStyle = '#4c4a48';
    ctx.fillRect(ax - half, 0, half * 2, CONFIG.worldHeight);
  }
  for (const sy of city.streets) {
    ctx.fillStyle = '#b9ac8f';
    ctx.fillRect(0, sy - half - CONFIG.sidewalkWidth, CONFIG.worldWidth, (half + CONFIG.sidewalkWidth) * 2);
    ctx.fillStyle = '#4c4a48';
    ctx.fillRect(0, sy - half, CONFIG.worldWidth, half * 2);
  }
  // Centre dashes.
  ctx.fillStyle = '#e8d27a';
  for (const ax of city.avenues) {
    for (let y = 40; y < CONFIG.worldHeight; y += 64) ctx.fillRect(ax - 3, y, 6, 30);
  }
  for (const sy of city.streets) {
    for (let x = 40; x < CONFIG.worldWidth; x += 64) ctx.fillRect(x, sy - 3, 30, 6);
  }
}

/** Parks with grass and round trees. */
function drawParks(ctx, world) {
  for (const park of world.city.parks) {
    ctx.fillStyle = '#6f9e4e';
    ctx.fillRect(park.x, park.y, park.w, park.h);
  }
  for (const tree of world.city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(tree.x + 4, tree.y + 5, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7a34';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d9c44';
    ctx.beginPath();
    ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Buildings with long golden-hour shadows, roofs and lit windows. */
function drawBuildings(ctx, world) {
  for (const b of world.city.buildings) {
    // Shadow falls to the north-east, long and soft.
    ctx.fillStyle = 'rgba(60,30,10,0.25)';
    ctx.fillRect(b.x + b.height, b.y - b.height * 0.4, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    // Windows in a deterministic pattern from the building's seed.
    ctx.fillStyle = 'rgba(255,220,140,0.85)';
    const cols = Math.max(1, Math.floor((b.w - 20) / 26));
    const rows = Math.max(1, Math.floor((b.h - 20) / 26));
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (hash01(b.seed + cx * 7 + cy * 13) > 0.45) {
          ctx.fillRect(b.x + 12 + cx * 26, b.y + 12 + cy * 26, 12, 14);
        }
      }
    }
  }
}

/** Shop signs: a coloured pad with a label. */
function drawShops(ctx, world) {
  const shops = world.city.shops;
  const pads = [
    { s: shops.weapon, c: '#8e2f38' },
    { s: shops.clinic, c: '#2f7a5d' },
    { s: shops.spray, c: '#2f5d8a' },
    { s: shops.garage, c: '#8a6d1a' },
  ];
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px sans-serif';
  for (const { s, c } of pads) {
    ctx.fillStyle = c;
    ctx.fillRect(s.x - 52, s.y - 20, 104, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.label, s.x, s.y + 5);
  }
}

/** Crates waiting to be collected, with a soft glow. */
function drawCrates(ctx, world) {
  for (const crate of world.crates) {
    if (crate.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(world.frame * 0.08);
    ctx.fillStyle = `rgba(232,185,60,${0.25 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(crate.x, crate.y, 26 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a67c1a';
    ctx.fillRect(crate.x - 13, crate.y - 13, 26, 26);
    ctx.strokeStyle = '#e8b93c';
    ctx.lineWidth = 3;
    ctx.strokeRect(crate.x - 13, crate.y - 13, 26, 26);
    ctx.beginPath();
    ctx.moveTo(crate.x - 13, crate.y - 13);
    ctx.lineTo(crate.x + 13, crate.y + 13);
    ctx.moveTo(crate.x + 13, crate.y - 13);
    ctx.lineTo(crate.x - 13, crate.y + 13);
    ctx.stroke();
  }
}

/** The pulsing mission marker and its ground ring. */
function drawMissionMarker(ctx, world) {
  const marker = world.mission.marker;
  if (!marker) return;
  const pulse = 0.5 + 0.5 * Math.sin(world.frame * 0.1);
  ctx.strokeStyle = `rgba(232,185,60,${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 30 + pulse * 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8b93c';
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 46 - pulse * 6);
  ctx.lineTo(marker.x - 10, marker.y - 28);
  ctx.lineTo(marker.x + 10, marker.y - 28);
  ctx.closePath();
  ctx.fill();
}

/** One car: shadow, body, roof, windows, wheels and headlights. */
function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-car.length / 2 + 5, -car.width / 2 + 6, car.length, car.width);
  ctx.fillStyle = car.body;
  roundRect(ctx, -car.length / 2, -car.width / 2, car.length, car.width, 9);
  ctx.fill();
  ctx.fillStyle = car.roof;
  roundRect(ctx, -car.length / 2 + 12, -car.width / 2 + 5, car.length - 30, car.width - 10, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.fillRect(car.length / 2 - 16, -car.width / 2 + 7, 8, car.width - 14);
  ctx.fillStyle = '#1c1c22';
  ctx.fillRect(-car.length / 2 - 2, -car.width / 2 - 3, 10, 6);
  ctx.fillRect(-car.length / 2 - 2, car.width / 2 - 3, 10, 6);
  ctx.fillRect(car.length / 2 - 8, -car.width / 2 - 3, 10, 6);
  ctx.fillRect(car.length / 2 - 8, car.width / 2 - 3, 10, 6);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2a1a';
    ctx.fillRect(-car.length / 2 - 3, -car.width / 2 + 4, 4, 7);
    ctx.fillRect(-car.length / 2 - 3, car.width / 2 - 11, 4, 7);
  }
  ctx.fillStyle = 'rgba(255,240,180,0.5)';
  ctx.beginPath();
  ctx.moveTo(car.length / 2, -car.width / 2 + 5);
  ctx.lineTo(car.length / 2 + 26, -car.width / 2 - 2);
  ctx.lineTo(car.length / 2 + 26, car.width / 2 + 2);
  ctx.lineTo(car.length / 2, car.width / 2 - 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (car.health < 45 && !car.broken) {
    ctx.fillStyle = 'rgba(90,90,90,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * car.length * 0.4, car.y - Math.sin(car.angle) * car.length * 0.4, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** All cars: parked, traffic, the player's, and police cruisers. */
function drawCars(ctx, world) {
  for (const car of world.cars) drawCarShape(ctx, car);
  for (const car of world.traffic) drawCarShape(ctx, car);
  for (const car of world.cruisers) {
    drawCarShape(ctx, car);
    // Light bar, flashing with the frame count.
    ctx.fillStyle = world.frame % 30 < 15 ? '#ff2a1a' : '#2a6bff';
    ctx.fillRect(car.x - 6, car.y - 4, 12, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLISI', car.x, car.y - car.width / 2 - 6);
  }
}

/** Pedestrians as small figures with a shadow. */
function drawPeds(ctx, world) {
  for (const ped of world.peds) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(ped.x + 2, ped.y + 4, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    if (ped.state === 'report') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', ped.x, ped.y - 16);
    }
  }
}

/** Rival Vipers and the boss, with health bars. */
function drawEnemies(ctx, world) {
  for (const e of world.enemies) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(e.x + 2, e.y + 4, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.boss ? '#3a0d12' : '#7a1f24';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.boss ? 18 : 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#e8b93c';
    ctx.beginPath();
    ctx.arc(e.x, e.y - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    // Health bar above the head.
    const w = e.boss ? 52 : 34;
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(e.x - w / 2, e.y - (e.boss ? 34 : 26), w, 6);
    ctx.fillStyle = e.boss ? '#ff2a1a' : '#e8b93c';
    ctx.fillRect(e.x - w / 2, e.y - (e.boss ? 34 : 26), w * (e.health / e.maxHealth), 6);
    if (e.boss) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOS VIPER', e.x, e.y - 40);
    }
    if (e.muzzle > 0) {
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(e.angle) * 26, e.y + Math.sin(e.angle) * 26, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The player: a figure with a direction tick, or the car when driving. */
function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.inCar) return; // The car itself is drawn with the cars.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 6, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.hurtFlash > 0 ? '#ff6a5a' : '#2f6db3';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 2, 7, 0, Math.PI * 2);
  ctx.fill();
  // Aim tick and muzzle flash.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aimAngle) * 14, p.y + Math.sin(p.aimAngle) * 14);
  ctx.lineTo(p.x + Math.cos(p.aimAngle) * 24, p.y + Math.sin(p.aimAngle) * 24);
  ctx.stroke();
  if (p.muzzle > 0) {
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.aimAngle) * 28, p.y + Math.sin(p.aimAngle) * 28, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bullets as bright tracer lines. */
function drawBullets(ctx, world) {
  ctx.lineWidth = 3;
  for (const b of world.bullets) {
    ctx.strokeStyle = b.owner === 'player' ? '#ffe9a8' : '#ff8a7a';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

/** Particles: sparks and smoke. */
function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    const alpha = Math.max(0, pt.life / pt.max);
    if (pt.kind === 'smoke') {
      ctx.fillStyle = `rgba(120,120,120,${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = pt.color || '#ffd27a';
      ctx.globalAlpha = alpha;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.globalAlpha = 1;
    }
  }
}

/** Golden-hour wash and a soft vignette, in screen space. */
function drawWarmLight(ctx, viewW, viewH) {
  const grad = ctx.createLinearGradient(0, 0, viewW, viewH);
  grad.addColorStop(0, 'rgba(255,180,90,0.10)');
  grad.addColorStop(1, 'rgba(120,40,20,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);
  const vig = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.42, viewW / 2, viewH / 2, viewH * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(20,8,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, viewW, viewH);
}

/** A rounded rectangle path, filled by the caller. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

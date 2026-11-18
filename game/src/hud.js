// hud.js — the heads-up display for SOLMAR: wanted stars, money, the mission
// objective, the weapon panel, toasts, the speed panel and the minimap.
//
// Layout rules this file exists to protect (learned the hard way):
// - The speed panel sits clearly ABOVE the minimap, with a gap, and the car
//   name is on its own line above the speed number — never overlapping.
// - The "SOLMAR BAY" caption is its own small pill INSIDE the top of the
//   minimap, not on the seam between the speed panel and the minimap.
// - Toast panels are sized to their measured message text, never a fixed
//   narrow pill the text can spill out of.
// - The weapon panel is about 300px wide so "[Q] switch [R] reload" fits.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, WEAPONS, WEAPON_ORDER, DISTRICTS, POIS } from './config.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function panel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(12, 14, 20, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function text(ctx, value, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

// Wanted stars, top-left, with a "WANTED" label.
export function drawWanted(ctx, G) {
  const x = 16;
  const y = 16;
  panel(ctx, x, y, 190, 56);
  text(ctx, 'WANTED', x + 14, y + 22, 12, '#ffb84d', 'left', 800);
  for (let i = 0; i < 5; i += 1) {
    const sx = x + 16 + i * 34;
    const sy = y + 44;
    ctx.font = '22px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = i < G.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', sx, sy);
  }
}

// Money and health, top-right.
export function drawMoney(ctx, G) {
  const w = 210;
  const x = VIEW_W - w - 16;
  const y = 16;
  panel(ctx, x, y, w, 56);
  text(ctx, `$${G.player.money.toLocaleString('en-US')}`, x + w - 14, y + 26, 22, '#7dff8a', 'right', 800);
  const hpW = w - 28;
  const hpY = y + 40;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 14, hpY, hpW, 8);
  ctx.fillStyle = G.player.hp > 50 ? '#4ade80' : G.player.hp > 25 ? '#facc15' : '#ef4444';
  ctx.fillRect(x + 14, hpY, hpW * Math.max(0, G.player.hp) / 100, 8);
  text(ctx, 'HP', x + 14, y + 26, 12, '#ffffffaa', 'left', 700);
}

// Mission objective panel, under the money panel.
export function drawMission(ctx, G) {
  const m = G.mission;
  if (!m) return;
  const w = 320;
  const x = VIEW_W - w - 16;
  const y = 84;
  const lines = wrapText(ctx, m.brief, 15, w - 28);
  const h = 62 + lines.length * 19;
  panel(ctx, x, y, w, h);
  text(ctx, `MISSION ${m.id} — ${m.name.toUpperCase()}`, x + 14, y + 24, 14, '#ffd94a', 'left', 800);
  lines.forEach((line, i) => text(ctx, line, x + 14, y + 46 + i * 19, 15, '#ffffff', 'left', 500));
  const bottom = y + h - 14;
  if (m.id === 2 || m.id === 5) {
    text(ctx, `TIME  ${Math.max(0, Math.ceil(G.missionTimer))}s`, x + 14, bottom, 16, '#ff6b6b', 'left', 800);
  } else if (m.id === 3) {
    text(ctx, `CRATES  ${m.progress} / 6`, x + 14, bottom, 16, '#ffffff', 'left', 800);
  } else if (m.id === 4) {
    text(ctx, `VIPERS DOWN  ${m.progress} / 8`, x + 14, bottom, 16, '#ffffff', 'left', 800);
  } else if (m.id === 6) {
    text(ctx, `WAVE  ${m.wave} / 3`, x + 14, bottom, 16, '#ffffff', 'left', 800);
  } else if (m.id === 1) {
    text(ctx, m.stage === 0 ? 'STEAL THE FALCO GT' : 'DELIVER TO GARAGE', x + 14, bottom, 16, '#ffffff', 'left', 800);
  }
  text(ctx, `REWARD $${m.reward}`, x + w - 14, bottom, 16, '#7dff8a', 'right', 800);
}

function wrapText(ctx, str, size, maxW) {
  ctx.font = `500 ${size}px ${FONT}`;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Toasts, centred near the top. Each panel is measured to its text.
export function drawToasts(ctx, G) {
  let y = 150;
  for (const t of G.toasts) {
    ctx.font = '600 16px ' + FONT;
    const w = ctx.measureText(t.text).width + 36;
    const x = (VIEW_W - w) / 2;
    const alpha = Math.min(0.88, t.t);
    ctx.fillStyle = `rgba(12, 14, 20, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, t.text, VIEW_W / 2, y + 22, 16, '#ffffff', 'center', 600);
    y += 42;
  }
}

// Weapon panel, bottom-left, about 300px wide so the hints fit inside.
export function drawWeapon(ctx, G) {
  const p = G.player;
  const w = 300;
  const h = 74;
  const x = 16;
  const y = VIEW_H - h - 16;
  panel(ctx, x, y, w, h);
  const weapon = WEAPONS[p.weapon];
  text(ctx, weapon.name.toUpperCase(), x + 14, y + 26, 18, '#ffffff', 'left', 800);
  const magText = p.reloading > 0 ? 'RELOADING…' : `${p.mag[p.weapon]} / ${p.ammo[p.weapon]}`;
  text(ctx, magText, x + w - 14, y + 26, 18, '#ffd94a', 'right', 800);
  // Owned weapons as small slots.
  let sx = x + 14;
  for (const key of WEAPON_ORDER) {
    const owned = p.owned.includes(key);
    ctx.fillStyle = p.weapon === key ? '#ffd94a' : owned ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(sx, y + 38, 54, 22, 5);
    ctx.fill();
    text(ctx, WEAPONS[key].name, sx + 27, y + 54, 12, p.weapon === key ? '#111' : '#fff', 'center', 700);
    sx += 62;
  }
  text(ctx, '[Q] switch   [R] reload', x + 196, y + 54, 12, '#ffffffaa', 'left', 600);
}

// Speed panel ABOVE the minimap, with the car name on its own line above
// the speed number. The minimap sits below it with a clear gap.
export function drawSpeed(ctx, G) {
  const p = G.player;
  if (!p.inCar) return;
  const mapW = 220;
  const mapH = 165;
  const mapX = VIEW_W - mapW - 16;
  const mapY = VIEW_H - mapH - 16;
  const w = 220;
  const h = 64;
  const x = mapX;
  const y = mapY - h - 12; // 12px gap above the minimap
  panel(ctx, x, y, w, h);
  text(ctx, p.inCar.type.name.toUpperCase(), x + w / 2, y + 22, 14, '#ffb84d', 'center', 800);
  const kmh = Math.round(Math.abs(p.inCar.speed) * 0.55);
  text(ctx, `${kmh}`, x + w / 2, y + 52, 26, '#ffffff', 'center', 800);
  text(ctx, 'km/h', x + w - 16, y + 52, 12, '#ffffffaa', 'right', 600);
}

// Minimap, bottom-right. The SOLMAR BAY caption is a small pill INSIDE the
// top of the minimap, with its own padding, not on the seam.
export function drawMinimap(ctx, G) {
  const mapW = 220;
  const mapH = 165;
  const x = VIEW_W - mapW - 16;
  const y = VIEW_H - mapH - 16;
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;
  panel(ctx, x, y, mapW, mapH, 0.88);
  // Water, park and hill tints.
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x + DISTRICTS.harbor.x * sx, y + DISTRICTS.harbor.y * sy, DISTRICTS.harbor.w * sx, DISTRICTS.harbor.h * sy);
  ctx.fillStyle = '#69a854';
  ctx.fillRect(x + DISTRICTS.park.x * sx, y + DISTRICTS.park.y * sy, DISTRICTS.park.w * sx, DISTRICTS.park.h * sy);
  ctx.fillStyle = '#e3c98f';
  ctx.fillRect(x, y + DISTRICTS.beach.y * sy, mapW, DISTRICTS.beach.h * sy);
  // Roads.
  ctx.strokeStyle = '#9aa0a8';
  ctx.lineWidth = 2;
  for (const ax of [400, 1000, 1600, 2200, 2800]) {
    ctx.beginPath();
    ctx.moveTo(x + ax * sx, y);
    ctx.lineTo(x + ax * sx, y + mapH);
    ctx.stroke();
  }
  for (const sy2 of [350, 800, 1250, 1700, 2150]) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy2 * sy);
    ctx.lineTo(x + mapW, y + sy2 * sy);
    ctx.stroke();
  }
  // Mission marker.
  if (G.mission && G.mission.marker) {
    const mx = x + G.mission.marker.x * sx;
    const my = y + G.mission.marker.y * sy;
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police dots.
  ctx.fillStyle = '#3b82f6';
  for (const car of G.cars) {
    if (car.driver === 'police' && !car.dead) {
      ctx.beginPath();
      ctx.arc(x + car.x * sx, y + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Player arrow.
  const px = x + G.player.x * sx;
  const py = y + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Caption pill inside the top of the minimap.
  ctx.font = '800 11px ' + FONT;
  const label = 'SOLMAR BAY';
  const lw = ctx.measureText(label).width + 18;
  const lx = x + (mapW - lw) / 2;
  const ly = y + 8;
  ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + mapW / 2, ly + 14);
}

// The whole HUD in play.
export function drawHud(ctx, G) {
  drawWanted(ctx, G);
  drawMoney(ctx, G);
  drawMission(ctx, G);
  drawToasts(ctx, G);
  drawWeapon(ctx, G);
  drawSpeed(ctx, G);
  drawMinimap(ctx, G);
}

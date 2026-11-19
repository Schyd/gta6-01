// SOLMAR — Streets of the Sun
// The HUD and the menus: health, money, wanted stars, the mission objective,
// the weapon panel, the speed panel above the minimap, the minimap itself
// with its SOLMAR BAY pill, toasts, and every full-screen menu.

import { CONFIG } from './config.js';
import { districtAt } from './city.js';
import { playerPos } from './world.js';
import { nearInteractable } from './player.js';
import { currentWeapon } from './combat.js';
import { wantedLabel } from './police.js';
import { missionProgress } from './missions.js';

/** Draw the in-play HUD over the game view. */
export function drawHUD(ctx, world, viewW, viewH) {
  const p = world.player;
  // Health bar, top left.
  ctx.fillStyle = 'rgba(10,10,16,0.55)';
  roundRectFill(ctx, 16, 14, 230, 46, 8);
  ctx.fillStyle = '#1c1c22';
  ctx.fillRect(28, 26, 150, 14);
  ctx.fillStyle = p.health > 35 ? '#5dc96a' : '#ff5a4a';
  ctx.fillRect(28, 26, 150 * Math.max(0, p.health / CONFIG.playerHealth), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`❤ ${Math.ceil(p.health)}`, 186, 38);
  ctx.fillStyle = '#e8b93c';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`$${world.money}`, 28, 54);

  // Wanted stars, top right, with a label.
  const stars = '★'.repeat(world.wanted) + '☆'.repeat(CONFIG.maxWanted - world.wanted);
  ctx.textAlign = 'right';
  ctx.fillStyle = world.wanted > 0 ? '#ff5a4a' : '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(stars, viewW - 16, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(wantedLabel(world), viewW - 16, 56);

  // Mission objective, top centre, on a dark pill.
  const objective = world.mission.objective;
  ctx.font = 'bold 14px sans-serif';
  const ow = Math.min(viewW - 40, ctx.measureText(objective).width + 36);
  ctx.fillStyle = 'rgba(10,10,16,0.6)';
  roundRectFill(ctx, (viewW - ow) / 2, 12, ow, 32, 16);
  ctx.fillStyle = '#ffd27a';
  ctx.textAlign = 'center';
  ctx.fillText(objective, viewW / 2, 33);
  // Mission timer, when one is running.
  if (world.mission.timer > 0 && (world.mission.stage === 'courier' || world.mission.stage === 'getaway')) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${Math.ceil(world.mission.timer)} dtk`, viewW / 2, 60);
  }
  // Mission counter under the objective pill.
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '12px sans-serif';
  ctx.fillText(missionProgress(world), viewW / 2, 78);

  // Weapon panel, bottom left, about 300 pixels wide.
  const weapon = currentWeapon(world);
  ctx.fillStyle = 'rgba(10,10,16,0.55)';
  roundRectFill(ctx, 16, viewH - 66, 300, 50, 8);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(weapon.name, 28, viewH - 44);
  ctx.fillStyle = '#ffd27a';
  ctx.font = '13px sans-serif';
  const ammoText = weapon.mag === 0 ? '∞ peluru' : (p.reloadTimer > 0 ? 'Mengisi ulang…' : `${p.ammo} / ${weapon.mag}`);
  ctx.fillText(ammoText, 28, viewH - 26);
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '12px sans-serif';
  ctx.fillText(districtAt(world.city, p.x, p.y), 210, viewH - 26);

  // Speed panel above the minimap, car name on its own line.
  const mapSize = 190;
  const mapX = viewW - mapSize - 16;
  const mapY = viewH - mapSize - 16;
  if (p.inCar) {
    const speedKmh = Math.round(Math.abs(p.inCar.speed) * 0.36);
    ctx.fillStyle = 'rgba(10,10,16,0.55)';
    roundRectFill(ctx, mapX, mapY - 58, mapSize, 50, 8);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${speedKmh} km/j`, mapX + mapSize / 2, mapY - 34);
    ctx.fillStyle = '#ffd27a';
    ctx.font = '13px sans-serif';
    ctx.fillText(p.inCar.typeName, mapX + mapSize / 2, mapY - 14);
  }

  // Minimap.
  drawMinimap(ctx, world, mapX, mapY, mapSize);

  // Toasts, centre, each sized to its measured text.
  ctx.textAlign = 'center';
  let toastY = 96;
  for (const toast of world.toasts) {
    ctx.font = 'bold 14px sans-serif';
    const tw = ctx.measureText(toast.text).width + 32;
    ctx.fillStyle = 'rgba(10,10,16,0.65)';
    roundRectFill(ctx, (viewW - tw) / 2, toastY, tw, 30, 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(toast.text, viewW / 2, toastY + 20);
    toastY += 38;
  }

  // Interaction prompt above the weapon panel.
  const prompt = nearInteractable(world);
  if (prompt) {
    ctx.font = 'bold 14px sans-serif';
    const pw = ctx.measureText(prompt).width + 28;
    ctx.fillStyle = 'rgba(232,185,60,0.9)';
    roundRectFill(ctx, 16, viewH - 104, pw, 30, 15);
    ctx.fillStyle = '#1c1c22';
    ctx.textAlign = 'left';
    ctx.fillText(prompt, 30, viewH - 84);
  }
}

/** The minimap: roads, the player, police, the mission marker, and the pill. */
function drawMinimap(ctx, world, x, y, size) {
  const scale = size / CONFIG.worldWidth;
  const pos = playerPos(world);
  ctx.fillStyle = 'rgba(10,10,16,0.6)';
  roundRectFill(ctx, x - 4, y - 4, size + 8, size + 8, 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = '#5d7a3e';
  ctx.fillRect(x, y, size, size);
  // Sea.
  ctx.fillStyle = '#3f7f9e';
  ctx.fillRect(x, y + 2180 * scale, size, size);
  // Roads.
  ctx.fillStyle = '#4c4a48';
  for (const ax of world.city.avenues) ctx.fillRect(x + (ax - 70) * scale, y, 140 * scale, size);
  for (const sy of world.city.streets) ctx.fillRect(x, y + (sy - 70) * scale, size, 140 * scale);
  // Mission marker.
  if (world.mission.marker) {
    ctx.fillStyle = '#e8b93c';
    ctx.beginPath();
    ctx.arc(x + world.mission.marker.x * scale, y + world.mission.marker.y * scale, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police blips.
  ctx.fillStyle = '#2a6bff';
  for (const cop of world.cops) {
    ctx.beginPath();
    ctx.arc(x + cop.x * scale, y + cop.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cruiser of world.cruisers) {
    ctx.beginPath();
    ctx.arc(x + cruiser.x * scale, y + cruiser.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enemies.
  ctx.fillStyle = '#ff5a4a';
  for (const e of world.enemies) {
    ctx.beginPath();
    ctx.arc(x + e.x * scale, y + e.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player, a white dot with a gold ring.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + pos.x * scale, y + pos.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b93c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + pos.x * scale, y + pos.y * scale, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // SOLMAR BAY pill inside the minimap, bottom centre.
  ctx.font = 'bold 11px sans-serif';
  const label = 'SOLMAR BAY';
  const lw = ctx.measureText(label).width + 18;
  ctx.fillStyle = 'rgba(232,185,60,0.92)';
  roundRectFill(ctx, x + (size - lw) / 2, y + size - 24, lw, 18, 9);
  ctx.fillStyle = '#1c1c22';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + size / 2, y + size - 11);
}

/** A filled rounded rectangle. */
function roundRectFill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/** A full-screen menu: title, pause, busted, wasted or finale. */
export function drawMenu(ctx, world, viewW, viewH, kind) {
  ctx.fillStyle = 'rgba(20,10,4,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  const cx = viewW / 2;
  if (kind === 'title') {
    ctx.fillStyle = '#e8b93c';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('SOLMAR', cx, 210);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('STREETS OF THE SUN', cx, 250);
    ctx.fillStyle = '#ffd27a';
    ctx.font = '16px sans-serif';
    ctx.fillText('Enam misi. Satu kota. Satu pengemudi yang mengambil alih jalanan.', cx, 300);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD / panah — bergerak dan mengemudi  •  Mouse — membidik  •  Klik — menembak', cx, 360);
    ctx.fillText('E — naik / keluar mobil, toko  •  Enter — mulai misi  •  R — isi ulang  •  P — jeda', cx, 388);
    ctx.fillStyle = '#e8b93c';
    ctx.font = 'bold 20px sans-serif';
    // The warmup ends on frame 150, an odd blink phase: show the prompt then.
    const blink = Math.floor(world.frame / 30) % 2 === 1;
    if (blink) ctx.fillText('— TEKAN ENTER UNTUK MULAI —', cx, 470);
    ctx.fillStyle = '#b9b3a4';
    ctx.font = '13px sans-serif';
    ctx.fillText('Game orisinal 2D. Semua aset digambar dan disintesis di dalam game.', cx, 540);
  } else if (kind === 'paused') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('JEDA', cx, 300);
    ctx.font = '16px sans-serif';
    ctx.fillText('Tekan P untuk lanjut, atau R untuk mulai dari awal misi ini.', cx, 350);
  } else if (kind === 'busted') {
    ctx.fillStyle = '#2a6bff';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('BUSTED!', cx, 300);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Polisi menangkapmu. Uang misi ini hangus, tapi kota tetap menunggumu.', cx, 350);
    ctx.fillText('Tekan Enter untuk mencoba lagi.', cx, 384);
  } else if (kind === 'wasted') {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('WASTED', cx, 300);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Kamu tumbang di jalanan Solmar Bay.', cx, 350);
    ctx.fillText('Tekan Enter untuk mencoba lagi.', cx, 384);
  } else if (kind === 'finale') {
    ctx.fillStyle = '#e8b93c';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('SOLMAR MILIKMU', cx, 280);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Enam misi selesai. Total penghasilan: $${world.totalEarned}.`, cx, 340);
    ctx.font = '16px sans-serif';
    ctx.fillText('Kota ini sekarang mengenal namamu. Main lagi? Tekan Enter.', cx, 380);
  }
}

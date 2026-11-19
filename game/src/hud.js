// The HUD, the minimap and every menu screen, drawn on the same canvas in
// screen space: wanted stars, cash, health, the mission objective, and the
// title, pause, busted, wasted and finale screens.
import { H_ROADS, V_ROADS, WORLD_H, WORLD_W } from './config.js';
import { MISSIONS, missionObjective } from './missions.js';
import { loadSave } from './world.js';

function panel(ctx, x, y, w, h, alpha = 0.72) {
  ctx.fillStyle = `rgba(12,14,20,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
}

function drawMinimap(state, ctx) {
  const w = 200; const h = 152;
  const x = 18; const y = state.viewH - h - 18;
  panel(ctx, x, y, w, h, 0.78);
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#2f8fb5';
  ctx.fillRect(x, y + (WORLD_H - 90) * sy, w, 90 * sy);
  ctx.fillStyle = '#e8cf9a';
  ctx.fillRect(x, y + (WORLD_H - 210) * sy, w, 120 * sy);
  ctx.strokeStyle = '#55504a';
  ctx.lineWidth = 3;
  for (const rx of V_ROADS) {
    ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + h); ctx.stroke();
  }
  for (const ry of H_ROADS) {
    ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + w, y + ry * sy); ctx.stroke();
  }
  // Shops.
  for (const shop of state.city.shops) {
    ctx.fillStyle = shop.kind === 'gun' ? '#ff5b5b' : shop.kind === 'clinic' ? '#fff' : '#7fd08a';
    ctx.fillRect(x + shop.x * sx - 2, y + shop.y * sy - 2, 4, 4);
  }
  // Mission marker.
  const m = state.mission && state.mission.marker;
  if (m) {
    const pulse = 4 + Math.sin(state.time * 5) * 1.5;
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.arc(x + m.x * sx, y + m.y * sy, pulse, 0, Math.PI * 2); ctx.fill();
  }
  // Police as red dots, the player as a white arrow.
  for (const car of state.cars) {
    if (!car.isCop || car.dead) continue;
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath(); ctx.arc(x + car.x * sx, y + car.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  const px = x + state.player.x * sx;
  const py = y + state.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.playerCar ? state.playerCar.angle : state.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  // SOLMAR BAY pill, inside the minimap at its top.
  ctx.font = 'bold 11px sans-serif';
  const label = 'SOLMAR BAY';
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(12,14,20,0.72)';
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, lw + 16, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + 14, y + 20);
}

// Speed and car readout, sitting right above the minimap so the driver
// reads it at a glance. The car name gets its own line, the speed below it.
function drawSpeedPanel(state, ctx) {
  const car = state.playerCar;
  if (!car) return;
  const w = 200;
  const x = 18;
  const y = state.viewH - 152 - 18 - 62;
  panel(ctx, x, y, w, 54);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(car.spec.name, x + 12, y + 20);
  const kmh = Math.round(Math.abs(car.speed) * 0.36);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${kmh} km/h`, x + 12, y + 44);
  // Car health bar, right of the speed.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + 118, y + 34, 70, 8);
  ctx.fillStyle = car.health > 40 ? '#7fd08a' : '#ff5b5b';
  ctx.fillRect(x + 118, y + 34, 70 * (car.health / 100), 8);
}

function drawHud(state, ctx) {
  const W = state.viewW;
  const H = state.viewH;
  // Mission objective, top left.
  const mission = state.mission;
  panel(ctx, 18, 16, 420, 64);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const title = mission ? `${mission.def.name} — ${mission.def.giver}` : 'FREE ROAM';
  ctx.fillText(title, 30, 38);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(missionObjective(state).slice(0, 64), 30, 58);
  // Wanted stars, cash, health — top right.
  panel(ctx, W - 268, 16, 250, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < state.wanted ? '★' : '☆';
  ctx.fillStyle = state.wanted > 0 ? '#ff5b5b' : '#8a8f98';
  ctx.fillText(stars, W - 254, 40);
  ctx.fillStyle = '#7fd08a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`$${state.cash.toLocaleString('en-US')}`, W - 254, 64);
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(W - 132, 26, 100, 12);
  ctx.fillStyle = state.player.health > 50 ? '#7fd08a' : state.player.health > 25 ? '#e8b93a' : '#ff5b5b';
  ctx.fillRect(W - 132, 26, 100 * (state.player.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.fillText(`${Math.ceil(state.player.health)} HP`, W - 132, 54);
  // Weapon panel, bottom right — wide enough for the ammo line and the hint.
  if (!state.playerCar) {
    panel(ctx, W - 318, H - 66, 300, 48);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(state.player.reload > 0 ? 'RELOADING…' : `AMMO ${state.player.ammo} / ${state.player.mag}`, W - 304, H - 38);
    ctx.fillStyle = '#cfd6dd';
    ctx.font = '11px sans-serif';
    ctx.fillText('Click — shoot    R — reload', W - 304, H - 20);
  }
  // Controls hint, bottom centre, fading after the first seconds.
  if (state.time < 14) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (14 - state.time) / 3) * 0.85})`;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD move / drive   •   E enter car & use shops   •   Mouse aim, Click shoot   •   R reload   •   Esc pause', W / 2, H - 24);
  }
  // Centre message banner, sized to the measured text.
  if (state.messageT > 0) {
    ctx.fillStyle = `rgba(12,14,20,${Math.min(0.85, state.messageT)})`;
    const msg = state.message;
    ctx.font = 'bold 17px sans-serif';
    const w = ctx.measureText(msg).width + 44;
    ctx.fillRect(W / 2 - w / 2, 96, w, 40);
    ctx.fillStyle = '#ffd23a';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W / 2, 122);
    ctx.textAlign = 'left';
  }
  // Busted progress: a cop closing in shows the arrest bar.
  if (state.bustedTimer > 0 && state.screen === 'play') {
    ctx.fillStyle = 'rgba(12,14,20,0.8)';
    ctx.fillRect(W / 2 - 130, H - 120, 260, 26);
    ctx.fillStyle = '#ff5b5b';
    ctx.fillRect(W / 2 - 126, H - 116, 252 * (state.bustedTimer / 1.4), 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED — break away!', W / 2, H - 102);
    ctx.textAlign = 'left';
  }
  drawSpeedPanel(state, ctx);
  drawMinimap(state, ctx);
}

function bigTitle(ctx, W, text, y, size, color) {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(text, W / 2 + 3, y + 4);
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y);
  ctx.textAlign = 'left';
}

function drawTitle(state, ctx) {
  const W = state.viewW; const H = state.viewH;
  ctx.fillStyle = 'rgba(10,12,24,0.45)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, W, 'SOLMAR', 190, 96, '#ffd23a');
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('STREETS OF THE SUN', W / 2, 232);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#e8e2d2';
  ctx.fillText('An open-world crime story. Jax Marín drives for Madame Luz —', W / 2, 276);
  ctx.fillText('steal cars, outrun the Solmar PD, and take the city from the Vipers.', W / 2, 300);
  const save = loadSave();
  const lines = [
    'WASD — move / drive      E — enter car, use shops',
    'Mouse — aim      Click — shoot      R — reload',
    'Esc — pause      M — mute',
  ];
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#cfd6dd';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 360 + i * 26));
  panel(ctx, W / 2 - 210, 470, 420, 58, 0.85);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(save && save.missionIndex > 0 ? 'ENTER — CONTINUE' : 'ENTER — START THE STORY', W / 2, 507);
  if (save && save.missionIndex > 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cfd6dd';
    ctx.fillText(`Save: $${save.cash}  •  ${save.completed.length} mission${save.completed.length === 1 ? '' : 's'} done`, W / 2, 566);
  }
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('A work of fiction. Solmar Bay, its people and its cars are invented — no real city, gang or game is depicted.', W / 2, H - 30);
  ctx.textAlign = 'left';
}

function drawPaused(state, ctx) {
  const W = state.viewW; const H = state.viewH;
  ctx.fillStyle = 'rgba(10,12,24,0.6)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, W, 'PAUSED', 300, 64, '#fff');
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e2d2';
  ctx.fillText('Esc — resume      Enter — restart from the title', W / 2, 360);
  ctx.fillText(`Cash $${state.cash}  •  Missions done ${state.completed.length}/${MISSIONS.length}`, W / 2, 392);
  ctx.textAlign = 'left';
}

function drawBusted(state, ctx) {
  const W = state.viewW; const H = state.viewH;
  ctx.fillStyle = 'rgba(20,10,30,0.72)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, W, 'BUSTED', 300, 80, '#7db8ff');
  ctx.font = '17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e2d2';
  ctx.fillText(`The Solmar PD took you in. Fine: $${Math.min(state.cash, 250)} — the heat is gone, the story goes on.`, W / 2, 360);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ENTER — BACK ON THE STREETS', W / 2, 420);
  ctx.textAlign = 'left';
}

function drawWasted(state, ctx) {
  const W = state.viewW; const H = state.viewH;
  ctx.fillStyle = 'rgba(30,8,8,0.72)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, W, 'WASTED', 300, 80, '#ff5b5b');
  ctx.font = '17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e2d2';
  ctx.fillText('Solmar Bay is not done with you yet. The clinic patched you up — the story goes on.', W / 2, 360);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ENTER — BACK ON THE STREETS', W / 2, 420);
  ctx.textAlign = 'left';
}

function drawFinale(state, ctx) {
  const W = state.viewW; const H = state.viewH;
  ctx.fillStyle = 'rgba(10,12,24,0.55)';
  ctx.fillRect(0, 0, W, H);
  bigTitle(ctx, W, 'KING OF SOLMAR', 250, 72, '#ffd23a');
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Viper is finished. The Vipers are finished. The city is yours, Jax.', W / 2, 310);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#e8e2d2';
  ctx.fillText(`All ${MISSIONS.length} missions complete  •  $${state.cash.toLocaleString('en-US')} in the pocket  •  ${state.stats.carsStolen} cars stolen`, W / 2, 352);
  ctx.fillText('Thanks for playing SOLMAR — free roam continues, or start the story again.', W / 2, 384);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ENTER — FREE ROAM', W / 2, 450);
  ctx.textAlign = 'left';
}

export function drawScreen(state, ctx, screen) {
  if (screen === 'title') drawTitle(state, ctx);
  else if (screen === 'paused') drawPaused(state, ctx);
  else if (screen === 'busted') drawBusted(state, ctx);
  else if (screen === 'wasted') drawWasted(state, ctx);
  else if (screen === 'finale') drawFinale(state, ctx);
}

export { drawHud };

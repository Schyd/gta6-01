// The HUD, minimap and menus: money, health, wanted stars, weapon, objective,
// toasts, and the title / pause / busted / wasted / finale screens.
import { FONT, MISSION_DEFS, ROAD_X, ROAD_Y, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { missionObjective } from './missions.js';

const STAR = '★';

export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 800 };

  function resize(w, h) {
    view.w = w;
    view.h = h;
  }

  const fonts = new Map();
  function text(str, x, y, size, color, align = 'left', bold = false) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h, alpha = 0.55) {
    ctx.fillStyle = `rgba(12,14,22,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  }

  function drawStars(g) {
    const x = view.w - 24;
    const y = 44;
    for (let i = 0; i < 5; i += 1) {
      text(STAR, x - i * 34, y, 30, i < g.wanted ? '#ffcf3a' : 'rgba(255,255,255,0.22)', 'right', true);
    }
    if (g.wanted > 0) text('WANTED', x - 5 * 34 - 8, y, 15, '#ff5a4e', 'right', true);
  }

  function drawMinimap(g) {
    const mw = 190;
    const mh = Math.round(mw * (WORLD_H / WORLD_W));
    const x0 = view.w - mw - 16;
    const y0 = view.h - mh - 16;
    panel(x0 - 6, y0 - 6, mw + 12, mh + 12, 0.6);
    const sx = mw / WORLD_W;
    const sy = mh / WORLD_H;
    // Water.
    ctx.fillStyle = '#22708f';
    ctx.fillRect(x0, y0 + 2200 * sy, mw, (WORLD_H - 2200) * sy);
    ctx.fillRect(x0 + 3000 * sx, y0, (WORLD_W - 3000) * sx, mh);
    // Park.
    ctx.fillStyle = '#5f9e4d';
    ctx.fillRect(x0 + 1000 * sx, y0 + 1000 * sy, 400 * sx, 400 * sy);
    // Roads.
    ctx.strokeStyle = 'rgba(230,230,230,0.75)';
    ctx.lineWidth = 2;
    for (const rx of ROAD_X) {
      ctx.beginPath();
      ctx.moveTo(x0 + rx * sx, y0);
      ctx.lineTo(x0 + rx * sx, y0 + mh);
      ctx.stroke();
    }
    for (const ry of ROAD_Y) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + ry * sy);
      ctx.lineTo(x0 + mw, y0 + ry * sy);
      ctx.stroke();
    }
    // Mission marker.
    const m = g.missionMarker ? g.missionMarker() : null;
    if (m) {
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.arc(x0 + m.x * sx, y0 + m.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Police dots.
    ctx.fillStyle = '#5aa8ff';
    for (const c of g.cops) {
      ctx.beginPath();
      ctx.arc(x0 + c.x * sx, y0 + c.y * sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of g.patrols) {
      ctx.beginPath();
      ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow.
    const px = x0 + g.player.x * sx;
    const py = y0 + g.player.y * sy;
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(g.player.car ? g.player.car.angle : g.player.angle);
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Caption on its own pill inside the top of the minimap, so it never
    // collides with the speed panel sitting above the minimap.
    const capW = 96;
    panel(x0 + (mw - capW) / 2, y0 + 6, capW, 18, 0.65);
    text('SOLMAR BAY', x0 + mw / 2, y0 + 19, 11, 'rgba(255,255,255,0.85)', 'center', true);
  }

  function drawHud(g) {
    // Money + health, top-left.
    panel(16, 14, 210, 64);
    text(`$${g.money.toLocaleString('en-US')}`, 30, 42, 26, '#8be28b', 'left', true);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(30, 52, 182, 10);
    ctx.fillStyle = g.player.hp > 30 ? '#4fc3f7' : '#ff5a4e';
    ctx.fillRect(30, 52, Math.max(0, 182 * (g.player.hp / 100)), 10);
    // Wanted stars, top-right.
    drawStars(g);
    // Objective, top-centre.
    const obj = missionObjective(g);
    ctx.font = '700 15px system-ui, -apple-system, "Segoe UI", sans-serif';
    const ow = Math.min(560, ctx.measureText(obj).width + 40);
    panel((view.w - ow) / 2, 14, ow, 34);
    text(obj, view.w / 2, 37, 15, '#ffffff', 'center', true);
    // Weapon, bottom-left. Panel is wide enough for the switch/reload hint.
    const w = WEAPONS[g.player.weapon];
    panel(16, view.h - 66, 300, 50);
    text(w.name, 30, view.h - 42, 16, '#ffffff', 'left', true);
    const ammo = g.player.reloading ? 'RELOADING…' : `${g.player.ammo} / ${g.player.reserve}`;
    text(ammo, 30, view.h - 22, 15, g.player.reloading ? '#ffcf3a' : '#e8e8e8', 'left');
    text('[Q] switch  [R] reload', 150, view.h - 22, 12, 'rgba(255,255,255,0.55)', 'left');
    // Speed when driving — its own tall panel above the minimap, with a clear
    // gap to the minimap and the car name on a separate line above the speed
    // number, so the name, the number and the minimap never overlap.
    if (g.player.car) {
      const kmh = Math.round(Math.abs(g.player.car.speed) * 0.55);
      const mh = Math.round(190 * (WORLD_H / WORLD_W));
      const mapTop = view.h - mh - 16 - 6; // top edge of the minimap panel
      const sy = mapTop - 12 - 74; // 12px gap, 74px tall panel
      panel(view.w - 206, sy, 190, 74);
      text(g.player.car.name, view.w - 111, sy + 24, 13, 'rgba(255,255,255,0.85)', 'center', true);
      text(`${kmh}`, view.w - 96, sy + 64, 34, '#ffffff', 'center', true);
      text('km/h', view.w - 40, sy + 64, 13, 'rgba(255,255,255,0.6)', 'center');
    }
    // Minimap, bottom-right (above the speed panel when driving).
    drawMinimap(g);
    // Shop prompt.
    if (g.nearShop) {
      panel((view.w - 420) / 2, view.h - 130, 420, 34);
      text(`Press E — ${g.nearShop.name}: ${g.nearShop.desc}`, view.w / 2, view.h - 107, 15, '#ffd98a', 'center', true);
    }
    // Car prompt.
    if (g.nearCar && !g.player.car) {
      panel((view.w - 300) / 2, view.h - 130, 300, 34);
      text(`Press E — steal the ${g.nearCar.name}`, view.w / 2, view.h - 107, 15, '#ffd98a', 'center', true);
    }
    // Toasts — each panel is sized to its own message so long text never
    // spills past the panel edges.
    let ty = 66;
    for (const t of g.toasts) {
      const alpha = Math.min(1, t.life / 0.8);
      ctx.font = `700 15px ${FONT}`;
      const tw = Math.min(view.w - 32, ctx.measureText(t.message).width + 40);
      ctx.globalAlpha = alpha;
      panel((view.w - tw) / 2, ty, tw, 30, 0.55);
      text(t.message, view.w / 2, ty + 21, 15, t.color, 'center', true);
      ctx.globalAlpha = 1;
      ty += 38;
    }
    // Controls hint, first seconds of play.
    if (g.playTime < 9 && g.screen === 'playing') {
      text('WASD move / drive · E enter car & shops · Mouse aim · Click shoot · R reload · Esc pause', view.w / 2, view.h - 170, 14, 'rgba(255,255,255,0.8)', 'center');
    }
  }

  function drawMenuPanel(title, lines, prompt, accent = '#ffd98a') {
    panel((view.w - 640) / 2, (view.h - 380) / 2, 640, 380, 0.78);
    text(title, view.w / 2, (view.h - 380) / 2 + 84, 52, accent, 'center', true);
    let y = (view.h - 380) / 2 + 140;
    for (const line of lines) {
      text(line, view.w / 2, y, 18, '#e8e8e8', 'center');
      y += 30;
    }
    text(prompt, view.w / 2, (view.h - 380) / 2 + 340, 20, '#ffd98a', 'center', true);
  }

  function drawTitle(g) {
    // Big sun-soaked title over the city, then a control panel below it.
    text('SOLMAR', view.w / 2, view.h * 0.26, 92, '#ffd98a', 'center', true);
    text('STREETS OF THE SUN', view.w / 2, view.h * 0.26 + 52, 26, '#ffffff', 'center', true);
    text('An open-world crime story in Solmar Bay — steal cars, dodge the heat,', view.w / 2, view.h * 0.26 + 96, 17, 'rgba(255,255,255,0.9)', 'center');
    text('run six missions for Rico, and take the crown from the Voss Mansion.', view.w / 2, view.h * 0.26 + 120, 17, 'rgba(255,255,255,0.9)', 'center');
    const hasSave = !!g.saveData;
    const py = view.h * 0.52;
    panel((view.w - 640) / 2, py, 640, 190, 0.78);
    text('WASD move / drive · E enter cars & shops · Mouse aim · Click shoot', view.w / 2, py + 44, 17, '#e8e8e8', 'center');
    text('R reload · Q switch weapon · Esc pause · M mute', view.w / 2, py + 74, 17, '#e8e8e8', 'center');
    text(hasSave ? 'Press Enter — Continue your story' : 'Press Enter — Start a new story', view.w / 2, py + 124, 22, '#ffd98a', 'center', true);
    if (hasSave) text(`Save: $${hasSave.money} · Mission ${Math.min(hasSave.missionIndex + 1, 6)} of 6`, view.w / 2, py + 156, 15, 'rgba(255,255,255,0.7)', 'center');
  }

  function drawPaused() {
    drawMenuPanel('PAUSED', ['Take a breath. Solmar Bay waits for no one —', 'except right now.'], 'Press Esc to keep playing');
  }

  function drawBusted(g) {
    drawMenuPanel('BUSTED', [`The Solmar Bay PD caught you. You lost $${g.bustedLoss}.`, 'Your heat is cleared — lay low for a while.'], 'Press Enter to get back out there');
  }

  function drawWasted(g) {
    drawMenuPanel('WASTED', ['You went down in Solmar Bay.', `The clinic patched you up for $${g.wastedLoss}.`], 'Press Enter to get back out there');
  }

  function drawFinale(g) {
    // Dark panel behind the text so it reads over the roads and the mansion.
    panel((view.w - 760) / 2, view.h * 0.16, 760, 210, 0.62);
    text('KING OF SOLMAR', view.w / 2, view.h * 0.16 + 78, 72, '#ffd98a', 'center', true);
    text('The Voss Mansion is yours. The whole bay answers to you now.', view.w / 2, view.h * 0.16 + 122, 20, '#ffffff', 'center');
    text(`Final take: $${g.money.toLocaleString('en-US')} · All 6 missions complete`, view.w / 2, view.h * 0.16 + 158, 18, '#e8e8e8', 'center');
    text('Press Enter — free roam Solmar Bay', view.w / 2, view.h * 0.16 + 196, 20, '#ffd98a', 'center', true);
  }

  function draw(g) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (g.screen === 'title') drawTitle(g);
    else if (g.screen === 'playing') drawHud(g);
    else if (g.screen === 'paused') { drawHud(g); drawPaused(); }
    else if (g.screen === 'busted') drawBusted(g);
    else if (g.screen === 'wasted') drawWasted(g);
    else if (g.screen === 'finale') drawFinale(g);
  }

  return { draw, resize, text };
}

export { MISSION_DEFS };

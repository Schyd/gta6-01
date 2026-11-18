// render.js — drawing only: the game state and the current screen in,
// pixels out. Top-down golden-hour Solmar Bay: warm light, long shadows,
// a street grid, downtown towers, the park, the beach, the harbor and the
// mansion hill, then the HUD and the menus on top.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, AVENUES, STREETS, ROAD_HALF, DISTRICTS, POIS, PALETTE } from './config.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_SHOP = 'shop';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_FINALE = 'finale';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function text(ctx, value, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function roundPanel(ctx, x, y, w, h, alpha = 0.9) {
  ctx.fillStyle = `rgba(12, 14, 20, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function viewOffset(G) {
    const px = G.player.inCar ? G.player.inCar.x : G.player.x;
    const py = G.player.inCar ? G.player.inCar.y : G.player.y;
    return {
      x: Math.max(0, Math.min(WORLD_W - VIEW_W, px - VIEW_W / 2)),
      y: Math.max(0, Math.min(WORLD_H - VIEW_H, py - VIEW_H / 2)),
    };
  }

  function drawGround(G, ox, oy) {
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Sea along the south edge.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, WORLD_H - 40 - oy, VIEW_W, 40);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(0, WORLD_H - 18 - oy, VIEW_W, 18);
    // Beach sand.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, DISTRICTS.beach.y - oy, VIEW_W, DISTRICTS.beach.h);
    // Park.
    const park = DISTRICTS.park;
    ctx.fillStyle = PALETTE.parkGrass;
    ctx.fillRect(park.x - ox, park.y - oy, park.w, park.h);
    // Park pond.
    ctx.fillStyle = PALETTE.water;
    ctx.beginPath();
    ctx.ellipse(park.x + 380 - ox, park.y + 240 - oy, 70, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mansion hill.
    const hill = DISTRICTS.hill;
    ctx.fillStyle = PALETTE.hill;
    ctx.beginPath();
    ctx.ellipse(hill.x + 180 - ox, hill.y + 150 - oy, 190, 160, 0, 0, Math.PI * 2);
    ctx.fill();
    // Harbor basin.
    const har = DISTRICTS.harbor;
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(har.x + 180 - ox, har.y + 120 - oy, har.w - 180, har.h - 120);
    // Harbor docks.
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(har.x + 190 - ox, har.y + 130 - oy, 130, 14);
    ctx.fillRect(har.x + 190 - ox, har.y + 210 - oy, 130, 14);
    // Boats.
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(har.x + 210 - ox, har.y + 148 - oy, 44, 16);
    ctx.fillStyle = '#c0272d';
    ctx.fillRect(har.x + 260 - ox, har.y + 228 - oy, 52, 18);
  }

  function drawRoads(ox, oy) {
    // Sidewalks first (a pale border around each road).
    ctx.fillStyle = PALETTE.sidewalk;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_HALF - 12 - ox, -oy, (ROAD_HALF + 12) * 2, WORLD_H);
    for (const sy of STREETS) ctx.fillRect(-ox, sy - ROAD_HALF - 12 - oy, WORLD_W, (ROAD_HALF + 12) * 2);
    // Asphalt.
    ctx.fillStyle = PALETTE.road;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_HALF - ox, -oy, ROAD_HALF * 2, WORLD_H);
    for (const sy of STREETS) ctx.fillRect(-ox, sy - ROAD_HALF - oy, WORLD_W, ROAD_HALF * 2);
    // Centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const ax of AVENUES) {
      for (let y = 0; y < WORLD_H; y += 70) ctx.fillRect(ax - 2 - ox, y - oy, 4, 34);
    }
    for (const sy of STREETS) {
      for (let x = 0; x < WORLD_W; x += 70) ctx.fillRect(x - ox, sy - 2 - oy, 34, 4);
    }
  }

  function drawBuildings(G, ox, oy) {
    for (const b of G.city.buildings) {
      // Long golden-hour shadow to the east.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(b.x + 16 - ox, b.y + 20 - oy, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - ox, b.y - oy, b.w, b.h);
      ctx.strokeStyle = PALETTE.buildingEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - ox, b.y - oy, b.w, b.h);
      // Rooftop detail: a lighter inner rectangle and vents.
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(b.x + 8 - ox, b.y + 8 - oy, b.w - 16, b.h - 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w / 2 - 10 - ox, b.y + b.h / 2 - 8 - oy, 20, 16);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255, 230, 150, 0.5)';
        for (let wy = b.y + 18; wy < b.y + b.h - 12; wy += 22) {
          for (let wx = b.x + 14; wx < b.x + b.w - 12; wx += 26) {
            ctx.fillRect(wx - ox, wy - oy, 10, 8);
          }
        }
      }
    }
    // The mansion on the hill.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(POIS.mansion.x + 16 - ox, POIS.mansion.y + 20 - oy, 150, 90);
    ctx.fillStyle = '#d8b48a';
    ctx.fillRect(POIS.mansion.x - ox, POIS.mansion.y - oy, 150, 90);
    ctx.fillStyle = '#8f2a2a';
    ctx.fillRect(POIS.mansion.x - ox, POIS.mansion.y - oy, 150, 18);
    ctx.fillStyle = '#3a6a8f';
    ctx.fillRect(POIS.mansion.x + 60 - ox, POIS.mansion.y + 34 - oy, 30, 40);
    text(ctx, 'VILLA DEL SOL', POIS.mansion.x + 75 - ox, POIS.mansion.y + 108 - oy, 13, '#fff', 'center', 800);
    // Points of interest: garage and shops as signed blocks.
    drawPoi(ctx, POIS.garage.x, POIS.garage.y, 'RICO GARAGE', '#2a4a6a', ox, oy);
    drawPoi(ctx, POIS.gunShop.x, POIS.gunShop.y, 'GUN SHOP', '#4a2a2a', ox, oy);
    drawPoi(ctx, POIS.clinic.x, POIS.clinic.y, 'CLINIC', '#2a6a4a', ox, oy);
    drawPoi(ctx, POIS.sprayShop.x, POIS.sprayShop.y, 'SPRAY SHOP', '#6a4a2a', ox, oy);
  }

  function drawPoi(ctx, x, y, label, color, ox, oy) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 10 - ox, y + 12 - oy, 110, 70);
    ctx.fillStyle = color;
    ctx.fillRect(x - ox, y - oy, 110, 70);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - ox, y - oy, 110, 70);
    text(ctx, label, x + 55 - ox, y + 40 - oy, 12, '#fff', 'center', 800);
  }

  function drawNature(G, ox, oy) {
    for (const t of G.city.trees) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(t.x + 8 - ox, t.y + 10 - oy, t.r, t.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7a34';
      ctx.beginPath();
      ctx.arc(t.x - ox, t.y - oy, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#57a047';
      ctx.beginPath();
      ctx.arc(t.x - 3 - ox, t.y - 3 - oy, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of G.city.palms) {
      ctx.strokeStyle = '#7a5a34';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x - ox, p.y + 10 - oy);
      ctx.lineTo(p.x + 6 - ox, p.y - 8 - oy);
      ctx.stroke();
      ctx.fillStyle = '#4a9a3a';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(p.x + 6 + Math.cos(a) * 10 - ox, p.y - 8 + Math.sin(a) * 8 - oy, 12, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const l of G.city.lamps) {
      ctx.fillStyle = '#222';
      ctx.fillRect(l.x - 2 - ox, l.y - 2 - oy, 4, 4);
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(l.x - ox, l.y - oy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMarker(G, ox, oy) {
    const m = G.mission && G.mission.marker;
    if (!m) return;
    const bob = Math.sin(G.time * 4) * 6;
    const x = m.x - ox;
    const y = m.y - oy + bob;
    ctx.fillStyle = '#ffd94a';
    ctx.save();
    ctx.translate(x, y - 26);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 16 + Math.sin(G.time * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, m.label, x, y + 34, 13, '#ffd94a', 'center', 800);
  }

  function drawCrates(G, ox, oy) {
    for (const c of G.crates) {
      if (c.taken) continue;
      ctx.fillStyle = '#8a6a2a';
      ctx.fillRect(c.x - 12 - ox, c.y - 12 - oy, 24, 24);
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(c.x - 9 - ox, c.y - 9 - oy, 18, 18);
      ctx.strokeStyle = '#5a451a';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 9 - ox, c.y - 9 - oy, 18, 18);
      text(ctx, '$', c.x - ox, c.y + 5 - oy, 14, '#5a451a', 'center', 800);
    }
  }

  function drawCar(G, car, ox, oy) {
    const t = car.type;
    ctx.save();
    ctx.translate(car.x - ox, car.y - oy);
    ctx.rotate(car.angle);
    if (car.dead) {
      ctx.fillStyle = '#222';
    } else if (car.driver === 'police') {
      ctx.fillStyle = '#1a2a4a';
    } else {
      ctx.fillStyle = car.color || t.color;
    }
    ctx.beginPath();
    ctx.roundRect(-t.len / 2, -t.wid / 2, t.len, t.wid, 7);
    ctx.fill();
    // Cabin and windshield.
    ctx.fillStyle = car.dead ? '#111' : 'rgba(180, 220, 240, 0.9)';
    ctx.beginPath();
    ctx.roundRect(-t.len / 6, -t.wid / 2 + 4, t.len / 3, t.wid - 8, 4);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(t.len / 2 - 3, -t.wid / 2 + 3, 3, 5);
    ctx.fillRect(t.len / 2 - 3, t.wid / 2 - 8, 3, 5);
    // Wheels.
    ctx.fillStyle = '#111';
    ctx.fillRect(-t.len / 2 + 6, -t.wid / 2 - 3, 10, 5);
    ctx.fillRect(-t.len / 2 + 6, t.wid / 2 - 2, 10, 5);
    ctx.fillRect(t.len / 2 - 16, -t.wid / 2 - 3, 10, 5);
    ctx.fillRect(t.len / 2 - 16, t.wid / 2 - 2, 10, 5);
    ctx.restore();
    // Police light bar, flashing red/blue.
    if (car.driver === 'police' && !car.dead) {
      const phase = Math.floor(car.sirenPhase) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2222' : '#2266ff';
      ctx.beginPath();
      ctx.arc(car.x - ox, car.y - oy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase ? '#2266ff' : '#ff2222';
      ctx.beginPath();
      ctx.arc(car.x - ox, car.y - oy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase ? 'rgba(255,34,34,0.18)' : 'rgba(34,102,255,0.18)';
      ctx.beginPath();
      ctx.arc(car.x - ox, car.y - oy, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    // Damage smoke.
    if (car.hp < 50 && !car.dead) {
      ctx.fillStyle = 'rgba(80,80,80,0.5)';
      ctx.beginPath();
      ctx.arc(car.x - ox + (G.rng() - 0.5) * 10, car.y - oy - 14, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPerson(ctx, x, y, angle, color, ox, oy, gun) {
    ctx.save();
    ctx.translate(x - ox, y - oy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(3, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (gun) {
      ctx.fillStyle = '#333';
      ctx.fillRect(8, -2, 14, 4);
    }
    ctx.restore();
  }

  function drawWorld(G) {
    const { x: ox, y: oy } = viewOffset(G);
    drawGround(G, ox, oy);
    drawRoads(ox, oy);
    drawNature(G, ox, oy);
    drawBuildings(G, ox, oy);
    drawCrates(G, ox, oy);
    drawMarker(G, ox, oy);
    for (const car of G.cars) drawCar(G, car, ox, oy);
    for (const p of G.peds) {
      drawPerson(ctx, p.x, p.y, p.angle, p.color, ox, oy, false);
    }
    for (const e of G.enemies) {
      drawPerson(ctx, e.x, e.y, e.angle, '#c0272d', ox, oy, true);
      text(ctx, 'VIPER', e.x - ox, e.y - 20 - oy, 10, '#ff8888', 'center', 800);
    }
    for (const cop of G.footCops) {
      drawPerson(ctx, cop.x, cop.y, cop.angle, '#1a2a4a', ox, oy, G.wanted >= 3);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(cop.x - ox, cop.y - 8 - oy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: on foot a figure, in a car the car itself (already drawn).
    const p = G.player;
    if (!p.inCar) {
      const blink = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;
      if (!blink) {
        drawPerson(ctx, p.x, p.y, p.angle, '#2d9a4a', ox, oy, true);
        ctx.fillStyle = '#ffd94a';
        ctx.beginPath();
        ctx.arc(p.x - ox, p.y - 12 - oy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Bullets.
    ctx.strokeStyle = '#ffe94a';
    ctx.lineWidth = 3;
    for (const b of G.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - ox - b.vx * 0.012, b.y - oy - b.vy * 0.012);
      ctx.lineTo(b.x - ox, b.y - oy);
      ctx.stroke();
    }
    // Particles.
    for (const pt of G.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - ox, pt.y - oy, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Fireworks for the finale.
    for (const f of G.fireworks) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x - ox, f.y - oy, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Golden-hour wash: warm light from the west, long shadows already drawn.
    const grad = ctx.createLinearGradient(0, 0, VIEW_W, 0);
    grad.addColorStop(0, 'rgba(255, 170, 60, 0.10)');
    grad.addColorStop(0.6, 'rgba(255, 170, 60, 0.03)');
    grad.addColorStop(1, 'rgba(60, 80, 160, 0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Vignette.
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawCrosshair(G, mouse) {
    if (G.screen !== SCREEN_PLAY) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouse.x - 14, mouse.y);
    ctx.lineTo(mouse.x - 5, mouse.y);
    ctx.moveTo(mouse.x + 5, mouse.y);
    ctx.lineTo(mouse.x + 14, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 14);
    ctx.lineTo(mouse.x, mouse.y - 5);
    ctx.moveTo(mouse.x, mouse.y + 5);
    ctx.lineTo(mouse.x, mouse.y + 14);
    ctx.stroke();
  }

  function drawTitle(G) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'SOLMAR', VIEW_W / 2, 220, 92, '#ffd94a', 'center', 900);
    text(ctx, 'STREETS OF THE SUN', VIEW_W / 2, 268, 30, '#ffffff', 'center', 700);
    text(ctx, 'An open-world crime story in Solmar Bay — steal cars, outrun the law,', VIEW_W / 2, 330, 19, '#ffffff', 'center', 500);
    text(ctx, 'run six missions and become the King of Solmar.', VIEW_W / 2, 356, 19, '#ffffff', 'center', 500);
    roundPanel(ctx, VIEW_W / 2 - 330, 400, 660, 150, 0.85);
    text(ctx, 'WASD  move / drive      E  enter car & shops', VIEW_W / 2, 436, 18, '#ffffff', 'center', 600);
    text(ctx, 'Mouse  aim      Click  shoot      Q  weapon      R  reload', VIEW_W / 2, 468, 18, '#ffffff', 'center', 600);
    text(ctx, 'Esc  pause      Enter  start', VIEW_W / 2, 500, 18, '#ffffff', 'center', 600);
    text(ctx, 'Press Enter to start', VIEW_W / 2, 610, 26, '#ffd94a', 'center', 800);
    if (G.saveNotice) text(ctx, G.saveNotice, VIEW_W / 2, 650, 16, '#7dff8a', 'center', 600);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    roundPanel(ctx, VIEW_W / 2 - 260, VIEW_H / 2 - 110, 520, 220, 0.92);
    text(ctx, 'PAUSED', VIEW_W / 2, VIEW_H / 2 - 46, 44, '#ffffff', 'center', 900);
    text(ctx, 'The city waits for you.', VIEW_W / 2, VIEW_H / 2, 18, '#ffffffaa', 'center', 500);
    text(ctx, 'Esc / Enter to resume', VIEW_W / 2, VIEW_H / 2 + 52, 18, '#ffd94a', 'center', 700);
  }

  function drawShop(G) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const kind = G.shopKind;
    const title = kind === 'gun' ? 'IRONWORKS GUN SHOP' : kind === 'clinic' ? 'SUNRISE CLINIC' : 'FRESH COAT SPRAY SHOP';
    roundPanel(ctx, VIEW_W / 2 - 300, VIEW_H / 2 - 170, 600, 340, 0.95);
    text(ctx, title, VIEW_W / 2, VIEW_H / 2 - 120, 30, '#ffd94a', 'center', 900);
    text(ctx, `Your money: $${G.player.money}`, VIEW_W / 2, VIEW_H / 2 - 84, 18, '#7dff8a', 'center', 700);
    if (kind === 'gun') {
      text(ctx, '[1] SMG — $350 (ammo $90)', VIEW_W / 2, VIEW_H / 2 - 40, 19, '#fff', 'center', 600);
      text(ctx, '[2] Rifle — $900 (ammo $120)', VIEW_W / 2, VIEW_H / 2 - 8, 19, '#fff', 'center', 600);
      text(ctx, '[3] Pistol ammo — $40', VIEW_W / 2, VIEW_H / 2 + 24, 19, '#fff', 'center', 600);
      text(ctx, '[4] SMG ammo — $90', VIEW_W / 2, VIEW_H / 2 + 56, 19, '#fff', 'center', 600);
      text(ctx, '[5] Rifle ammo — $120', VIEW_W / 2, VIEW_H / 2 + 88, 19, '#fff', 'center', 600);
    } else if (kind === 'clinic') {
      text(ctx, '[1] Full heal — $150', VIEW_W / 2, VIEW_H / 2 - 40, 19, '#fff', 'center', 600);
    } else {
      text(ctx, '[1] New paint job — $300', VIEW_W / 2, VIEW_H / 2 - 40, 19, '#fff', 'center', 600);
      text(ctx, 'Clears your wanted level completely.', VIEW_W / 2, VIEW_H / 2 - 8, 16, '#ffffffaa', 'center', 500);
    }
    text(ctx, 'Press the number to buy, E or Esc to leave', VIEW_W / 2, VIEW_H / 2 + 136, 16, '#ffd94a', 'center', 600);
  }

  function drawBusted(G) {
    ctx.fillStyle = 'rgba(10, 12, 30, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'BUSTED', VIEW_W / 2, 330, 84, '#3b82f6', 'center', 900);
    text(ctx, 'The Solmar Bay police took you in.', VIEW_W / 2, 390, 20, '#fff', 'center', 500);
    text(ctx, `Missions done: ${G.stats.missionsDone}   •   Money kept: $${G.player.money}`, VIEW_W / 2, 430, 18, '#ffffffaa', 'center', 600);
    text(ctx, 'Press Enter to get out and keep playing', VIEW_W / 2, 500, 22, '#ffd94a', 'center', 700);
  }

  function drawWasted(G) {
    ctx.fillStyle = 'rgba(30, 8, 8, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'WASTED', VIEW_W / 2, 330, 84, '#ef4444', 'center', 900);
    text(ctx, 'Solmar Bay is not done with you yet.', VIEW_W / 2, 390, 20, '#fff', 'center', 500);
    text(ctx, `Missions done: ${G.stats.missionsDone}   •   Money kept: $${G.player.money}`, VIEW_W / 2, 430, 18, '#ffffffaa', 'center', 600);
    text(ctx, 'Press Enter to get back on your feet', VIEW_W / 2, 500, 22, '#ffd94a', 'center', 700);
  }

  function drawFinale(G) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'KING OF SOLMAR', VIEW_W / 2, 300, 72, '#ffd94a', 'center', 900);
    text(ctx, 'Villa Del Sol is yours. The city is yours.', VIEW_W / 2, 356, 22, '#ffffff', 'center', 600);
    text(ctx, `Missions completed: 6 / 6      Money earned: $${G.stats.moneyEarned.toLocaleString('en-US')}`, VIEW_W / 2, 420, 19, '#ffffff', 'center', 600);
    text(ctx, `Cars stolen: ${G.stats.carsStolen}      Takedowns: ${G.stats.kills}`, VIEW_W / 2, 452, 19, '#ffffff', 'center', 600);
    text(ctx, 'Press Enter to keep cruising Solmar Bay', VIEW_W / 2, 530, 22, '#ffd94a', 'center', 700);
  }

  function draw(G, mouse) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawWorld(G);
    if (G.screen === SCREEN_PLAY || G.screen === SCREEN_PAUSED || G.screen === SCREEN_SHOP) {
      drawHud(ctx, G);
      drawCrosshair(G, mouse);
    }
    if (G.screen === SCREEN_TITLE) drawTitle(G);
    else if (G.screen === SCREEN_PAUSED) drawPaused();
    else if (G.screen === SCREEN_SHOP) drawShop(G);
    else if (G.screen === SCREEN_BUSTED) drawBusted(G);
    else if (G.screen === SCREEN_WASTED) drawWasted(G);
    else if (G.screen === SCREEN_FINALE) drawFinale(G);
    // Interaction hint when near a car or a shop.
    if (G.screen === SCREEN_PLAY && G.nearHint) {
      ctx.font = '600 15px ' + FONT;
      const w = ctx.measureText(G.nearHint).width + 30;
      const x = (VIEW_W - w) / 2;
      const y = VIEW_H - 110;
      ctx.fillStyle = 'rgba(12, 14, 20, 0.88)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, 32, 16);
      ctx.fill();
      text(ctx, G.nearHint, VIEW_W / 2, y + 21, 15, '#ffffff', 'center', 600);
    }
  }

  return { draw, viewOffset };
}

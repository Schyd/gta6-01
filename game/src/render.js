// Drawing only: the city, its people and cars, golden-hour light and particles.
// The camera follows the player; the world is drawn in world units through one
// transform, and anything off screen is skipped.
import { FONT, PAL, ROAD_HALF, ROAD_X, ROAD_Y, WORLD_H, WORLD_W } from './config.js';
import { clamp } from './random.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 800, zoom: 0.85, dpr: 1 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    view.dpr = dpr;
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
    canvas.style.width = `${view.w}px`;
    canvas.style.height = `${view.h}px`;
  }

  const fonts = new Map();
  function font(size, bold) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(str, x, y, size, color, align = 'left', bold = false) {
    ctx.font = font(size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function toScreen(g, x, y) {
    return {
      x: (x - g.camera.x) * view.zoom + view.w / 2,
      y: (y - g.camera.y) * view.zoom + view.h / 2,
    };
  }

  function visible(g, x, y, margin) {
    const s = toScreen(g, x, y);
    return s.x > -margin && s.x < view.w + margin && s.y > -margin && s.y < view.h + margin;
  }

  function rect(g, x, y, w, h, color) {
    const s = toScreen(g, x, y);
    ctx.fillStyle = color;
    ctx.fillRect(s.x, s.y, w * view.zoom, h * view.zoom);
  }

  function circle(g, x, y, r, color) {
    const s = toScreen(g, x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(1, r * view.zoom), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround(g) {
    // Base grass.
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(0, 0, view.w, view.h);
    const city = g.city;
    // Beach sand and sea along the south edge.
    rect(g, 0, city.beachY, WORLD_W, WORLD_H - city.beachY, PAL.sand);
    rect(g, 0, 2320, WORLD_W, WORLD_H - 2320, PAL.sea);
    // Harbor water on the east edge.
    rect(g, city.harborX, 0, WORLD_W - city.harborX, WORLD_H, PAL.sand);
    rect(g, 3120, 0, WORLD_W - 3120, WORLD_H, PAL.seaDeep);
    // Sea shimmer lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let y = 2340; y < WORLD_H; y += 26) {
      const a = toScreen(g, 0, y);
      const b = toScreen(g, WORLD_W, y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // Coral Park.
    rect(g, city.park.x0, city.park.y0, city.park.x1 - city.park.x0, city.park.y1 - city.park.y0, PAL.park);
    // Park pond.
    circle(g, 1200, 1200, 55, '#3f9ec2');
    // Park paths (cross).
    rect(g, 1185, 1000, 30, 400, PAL.parkPath);
    rect(g, 1000, 1185, 400, 30, PAL.parkPath);
    // Mansion grounds.
    rect(g, 200, 200, 400, 400, '#a8c47a');
    // Mansion house.
    rect(g, 320, 300, 170, 120, PAL.mansion);
    rect(g, 300, 285, 210, 22, '#8a5a3b');
    text('VOSS', 405, 370, 16, '#6a5a3a', 'center', true);
    // Sidewalks around every road (world space, so they stop at the beach/harbor).
    for (const rx of ROAD_X) rect(g, rx - ROAD_HALF - 12, 0, (ROAD_HALF + 12) * 2, 2200, PAL.sidewalk);
    for (const ry of ROAD_Y) rect(g, 0, ry - ROAD_HALF - 12, 3000, (ROAD_HALF + 12) * 2, PAL.sidewalk);
    // Roads.
    for (const rx of ROAD_X) rect(g, rx - ROAD_HALF, 0, ROAD_HALF * 2, 2200, PAL.road);
    for (const ry of ROAD_Y) rect(g, 0, ry - ROAD_HALF, 3000, ROAD_HALF * 2, PAL.road);
    // Lane dashes.
    ctx.fillStyle = PAL.lane;
    for (const rx of ROAD_X) {
      for (let y = 0; y < WORLD_H; y += 90) {
        if (!visible(g, rx, y, 60)) continue;
        const s = toScreen(g, rx, y);
        ctx.fillRect(s.x - 2, s.y, 4, 34 * view.zoom);
      }
    }
    for (const ry of ROAD_Y) {
      for (let x = 0; x < WORLD_W; x += 90) {
        if (!visible(g, x, ry, 60)) continue;
        const s = toScreen(g, x, ry);
        ctx.fillRect(s.x, s.y - 2, 34 * view.zoom, 4);
      }
    }
  }

  function drawBuildings(g) {
    for (const b of g.city.buildings) {
      if (!visible(g, b.x + b.w / 2, b.y + b.h / 2, 300)) continue;
      // Long golden-hour shadow to the east.
      ctx.fillStyle = 'rgba(60,30,10,0.18)';
      const sh = toScreen(g, b.x + 14, b.y + 14);
      ctx.fillRect(sh.x, sh.y, b.w * view.zoom, b.h * view.zoom);
      // Body.
      rect(g, b.x, b.y, b.w, b.h, b.color);
      // Roof inset.
      rect(g, b.x + 6, b.y + 6, b.w - 12, b.h - 12, b.roof);
      if (b.tall) {
        // Fake height: a second, offset roof face.
        rect(g, b.x + 18, b.y - 16, b.w - 12, 18, b.color);
        rect(g, b.x + 18, b.y - 16, b.w - 12, 6, b.roof);
      }
      // Windows: warm lit ones facing the sun.
      const cols = Math.max(2, Math.floor(b.w / 34));
      const rows = Math.max(1, Math.floor(b.h / 34));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const wx = b.x + 14 + cx * ((b.w - 28) / Math.max(1, cols - 1));
          const wy = b.y + 14 + cy * ((b.h - 28) / Math.max(1, rows - 1));
          const lit = (cx * 7 + cy * 3 + (b.x | 0)) % 3 === 0;
          rect(g, wx, wy, 12, 14, lit ? PAL.windowLit : PAL.windowDark);
        }
      }
    }
    // Shops: labelled awnings.
    for (const s of g.city.shops) {
      if (!visible(g, s.x, s.y, 200)) continue;
      rect(g, s.x - 60, s.y - 40, 120, 80, s.kind === 'garage' ? PAL.garage : '#d9c9a8');
      rect(g, s.x - 60, s.y - 52, 120, 14, '#c22a2a');
      const label = toScreen(g, s.x, s.y - 8);
      text(s.name, label.x, label.y, 13, '#20242e', 'center', true);
    }
  }

  function drawTrees(g) {
    for (const t of g.city.trees) {
      if (!visible(g, t.x, t.y, 60)) continue;
      circle(g, t.x + 3, t.y + 4, t.r, 'rgba(60,30,10,0.20)');
      circle(g, t.x, t.y, t.r, PAL.tree);
      circle(g, t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.55, PAL.treeLight);
    }
    for (const p of g.city.palms) {
      if (!visible(g, p.x, p.y, 60)) continue;
      const s = toScreen(g, p.x, p.y);
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 3 * view.zoom;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + 4 * view.zoom, s.y - 16 * view.zoom);
      ctx.stroke();
      circle(g, p.x + 4, p.y - 18, 11, PAL.palm);
    }
    for (const l of g.city.lamps) {
      if (!visible(g, l.x, l.y, 40)) continue;
      circle(g, l.x, l.y, 4, '#3a3a42');
      circle(g, l.x, l.y, 8, 'rgba(255,220,130,0.35)');
    }
  }

  function drawCarShape(g, car) {
    const s = toScreen(g, car.x, car.y);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(car.angle);
    const z = view.zoom;
    const len = car.len * z;
    const wid = car.wid * z;
    // Shadow.
    ctx.fillStyle = 'rgba(60,30,10,0.25)';
    ctx.fillRect(-len / 2 + 4, -wid / 2 + 5, len, wid);
    // Wheels.
    ctx.fillStyle = '#16181d';
    ctx.fillRect(-len * 0.32, -wid / 2 - 2, len * 0.16, 5);
    ctx.fillRect(len * 0.16, -wid / 2 - 2, len * 0.16, 5);
    ctx.fillRect(-len * 0.32, wid / 2 - 3, len * 0.16, 5);
    ctx.fillRect(len * 0.16, wid / 2 - 3, len * 0.16, 5);
    // Body.
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 6 * z);
    ctx.fill();
    // Cabin and windshield.
    ctx.fillStyle = 'rgba(20,28,40,0.85)';
    ctx.beginPath();
    ctx.roundRect(-len * 0.12, -wid * 0.36, len * 0.34, wid * 0.72, 4 * z);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    ctx.fillRect(len * 0.22, -wid * 0.36, len * 0.06, wid * 0.72);
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 3, 5);
    ctx.fillRect(len / 2 - 3, wid / 2 - 8, 3, 5);
    if (car.type === 'taxi') {
      ctx.fillStyle = '#20242e';
      for (let i = 0; i < 5; i += 1) ctx.fillRect(-len * 0.3 + i * len * 0.12, -wid / 2 + 2, len * 0.06, 4);
    }
    if (car.police) {
      const phase = Math.floor(car.flash * 4) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2a2a' : '#2a6bff';
      ctx.beginPath();
      ctx.arc(-len * 0.05, -wid * 0.2, 5 * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase ? '#2a6bff' : '#ff2a2a';
      ctx.beginPath();
      ctx.arc(-len * 0.05, wid * 0.2, 5 * z, 0, Math.PI * 2);
      ctx.fill();
      // Light glow.
      ctx.fillStyle = phase ? 'rgba(255,42,42,0.20)' : 'rgba(42,107,255,0.20)';
      ctx.beginPath();
      ctx.arc(0, 0, 46 * z, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(g, x, y, angle, color, gun) {
    if (!visible(g, x, y, 40)) return;
    const s = toScreen(g, x, y);
    const z = view.zoom;
    ctx.fillStyle = 'rgba(60,30,10,0.25)';
    ctx.beginPath();
    ctx.ellipse(s.x + 2, s.y + 3, 9 * z, 6 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(s.x, s.y - 2 * z, 5 * z, 0, Math.PI * 2);
    ctx.fill();
    if (gun) {
      ctx.strokeStyle = '#20242e';
      ctx.lineWidth = 3 * z;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(angle) * 18 * z, s.y + Math.sin(angle) * 18 * z);
      ctx.stroke();
    }
  }

  function drawMissionMarker(g) {
    const m = g.missionMarker ? g.missionMarker() : null;
    if (!m) return;
    const s = toScreen(g, m.x, m.y);
    const pulse = 1 + Math.sin(g.time * 4) * 0.12;
    // Light beam.
    ctx.fillStyle = 'rgba(255,217,138,0.25)';
    ctx.fillRect(s.x - 3, s.y - 160 * view.zoom, 6, 160 * view.zoom);
    // Floating diamond.
    ctx.save();
    ctx.translate(s.x, s.y - 44 * view.zoom * pulse);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd98a';
    ctx.strokeStyle = '#8a5a00';
    ctx.lineWidth = 2;
    const r = 12 * view.zoom * pulse;
    ctx.fillRect(-r / 2, -r / 2, r, r);
    ctx.strokeRect(-r / 2, -r / 2, r, r);
    ctx.restore();
    text(m.label, s.x, s.y - 62 * view.zoom, 14, '#ffd98a', 'center', true);
  }

  function drawBullets(g) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    for (const b of g.bullets) {
      const a = toScreen(g, b.x, b.y);
      const c = toScreen(g, b.x - Math.cos(b.angle) * 22, b.y - Math.sin(b.angle) * 22);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
  }

  function drawParticles(g) {
    for (const p of g.particles) {
      const a = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color.replace('A', String(a.toFixed(2)));
      circle(g, p.x, p.y, p.r, p.color.replace('A', String(a.toFixed(2))));
    }
  }

  function drawFireworks(g) {
    for (const fw of g.fireworks) {
      const age = (g.time - fw.t) % 2.4;
      if (age < 0 || age > 1.2) continue;
      const s = toScreen(g, fw.x, fw.y);
      const cols = ['#ff5a4e', '#ffd98a', '#4fc3f7', '#8be28b', '#c25aa8'];
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2;
        const r = age * 110;
        ctx.fillStyle = cols[(fw.hue + i) % cols.length];
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGoldenLight(g) {
    // Warm wash from the top-left sun, plus a vignette.
    const grad = ctx.createLinearGradient(0, 0, view.w * 0.7, view.h);
    grad.addColorStop(0, 'rgba(255,190,90,0.10)');
    grad.addColorStop(0.6, 'rgba(255,170,80,0.03)');
    grad.addColorStop(1, 'rgba(40,20,60,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, view.w, view.h);
    const vg = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.42, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,10,30,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function drawWorld(g) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#1b1f2a';
    ctx.fillRect(0, 0, view.w, view.h);
    drawGround(g);
    drawBuildings(g);
    drawTrees(g);
    // Crates.
    for (const c of g.crates) {
      if (c.taken || !visible(g, c.x, c.y, 60)) continue;
      rect(g, c.x - 14, c.y - 14, 28, 28, '#a8763e');
      rect(g, c.x - 14, c.y - 3, 28, 6, '#7a5a2a');
      rect(g, c.x - 3, c.y - 14, 6, 28, '#7a5a2a');
    }
    drawMissionMarker(g);
    // Cars (traffic and parked alike).
    for (const car of g.cars) {
      if (visible(g, car.x, car.y, 80)) drawCarShape(g, car);
    }
    // Pedestrians.
    for (const p of g.peds) {
      if (p.dead) continue;
      drawPerson(g, p.x, p.y, p.angle, p.color, false);
    }
    // Gang members and cops.
    for (const e of g.enemies) drawPerson(g, e.x, e.y, e.angle, '#c22a2a', true);
    for (const c of g.cops) drawPerson(g, c.x, c.y, c.angle, '#20303e', true);
    // Player.
    const pl = g.player;
    if (!pl.car) {
      drawPerson(g, pl.x, pl.y, pl.aimAngle, '#2a7a3a', true);
      // Aim line.
      const s = toScreen(g, pl.x, pl.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(pl.aimAngle) * 34 * view.zoom, s.y + Math.sin(pl.aimAngle) * 34 * view.zoom);
      ctx.stroke();
    }
    drawBullets(g);
    drawParticles(g);
    if (g.screen === 'finale') drawFireworks(g);
    drawGoldenLight(g);
  }

  return { drawWorld, resize, view, text, font, toScreen };
}

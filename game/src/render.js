// The renderer: paints the city, the cars, the people and the effects on one
// canvas, top-down, in a warm golden-hour grade. Everything is drawn with
// plain canvas shapes — no image assets — so the game loads offline.
import { H_ROADS, PALETTE, ROAD_W, V_ROADS, WORLD_H, WORLD_W } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function visible(state) {
    const cam = state.camera;
    const hw = state.viewW / 2 / cam.zoom;
    const hh = state.viewH / 2 / cam.zoom;
    return { x0: cam.x - hw - 60, x1: cam.x + hw + 60, y0: cam.y - hh - 60, y1: cam.y + hh + 60 };
  }

  function drawCity(state) {
    const v = visible(state);
    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // Beach and water along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(Math.max(v.x0, 0), WORLD_H - 210, Math.min(v.x1, WORLD_W) - Math.max(v.x0, 0), 210);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(Math.max(v.x0, 0), WORLD_H - 90, Math.min(v.x1, WORLD_W) - Math.max(v.x0, 0), 90);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let x = 0; x < WORLD_W; x += 140) {
      const y = WORLD_H - 70 + Math.sin(state.time * 1.4 + x * 0.01) * 6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y); ctx.stroke();
    }
    // Parks.
    for (const p of state.city.parks) {
      if (p.x + p.w / 2 < v.x0 || p.x - p.w / 2 > v.x1 || p.y + p.h / 2 < v.y0 || p.y - p.h / 2 > v.y1) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    }
    // Sidewalks.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2 - 10, Math.max(v.y0, 0), ROAD_W + 20, Math.min(v.y1, WORLD_H) - Math.max(v.y0, 0));
    for (const ry of H_ROADS) ctx.fillRect(Math.max(v.x0, 0), ry - ROAD_W / 2 - 10, Math.min(v.x1, WORLD_W) - Math.max(v.x0, 0), ROAD_W + 20);
    // Asphalt.
    ctx.fillStyle = PALETTE.asphalt;
    for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2, Math.max(v.y0, 0), ROAD_W, Math.min(v.y1, WORLD_H) - Math.max(v.y0, 0));
    for (const ry of H_ROADS) ctx.fillRect(Math.max(v.x0, 0), ry - ROAD_W / 2, Math.min(v.x1, WORLD_W) - Math.max(v.x0, 0), ROAD_W);
    // Lane dashes and crosswalks.
    ctx.fillStyle = PALETTE.asphaltLine;
    for (const rx of V_ROADS) {
      for (let y = 60; y < WORLD_H; y += 56) {
        if (y < v.y0 - 30 || y > v.y1 + 30) continue;
        if (H_ROADS.some((ry) => Math.abs(y - ry) < 56)) continue;
        ctx.fillRect(rx - 2, y, 4, 26);
      }
    }
    for (const ry of H_ROADS) {
      for (let x = 60; x < WORLD_W; x += 56) {
        if (x < v.x0 - 30 || x > v.x1 + 30) continue;
        if (V_ROADS.some((rx) => Math.abs(x - rx) < 56)) continue;
        ctx.fillRect(x, ry - 2, 26, 4);
      }
    }
    ctx.fillStyle = PALETTE.crosswalk;
    for (const rx of V_ROADS) {
      for (const ry of H_ROADS) {
        if (rx < v.x0 - 60 || rx > v.x1 + 60 || ry < v.y0 - 60 || ry > v.y1 + 60) continue;
        for (let i = -2; i <= 2; i++) {
          ctx.fillRect(rx + i * 12 - 4, ry - ROAD_W / 2 + 4, 8, 12);
          ctx.fillRect(rx + i * 12 - 4, ry + ROAD_W / 2 - 16, 8, 12);
        }
      }
    }
    // Buildings: drop shadow, roof, edge, rooftop details.
    for (const b of state.city.buildings) {
      if (b.x + b.w / 2 < v.x0 || b.x - b.w / 2 > v.x1 || b.y + b.h / 2 < v.y0 || b.y - b.h / 2 > v.y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x - b.w / 2 + 7, b.y - b.h / 2 + 9, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      ctx.strokeStyle = PALETTE.roofEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - b.w / 2 + 8, b.y - b.h / 2 + 8, b.w - 16, b.h - 16);
      // Rooftop boxes placed by the building's own seed.
      const s = b.roofSeed * 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(b.x - b.w / 4 + ((s % 30) - 15), b.y - b.h / 4, 18, 14);
      ctx.fillRect(b.x + b.w / 5, b.y + b.h / 5, 14, 14);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(b.x - 4, b.y - b.h / 2 + 6, 8, 8);
      }
    }
    // Trees and palms.
    for (const t of state.city.trees) {
      if (t.x < v.x0 || t.x > v.x1 || t.y < v.y0 || t.y > v.y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.arc(t.x + 4, t.y + 5, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.palm ? PALETTE.treeLight : PALETTE.tree;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    // Shops and the safehouse.
    for (const shop of state.city.shops) {
      drawSign(shop.x, shop.y, shop.kind === 'gun' ? '#c23b3b' : shop.kind === 'clinic' ? '#e8e2d2' : '#3f6d4e', shop.kind === 'gun' ? '$' : shop.kind === 'clinic' ? '+' : 'S');
    }
    drawSign(state.city.safehouse.x, state.city.safehouse.y, '#2e4a6b', 'H');
  }

  function drawSign(x, y, color, letter) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(x + 3, y + 4, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x, y + 1);
  }

  function drawMarker(state) {
    const m = state.mission && state.mission.marker;
    if (!m) return;
    const pulse = 1 + Math.sin(state.time * 5) * 0.15;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 3;
    const s = 15 * pulse;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,210,58,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(m.x, m.y, 26 + Math.sin(state.time * 5) * 5, 0, Math.PI * 2); ctx.stroke();
    // A light beam so the target reads from far away.
    const grad = ctx.createLinearGradient(m.x, m.y - 220, m.x, m.y);
    grad.addColorStop(0, 'rgba(255,210,58,0)');
    grad.addColorStop(1, 'rgba(255,210,58,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(m.x - 7, m.y - 220, 14, 220);
  }

  function drawCar(state, car) {
    const spec = car.spec;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-spec.w / 2 + 4, -spec.h / 2 + 5, spec.w, spec.h);
    // Body.
    ctx.fillStyle = car.health < 35 ? '#3a3a3a' : car.color;
    roundRect(-spec.w / 2, -spec.h / 2, spec.w, spec.h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Windshield and rear window.
    ctx.fillStyle = 'rgba(20,30,45,0.85)';
    roundRect(spec.w / 2 - 16, -spec.h / 2 + 4, 9, spec.h - 8, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,0.6)';
    roundRect(-spec.w / 2 + 5, -spec.h / 2 + 4, 8, spec.h - 8, 3);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(spec.w / 2 - 2, -spec.h / 2 + 3, 3, 5);
    ctx.fillRect(spec.w / 2 - 2, spec.h / 2 - 8, 3, 5);
    if (car.type === 'taxi') {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    if (car.isCop) {
      const phase = Math.floor(state.time * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2d2d' : '#2d7dff';
      ctx.beginPath(); ctx.arc(-4, -spec.h / 2 + 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = phase ? '#2d7dff' : '#ff2d2d';
      ctx.beginPath(); ctx.arc(-4, spec.h / 2 - 2, 4, 0, Math.PI * 2); ctx.fill();
      // Flash glow on the road.
      ctx.fillStyle = phase ? 'rgba(255,45,45,0.16)' : 'rgba(45,125,255,0.16)';
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
    }
    if (car.health < 60) {
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath(); ctx.arc(-spec.w / 4, 0, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (car.isPlayer) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(car.x, car.y, 34, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPed(state, ped) {
    const bob = Math.sin(ped.t * 9) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(ped.x + 2, ped.y + 3, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(ped.x, ped.y + bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(ped.x, ped.y + bob * 0.3, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayer(state) {
    const p = state.player;
    if (state.playerCar) return;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 4, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Jax: teal jacket, dark jeans.
    ctx.fillStyle = '#2e7f8f';
    ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(p.x, p.y - 2, 5.5, Math.PI, Math.PI * 2); ctx.fill();
    // The pistol points where the mouse aims.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.aimAngle) * 20, p.y + Math.sin(p.aimAngle) * 20);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.stroke();
  }

  function drawEffects(state) {
    for (const e of state.effects) {
      const k = 1 - e.t / e.life;
      if (e.kind === 'muzzle') {
        ctx.fillStyle = `rgba(255,220,120,${k})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, 12 * k + 4, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'hit') {
        ctx.fillStyle = `rgba(200,40,40,${k * 0.8})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 * (1 - k) + 4, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'smoke') {
        ctx.fillStyle = `rgba(80,80,80,${k * 0.55})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, 14 + (1 - k) * 26, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'spark') {
        ctx.fillStyle = `rgba(255,200,80,${k})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'firework') {
        // A starburst: bright core, coloured ring, eight rays.
        ctx.fillStyle = `rgba(255,240,180,${k})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 + (1 - k) * 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = e.color || `rgba(255,210,58,${k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, 18 + (1 - k) * 26, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + e.t;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
          ctx.lineTo(e.x + Math.cos(a) * (26 + (1 - k) * 22), e.y + Math.sin(a) * (26 + (1 - k) * 22));
          ctx.stroke();
        }
      }
    }
    // Crates the harbour mission leaves behind.
    if (state.mission) {
      for (const c of state.mission.crates || []) {
        if (c.taken) continue;
        ctx.fillStyle = '#8a6a3b';
        ctx.fillRect(c.x - 11, c.y - 11, 22, 22);
        ctx.strokeStyle = '#5d4526';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x - 11, c.y - 11, 22, 22);
        ctx.beginPath(); ctx.moveTo(c.x - 11, c.y - 11); ctx.lineTo(c.x + 11, c.y + 11); ctx.stroke();
      }
    }
    for (const p of state.pickups) {
      const bob = Math.sin(p.t * 5) * 3;
      if (p.kind === 'cash') {
        ctx.fillStyle = '#2f9e44';
        ctx.beginPath(); ctx.arc(p.x, p.y + bob, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', p.x, p.y + bob);
      } else if (p.kind === 'ammo') {
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(p.x - 9, p.y - 7 + bob, 18, 14);
        ctx.fillStyle = '#222';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('AMMO', p.x, p.y + bob);
      } else if (p.kind === 'health') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - 9, p.y - 9 + bob, 18, 18);
        ctx.fillStyle = '#c23b3b';
        ctx.fillRect(p.x - 2, p.y - 7 + bob, 4, 14);
        ctx.fillRect(p.x - 7, p.y - 2 + bob, 14, 4);
      }
    }
    // Bullets as bright tracers.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2.5;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawGang(state) {
    for (const g of state.gang) {
      if (g.dead) continue;
      const r = g.boss ? 13 : 10;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(g.x + 2, g.y + 3, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = g.boss ? '#4a1a6b' : '#7b2fbe';
      ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath(); ctx.arc(g.x, g.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      if (g.boss) {
        // Viper's gold bandana: a crown stripe above the head.
        ctx.fillStyle = '#ffd23a';
        ctx.fillRect(g.x - 8, g.y - r - 5, 16, 4);
      }
      // Health bar above the head.
      ctx.fillStyle = '#c23b3b';
      ctx.fillRect(g.x - 12, g.y - r - 10, 24, 4);
      ctx.fillStyle = g.boss ? '#ffd23a' : '#7b2fbe';
      ctx.fillRect(g.x - 12, g.y - r - 10, 24 * (g.health / (g.boss ? 220 : 100)), 4);
    }
  }

  function drawWorld(state) {
    const cam = state.camera;
    ctx.save();
    ctx.translate(state.viewW / 2, state.viewH / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    drawCity(state);
    drawMarker(state);
    for (const car of state.cars) if (!car.dead) drawCar(state, car);
    for (const ped of state.peds) if (!ped.dead) drawPed(state, ped);
    drawGang(state);
    for (const cop of state.footCops) {
      if (cop.dead) continue;
      ctx.fillStyle = '#1d3a6e';
      ctx.beginPath(); ctx.arc(cop.x, cop.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath(); ctx.arc(cop.x, cop.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d3a6e';
      ctx.beginPath(); ctx.arc(cop.x, cop.y - 2, 5, Math.PI, Math.PI * 2); ctx.fill();
    }
    drawPlayer(state);
    drawEffects(state);
    ctx.restore();

    // Golden-hour grade: warm sun wash and a soft vignette, screen space.
    const sun = ctx.createRadialGradient(state.viewW * 0.78, state.viewH * 0.12, 40, state.viewW * 0.78, state.viewH * 0.12, state.viewW * 0.75);
    sun.addColorStop(0, 'rgba(255,214,140,0.16)');
    sun.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, state.viewW, state.viewH);
    const vig = ctx.createRadialGradient(state.viewW / 2, state.viewH / 2, state.viewH * 0.42, state.viewW / 2, state.viewH / 2, state.viewH * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(20,10,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, state.viewW, state.viewH);
  }

  return { ctx, drawWorld };
}

import { GameState, BUILDINGS, GRID, TW, TH, HW, HH, Citizen, SmokeParticle } from './types';

// ── Coordinate helpers ──────────────────────────────────────────

export function gridToScreen(r: number, c: number): [number, number] {
  return [(c - r) * HW, (c + r) * HH];
}

export function screenToGrid(sx: number, sy: number): [number, number] {
  const c = (sx / HW + sy / HH) / 2;
  const r = (sy / HH - sx / HW) / 2;
  return [Math.floor(r), Math.floor(c)];
}

// ── Primitive helpers ───────────────────────────────────────────

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

function leftFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx - HW, cy);
  ctx.lineTo(cx, cy + HH);
  ctx.lineTo(cx, cy + HH + h);
  ctx.lineTo(cx - HW, cy + h);
  ctx.closePath();
}

function rightFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx + HW, cy);
  ctx.lineTo(cx, cy + HH);
  ctx.lineTo(cx, cy + HH + h);
  ctx.lineTo(cx + HW, cy + h);
  ctx.closePath();
}

// ── Ground drawing ──────────────────────────────────────────────

const GRASS = ['#4a8a3a', '#4e9040', '#468636', '#509444'];

function drawGround(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: number) {
  const gi = ((r * 7 + c * 13) % 4);
  diamond(ctx, cx, cy + HH, TW, TH); // offset down so building sits on surface
  ctx.fillStyle = GRASS[gi];
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ── Building: Residential (house with peaked roof, windows, door) ──

function drawResidential(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 18;
  const wallL = '#d4c4a0';
  const wallR = '#baa880';

  // Left wall
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = wallL;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Windows on left wall (clipped)
  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  // Two windows
  ctx.fillStyle = '#8cc8f8';
  ctx.fillRect(cx - HW + 6, cy + 4, 7, 5);
  ctx.fillRect(cx - HW + 17, cy + 4, 7, 5);
  // Window frames
  ctx.strokeStyle = '#706050';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - HW + 6, cy + 4, 7, 5);
  ctx.strokeRect(cx - HW + 17, cy + 4, 7, 5);
  // Window cross
  ctx.beginPath();
  ctx.moveTo(cx - HW + 9.5, cy + 4); ctx.lineTo(cx - HW + 9.5, cy + 9);
  ctx.moveTo(cx - HW + 20.5, cy + 4); ctx.lineTo(cx - HW + 20.5, cy + 9);
  ctx.stroke();
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = wallR;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Door + window on right wall (clipped)
  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Door
  ctx.fillStyle = '#7a5030';
  ctx.fillRect(cx + 5, cy + HH + bh - 10, 6, 10);
  ctx.strokeStyle = '#5a3820';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 5, cy + HH + bh - 10, 6, 10);
  // Door knob
  ctx.fillStyle = '#c0a040';
  ctx.fillRect(cx + 9, cy + HH + bh - 5, 1.5, 1.5);
  // Window
  ctx.fillStyle = '#8cc8f8';
  ctx.fillRect(cx + 16, cy + HH + 4, 7, 5);
  ctx.strokeStyle = '#706050';
  ctx.strokeRect(cx + 16, cy + HH + 4, 7, 5);
  ctx.restore();

  // Roof (pyramid)
  const peak = 10;
  // Left roof slope
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx - HW, cy);
  ctx.lineTo(cx, cy + HH);
  ctx.closePath();
  ctx.fillStyle = '#b04030';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Right roof slope
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx + HW, cy);
  ctx.lineTo(cx, cy + HH);
  ctx.closePath();
  ctx.fillStyle = '#983828';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Roof ridge highlight
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx, cy + HH);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Chimney
  ctx.fillStyle = '#8a6050';
  ctx.fillRect(cx - HW / 2 - 2, cy - peak + 2, 4, 8);
  ctx.fillStyle = '#706050';
  ctx.fillRect(cx - HW / 2 - 3, cy - peak + 1, 6, 2);
}

// ── Building: Commercial (tall shop with awning + sign) ──

function drawCommercial(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 26;

  // Left wall
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#e8dcc8';
  ctx.fill();

  // Floor lines on left wall
  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const fy = cy + i * 8;
    ctx.beginPath();
    ctx.moveTo(cx - HW - 5, fy);
    ctx.lineTo(cx + 5, fy + HH);
    ctx.stroke();
  }
  // Windows (2 rows of 2)
  ctx.fillStyle = '#a0d8f0';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(cx - HW + 5 + col * 12, cy + 3 + row * 10, 8, 6);
    }
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#ccc0a8';
  ctx.fill();

  // Right wall details
  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Large storefront window
  ctx.fillStyle = '#a0d8f0';
  ctx.fillRect(cx + 3, cy + HH + bh - 14, 20, 10);
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 3, cy + HH + bh - 14, 20, 10);
  // Upper windows
  ctx.fillStyle = '#a0d8f0';
  ctx.fillRect(cx + 5, cy + HH + 3, 6, 5);
  ctx.fillRect(cx + 15, cy + HH + 3, 6, 5);
  ctx.restore();

  // Flat roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#3080c0';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Roof edge trim
  diamond(ctx, cx, cy, TW - 4, TH - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Awning on right face
  ctx.beginPath();
  ctx.moveTo(cx, cy + HH);
  ctx.lineTo(cx + HW + 4, cy + 2);
  ctx.lineTo(cx + HW + 4, cy + 5);
  ctx.lineTo(cx, cy + HH + 3);
  ctx.closePath();
  ctx.fillStyle = '#d04040';
  ctx.fill();
}

// ── Building: Industrial (factory with smokestacks) ──

function drawIndustrial(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 20;

  // Left wall
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#a0a0a0';
  ctx.fill();

  // Metal panels on left
  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - HW + 8 + i * 8, cy - 2);
    ctx.lineTo(cx - HW + 8 + i * 8, cy + bh + HH + 2);
    ctx.stroke();
  }
  // Loading bay door
  ctx.fillStyle = '#606060';
  ctx.fillRect(cx - HW + 3, cy + bh - 6, 12, 8);
  ctx.fillStyle = '#505050';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - HW + 3, cy + bh - 6 + i * 3, 12, 1);
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#888';
  ctx.fill();

  // Right wall detail
  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Large bay door
  ctx.fillStyle = '#606060';
  ctx.fillRect(cx + 4, cy + HH + bh - 12, 16, 12);
  // Warning stripes
  ctx.fillStyle = '#e0c030';
  ctx.fillRect(cx + 4, cy + HH + bh - 12, 16, 2);
  ctx.restore();

  // Flat roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#606060';
  ctx.fill();

  // Smokestack 1
  const s1x = cx - 8, s1y = cy - 12;
  ctx.fillStyle = '#787878';
  ctx.fillRect(s1x - 3, s1y, 6, 14);
  ctx.fillStyle = '#686868';
  ctx.fillRect(s1x - 4, s1y - 1, 8, 3);
  // Red band
  ctx.fillStyle = '#c04030';
  ctx.fillRect(s1x - 3, s1y + 2, 6, 2);

  // Smokestack 2
  const s2x = cx + 6, s2y = cy - 8;
  ctx.fillStyle = '#787878';
  ctx.fillRect(s2x - 3, s2y, 6, 10);
  ctx.fillStyle = '#686868';
  ctx.fillRect(s2x - 4, s2y - 1, 8, 3);
  ctx.fillStyle = '#c04030';
  ctx.fillRect(s2x - 3, s2y + 2, 6, 2);
}

// ── Building: Park (trees, bench, path) ──

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Trunk
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(x - 1.5, y - size * 0.4, 3, size * 0.5);
  // Foliage layers (bottom to top, lighter going up)
  const colors = ['#2a7a28', '#38942e', '#48a838'];
  for (let i = 0; i < 3; i++) {
    const s = size * (1 - i * 0.25);
    const oy = y - size * 0.4 - i * (size * 0.28);
    ctx.beginPath();
    ctx.ellipse(x, oy, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
  }
  // Highlight
  ctx.beginPath();
  ctx.ellipse(x - size * 0.15, y - size * 0.9, size * 0.12, size * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
}

function drawPark(ctx: CanvasRenderingContext2D, cx: number, cy: number, seed: number) {
  // Nicer grass
  diamond(ctx, cx, cy + HH, TW, TH);
  ctx.fillStyle = '#4aa040';
  ctx.fill();

  // Path through park
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy + HH - HH / 2);
  ctx.quadraticCurveTo(cx, cy + HH, cx + 3, cy + HH + HH / 2);
  ctx.strokeStyle = '#c8b888';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = '#b0a070';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Trees based on seed for variety
  const s = seed % 4;
  drawTree(ctx, cx - 10 - (s * 2), cy + HH - 8, 12);
  drawTree(ctx, cx + 10 + (s * 1), cy + HH + 2, 10);
  if (s > 1) drawTree(ctx, cx - 2, cy + HH - 14, 8);

  // Bench
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(cx + 5, cy + HH + 5, 8, 2);
  ctx.fillRect(cx + 5, cy + HH + 5, 1.5, 4);
  ctx.fillRect(cx + 11.5, cy + HH + 5, 1.5, 4);

  // Flowers
  const flowerColors = ['#f04060', '#f0d040', '#e070d0', '#ffffff'];
  for (let i = 0; i < 4; i++) {
    const fx = cx - 16 + i * 5 + (seed * 3 + i * 7) % 5;
    const fy = cy + HH + 4 + (seed * 5 + i * 11) % 6;
    ctx.fillStyle = flowerColors[(seed + i) % flowerColors.length];
    ctx.fillRect(fx, fy, 2, 2);
    ctx.fillStyle = '#40a030';
    ctx.fillRect(fx + 0.5, fy + 2, 1, 2);
  }
}

// ── Building: Road ──

function drawRoad(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy + HH, TW, TH);
  ctx.fillStyle = '#555';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Center line
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(cx - HW * 0.4, cy + HH - HH * 0.4 + 1);
  ctx.lineTo(cx + HW * 0.4, cy + HH + HH * 0.4 + 1);
  ctx.strokeStyle = '#cc9920';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  // Side marks
  diamond(ctx, cx, cy + HH, TW - 6, TH - 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ── Building: Power plant ──

function drawPower(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 30;

  // Left wall
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#c0b070';
  ctx.fill();

  // Warning stripes on left
  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e0c030' : '#303030';
    ctx.fillRect(cx - HW, cy + bh - 4 + i * 3 - 14, HW + 5, 3);
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#a09060';
  ctx.fill();

  // Right wall panel
  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.fillStyle = '#808060';
  ctx.fillRect(cx + 6, cy + HH + 4, 14, 18);
  // Control lights
  ctx.fillStyle = '#40ff40';
  ctx.fillRect(cx + 9, cy + HH + 7, 3, 3);
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(cx + 14, cy + HH + 7, 3, 3);
  ctx.fillStyle = '#40ff40';
  ctx.fillRect(cx + 9, cy + HH + 13, 3, 3);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(cx + 14, cy + HH + 13, 3, 3);
  ctx.restore();

  // Roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#d0c050';
  ctx.fill();

  // Cooling tower (cylinder approximation)
  const tx = cx - 5, ty = cy - 16;
  // Tower body
  ctx.fillStyle = '#b0a888';
  ctx.beginPath();
  ctx.moveTo(tx - 7, ty + 20);
  ctx.quadraticCurveTo(tx - 8, ty + 10, tx - 5, ty);
  ctx.lineTo(tx + 5, ty);
  ctx.quadraticCurveTo(tx + 8, ty + 10, tx + 7, ty + 20);
  ctx.closePath();
  ctx.fill();
  // Tower shadow side
  ctx.fillStyle = '#908870';
  ctx.beginPath();
  ctx.moveTo(tx + 1, ty);
  ctx.quadraticCurveTo(tx + 8, ty + 10, tx + 7, ty + 20);
  ctx.lineTo(tx + 0, ty + 20);
  ctx.quadraticCurveTo(tx + 1, ty + 10, tx + 1, ty);
  ctx.closePath();
  ctx.fill();
  // Tower top rim
  ctx.beginPath();
  ctx.ellipse(tx, ty, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#a09878';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Lightning bolt symbol on roof
  ctx.fillStyle = '#f0d000';
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 2, cy + 3);
  ctx.lineTo(cx + 5, cy + 3);
  ctx.lineTo(cx + 1, cy + 8);
  ctx.lineTo(cx + 8, cy + 2);
  ctx.lineTo(cx + 5, cy + 2);
  ctx.closePath();
  ctx.fill();
}

// ── Citizens ────────────────────────────────────────────────────

function drawCitizen(ctx: CanvasRenderingContext2D, c: Citizen, camX: number, camY: number) {
  const x = c.x + camX;
  const y = c.y + camY;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 2.5, 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = c.color;
  ctx.fillRect(x - 1.5, y - 5, 3, 4);

  // Head
  ctx.fillStyle = '#f0d0a0';
  ctx.beginPath();
  ctx.arc(x, y - 6.5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Legs (alternating based on position for walking animation)
  const step = Math.sin(c.x * 0.5 + c.y * 0.3) > 0;
  ctx.fillStyle = '#404060';
  ctx.fillRect(x - 1.5, y - 1, 1.2, step ? 2 : 1.5);
  ctx.fillRect(x + 0.3, y - 1, 1.2, step ? 1.5 : 2);
}

// ── Smoke ───────────────────────────────────────────────────────

function drawSmoke(ctx: CanvasRenderingContext2D, p: SmokeParticle, camX: number, camY: number) {
  const alpha = Math.max(0, 0.4 * (1 - p.age / p.maxAge));
  ctx.fillStyle = `rgba(180,180,180,${alpha})`;
  ctx.beginPath();
  ctx.arc(p.x + camX, p.y + camY, p.size * (0.5 + p.age / p.maxAge * 0.8), 0, Math.PI * 2);
  ctx.fill();
}

// ── Main render ─────────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  camX: number,
  camY: number,
  hoverR: number,
  hoverC: number,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Sky gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a2a1a');
  grad.addColorStop(0.5, '#1e321e');
  grad.addColorStop(1, '#142414');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const offX = w / 2 + camX;
  const offY = h * 0.38 + camY;

  ctx.translate(offX, offY);

  // Draw tiles back-to-front
  for (let sum = 0; sum < GRID * 2 - 1; sum++) {
    for (let r = Math.max(0, sum - GRID + 1); r <= Math.min(sum, GRID - 1); r++) {
      const c = sum - r;
      if (c < 0 || c >= GRID) continue;

      const [sx, sy] = gridToScreen(r, c);
      const cell = state.grid[r][c];

      // Ground
      drawGround(ctx, sx, sy, r, c);

      // Hover highlight
      if (r === hoverR && c === hoverC) {
        diamond(ctx, sx, sy + HH, TW, TH);
        ctx.fillStyle = 'rgba(233,69,96,0.25)';
        ctx.fill();
      }

      // Building
      if (cell.type !== 'empty') {
        ctx.save();
        ctx.translate(sx, sy);

        switch (cell.type) {
          case 'residential': drawResidential(ctx, 0, 0); break;
          case 'commercial': drawCommercial(ctx, 0, 0); break;
          case 'industrial': drawIndustrial(ctx, 0, 0); break;
          case 'park': drawPark(ctx, 0, 0, r * GRID + c); break;
          case 'road': drawRoad(ctx, 0, 0); break;
          case 'power': drawPower(ctx, 0, 0); break;
        }

        ctx.restore();
      }

      // Draw citizens near this tile
      for (const cit of state.citizens) {
        const cr = Math.floor((cit.y / HH + cit.x / HW) / 2 + 0.5);
        const cc = Math.floor((cit.y / HH - cit.x / HW) / 2 + 0.5);
        if (cr === r && cc === c) {
          drawCitizen(ctx, cit, 0, 0);
        }
      }
    }
  }

  // Smoke (drawn on top of everything)
  for (const p of state.smoke) {
    drawSmoke(ctx, p, 0, 0);
  }

  ctx.restore();
}

import { GameState, BUILDINGS, GRID, TW, TH, HW, HH, Citizen, SmokeParticle } from './types';

// ── Coordinate helpers ──────────────────────────────────────────

function rotateCoord(r: number, c: number, rot: number): [number, number] {
  switch (rot % 4) {
    case 1: return [c, GRID - 1 - r];
    case 2: return [GRID - 1 - r, GRID - 1 - c];
    case 3: return [GRID - 1 - c, r];
    default: return [r, c];
  }
}

function unrotateCoord(r: number, c: number, rot: number): [number, number] {
  // Inverse rotation
  switch (rot % 4) {
    case 1: return [GRID - 1 - c, r];
    case 2: return [GRID - 1 - r, GRID - 1 - c];
    case 3: return [c, GRID - 1 - r];
    default: return [r, c];
  }
}

export function gridToScreen(r: number, c: number, rot: number = 0): [number, number] {
  const [rr, rc] = rotateCoord(r, c, rot);
  return [(rc - rr) * HW, (rc + rr) * HH];
}

export function screenToGrid(sx: number, sy: number, rot: number = 0): [number, number] {
  const c = (sx / HW + sy / HH) / 2;
  const r = (sy / HH - sx / HW) / 2;
  const gr = Math.floor(r);
  const gc = Math.floor(c);
  return unrotateCoord(gr, gc, rot);
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
  diamond(ctx, cx, cy + HH, TW, TH);
  ctx.fillStyle = GRASS[gi];
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ── Building: House (gabled roof, shutters, porch) ──────────────

function drawResidential(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 18;
  const peak = 12;

  // Left wall
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#e8dbc4';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Left wall windows with shutters
  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  for (let i = 0; i < 2; i++) {
    const wx = cx - HW + 6 + i * 13;
    const wy = cy + 4;
    // Shutters
    ctx.fillStyle = '#5a7a5a';
    ctx.fillRect(wx - 2, wy - 1, 2, 7);
    ctx.fillRect(wx + 7, wy - 1, 2, 7);
    // Window pane
    ctx.fillStyle = '#b8ddf8';
    ctx.fillRect(wx, wy, 7, 5);
    // Window frame
    ctx.strokeStyle = '#f0e8d0';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(wx, wy, 7, 5);
    // Cross
    ctx.beginPath();
    ctx.moveTo(wx + 3.5, wy); ctx.lineTo(wx + 3.5, wy + 5);
    ctx.moveTo(wx, wy + 2.5); ctx.lineTo(wx + 7, wy + 2.5);
    ctx.strokeStyle = '#f0e8d0';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#d4c8a8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Right wall: door with porch, window
  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Porch step
  ctx.fillStyle = '#a09080';
  ctx.fillRect(cx + 3, cy + HH + bh - 3, 10, 3);
  // Door
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(cx + 5, cy + HH + bh - 12, 7, 9);
  ctx.strokeStyle = '#6a4428';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 5, cy + HH + bh - 12, 7, 9);
  // Door panels
  ctx.strokeStyle = '#7a5030';
  ctx.strokeRect(cx + 6, cy + HH + bh - 11, 2.5, 3.5);
  ctx.strokeRect(cx + 9, cy + HH + bh - 11, 2.5, 3.5);
  // Door knob
  ctx.fillStyle = '#d4aa40';
  ctx.beginPath();
  ctx.arc(cx + 10.5, cy + HH + bh - 7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Window
  ctx.fillStyle = '#5a7a5a';
  ctx.fillRect(cx + 15, wy_rw(cy) - 1, 2, 7);
  ctx.fillRect(cx + 24, wy_rw(cy) - 1, 2, 7);
  ctx.fillStyle = '#b8ddf8';
  ctx.fillRect(cx + 17, wy_rw(cy), 7, 5);
  ctx.strokeStyle = '#f0e8d0';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(cx + 17, wy_rw(cy), 7, 5);
  ctx.restore();

  // Gabled roof - left slope
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);       // ridge peak (center top)
  ctx.lineTo(cx - HW - 2, cy + 1); // left eave (slight overhang)
  ctx.lineTo(cx, cy + HH + 1);     // bottom eave
  ctx.closePath();
  ctx.fillStyle = '#b84835';
  ctx.fill();

  // Roof tile lines on left slope
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx - HW - 2, cy + 1);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const y = cy - peak + (cy + HH + 1 - (cy - peak)) * t;
    ctx.beginPath();
    ctx.moveTo(cx - HW - 4, y + 2);
    ctx.lineTo(cx + 4, y);
    ctx.stroke();
  }
  ctx.restore();

  // Gabled roof - right slope
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx + HW + 2, cy + 1);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.closePath();
  ctx.fillStyle = '#9a3828';
  ctx.fill();

  // Ridge line
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.strokeStyle = '#c85040';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Chimney
  ctx.fillStyle = '#9a7060';
  ctx.fillRect(cx + HW * 0.3, cy - peak - 2, 5, 10);
  ctx.fillStyle = '#8a6050';
  ctx.fillRect(cx + HW * 0.3 - 0.5, cy - peak - 3, 6, 2);
}

// Helper for right wall window Y
function wy_rw(cy: number) { return cy + HH + 4; }

// ── Building: Commercial (tall shop with awning + sign) ──

function drawCommercial(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 26;

  // Left wall
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#e8dcc8';
  ctx.fill();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const fy = cy + i * 8;
    ctx.beginPath();
    ctx.moveTo(cx - HW - 5, fy);
    ctx.lineTo(cx + 5, fy + HH);
    ctx.stroke();
  }
  ctx.fillStyle = '#a0d8f0';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(cx - HW + 5 + col * 12, cy + 3 + row * 10, 8, 6);
      ctx.strokeStyle = '#c0b8a0';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - HW + 5 + col * 12, cy + 3 + row * 10, 8, 6);
    }
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#ccc0a8';
  ctx.fill();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.fillStyle = '#90d0e8';
  ctx.fillRect(cx + 3, cy + HH + bh - 14, 20, 10);
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 3, cy + HH + bh - 14, 20, 10);
  // Mannequin/display
  ctx.fillStyle = '#e0a080';
  ctx.fillRect(cx + 8, cy + HH + bh - 12, 3, 6);
  ctx.fillRect(cx + 14, cy + HH + bh - 11, 3, 5);
  ctx.fillStyle = '#a0d8f0';
  ctx.fillRect(cx + 5, cy + HH + 3, 6, 5);
  ctx.fillRect(cx + 15, cy + HH + 3, 6, 5);
  ctx.restore();

  // Flat roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#3080c0';
  ctx.fill();
  diamond(ctx, cx, cy, TW - 4, TH - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Awning
  ctx.beginPath();
  ctx.moveTo(cx, cy + HH);
  ctx.lineTo(cx + HW + 4, cy + 2);
  ctx.lineTo(cx + HW + 4, cy + 5);
  ctx.lineTo(cx, cy + HH + 3);
  ctx.closePath();
  ctx.fillStyle = '#d04040';
  ctx.fill();
  // Awning stripes
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + HH);
  ctx.lineTo(cx + HW + 4, cy + 2);
  ctx.lineTo(cx + HW + 4, cy + 5);
  ctx.lineTo(cx, cy + HH + 3);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#f0f0f0';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx + i * 8, cy - 2, 4, HH + 10);
  }
  ctx.restore();

  // Sign
  ctx.fillStyle = '#f0e8c0';
  ctx.fillRect(cx + HW * 0.2, cy + 1, HW * 0.6, 4);
  ctx.fillStyle = '#d04040';
  ctx.font = '4px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHOP', cx + HW * 0.5, cy + 4);
}

// ── Building: Industrial (factory with smokestacks) ──

function drawIndustrial(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 20;

  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#a0a0a0';
  ctx.fill();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - HW + 8 + i * 8, cy - 2);
    ctx.lineTo(cx - HW + 8 + i * 8, cy + bh + HH + 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#606060';
  ctx.fillRect(cx - HW + 3, cy + bh - 6, 12, 8);
  ctx.fillStyle = '#505050';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - HW + 3, cy + bh - 6 + i * 3, 12, 1);
  }
  ctx.restore();

  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#888';
  ctx.fill();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.fillStyle = '#606060';
  ctx.fillRect(cx + 4, cy + HH + bh - 12, 16, 12);
  ctx.fillStyle = '#e0c030';
  ctx.fillRect(cx + 4, cy + HH + bh - 12, 16, 2);
  ctx.restore();

  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#606060';
  ctx.fill();

  // Smokestack 1
  const s1x = cx - 8, s1y = cy - 12;
  ctx.fillStyle = '#787878';
  ctx.fillRect(s1x - 3, s1y, 6, 14);
  ctx.fillStyle = '#686868';
  ctx.fillRect(s1x - 4, s1y - 1, 8, 3);
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

// ── Park ─────────────────────────────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(x - 1.5, y - size * 0.4, 3, size * 0.5);
  const colors = ['#2a7a28', '#38942e', '#48a838'];
  for (let i = 0; i < 3; i++) {
    const s = size * (1 - i * 0.25);
    const oy = y - size * 0.4 - i * (size * 0.28);
    ctx.beginPath();
    ctx.ellipse(x, oy, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x - size * 0.15, y - size * 0.9, size * 0.12, size * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
}

function drawPark(ctx: CanvasRenderingContext2D, cx: number, cy: number, seed: number) {
  diamond(ctx, cx, cy + HH, TW, TH);
  ctx.fillStyle = '#4aa040';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 2, cy + HH - HH / 2);
  ctx.quadraticCurveTo(cx, cy + HH, cx + 3, cy + HH + HH / 2);
  ctx.strokeStyle = '#c8b888';
  ctx.lineWidth = 3;
  ctx.stroke();

  const s = seed % 4;
  drawTree(ctx, cx - 10 - (s * 2), cy + HH - 8, 12);
  drawTree(ctx, cx + 10 + (s * 1), cy + HH + 2, 10);
  if (s > 1) drawTree(ctx, cx - 2, cy + HH - 14, 8);

  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(cx + 5, cy + HH + 5, 8, 2);
  ctx.fillRect(cx + 5, cy + HH + 5, 1.5, 4);
  ctx.fillRect(cx + 11.5, cy + HH + 5, 1.5, 4);

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

// ── Road ─────────────────────────────────────────────────────

function drawRoad(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy + HH, TW, TH);
  ctx.fillStyle = '#555';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(cx - HW * 0.4, cy + HH - HH * 0.4 + 1);
  ctx.lineTo(cx + HW * 0.4, cy + HH + HH * 0.4 + 1);
  ctx.strokeStyle = '#cc9920';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Power plant ──────────────────────────────────────────────

function drawPower(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 30;

  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#c0b070';
  ctx.fill();
  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e0c030' : '#303030';
    ctx.fillRect(cx - HW, cy + bh - 4 + i * 3 - 14, HW + 5, 3);
  }
  ctx.restore();

  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#a09060';
  ctx.fill();
  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.fillStyle = '#808060';
  ctx.fillRect(cx + 6, cy + HH + 4, 14, 18);
  ctx.fillStyle = '#40ff40';
  ctx.fillRect(cx + 9, cy + HH + 7, 3, 3);
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(cx + 14, cy + HH + 7, 3, 3);
  ctx.fillStyle = '#40ff40';
  ctx.fillRect(cx + 9, cy + HH + 13, 3, 3);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(cx + 14, cy + HH + 13, 3, 3);
  ctx.restore();

  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#d0c050';
  ctx.fill();

  const tx = cx - 5, ty = cy - 16;
  ctx.fillStyle = '#b0a888';
  ctx.beginPath();
  ctx.moveTo(tx - 7, ty + 20);
  ctx.quadraticCurveTo(tx - 8, ty + 10, tx - 5, ty);
  ctx.lineTo(tx + 5, ty);
  ctx.quadraticCurveTo(tx + 8, ty + 10, tx + 7, ty + 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#908870';
  ctx.beginPath();
  ctx.moveTo(tx + 1, ty);
  ctx.quadraticCurveTo(tx + 8, ty + 10, tx + 7, ty + 20);
  ctx.lineTo(tx + 0, ty + 20);
  ctx.quadraticCurveTo(tx + 1, ty + 10, tx + 1, ty);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(tx, ty, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#a09878';
  ctx.fill();

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

function drawCitizen(ctx: CanvasRenderingContext2D, c: Citizen) {
  const x = c.x;
  const y = c.y;

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 2.5, 1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.color;
  ctx.fillRect(x - 1.5, y - 5, 3, 4);

  ctx.fillStyle = '#f0d0a0';
  ctx.beginPath();
  ctx.arc(x, y - 6.5, 2, 0, Math.PI * 2);
  ctx.fill();

  const step = Math.sin(c.x * 0.5 + c.y * 0.3) > 0;
  ctx.fillStyle = '#404060';
  ctx.fillRect(x - 1.5, y - 1, 1.2, step ? 2 : 1.5);
  ctx.fillRect(x + 0.3, y - 1, 1.2, step ? 1.5 : 2);
}

// ── Smoke ───────────────────────────────────────────────────────

function drawSmoke(ctx: CanvasRenderingContext2D, p: SmokeParticle) {
  const alpha = Math.max(0, 0.4 * (1 - p.age / p.maxAge));
  ctx.fillStyle = `rgba(180,180,180,${alpha})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * (0.5 + p.age / p.maxAge * 0.8), 0, Math.PI * 2);
  ctx.fill();
}

// ── Main render ─────────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  camX: number,
  camY: number,
  zoom: number,
  rotation: number,
  hoverR: number,
  hoverC: number,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a2a1a');
  grad.addColorStop(0.5, '#1e321e');
  grad.addColorStop(1, '#142414');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const offX = w / 2 + camX;
  const offY = h * 0.38 + camY;

  ctx.translate(offX, offY);
  ctx.scale(zoom, zoom);

  // Draw tiles back-to-front (in rotated order)
  for (let sum = 0; sum < GRID * 2 - 1; sum++) {
    for (let rr = Math.max(0, sum - GRID + 1); rr <= Math.min(sum, GRID - 1); rr++) {
      const rc = sum - rr;
      if (rc < 0 || rc >= GRID) continue;

      // rr, rc are rotated coords. Get real grid coords.
      const [gr, gc] = unrotateCoord(rr, rc, rotation);

      const sx = (rc - rr) * HW;
      const sy = (rc + rr) * HH;
      const cell = state.grid[gr][gc];

      drawGround(ctx, sx, sy, gr, gc);

      if (gr === hoverR && gc === hoverC) {
        diamond(ctx, sx, sy + HH, TW, TH);
        ctx.fillStyle = 'rgba(233,69,96,0.25)';
        ctx.fill();
      }

      if (cell.type !== 'empty') {
        ctx.save();
        ctx.translate(sx, sy);
        switch (cell.type) {
          case 'residential': drawResidential(ctx, 0, 0); break;
          case 'commercial': drawCommercial(ctx, 0, 0); break;
          case 'industrial': drawIndustrial(ctx, 0, 0); break;
          case 'park': drawPark(ctx, 0, 0, gr * GRID + gc); break;
          case 'road': drawRoad(ctx, 0, 0); break;
          case 'power': drawPower(ctx, 0, 0); break;
        }
        ctx.restore();
      }

      // Citizens at this tile
      for (const cit of state.citizens) {
        const cr = Math.floor((cit.y / HH + cit.x / HW) / 2 + 0.5);
        const cc = Math.floor((cit.y / HH - cit.x / HW) / 2 + 0.5);
        // cr, cc are in rotated space
        if (cr === rr && cc === rc) {
          drawCitizen(ctx, cit);
        }
      }
    }
  }

  for (const p of state.smoke) {
    drawSmoke(ctx, p);
  }

  ctx.restore();
}

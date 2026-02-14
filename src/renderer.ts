import { GameState, BUILDINGS, GRID, TW, TH, HW, HH, Citizen, SmokeParticle, getLevelMultiplier } from './types';

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

// ── Level indicator (stars) ─────────────────────────────────────

function drawLevelStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, level: number) {
  if (level <= 1) return;
  const count = level - 1; // 1 star for level 2, 2 stars for level 3
  const startX = cx - count * 4;
  for (let i = 0; i < count; i++) {
    const sx = startX + i * 8;
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#b8960f';
    ctx.lineWidth = 0.5;
    drawStar(ctx, sx, cy, 3, 5);
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, inner: number, outer: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const r = i === 0 ? outer : outer;
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    const midAngle = angle + (2 * Math.PI) / 10;
    ctx.lineTo(cx + Math.cos(midAngle) * inner, cy + Math.sin(midAngle) * inner);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ── Fire effect ──────────────────────────────────────────────────

function drawFireEffect(ctx: CanvasRenderingContext2D, cx: number, cy: number, tick: number) {
  const t = tick * 0.15;
  for (let i = 0; i < 6; i++) {
    const fx = cx + Math.sin(t + i * 1.3) * 8 - 4;
    const fy = cy + Math.cos(t + i * 0.9) * 3 - 6 - i * 2;
    const s = 4 + Math.sin(t + i) * 2;
    const alpha = 0.6 + Math.sin(t * 2 + i) * 0.3;
    ctx.fillStyle = i < 3 ? `rgba(255,100,20,${alpha})` : `rgba(255,200,50,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(fx, fy, s, s * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Building: House ─────────────────────────────────────────────

function drawResidential(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 18;
  const peak = 12;

  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#e8dbc4';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  for (let i = 0; i < 2; i++) {
    const wx = cx - HW + 6 + i * 13;
    const wy = cy + 4;
    ctx.fillStyle = '#5a7a5a';
    ctx.fillRect(wx - 2, wy - 1, 2, 7);
    ctx.fillRect(wx + 7, wy - 1, 2, 7);
    ctx.fillStyle = '#b8ddf8';
    ctx.fillRect(wx, wy, 7, 5);
    ctx.strokeStyle = '#f0e8d0';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(wx, wy, 7, 5);
    ctx.beginPath();
    ctx.moveTo(wx + 3.5, wy); ctx.lineTo(wx + 3.5, wy + 5);
    ctx.moveTo(wx, wy + 2.5); ctx.lineTo(wx + 7, wy + 2.5);
    ctx.strokeStyle = '#f0e8d0';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();

  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#d4c8a8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  ctx.fillStyle = '#a09080';
  ctx.fillRect(cx + 3, cy + HH + bh - 3, 10, 3);
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(cx + 5, cy + HH + bh - 12, 7, 9);
  ctx.strokeStyle = '#6a4428';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 5, cy + HH + bh - 12, 7, 9);
  ctx.strokeStyle = '#7a5030';
  ctx.strokeRect(cx + 6, cy + HH + bh - 11, 2.5, 3.5);
  ctx.strokeRect(cx + 9, cy + HH + bh - 11, 2.5, 3.5);
  ctx.fillStyle = '#d4aa40';
  ctx.beginPath();
  ctx.arc(cx + 10.5, cy + HH + bh - 7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  const wy = cy + HH + 4;
  ctx.fillStyle = '#5a7a5a';
  ctx.fillRect(cx + 15, wy - 1, 2, 7);
  ctx.fillRect(cx + 24, wy - 1, 2, 7);
  ctx.fillStyle = '#b8ddf8';
  ctx.fillRect(cx + 17, wy, 7, 5);
  ctx.strokeStyle = '#f0e8d0';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(cx + 17, wy, 7, 5);
  ctx.restore();

  // Gabled roof - left slope
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx - HW - 2, cy + 1);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.closePath();
  ctx.fillStyle = '#b84835';
  ctx.fill();

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

// ── Building: Commercial ────────────────────────────────────────

function drawCommercial(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 26;

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
  ctx.fillStyle = '#e0a080';
  ctx.fillRect(cx + 8, cy + HH + bh - 12, 3, 6);
  ctx.fillRect(cx + 14, cy + HH + bh - 11, 3, 5);
  ctx.fillStyle = '#a0d8f0';
  ctx.fillRect(cx + 5, cy + HH + 3, 6, 5);
  ctx.fillRect(cx + 15, cy + HH + 3, 6, 5);
  ctx.restore();

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

  ctx.fillStyle = '#f0e8c0';
  ctx.fillRect(cx + HW * 0.2, cy + 1, HW * 0.6, 4);
  ctx.fillStyle = '#d04040';
  ctx.font = '4px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHOP', cx + HW * 0.5, cy + 4);
}

// ── Building: Industrial ────────────────────────────────────────

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

// ── Hospital ────────────────────────────────────────────────────

function drawHospital(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 24;

  // Left wall - white/light gray
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#f0f0f0';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  // Windows
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = '#a0e0f0';
      ctx.fillRect(cx - HW + 4 + col * 12, cy + 2 + row * 7, 7, 5);
      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - HW + 4 + col * 12, cy + 2 + row * 7, 7, 5);
    }
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#e0e0e0';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Entrance
  ctx.fillStyle = '#80c0e0';
  ctx.fillRect(cx + 6, cy + HH + bh - 12, 14, 12);
  ctx.strokeStyle = '#6090b0';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 6, cy + HH + bh - 12, 14, 12);
  // Red cross on entrance
  ctx.fillStyle = '#e04040';
  ctx.fillRect(cx + 11, cy + HH + bh - 10, 4, 8);
  ctx.fillRect(cx + 9, cy + HH + bh - 8, 8, 4);
  ctx.restore();

  // Flat roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#e8e8e8';
  ctx.fill();
  diamond(ctx, cx, cy, TW - 6, TH - 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Red cross on roof
  ctx.fillStyle = '#e04040';
  ctx.fillRect(cx - 1.5, cy - 4, 3, 8);
  ctx.fillRect(cx - 4, cy - 1.5, 8, 3);

  // Helipad circle
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// ── School ──────────────────────────────────────────────────────

function drawSchool(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 22;

  // Left wall - warm brick
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#c8a070';
  ctx.fill();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  // Brick pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    const by = cy + i * 4;
    ctx.beginPath();
    ctx.moveTo(cx - HW - 2, by);
    ctx.lineTo(cx + 2, by + HH * 0.5);
    ctx.stroke();
  }
  // Windows
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#a0d8f0';
    ctx.fillRect(cx - HW + 3 + i * 9, cy + 4, 6, 8);
    ctx.strokeStyle = '#b09060';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - HW + 3 + i * 9, cy + 4, 6, 8);
  }
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#b09060';
  ctx.fill();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Door
  ctx.fillStyle = '#6a4428';
  ctx.fillRect(cx + 8, cy + HH + bh - 14, 10, 14);
  ctx.strokeStyle = '#503018';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 8, cy + HH + bh - 14, 10, 14);
  // Door window
  ctx.fillStyle = '#a0d8f0';
  ctx.fillRect(cx + 10, cy + HH + bh - 12, 6, 4);
  // Clock/sign
  ctx.fillStyle = '#f0e8c0';
  ctx.fillRect(cx + 4, cy + HH + 2, 18, 5);
  ctx.fillStyle = '#904030';
  ctx.font = '3.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCHOOL', cx + 13, cy + HH + 5.5);
  ctx.restore();

  // Gabled roof like residential but different color
  const peak = 10;
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx - HW - 2, cy + 1);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.closePath();
  ctx.fillStyle = '#904030';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx + HW + 2, cy + 1);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.closePath();
  ctx.fillStyle = '#7a3020';
  ctx.fill();

  // Ridge
  ctx.beginPath();
  ctx.moveTo(cx, cy - peak);
  ctx.lineTo(cx, cy + HH + 1);
  ctx.strokeStyle = '#a04030';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bell tower
  ctx.fillStyle = '#c8a070';
  ctx.fillRect(cx - 3, cy - peak - 8, 6, 8);
  ctx.fillStyle = '#b09060';
  ctx.fillRect(cx - 4, cy - peak - 9, 8, 2);
  // Bell
  ctx.fillStyle = '#d4aa40';
  ctx.beginPath();
  ctx.arc(cx, cy - peak - 4, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ── Fire Station ────────────────────────────────────────────────

function drawFireStation(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 20;

  // Left wall - red
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#c83030';
  ctx.fill();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  // Windows
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#a0d8f0';
    ctx.fillRect(cx - HW + 4 + i * 12, cy + 3, 8, 5);
    ctx.strokeStyle = '#a02020';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - HW + 4 + i * 12, cy + 3, 8, 5);
  }
  // Stripe
  ctx.fillStyle = '#ff6060';
  ctx.fillRect(cx - HW, cy + bh - 2, HW + 4, 3);
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#b02828';
  ctx.fill();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Garage door
  ctx.fillStyle = '#e0d0b0';
  ctx.fillRect(cx + 3, cy + HH + bh - 16, 20, 16);
  ctx.strokeStyle = '#b0a080';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy + HH + bh - 16 + i * 4);
    ctx.lineTo(cx + 23, cy + HH + bh - 16 + i * 4);
    ctx.stroke();
  }
  ctx.restore();

  // Flat roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#cc3333';
  ctx.fill();

  // Siren on roof
  ctx.fillStyle = '#ff4040';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Tower
  ctx.fillStyle = '#d04040';
  ctx.fillRect(cx - HW * 0.3 - 2, cy - 14, 4, 14);
  ctx.fillStyle = '#ff8080';
  ctx.fillRect(cx - HW * 0.3 - 3, cy - 15, 6, 2);
}

// ── Police Station ──────────────────────────────────────────────

function drawPolice(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const bh = 22;

  // Left wall - blue
  leftFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#4060a0';
  ctx.fill();

  ctx.save();
  leftFace(ctx, cx, cy, bh);
  ctx.clip();
  // Windows
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#a0d8f0';
    ctx.fillRect(cx - HW + 4 + i * 12, cy + 3, 8, 6);
    ctx.strokeStyle = '#305080';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - HW + 4 + i * 12, cy + 3, 8, 6);
  }
  // Badge/emblem
  ctx.fillStyle = '#d4aa40';
  ctx.beginPath();
  ctx.arc(cx - HW + 14, cy + 15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right wall
  rightFace(ctx, cx, cy, bh);
  ctx.fillStyle = '#305080';
  ctx.fill();

  ctx.save();
  rightFace(ctx, cx, cy, bh);
  ctx.clip();
  // Door
  ctx.fillStyle = '#203860';
  ctx.fillRect(cx + 8, cy + HH + bh - 14, 10, 14);
  ctx.strokeStyle = '#102040';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx + 8, cy + HH + bh - 14, 10, 14);
  // Sign
  ctx.fillStyle = '#f0e8c0';
  ctx.fillRect(cx + 3, cy + HH + 2, 20, 5);
  ctx.fillStyle = '#305080';
  ctx.font = '3px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE', cx + 13, cy + HH + 5.5);
  ctx.restore();

  // Flat roof
  diamond(ctx, cx, cy, TW, TH);
  ctx.fillStyle = '#3050a0';
  ctx.fill();

  // Police light
  ctx.fillStyle = '#4080ff';
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4040';
  ctx.beginPath();
  ctx.arc(cx + 4, cy - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Flag pole
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(cx + HW * 0.3, cy - 16, 1.5, 16);
  ctx.fillStyle = '#3050a0';
  ctx.fillRect(cx + HW * 0.3 + 1.5, cy - 16, 8, 5);
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

// ── Day/Night overlay ───────────────────────────────────────────

function getDayNightColor(dayTime: number): { r: number; g: number; b: number; a: number } {
  // dayTime: 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  // Returns an overlay tint
  if (dayTime < 0.2) {
    // Night (midnight to pre-dawn)
    return { r: 10, g: 15, b: 50, a: 0.35 };
  } else if (dayTime < 0.3) {
    // Dawn transition
    const t = (dayTime - 0.2) / 0.1;
    return {
      r: Math.round(10 + t * 30),
      g: Math.round(15 + t * 20),
      b: Math.round(50 - t * 40),
      a: 0.35 - t * 0.3,
    };
  } else if (dayTime < 0.7) {
    // Day - minimal overlay
    return { r: 0, g: 0, b: 0, a: 0.0 };
  } else if (dayTime < 0.8) {
    // Dusk transition
    const t = (dayTime - 0.7) / 0.1;
    return {
      r: Math.round(40 * t),
      g: Math.round(15 * t),
      b: Math.round(10 * t),
      a: t * 0.2,
    };
  } else {
    // Night (dusk to midnight)
    const t = (dayTime - 0.8) / 0.2;
    return {
      r: Math.round(40 - t * 30),
      g: Math.round(15 - t * 0),
      b: Math.round(10 + t * 40),
      a: 0.2 + t * 0.15,
    };
  }
}

function getTimeOfDayLabel(dayTime: number): string {
  if (dayTime < 0.2) return 'Night';
  if (dayTime < 0.3) return 'Dawn';
  if (dayTime < 0.7) return 'Day';
  if (dayTime < 0.8) return 'Dusk';
  return 'Night';
}

export { getTimeOfDayLabel };

// ── Visitor badge ────────────────────────────────────────────────

function drawVisitorBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, visitors: number, capacity: number) {
  if (capacity <= 0) return;
  const bh = -8;
  const fill = visitors / capacity;
  const badgeX = cx + 12;
  const badgeY = cy + bh - 4;

  // Background pill
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(badgeX - 10, badgeY - 5, 20, 10, 4);
  ctx.fill();

  // Fill bar
  const barW = 16;
  const barH = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(badgeX - 8, badgeY - 2, barW, barH);
  ctx.fillStyle = fill >= 0.9 ? '#f87171' : fill >= 0.5 ? '#facc15' : '#4ade80';
  ctx.fillRect(badgeX - 8, badgeY - 2, barW * fill, barH);

  // Count text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${visitors}/${capacity}`, badgeX, badgeY + 7);
}

// ── Main render ─────────────────────────────────────────────────

let _frameTick = 0;

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
  _frameTick++;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background gradient
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
          case 'hospital': drawHospital(ctx, 0, 0); break;
          case 'school': drawSchool(ctx, 0, 0); break;
          case 'fire_station': drawFireStation(ctx, 0, 0); break;
          case 'police': drawPolice(ctx, 0, 0); break;
        }

        // Level stars
        const bh = BUILDINGS[cell.type].height;
        drawLevelStars(ctx, 0, -bh - 6, cell.level);

        // Visitor badge
        const bInfo = BUILDINGS[cell.type];
        const cap = Math.floor(bInfo.capacity * getLevelMultiplier(cell.level));
        if (cap > 0) {
          drawVisitorBadge(ctx, 0, -bh - 12, cell.visitors, cap);
        }

        // Fire effect
        if (cell.onFire) {
          drawFireEffect(ctx, 0, 0, _frameTick);
        }

        ctx.restore();
      }

      // Citizens at this tile
      for (const cit of state.citizens) {
        const cr = Math.floor((cit.y / HH + cit.x / HW) / 2 + 0.5);
        const cc = Math.floor((cit.y / HH - cit.x / HW) / 2 + 0.5);
        if (cr === rr && cc === rc) {
          drawCitizen(ctx, cit);
        }
      }
    }
  }

  for (const p of state.smoke) {
    drawSmoke(ctx, p);
  }

  // Reset transform before day/night overlay
  ctx.restore();

  // Day/Night overlay
  const dnColor = getDayNightColor(state.dayTime);
  if (dnColor.a > 0.01) {
    ctx.fillStyle = `rgba(${dnColor.r},${dnColor.g},${dnColor.b},${dnColor.a})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

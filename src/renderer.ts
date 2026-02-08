import { GameState, BUILDINGS, GRID, TW, TH } from './types';

// Isometric conversions
export function gridToScreen(row: number, col: number): [number, number] {
  const x = (col - row) * (TW / 2);
  const y = (col + row) * (TH / 2);
  return [x, y];
}

export function screenToGrid(sx: number, sy: number): [number, number] {
  // Inverse of the isometric transform
  const col = (sx / (TW / 2) + sy / (TH / 2)) / 2;
  const row = (sy / (TH / 2) - sx / (TW / 2)) / 2;
  return [Math.floor(row), Math.floor(col)];
}

// Grass color with slight variation
const GRASS_A = '#3e8a35';
const GRASS_B = '#449038';
const GRASS_DARK_A = '#357a2e';
const GRASS_DARK_B = '#3a7e30';

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);      // top
  ctx.lineTo(cx + w / 2, cy);      // right
  ctx.lineTo(cx, cy + h / 2);      // bottom
  ctx.lineTo(cx - w / 2, cy);      // left
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function drawBuildingBlock(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,  // center of the top diamond
  bh: number,              // building height in pixels
  topColor: string,
  leftColor: string,
  rightColor: string,
) {
  const hw = TW / 2;
  const hh = TH / 2;

  // Left face (parallelogram)
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);            // diamond left
  ctx.lineTo(cx, cy + hh);            // diamond bottom
  ctx.lineTo(cx, cy + hh + bh);       // bottom-bottom
  ctx.lineTo(cx - hw, cy + bh);       // bottom-left
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();

  // Right face (parallelogram)
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy);            // diamond right
  ctx.lineTo(cx, cy + hh);            // diamond bottom
  ctx.lineTo(cx, cy + hh + bh);       // bottom-bottom
  ctx.lineTo(cx + hw, cy + bh);       // bottom-right
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();

  // Top face (diamond)
  drawDiamond(ctx, cx, cy, TW, TH, topColor);

  // Edge highlights
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx, cy - hh);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bottom edge darken
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy + bh);
  ctx.lineTo(cx, cy + hh + bh);
  ctx.lineTo(cx + hw, cy + bh);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

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

  // Clear
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(0, 0, w, h);

  // Camera offset: center the grid
  const centerOffX = w / 2 + camX;
  const centerOffY = h * 0.38 + camY;

  ctx.translate(centerOffX, centerOffY);

  // Draw tiles back-to-front
  for (let sum = 0; sum < GRID * 2 - 1; sum++) {
    for (let r = Math.max(0, sum - GRID + 1); r <= Math.min(sum, GRID - 1); r++) {
      const c = sum - r;
      if (c < 0 || c >= GRID) continue;

      const [sx, sy] = gridToScreen(r, c);
      const cell = state.grid[r][c];
      const info = BUILDINGS[cell.type];

      // Ground tile
      const isAlt = (r + c) % 2 === 0;
      const grassTop = isAlt ? GRASS_A : GRASS_B;
      const grassLeft = isAlt ? GRASS_DARK_A : GRASS_DARK_B;

      if (cell.type === 'empty') {
        // Flat ground diamond
        drawDiamond(ctx, sx, sy, TW, TH, grassTop, 'rgba(0,0,0,0.08)');

        // Hover highlight
        if (r === hoverR && c === hoverC) {
          drawDiamond(ctx, sx, sy, TW, TH, 'rgba(233,69,96,0.25)');
        }
      } else {
        // Ground under building
        drawDiamond(ctx, sx, sy + info.height, TW, TH, grassLeft, 'rgba(0,0,0,0.08)');

        // Building block
        drawBuildingBlock(ctx, sx, sy, info.height, info.topColor, info.leftColor, info.rightColor);

        // Emoji on building
        if (cell.type !== 'road') {
          ctx.font = `${Math.min(22, TW * 0.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(info.emoji, sx, sy - 2);
        }

        // Hover highlight on top
        if (r === hoverR && c === hoverC) {
          drawDiamond(ctx, sx, sy, TW, TH, 'rgba(233,69,96,0.3)');
        }
      }
    }
  }

  ctx.restore();
}

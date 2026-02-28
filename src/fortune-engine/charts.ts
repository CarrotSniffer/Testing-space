export function drawSparkline(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  data: number[],
  color: string,
): void {
  if (data.length < 2) return;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = x + (i / (data.length - 1)) * w;
    const py = y + h - ((data[i] - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawPriceChart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  data: number[],
  color: string,
): void {
  if (data.length < 2) return;
  const min = Math.min(...data) * 0.98;
  const max = Math.max(...data) * 1.02;
  const range = max - min || 1;

  // Background
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(x, y, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const gy = y + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }

  // Price labels
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '9px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('$' + max.toFixed(2), x + w - 2, y + 10);
  ctx.fillText('$' + min.toFixed(2), x + w - 2, y + h - 4);

  // Fill gradient
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = x + (i / (data.length - 1)) * w;
    const py = y + h - ((data[i] - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  const isUp = data[data.length - 1] >= data[0];
  const baseColor = isUp ? '74,222,128' : '248,113,113';
  grad.addColorStop(0, `rgba(${baseColor},0.15)`);
  grad.addColorStop(1, `rgba(${baseColor},0)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = x + (i / (data.length - 1)) * w;
    const py = y + h - ((data[i] - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Current price dot
  const lastPx = x + w;
  const lastPy = y + h - ((data[data.length - 1] - min) / range) * h;
  ctx.beginPath();
  ctx.arc(lastPx, lastPy, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawNetWorthChart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  history: { tick: number; value: number }[],
): void {
  if (history.length < 2) return;
  const values = history.map(h => Math.max(1, h.value));
  const logValues = values.map(v => Math.log10(v));
  const min = Math.min(...logValues);
  const max = Math.max(...logValues);
  const range = max - min || 1;

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(x, y, w, h);

  ctx.beginPath();
  for (let i = 0; i < logValues.length; i++) {
    const px = x + (i / (logValues.length - 1)) * w;
    const py = y + h - ((logValues[i] - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.stroke();
}

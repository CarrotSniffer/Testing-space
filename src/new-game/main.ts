// ── New Game Starter Template ────────────────────────────────
// This is a blank canvas for your new game.
// It sets up an HTML5 Canvas with a basic game loop.
// Replace this code with your own game logic!

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// ── Resize handling ──────────────────────────────────────────

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
resize();
window.addEventListener('resize', resize);

// ── Game state ───────────────────────────────────────────────

interface GameState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  score: number;
}

const state: GameState = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  vx: 3,
  vy: 2,
  radius: 20,
  color: '#e94560',
  score: 0,
};

// ── Input ────────────────────────────────────────────────────

canvas.addEventListener('click', (e) => {
  const dx = e.clientX - state.x;
  const dy = e.clientY - state.y;
  if (Math.sqrt(dx * dx + dy * dy) < state.radius) {
    state.score++;
    state.color = `hsl(${Math.random() * 360}, 70%, 55%)`;
    state.vx *= 1.05;
    state.vy *= 1.05;
    updateScore();
  }
});

function updateScore() {
  const el = document.getElementById('score-value')!;
  el.textContent = state.score.toString();
}

// ── Game loop ────────────────────────────────────────────────

function update() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  state.x += state.vx;
  state.y += state.vy;

  if (state.x - state.radius < 0 || state.x + state.radius > w) {
    state.vx *= -1;
    state.x = Math.max(state.radius, Math.min(w - state.radius, state.x));
  }
  if (state.y - state.radius < 0 || state.y + state.radius > h) {
    state.vy *= -1;
    state.y = Math.max(state.radius, Math.min(h - state.radius, state.y));
  }
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, w, h);

  // Grid lines for style
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Ball
  ctx.beginPath();
  ctx.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
  ctx.fillStyle = state.color;
  ctx.fill();

  // Glow
  ctx.beginPath();
  ctx.arc(state.x, state.y, state.radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = state.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Instructions
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click the ball! Replace this with your own game.', w / 2, h - 40);

  ctx.restore();
}

function frame() {
  update();
  draw();
  requestAnimationFrame(frame);
}

// ── Start ────────────────────────────────────────────────────

requestAnimationFrame(frame);

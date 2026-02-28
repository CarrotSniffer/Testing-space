import { Particle } from './types';

export function spawnTapParticles(x: number, y: number, value: number): Particle[] {
  const particles: Particle[] = [];
  // Gold coin bursts
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 0, maxLife: 30 + Math.random() * 20,
      color: `hsl(${45 + Math.random() * 15}, 90%, ${60 + Math.random() * 20}%)`,
      size: 3 + Math.random() * 3,
    });
  }
  // Floating number
  particles.push({
    x, y: y - 10,
    vx: 0, vy: -1.5,
    life: 0, maxLife: 50,
    color: '#4ade80',
    size: 14,
    text: '+$' + (value < 100 ? value.toFixed(1) : Math.floor(value).toString()),
  });
  return particles;
}

export function spawnWinParticles(x: number, y: number, amount: number): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(20, Math.max(8, Math.floor(Math.log10(amount + 1) * 5)));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 0, maxLife: 40 + Math.random() * 30,
      color: `hsl(${120 + Math.random() * 40}, 80%, ${50 + Math.random() * 30}%)`,
      size: 2 + Math.random() * 4,
    });
  }
  return particles;
}

export function spawnLoseParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0, maxLife: 25 + Math.random() * 15,
      color: `hsl(0, 70%, ${40 + Math.random() * 20}%)`,
      size: 2 + Math.random() * 3,
    });
  }
  return particles;
}

export function spawnPrestigeParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 3,
      life: 0, maxLife: 60 + Math.random() * 40,
      color: `hsl(${45 + Math.random() * 15}, 90%, ${70 + Math.random() * 20}%)`,
      size: 2 + Math.random() * 5,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const factor = dt / 16;
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * factor,
      y: p.y + p.vy * factor,
      vy: p.vy + 0.05 * factor, // gravity
      life: p.life + factor,
    }))
    .filter(p => p.life < p.maxLife);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    if (p.text) {
      ctx.font = `bold ${p.size}px -apple-system, system-ui, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * (1 - p.life / p.maxLife)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

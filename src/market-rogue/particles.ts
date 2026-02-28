import { Particle } from './types';

export function spawnGainParticles(x: number, y: number, amount: string): Particle[] {
  return [{
    x, y, vx: 0, vy: -1.2,
    life: 0, maxLife: 50,
    color: '#4ade80', size: 13,
    text: '+' + amount,
  }];
}

export function spawnLossParticles(x: number, y: number, amount: string): Particle[] {
  return [{
    x, y, vx: 0, vy: -0.8,
    life: 0, maxLife: 50,
    color: '#f87171', size: 13,
    text: '-' + amount,
  }];
}

export function spawnEventParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * (1 + Math.random() * 2),
      life: 0, maxLife: 40 + Math.random() * 20,
      color: ['#facc15', '#e94560', '#4ade80', '#3b82f6'][Math.floor(Math.random() * 4)],
      size: 3 + Math.random() * 3,
    });
  }
  return particles;
}

export function spawnBossParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h * 0.3,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1,
      life: 0, maxLife: 60 + Math.random() * 40,
      color: '#f87171',
      size: 2 + Math.random() * 4,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const step = dt / 16;
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * step,
      y: p.y + p.vy * step,
      life: p.life + step,
    }))
    .filter(p => p.life < p.maxLife);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = 1 - p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

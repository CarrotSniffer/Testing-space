import { Vec2 } from './types';

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Len(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Dist(a: Vec2, b: Vec2): number {
  return vec2Len(vec2Sub(a, b));
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Simple seeded PRNG (xorshift32)
export function createRng(seed: number) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// 2D Perlin noise
const PERM_SIZE = 256;
let perm: Uint8Array | null = null;
const grad2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export function initNoise(seed: number) {
  const rng = createRng(seed);
  perm = new Uint8Array(PERM_SIZE * 2);
  const base = new Uint8Array(PERM_SIZE);
  for (let i = 0; i < PERM_SIZE; i++) base[i] = i;
  // Fisher-Yates shuffle
  for (let i = PERM_SIZE - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < PERM_SIZE * 2; i++) {
    perm[i] = base[i % PERM_SIZE];
  }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

export function noise2d(x: number, y: number): number {
  if (!perm) initNoise(42);
  const p = perm!;

  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = p[p[xi] + yi];
  const ab = p[p[xi] + yi + 1];
  const ba = p[p[xi + 1] + yi];
  const bb = p[p[xi + 1] + yi + 1];

  const g00 = grad2[aa % 8];
  const g10 = grad2[ba % 8];
  const g01 = grad2[ab % 8];
  const g11 = grad2[bb % 8];

  const n00 = dot2(g00, xf, yf);
  const n10 = dot2(g10, xf - 1, yf);
  const n01 = dot2(g01, xf, yf - 1);
  const n11 = dot2(g11, xf - 1, yf - 1);

  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);

  return lerp(nx0, nx1, v);
}

// Layered noise (fractal Brownian motion)
export function fbm(x: number, y: number, octaves: number, lacunarity: number, gain: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxAmplitude;
}

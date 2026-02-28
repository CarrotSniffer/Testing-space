import { CameraState, Vec2 } from '../core/types';
import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, CHUNK_SIZE } from '../core/config';
import { clamp, lerp } from '../core/math';

export function createCamera(viewportW: number, viewportH: number): CameraState {
  return {
    x: (WORLD_WIDTH * TILE_SIZE) / 2,
    y: WORLD_HEIGHT * TILE_SIZE * 0.25,
    zoom: 1,
    viewportW,
    viewportH,
  };
}

export function cameraFollow(cam: CameraState, target: Vec2, alpha: number) {
  const smoothing = 0.1;
  cam.x = lerp(cam.x, target.x, smoothing);
  cam.y = lerp(cam.y, target.y, smoothing);

  // Clamp to world bounds
  const halfW = cam.viewportW / (2 * cam.zoom);
  const halfH = cam.viewportH / (2 * cam.zoom);
  const worldPxW = WORLD_WIDTH * TILE_SIZE;
  const worldPxH = WORLD_HEIGHT * TILE_SIZE;
  cam.x = clamp(cam.x, halfW, worldPxW - halfW);
  cam.y = clamp(cam.y, halfH, worldPxH - halfH);
}

export function cameraResize(cam: CameraState, w: number, h: number) {
  cam.viewportW = w;
  cam.viewportH = h;
}

// Returns an orthographic projection matrix as a flat Float32Array (column-major)
export function getCameraProjection(cam: CameraState): Float32Array {
  const halfW = cam.viewportW / (2 * cam.zoom);
  const halfH = cam.viewportH / (2 * cam.zoom);
  const left = cam.x - halfW;
  const right = cam.x + halfW;
  const top = cam.y - halfH;
  const bottom = cam.y + halfH;

  // Orthographic projection matrix (column-major for WebGL)
  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,  // flip Y so +Y is down (world coords)
    0, 0, -1, 0,
    -(right + left) / (right - left), -(top + bottom) / (top - bottom), 0, 1,
  ]);
}

export function screenToWorld(cam: CameraState, sx: number, sy: number): Vec2 {
  const halfW = cam.viewportW / (2 * cam.zoom);
  const halfH = cam.viewportH / (2 * cam.zoom);
  return {
    x: cam.x - halfW + (sx / cam.zoom),
    y: cam.y - halfH + (sy / cam.zoom),
  };
}

export function worldToScreen(cam: CameraState, wx: number, wy: number): Vec2 {
  const halfW = cam.viewportW / (2 * cam.zoom);
  const halfH = cam.viewportH / (2 * cam.zoom);
  return {
    x: (wx - cam.x + halfW) * cam.zoom,
    y: (wy - cam.y + halfH) * cam.zoom,
  };
}

// Get visible chunk coordinate ranges
export function getVisibleChunks(cam: CameraState): { x0: number; y0: number; x1: number; y1: number } {
  const halfW = cam.viewportW / (2 * cam.zoom);
  const halfH = cam.viewportH / (2 * cam.zoom);
  const chunkPx = CHUNK_SIZE * TILE_SIZE;

  const x0 = Math.max(0, Math.floor((cam.x - halfW) / chunkPx) - 1);
  const y0 = Math.max(0, Math.floor((cam.y - halfH) / chunkPx) - 1);
  const x1 = Math.min(Math.ceil(WORLD_WIDTH / CHUNK_SIZE) - 1, Math.ceil((cam.x + halfW) / chunkPx) + 1);
  const y1 = Math.min(Math.ceil(WORLD_HEIGHT / CHUNK_SIZE) - 1, Math.ceil((cam.y + halfH) / chunkPx) + 1);

  return { x0, y0, x1, y1 };
}

import { BlockId } from '../core/types';
import { WORLD_WIDTH, WORLD_HEIGHT, CHUNK_SIZE } from '../core/config';
import { isBlockSolid } from '../data/blocks';

export class WorldManager {
  readonly width: number;
  readonly height: number;
  readonly blocks: Uint16Array;

  // Track dirty chunks for renderer rebuild
  private dirtyChunks = new Set<string>();

  constructor(width: number, height: number, blocks?: Uint16Array) {
    this.width = width;
    this.height = height;
    this.blocks = blocks ?? new Uint16Array(width * height);
  }

  getBlock(x: number, y: number): BlockId {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.blocks[y * this.width + x];
  }

  setBlock(x: number, y: number, id: BlockId) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.blocks[y * this.width + x] = id;
    this.markDirty(x, y);

    // Also mark neighboring chunks if on a border
    const lx = x % CHUNK_SIZE;
    const ly = y % CHUNK_SIZE;
    if (lx === 0) this.markDirty(x - 1, y);
    if (lx === CHUNK_SIZE - 1) this.markDirty(x + 1, y);
    if (ly === 0) this.markDirty(x, y - 1);
    if (ly === CHUNK_SIZE - 1) this.markDirty(x, y + 1);
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      // Treat out-of-bounds bottom/sides as solid, top as air
      return y >= this.height || x < 0 || x >= this.width;
    }
    return isBlockSolid(this.blocks[y * this.width + x]);
  }

  markDirty(x: number, y: number) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    this.dirtyChunks.add(`${cx},${cy}`);
  }

  consumeDirtyChunks(): Set<string> {
    const chunks = new Set(this.dirtyChunks);
    this.dirtyChunks.clear();
    return chunks;
  }

  // Find the surface Y at a given X (first non-air block from top)
  getSurfaceY(x: number): number {
    for (let y = 0; y < this.height; y++) {
      if (this.blocks[y * this.width + x] !== 0) {
        return y;
      }
    }
    return this.height - 1;
  }
}

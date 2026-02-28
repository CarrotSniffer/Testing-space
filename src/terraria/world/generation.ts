import { WORLD_WIDTH, WORLD_HEIGHT, SURFACE_Y } from '../core/config';
import { initNoise, noise2d, fbm, createRng } from '../core/math';
import { BLOCK } from '../data/blocks';
import { WorldManager } from './world';

export function generateWorld(seed: number): WorldManager {
  initNoise(seed);
  const rng = createRng(seed);
  const world = new WorldManager(WORLD_WIDTH, WORLD_HEIGHT);
  const blocks = world.blocks;
  const W = WORLD_WIDTH;
  const H = WORLD_HEIGHT;

  // === 1. Generate surface heightmap ===
  const surfaceHeight = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    // Layered noise for natural-looking terrain
    const large = fbm(x * 0.003, 0.5, 3, 2.0, 0.5) * 50;
    const medium = fbm(x * 0.01, 1.5, 3, 2.0, 0.5) * 15;
    const small = noise2d(x * 0.05, 2.5) * 4;
    surfaceHeight[x] = SURFACE_Y + large + medium + small;
  }

  // === 2. Fill terrain layers ===
  for (let x = 0; x < W; x++) {
    const surface = Math.floor(surfaceHeight[x]);
    for (let y = 0; y < H; y++) {
      const idx = y * W + x;
      const depth = y - surface;

      if (depth < 0) {
        // Above surface = air
        blocks[idx] = BLOCK.AIR;
      } else if (depth === 0) {
        // Surface block
        blocks[idx] = BLOCK.GRASS;
      } else if (depth < 4 + Math.floor(rng() * 3)) {
        // Dirt layer
        blocks[idx] = BLOCK.DIRT;
      } else if (y >= H - 3) {
        // Bedrock at bottom
        blocks[idx] = BLOCK.BEDROCK;
      } else {
        // Stone
        blocks[idx] = BLOCK.STONE;
      }
    }
  }

  // === 3. Carve caves using layered Perlin noise ===
  for (let x = 0; x < W; x++) {
    const surface = Math.floor(surfaceHeight[x]);
    for (let y = surface + 5; y < H - 5; y++) {
      const depth = y - surface;

      // Large caves
      const cave1 = noise2d(x * 0.02, y * 0.02);
      // Small tunnels
      const cave2 = noise2d(x * 0.06, y * 0.06);
      // Worm-like caves using two noise channels
      const wormX = noise2d(x * 0.035 + 100, y * 0.035);
      const wormY = noise2d(x * 0.035, y * 0.035 + 100);
      const worm = wormX * wormX + wormY * wormY;

      // Cave density increases with depth
      const depthFactor = Math.min(1.0, depth / 200);
      const caveThreshold = 0.55 - depthFactor * 0.1;

      if (cave1 > caveThreshold || cave2 > 0.65 || worm < 0.01) {
        blocks[y * W + x] = BLOCK.AIR;
      }
    }
  }

  // === 4. Place ores ===
  for (let x = 0; x < W; x++) {
    const surface = Math.floor(surfaceHeight[x]);
    for (let y = surface + 3; y < H - 3; y++) {
      if (blocks[y * W + x] !== BLOCK.STONE) continue;

      const depth = y - surface;
      const oreNoise = rng();

      // Copper: shallow, common
      if (depth > 5 && depth < 400 && oreNoise < 0.008) {
        placeOreVein(blocks, W, H, x, y, BLOCK.COPPER_ORE, 3 + Math.floor(rng() * 5), rng);
      }
      // Iron: medium depth
      if (depth > 40 && depth < 600 && oreNoise > 0.99) {
        placeOreVein(blocks, W, H, x, y, BLOCK.IRON_ORE, 3 + Math.floor(rng() * 4), rng);
      }
      // Silver: deeper
      if (depth > 100 && depth < 700 && oreNoise > 0.994) {
        placeOreVein(blocks, W, H, x, y, BLOCK.SILVER_ORE, 2 + Math.floor(rng() * 4), rng);
      }
      // Gold: deepest, rarest
      if (depth > 200 && oreNoise > 0.997) {
        placeOreVein(blocks, W, H, x, y, BLOCK.GOLD_ORE, 2 + Math.floor(rng() * 3), rng);
      }
    }
  }

  // === 5. Place clay pockets near surface ===
  for (let x = 0; x < W; x++) {
    const surface = Math.floor(surfaceHeight[x]);
    for (let y = surface + 2; y < surface + 30; y++) {
      if (y >= H || blocks[y * W + x] !== BLOCK.DIRT) continue;
      const clayNoise = noise2d(x * 0.1 + 50, y * 0.1 + 50);
      if (clayNoise > 0.55) {
        blocks[y * W + x] = BLOCK.CLAY;
      }
    }
  }

  // === 6. Generate trees on surface ===
  let lastTreeX = -10;
  for (let x = 5; x < W - 5; x++) {
    if (x - lastTreeX < 4) continue;

    const surface = Math.floor(surfaceHeight[x]);
    if (blocks[surface * W + x] !== BLOCK.GRASS) continue;

    // Check flat ground (surface height similar for 3 blocks)
    const leftH = Math.floor(surfaceHeight[x - 1]);
    const rightH = Math.floor(surfaceHeight[x + 1]);
    if (Math.abs(leftH - surface) > 1 || Math.abs(rightH - surface) > 1) continue;

    if (rng() < 0.15) {
      placeTree(blocks, W, x, surface, rng);
      lastTreeX = x;
    }
  }

  // === 7. Find and set spawn point ===
  // Already handled externally — world just provides getSurfaceY()

  return world;
}

function placeOreVein(
  blocks: Uint16Array, W: number, H: number,
  startX: number, startY: number,
  oreId: number, size: number, rng: () => number,
) {
  let cx = startX;
  let cy = startY;
  for (let i = 0; i < size; i++) {
    if (cx >= 0 && cx < W && cy >= 3 && cy < H - 3) {
      if (blocks[cy * W + cx] === BLOCK.STONE) {
        blocks[cy * W + cx] = oreId;
      }
    }
    // Random walk
    const dir = rng();
    if (dir < 0.25) cx--;
    else if (dir < 0.5) cx++;
    else if (dir < 0.75) cy--;
    else cy++;
  }
}

function placeTree(
  blocks: Uint16Array, W: number,
  x: number, surfaceY: number, rng: () => number,
) {
  const trunkHeight = 5 + Math.floor(rng() * 6);
  const trunkTop = surfaceY - trunkHeight;

  // Trunk
  for (let y = surfaceY - 1; y >= trunkTop; y--) {
    blocks[y * W + x] = BLOCK.WOOD;
  }

  // Leaf canopy (oval shape)
  const leafRadius = 2 + Math.floor(rng() * 2);
  const leafHeight = leafRadius + 1 + Math.floor(rng() * 2);
  const leafCenterY = trunkTop - 1;

  for (let dy = -leafHeight; dy <= 1; dy++) {
    const rowWidth = Math.ceil(leafRadius * (1 - Math.abs(dy) / (leafHeight + 1)));
    for (let dx = -rowWidth; dx <= rowWidth; dx++) {
      const lx = x + dx;
      const ly = leafCenterY + dy;
      if (lx >= 0 && lx < W && ly >= 0 && blocks[ly * W + lx] === BLOCK.AIR) {
        blocks[ly * W + lx] = BLOCK.LEAVES;
      }
    }
  }
}

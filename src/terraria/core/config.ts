export const TILE_SIZE = 16;
export const WORLD_WIDTH = 4200;
export const WORLD_HEIGHT = 1200;
export const CHUNK_SIZE = 32;
export const SURFACE_Y = 300;

// --- Terraria-accurate physics (values from decompiled source) ---
// All values are in pixels/tick at 60 ticks/sec, tiles are 16px

// Gravity & falling
export const GRAVITY = 0.4;               // 0.4 px/tick² (Terraria default)
export const MAX_FALL_SPEED = 10;          // ~37.5 tiles/sec terminal velocity

// Horizontal movement (Terraria uses linear accel/decel, NOT multiplicative friction)
export const RUN_ACCELERATION = 0.08;      // px/tick² when pressing direction
export const RUN_SLOWDOWN = 0.2;           // px/tick² friction when NOT pressing direction
export const MAX_RUN_SPEED = 3.0;          // 15 mph = 11.36 tiles/sec = ~3 px/tick

// Jump (variable-height: hold to sustain upward velocity)
export const JUMP_SPEED = 5.01;            // upward velocity during jump (px/tick)
export const JUMP_DURATION = 15;           // ticks of sustained jump before gravity takes over

// Fall damage
export const SAFE_FALL_TILES = 25;         // no damage up to this
export const FALL_DAMAGE_MULT = 10;        // damage = 10 * (fallTiles - 25)

// Player dimensions
export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 42;

// Reach range (rectangular, NOT circular — Terraria uses tileRangeX/tileRangeY)
export const REACH_RANGE_X = 5;            // tiles horizontal from player center
export const REACH_RANGE_Y = 4;            // tiles vertical from player center

export const TICK_RATE = 60;
export const DAY_LENGTH = 900;
export const ATLAS_SIZE = 512;

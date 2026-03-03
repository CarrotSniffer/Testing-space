import { PlayerEntity, InputState } from '../core/types';
import {
  PLAYER_WIDTH, PLAYER_HEIGHT,
  RUN_ACCELERATION, RUN_SLOWDOWN, MAX_RUN_SPEED,
  JUMP_SPEED, JUMP_DURATION,
  TILE_SIZE, SAFE_FALL_TILES, FALL_DAMAGE_MULT,
} from '../core/config';
import { createInventory } from '../systems/inventory';

export function createPlayer(x: number, y: number): PlayerEntity {
  return {
    type: 'player',
    id: 0,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    size: { x: PLAYER_WIDTH, y: PLAYER_HEIGHT },
    onGround: false,
    facingRight: true,
    hp: 100,
    maxHp: 100,
    invulnTimer: 0,
    inventory: createInventory(40, 10),
    miningTarget: null,
    jumpHeld: false,
    jumpTimer: 0,
    fallStartY: y,
    isFalling: false,
    attackCooldown: 0,
    selectedSlot: 0,
  };
}

export function updatePlayer(player: PlayerEntity, input: InputState): number {
  // --- Horizontal movement (Terraria-style linear accel/decel) ---
  if (input.left && !input.right) {
    player.facingRight = false;
    if (player.vel.x > -MAX_RUN_SPEED) {
      player.vel.x -= RUN_ACCELERATION;
      if (player.vel.x < -MAX_RUN_SPEED) player.vel.x = -MAX_RUN_SPEED;
    }
  } else if (input.right && !input.left) {
    player.facingRight = true;
    if (player.vel.x < MAX_RUN_SPEED) {
      player.vel.x += RUN_ACCELERATION;
      if (player.vel.x > MAX_RUN_SPEED) player.vel.x = MAX_RUN_SPEED;
    }
  } else {
    // No input — apply friction (linear deceleration, like Terraria's runSlowdown)
    if (player.vel.x > 0) {
      player.vel.x -= RUN_SLOWDOWN;
      if (player.vel.x < 0) player.vel.x = 0;
    } else if (player.vel.x < 0) {
      player.vel.x += RUN_SLOWDOWN;
      if (player.vel.x > 0) player.vel.x = 0;
    }
  }

  // --- Variable-height jump (Terraria-style) ---
  // Phase 1: On the ground, pressing jump starts the jump
  if (input.jump && player.onGround && !player.jumpHeld) {
    player.vel.y = -JUMP_SPEED;
    player.jumpTimer = JUMP_DURATION;
    player.onGround = false;
  }

  // Phase 2: While holding jump and jumpTimer > 0, sustain upward velocity
  // (prevents gravity from slowing ascent — this is what gives variable jump height)
  if (input.jump && player.jumpTimer > 0 && !player.onGround) {
    player.vel.y = -JUMP_SPEED;
    player.jumpTimer--;
  }

  // Releasing jump cancels sustained ascent immediately
  if (!input.jump) {
    player.jumpTimer = 0;
  }

  player.jumpHeld = input.jump;

  // --- Fall tracking (for fall damage) ---
  let fallDamage = 0;

  if (!player.onGround && player.vel.y > 0) {
    // Currently falling
    if (!player.isFalling) {
      // Just started falling — record the Y position
      player.fallStartY = player.pos.y;
      player.isFalling = true;
    }
  }

  if (player.onGround && player.isFalling) {
    // Just landed — calculate fall distance
    const fallPixels = player.pos.y - player.fallStartY;
    const fallTiles = fallPixels / TILE_SIZE;

    if (fallTiles > SAFE_FALL_TILES) {
      fallDamage = Math.floor(FALL_DAMAGE_MULT * (fallTiles - SAFE_FALL_TILES));
    }

    player.isFalling = false;
  }

  // Reset fall tracking when on ground
  if (player.onGround) {
    player.fallStartY = player.pos.y;
    player.isFalling = false;
  }

  // --- Hotbar selection (number keys) ---
  if (input.hotbarSelect >= 0) {
    player.selectedSlot = input.hotbarSelect;
    player.inventory.selectedSlot = input.hotbarSelect;
  }

  // --- Scroll wheel hotbar cycling ---
  if (input.scrollDelta !== 0) {
    let slot = player.selectedSlot + input.scrollDelta;
    if (slot < 0) slot = player.inventory.hotbarSize - 1;
    if (slot >= player.inventory.hotbarSize) slot = 0;
    player.selectedSlot = slot;
    player.inventory.selectedSlot = slot;
  }

  // Tick timers
  if (player.invulnTimer > 0) player.invulnTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;

  return fallDamage;
}

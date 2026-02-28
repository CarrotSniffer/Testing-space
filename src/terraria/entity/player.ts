import { PlayerEntity, InputState } from '../core/types';
import { PLAYER_SPEED, PLAYER_JUMP, PLAYER_WIDTH, PLAYER_HEIGHT } from '../core/config';
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
    attackCooldown: 0,
    selectedSlot: 0,
  };
}

export function updatePlayer(player: PlayerEntity, input: InputState) {
  // Horizontal movement
  if (input.left) {
    player.vel.x = -PLAYER_SPEED;
    player.facingRight = false;
  } else if (input.right) {
    player.vel.x = PLAYER_SPEED;
    player.facingRight = true;
  } else {
    // Friction
    player.vel.x *= 0.65;
    if (Math.abs(player.vel.x) < 0.1) player.vel.x = 0;
  }

  // Jump
  if (input.jump && player.onGround && !player.jumpHeld) {
    player.vel.y = PLAYER_JUMP;
    player.onGround = false;
  }
  player.jumpHeld = input.jump;

  // Hotbar selection
  if (input.hotbarSelect >= 0) {
    player.selectedSlot = input.hotbarSelect;
    player.inventory.selectedSlot = input.hotbarSelect;
  }

  // Tick invuln timer
  if (player.invulnTimer > 0) player.invulnTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
}

import { ItemDropEntity, ItemStack, Vec2, PlayerEntity } from '../core/types';
import { TILE_SIZE } from '../core/config';
import { addItem } from '../systems/inventory';

export function createItemDrop(
  id: number,
  pos: Vec2,
  item: ItemStack,
): ItemDropEntity {
  return {
    type: 'item_drop',
    id,
    pos: { x: pos.x, y: pos.y },
    vel: { x: (Math.random() - 0.5) * 3, y: -3 - Math.random() * 2 },
    size: { x: 10, y: 10 },
    onGround: false,
    facingRight: true,
    hp: 1,
    maxHp: 1,
    invulnTimer: 0,
    item: { ...item },
    pickupDelay: 30, // half second before pickup
    lifetime: 60 * 60 * 5, // 5 minutes
  };
}

export function updateItemDrop(drop: ItemDropEntity) {
  if (drop.pickupDelay > 0) drop.pickupDelay--;
  drop.lifetime--;

  // Float bob effect when on ground
  if (drop.onGround) {
    drop.vel.x *= 0.9;
  }
}

export function tryPickup(drop: ItemDropEntity, player: PlayerEntity): boolean {
  if (drop.pickupDelay > 0) return false;

  // Check distance to player
  const dx = (drop.pos.x + 5) - (player.pos.x + player.size.x / 2);
  const dy = (drop.pos.y + 5) - (player.pos.y + player.size.y / 2);
  const pickupRange = TILE_SIZE * 2.5;

  if (dx * dx + dy * dy > pickupRange * pickupRange) return false;

  // Try to add to inventory
  const itemCopy = { ...drop.item };
  if (addItem(player.inventory, itemCopy)) {
    drop.lifetime = 0; // mark for removal
    return true;
  }

  return false;
}

// Magnetic pull toward player when close
export function magneticPull(drop: ItemDropEntity, player: PlayerEntity) {
  if (drop.pickupDelay > 0) return;

  const dx = (player.pos.x + player.size.x / 2) - (drop.pos.x + 5);
  const dy = (player.pos.y + player.size.y / 2) - (drop.pos.y + 5);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const pullRange = TILE_SIZE * 4;

  if (dist < pullRange && dist > 1) {
    const strength = 0.15 * (1 - dist / pullRange);
    drop.vel.x += (dx / dist) * strength * 5;
    drop.vel.y += (dy / dist) * strength * 5;
  }
}

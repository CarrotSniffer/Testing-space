import { Inventory, ItemStack, PlayerEntity } from '../core/types';
import { getItemDef } from '../data/items';

export function createInventory(totalSlots: number, hotbarSize: number): Inventory {
  return {
    slots: new Array(totalSlots).fill(null),
    hotbarSize,
    selectedSlot: 0,
  };
}

export function addItem(inv: Inventory, item: ItemStack): boolean {
  const def = getItemDef(item.itemId);
  if (def.maxStack === 0) return false;

  // First try to stack with existing matching slots
  for (let i = 0; i < inv.slots.length; i++) {
    const slot = inv.slots[i];
    if (slot && slot.itemId === item.itemId && slot.count < def.maxStack) {
      const space = def.maxStack - slot.count;
      const add = Math.min(space, item.count);
      slot.count += add;
      item.count -= add;
      if (item.count <= 0) return true;
    }
  }

  // Then find first empty slot
  for (let i = 0; i < inv.slots.length; i++) {
    if (!inv.slots[i]) {
      inv.slots[i] = { itemId: item.itemId, count: item.count };
      item.count = 0;
      return true;
    }
  }

  return false; // inventory full
}

export function removeItem(inv: Inventory, itemId: number, count: number): boolean {
  let remaining = count;

  // Check we have enough first
  let total = 0;
  for (const slot of inv.slots) {
    if (slot && slot.itemId === itemId) total += slot.count;
  }
  if (total < count) return false;

  // Remove from slots
  for (let i = 0; i < inv.slots.length; i++) {
    const slot = inv.slots[i];
    if (!slot || slot.itemId !== itemId) continue;

    const take = Math.min(slot.count, remaining);
    slot.count -= take;
    remaining -= take;

    if (slot.count <= 0) inv.slots[i] = null;
    if (remaining <= 0) break;
  }

  return true;
}

export function countItem(inv: Inventory, itemId: number): number {
  let total = 0;
  for (const slot of inv.slots) {
    if (slot && slot.itemId === itemId) total += slot.count;
  }
  return total;
}

export function getHeldItemDef(player: PlayerEntity) {
  const slot = player.inventory.slots[player.selectedSlot];
  if (!slot) return null;
  return getItemDef(slot.itemId);
}

export function getHeldStack(player: PlayerEntity): ItemStack | null {
  return player.inventory.slots[player.selectedSlot];
}

export function consumeHeldItem(player: PlayerEntity, count: number) {
  const slot = player.inventory.slots[player.selectedSlot];
  if (!slot) return;
  slot.count -= count;
  if (slot.count <= 0) {
    player.inventory.slots[player.selectedSlot] = null;
  }
}

export function swapSlots(inv: Inventory, a: number, b: number) {
  const tmp = inv.slots[a];
  inv.slots[a] = inv.slots[b];
  inv.slots[b] = tmp;
}

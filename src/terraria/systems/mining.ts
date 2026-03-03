import { PlayerEntity, InputState } from '../core/types';
import { TILE_SIZE, REACH_RANGE_X, REACH_RANGE_Y } from '../core/config';
import { WorldManager } from '../world/world';
import { getBlockDef, BLOCK } from '../data/blocks';
import { getHeldItemDef, getHeldStack, consumeHeldItem, addItem } from './inventory';
import { getItemDef } from '../data/items';

export interface MiningState {
  tx: number;
  ty: number;
  progress: number;
  maxProgress: number;
}

export class MiningSystem {
  miningState: MiningState | null = null;

  update(player: PlayerEntity, world: WorldManager, input: InputState) {
    this.handleMining(player, world, input);
    this.handlePlacing(player, world, input);
  }

  private handleMining(player: PlayerEntity, world: WorldManager, input: InputState) {
    if (!input.attack) {
      this.miningState = null;
      return;
    }

    // Convert cursor to tile coordinates
    const tx = Math.floor(input.cursorWorld.x / TILE_SIZE);
    const ty = Math.floor(input.cursorWorld.y / TILE_SIZE);

    // Check reach — Terraria uses rectangular range (tileRangeX / tileRangeY), NOT circular
    const pcx = (player.pos.x + player.size.x / 2) / TILE_SIZE;
    const pcy = (player.pos.y + player.size.y / 2) / TILE_SIZE;
    const dx = Math.abs(tx + 0.5 - pcx);
    const dy = Math.abs(ty + 0.5 - pcy);
    if (dx > REACH_RANGE_X || dy > REACH_RANGE_Y) {
      this.miningState = null;
      return;
    }

    const blockId = world.getBlock(tx, ty);
    if (blockId === BLOCK.AIR) {
      this.miningState = null;
      return;
    }

    const blockDef = getBlockDef(blockId);
    if (blockDef.hardness < 0) {
      // Unbreakable
      this.miningState = null;
      return;
    }

    // Start or continue mining
    if (!this.miningState || this.miningState.tx !== tx || this.miningState.ty !== ty) {
      this.miningState = {
        tx,
        ty,
        progress: 0,
        maxProgress: blockDef.hardness,
      };
    }

    // Tool power affects mining speed
    const heldDef = getHeldItemDef(player);
    let power = 1;
    if (heldDef && heldDef.isTool) {
      if (heldDef.toolType === 'pickaxe') power = heldDef.toolPower;
      if (heldDef.toolType === 'axe' && (blockId === BLOCK.WOOD || blockId === BLOCK.PLANKS)) {
        power = heldDef.toolPower * 1.5;
      }
    }

    this.miningState.progress += power;

    // Check if block is broken
    if (this.miningState.progress >= this.miningState.maxProgress) {
      // Break the block
      world.setBlock(tx, ty, BLOCK.AIR);

      // Drop item
      if (blockDef.dropItemId > 0) {
        addItem(player.inventory, { itemId: blockDef.dropItemId, count: 1 });
      }

      this.miningState = null;
    }
  }

  private handlePlacing(player: PlayerEntity, world: WorldManager, input: InputState) {
    if (!input.interact) return;

    const heldStack = getHeldStack(player);
    if (!heldStack) return;

    const heldDef = getItemDef(heldStack.itemId);
    if (!heldDef.isPlaceable) return;

    // Target tile
    const tx = Math.floor(input.cursorWorld.x / TILE_SIZE);
    const ty = Math.floor(input.cursorWorld.y / TILE_SIZE);

    // Check reach — rectangular (Terraria tileRangeX/Y)
    const pcx = (player.pos.x + player.size.x / 2) / TILE_SIZE;
    const pcy = (player.pos.y + player.size.y / 2) / TILE_SIZE;
    const dx = Math.abs(tx + 0.5 - pcx);
    const dy = Math.abs(ty + 0.5 - pcy);
    if (dx > REACH_RANGE_X || dy > REACH_RANGE_Y) return;

    // Target must be air
    if (world.getBlock(tx, ty) !== BLOCK.AIR) return;

    // Must be adjacent to at least one solid block
    const hasNeighbor =
      world.getBlock(tx - 1, ty) !== BLOCK.AIR ||
      world.getBlock(tx + 1, ty) !== BLOCK.AIR ||
      world.getBlock(tx, ty - 1) !== BLOCK.AIR ||
      world.getBlock(tx, ty + 1) !== BLOCK.AIR;
    if (!hasNeighbor) return;

    // Don't place inside the player
    const blockLeft = tx * TILE_SIZE;
    const blockTop = ty * TILE_SIZE;
    const blockRight = blockLeft + TILE_SIZE;
    const blockBottom = blockTop + TILE_SIZE;
    const playerRight = player.pos.x + player.size.x;
    const playerBottom = player.pos.y + player.size.y;
    if (
      blockRight > player.pos.x && blockLeft < playerRight &&
      blockBottom > player.pos.y && blockTop < playerBottom
    ) {
      return;
    }

    // Place the block
    world.setBlock(tx, ty, heldDef.placesBlock);
    consumeHeldItem(player, 1);
  }
}

import { EntityBase } from '../core/types';
import { TILE_SIZE, GRAVITY, MAX_FALL_SPEED } from '../core/config';
import { WorldManager } from '../world/world';

export class PhysicsEngine {
  applyGravity(entity: EntityBase) {
    entity.vel.y = Math.min(entity.vel.y + GRAVITY, MAX_FALL_SPEED);
  }

  moveAndCollide(entity: EntityBase, world: WorldManager) {
    // Apply gravity first
    this.applyGravity(entity);

    // Move on X axis, then resolve (with auto-step)
    entity.pos.x += entity.vel.x;
    this.resolveX(entity, world);

    // Move on Y axis, then resolve
    entity.pos.y += entity.vel.y;
    entity.onGround = false;
    this.resolveY(entity, world);
  }

  private resolveX(entity: EntityBase, world: WorldManager) {
    const left = entity.pos.x;
    const right = entity.pos.x + entity.size.x;
    const top = entity.pos.y;
    const bottom = entity.pos.y + entity.size.y;

    const tx0 = Math.floor(left / TILE_SIZE);
    const tx1 = Math.floor((right - 0.01) / TILE_SIZE);
    const ty0 = Math.floor(top / TILE_SIZE);
    const ty1 = Math.floor((bottom - 0.01) / TILE_SIZE);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!world.isSolid(tx, ty)) continue;

        const tileLeft = tx * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;

        if (right > tileLeft && left < tileRight) {
          if (entity.vel.x > 0) {
            // Moving right — try auto-step before blocking
            if (this.tryAutoStep(entity, world, tx, ty, 1)) return;
            entity.pos.x = tileLeft - entity.size.x;
            entity.vel.x = 0;
          } else if (entity.vel.x < 0) {
            // Moving left — try auto-step before blocking
            if (this.tryAutoStep(entity, world, tx, ty, -1)) return;
            entity.pos.x = tileRight;
            entity.vel.x = 0;
          }
        }
      }
    }
  }

  /**
   * Terraria auto-step: when walking into a 1-block ledge, automatically
   * step up onto it without losing speed. Only works when on the ground
   * and the block above the ledge (and above the player's head) is air.
   */
  private tryAutoStep(entity: EntityBase, world: WorldManager, blockTx: number, blockTy: number, dir: number): boolean {
    // Only auto-step when on (or very near) the ground
    if (!entity.onGround && entity.vel.y < -0.5) return false;

    // The blocking tile must be at foot level (bottom row of tiles the entity overlaps)
    const entityBottomTile = Math.floor((entity.pos.y + entity.size.y - 0.01) / TILE_SIZE);
    if (blockTy !== entityBottomTile) return false;

    // Check that the tile above the blocking one is air (the space we'd step into)
    const aboveTy = blockTy - 1;
    if (world.isSolid(blockTx, aboveTy)) return false;

    // Check there's headroom: above the step-up position, the whole entity height must fit
    const steppedY = aboveTy * TILE_SIZE - entity.size.y + TILE_SIZE;
    const headTy = Math.floor(steppedY / TILE_SIZE);
    for (let ty = headTy; ty < aboveTy; ty++) {
      // Check all columns the entity spans
      const eLeft = Math.floor(entity.pos.x / TILE_SIZE);
      const eRight = Math.floor((entity.pos.x + entity.size.x - 0.01) / TILE_SIZE);
      for (let tx = eLeft; tx <= eRight; tx++) {
        if (world.isSolid(tx, ty)) return false;
      }
    }

    // Step up! Move entity up by one tile
    entity.pos.y = (blockTy - 1) * TILE_SIZE - entity.size.y + TILE_SIZE;
    return true;
  }

  private resolveY(entity: EntityBase, world: WorldManager) {
    const left = entity.pos.x;
    const right = entity.pos.x + entity.size.x;
    const top = entity.pos.y;
    const bottom = entity.pos.y + entity.size.y;

    const tx0 = Math.floor(left / TILE_SIZE);
    const tx1 = Math.floor((right - 0.01) / TILE_SIZE);
    const ty0 = Math.floor(top / TILE_SIZE);
    const ty1 = Math.floor((bottom - 0.01) / TILE_SIZE);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!world.isSolid(tx, ty)) continue;

        const tileTop = ty * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;

        if (bottom > tileTop && top < tileBottom) {
          if (entity.vel.y > 0) {
            // Falling down, land on top of tile
            entity.pos.y = tileTop - entity.size.y;
            entity.vel.y = 0;
            entity.onGround = true;
          } else if (entity.vel.y < 0) {
            // Jumping up, hit ceiling
            entity.pos.y = tileBottom;
            entity.vel.y = 0;
          }
        }
      }
    }
  }
}

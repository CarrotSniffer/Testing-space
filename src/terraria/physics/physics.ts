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

    // Move on X axis, then resolve
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

    // Tile range the entity overlaps
    const tx0 = Math.floor(left / TILE_SIZE);
    const tx1 = Math.floor((right - 0.01) / TILE_SIZE);
    const ty0 = Math.floor(top / TILE_SIZE);
    const ty1 = Math.floor((bottom - 0.01) / TILE_SIZE);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!world.isSolid(tx, ty)) continue;

        const tileLeft = tx * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;

        // Check overlap
        if (right > tileLeft && left < tileRight) {
          if (entity.vel.x > 0) {
            // Moving right, push left
            entity.pos.x = tileLeft - entity.size.x;
            entity.vel.x = 0;
          } else if (entity.vel.x < 0) {
            // Moving left, push right
            entity.pos.x = tileRight;
            entity.vel.x = 0;
          }
        }
      }
    }
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

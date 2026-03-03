import { Entity, PlayerEntity, EnemyEntity, EnemyType, InputState, ItemStack, Vec2, CameraState, GameClock } from '../core/types';
import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, SURFACE_Y } from '../core/config';
import { createPlayer, updatePlayer } from './player';
import { createEnemy, updateEnemy, isFlyer } from './enemy';
import { createItemDrop, updateItemDrop, tryPickup, magneticPull } from './item-drop';
import { PhysicsEngine } from '../physics/physics';
import { WorldManager } from '../world/world';
import { ENEMY_DEFS, getEnemyDef } from '../data/enemies';
import { ITEM } from '../data/ids';

const MAX_ENEMIES = 15;
const SPAWN_INTERVAL = 120; // frames between spawn attempts
const SPAWN_RANGE_MIN = 400; // min px from player
const SPAWN_RANGE_MAX = 800; // max px from player

export class EntityManager {
  player: PlayerEntity;
  entities: Entity[] = [];
  lastFallDamage = 0;   // fall damage from last update tick
  private nextId = 1;
  private spawnTimer = SPAWN_INTERVAL;

  constructor(spawnX: number, spawnY: number) {
    this.player = createPlayer(spawnX, spawnY);
  }

  update(input: InputState, physics: PhysicsEngine, world: WorldManager) {
    this.lastFallDamage = updatePlayer(this.player, input);

    for (const entity of this.entities) {
      switch (entity.type) {
        case 'enemy':
          updateEnemy(entity, this.player.pos, world);
          if (isFlyer(entity.enemyType)) {
            // Flyers: just move by velocity, no gravity
            entity.pos.x += entity.vel.x;
            entity.pos.y += entity.vel.y;
          } else {
            physics.moveAndCollide(entity, world);
          }
          break;
        case 'item_drop':
          magneticPull(entity, this.player);
          updateItemDrop(entity);
          physics.moveAndCollide(entity, world);
          tryPickup(entity, this.player);
          break;
        case 'projectile':
          entity.lifetime--;
          entity.pos.x += entity.vel.x;
          entity.pos.y += entity.vel.y;
          break;
      }
    }

    this.cleanup();
  }

  getEnemies(): EnemyEntity[] {
    return this.entities.filter((e): e is EnemyEntity => e.type === 'enemy');
  }

  spawnEnemies(world: WorldManager, clock: GameClock, camera: CameraState) {
    this.spawnTimer--;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = SPAWN_INTERVAL;

    const enemyCount = this.entities.filter((e) => e.type === 'enemy').length;
    if (enemyCount >= MAX_ENEMIES) return;

    // Pick random position near player but off-screen
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_RANGE_MIN + Math.random() * (SPAWN_RANGE_MAX - SPAWN_RANGE_MIN);
    const sx = this.player.pos.x + Math.cos(angle) * dist;
    const sy = this.player.pos.y + Math.sin(angle) * dist;

    // Tile coordinates
    const tx = Math.floor(sx / TILE_SIZE);
    const ty = Math.floor(sy / TILE_SIZE);

    if (tx < 2 || tx >= WORLD_WIDTH - 2 || ty < 2 || ty >= WORLD_HEIGHT - 2) return;

    // Determine depth (tiles below surface)
    const surfaceY = world.getSurfaceY(tx);
    const depth = ty - surfaceY;

    // Pick eligible enemy type
    const eligible: EnemyType[] = [];
    const weights: number[] = [];

    for (const [type, def] of Object.entries(ENEMY_DEFS)) {
      if (def.nightOnly && !clock.isNight) continue;
      if (depth < def.minDepth || depth > def.maxDepth) continue;
      eligible.push(type as EnemyType);
      weights.push(def.spawnWeight);
    }

    if (eligible.length === 0) return;

    const picked = weightedRandom(eligible, weights);
    const def = getEnemyDef(picked);

    // For ground enemies, find a valid ground position
    if (!isFlyer(picked)) {
      // Need air above and solid below
      let groundY = -1;
      for (let y = ty; y < ty + 10 && y < WORLD_HEIGHT; y++) {
        if (!world.isSolid(tx, y) && world.isSolid(tx, y + 1)) {
          groundY = y;
          break;
        }
      }
      if (groundY < 0) return;

      const spawnPxX = tx * TILE_SIZE;
      const spawnPxY = groundY * TILE_SIZE - def.height;
      this.entities.push(createEnemy(this.getNextId(), picked, spawnPxX, spawnPxY));
    } else {
      // Flyers: just need air
      if (world.isSolid(tx, ty)) return;
      const spawnPxX = tx * TILE_SIZE;
      const spawnPxY = ty * TILE_SIZE;
      this.entities.push(createEnemy(this.getNextId(), picked, spawnPxX, spawnPxY));
    }
  }

  spawnItemDrop(pos: Vec2, item: ItemStack) {
    this.entities.push(createItemDrop(this.getNextId(), pos, item));
  }

  // Drop loot when enemy dies
  handleEnemyDeath(enemy: EnemyEntity) {
    const cx = enemy.pos.x + enemy.size.x / 2;
    const cy = enemy.pos.y + enemy.size.y / 2;

    // All enemies can drop gel
    if (enemy.enemyType === 'slime') {
      this.spawnItemDrop({ x: cx, y: cy }, { itemId: ITEM.GEL, count: 1 + Math.floor(Math.random() * 3) });
    }

    // Chance to drop copper ore or other materials
    if (Math.random() < 0.15) {
      this.spawnItemDrop({ x: cx, y: cy }, { itemId: ITEM.COPPER_ORE, count: 1 });
    }
    if (Math.random() < 0.08) {
      this.spawnItemDrop({ x: cx, y: cy }, { itemId: ITEM.TORCH, count: 2 + Math.floor(Math.random() * 3) });
    }
  }

  private cleanup() {
    this.entities = this.entities.filter((e) => {
      if (e.type === 'enemy' && e.hp <= 0) return false;
      if (e.type === 'projectile' && e.lifetime <= 0) return false;
      if (e.type === 'item_drop' && e.lifetime <= 0) return false;
      return true;
    });

    // Despawn enemies too far from player
    const despawnRange = TILE_SIZE * 80;
    this.entities = this.entities.filter((e) => {
      if (e.type !== 'enemy') return true;
      const dx = e.pos.x - this.player.pos.x;
      const dy = e.pos.y - this.player.pos.y;
      return dx * dx + dy * dy < despawnRange * despawnRange;
    });
  }

  getNextId(): number {
    return this.nextId++;
  }
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

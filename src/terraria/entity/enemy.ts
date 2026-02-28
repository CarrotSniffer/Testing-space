import { EnemyEntity, EnemyType, Vec2 } from '../core/types';
import { TILE_SIZE } from '../core/config';
import { getEnemyDef } from '../data/enemies';
import { WorldManager } from '../world/world';

export function createEnemy(id: number, type: EnemyType, x: number, y: number): EnemyEntity {
  const def = getEnemyDef(type);
  return {
    type: 'enemy',
    id,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    size: { x: def.width, y: def.height },
    onGround: false,
    facingRight: Math.random() > 0.5,
    hp: def.hp,
    maxHp: def.hp,
    invulnTimer: 0,
    enemyType: type,
    aiState: 'idle',
    aiTimer: 30 + Math.random() * 60,
    contactDamage: def.contactDamage,
  };
}

export function updateEnemy(enemy: EnemyEntity, playerPos: Vec2, world: WorldManager) {
  if (enemy.invulnTimer > 0) enemy.invulnTimer--;
  enemy.aiTimer--;

  switch (enemy.enemyType) {
    case 'slime':
      updateSlime(enemy, playerPos);
      break;
    case 'zombie':
    case 'skeleton':
      updateWalker(enemy, playerPos, world);
      break;
    case 'bat':
      updateFlyer(enemy, playerPos, 0.8, 2.5);
      break;
    case 'demon_eye':
      updateFlyer(enemy, playerPos, 1.2, 3.5);
      break;
  }

  // Face toward movement direction
  if (Math.abs(enemy.vel.x) > 0.3) {
    enemy.facingRight = enemy.vel.x > 0;
  }
}

function updateSlime(enemy: EnemyEntity, playerPos: Vec2) {
  if (enemy.aiState === 'idle' && enemy.aiTimer <= 0 && enemy.onGround) {
    enemy.aiState = 'jumping';
    const dx = playerPos.x - enemy.pos.x;
    const dist = Math.abs(dx);

    // Jump toward player if close enough, otherwise random
    if (dist < TILE_SIZE * 30) {
      enemy.vel.x = Math.sign(dx) * (1.5 + Math.random() * 2);
    } else {
      enemy.vel.x = (Math.random() - 0.5) * 3;
    }
    enemy.vel.y = -5 - Math.random() * 3;
    enemy.aiTimer = 20;
  }

  if (enemy.aiState === 'jumping' && enemy.onGround && enemy.aiTimer <= 0) {
    enemy.aiState = 'idle';
    enemy.vel.x = 0;
    enemy.aiTimer = 30 + Math.random() * 60;
  }
}

function updateWalker(enemy: EnemyEntity, playerPos: Vec2, world: WorldManager) {
  const dx = playerPos.x - enemy.pos.x;
  const dist = Math.abs(dx);

  if (dist < TILE_SIZE * 40) {
    // Walk toward player
    const speed = enemy.enemyType === 'skeleton' ? 1.2 : 0.8;
    enemy.vel.x = Math.sign(dx) * speed;

    // Jump over 1-2 tile obstacles
    if (enemy.onGround && enemy.aiTimer <= 0) {
      const checkX = Math.floor((enemy.pos.x + enemy.size.x / 2 + Math.sign(dx) * TILE_SIZE) / TILE_SIZE);
      const checkY = Math.floor((enemy.pos.y + enemy.size.y) / TILE_SIZE) - 1;
      if (world.isSolid(checkX, checkY)) {
        enemy.vel.y = -7;
        enemy.aiTimer = 15;
      }
    }
  } else {
    // Idle wander
    if (enemy.aiTimer <= 0) {
      enemy.vel.x = (Math.random() - 0.5) * 1.5;
      enemy.aiTimer = 60 + Math.random() * 120;
    }
  }

  // Friction when on ground and not actively walking
  if (enemy.onGround && Math.abs(enemy.vel.x) < 0.3) {
    enemy.vel.x *= 0.8;
  }
}

function updateFlyer(enemy: EnemyEntity, playerPos: Vec2, accel: number, maxSpeed: number) {
  // No gravity for flyers — handled by skipping gravity in physics
  const dx = playerPos.x - enemy.pos.x;
  const dy = playerPos.y - enemy.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < TILE_SIZE * 50 && dist > 1) {
    // Fly toward player
    enemy.vel.x += (dx / dist) * accel * 0.06;
    enemy.vel.y += (dy / dist) * accel * 0.06;

    // Add sine wave bobbing for bats
    if (enemy.enemyType === 'bat') {
      enemy.vel.y += Math.sin(enemy.aiTimer * 0.15) * 0.15;
    }
  } else {
    // Drift randomly
    enemy.vel.x += (Math.random() - 0.5) * 0.1;
    enemy.vel.y += (Math.random() - 0.5) * 0.1;
  }

  // Clamp speed
  const speed = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);
  if (speed > maxSpeed) {
    enemy.vel.x = (enemy.vel.x / speed) * maxSpeed;
    enemy.vel.y = (enemy.vel.y / speed) * maxSpeed;
  }

  // Flyers use aiTimer as a general counter
  enemy.aiTimer++;
}

export function isFlyer(type: EnemyType): boolean {
  return type === 'bat' || type === 'demon_eye';
}

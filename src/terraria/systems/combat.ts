import { PlayerEntity, EnemyEntity, EntityBase, Vec2 } from '../core/types';
import { TILE_SIZE } from '../core/config';
import { getHeldItemDef } from './inventory';
import { getEnemyDef } from '../data/enemies';

export class CombatSystem {
  update(
    player: PlayerEntity,
    enemies: EnemyEntity[],
    attack: boolean,
  ): { killed: EnemyEntity[] } {
    const killed: EnemyEntity[] = [];

    // Player melee attack
    if (attack && player.attackCooldown <= 0) {
      const weapon = getHeldItemDef(player);
      const damage = weapon ? weapon.damage : 2; // fist damage
      const cooldown = weapon && weapon.isTool && weapon.toolType === 'sword' ? 15 : 25;

      if (damage > 0) {
        player.attackCooldown = cooldown;
        const reach = TILE_SIZE * 3;

        for (const enemy of enemies) {
          if (enemy.hp <= 0) continue;
          const dist = entityDist(player, enemy);
          if (dist < reach && isFacing(player, enemy)) {
            this.dealDamage(enemy, damage, player.pos);
            if (enemy.hp <= 0) killed.push(enemy);
          }
        }
      }
    }

    // Enemy contact damage to player
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      if (player.invulnTimer > 0) continue;
      if (aabbOverlap(player, enemy)) {
        this.dealDamage(player, enemy.contactDamage, enemy.pos);
        player.invulnTimer = 40;
      }
    }

    return { killed };
  }

  private dealDamage(target: EntityBase, amount: number, sourcePos: Vec2) {
    target.hp = Math.max(0, target.hp - amount);

    // Knockback
    const dx = target.pos.x - sourcePos.x;
    let kbResist = 0;
    if ('enemyType' in target) {
      kbResist = getEnemyDef((target as EnemyEntity).enemyType).knockbackResist;
    }
    const kbMult = 1 - kbResist;
    target.vel.x += Math.sign(dx || 1) * 5 * kbMult;
    target.vel.y -= 3 * kbMult;

    // Invuln frames for enemies too
    target.invulnTimer = Math.max(target.invulnTimer, 10);
  }
}

function entityDist(a: EntityBase, b: EntityBase): number {
  const acx = a.pos.x + a.size.x / 2;
  const acy = a.pos.y + a.size.y / 2;
  const bcx = b.pos.x + b.size.x / 2;
  const bcy = b.pos.y + b.size.y / 2;
  const dx = acx - bcx;
  const dy = acy - bcy;
  return Math.sqrt(dx * dx + dy * dy);
}

function isFacing(player: PlayerEntity, target: EntityBase): boolean {
  const dx = (target.pos.x + target.size.x / 2) - (player.pos.x + player.size.x / 2);
  if (player.facingRight) return dx > -TILE_SIZE;
  return dx < TILE_SIZE;
}

function aabbOverlap(a: EntityBase, b: EntityBase): boolean {
  return (
    a.pos.x < b.pos.x + b.size.x &&
    a.pos.x + a.size.x > b.pos.x &&
    a.pos.y < b.pos.y + b.size.y &&
    a.pos.y + a.size.y > b.pos.y
  );
}

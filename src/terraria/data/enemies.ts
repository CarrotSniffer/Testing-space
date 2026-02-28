import { EnemyType } from '../core/types';

export interface EnemyDef {
  type: EnemyType;
  name: string;
  hp: number;
  contactDamage: number;
  width: number;
  height: number;
  color: [number, number, number];
  spawnWeight: number;   // relative chance
  nightOnly: boolean;
  minDepth: number;      // 0 = surface, negative = underground
  maxDepth: number;
  knockbackResist: number; // 0-1, higher = less knockback
}

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  slime: {
    type: 'slime',
    name: 'Green Slime',
    hp: 14,
    contactDamage: 6,
    width: 24,
    height: 18,
    color: [0, 200, 50],
    spawnWeight: 10,
    nightOnly: false,
    minDepth: -50,
    maxDepth: 100,
    knockbackResist: 0.0,
  },
  zombie: {
    type: 'zombie',
    name: 'Zombie',
    hp: 45,
    contactDamage: 14,
    width: 18,
    height: 40,
    color: [80, 120, 80],
    spawnWeight: 8,
    nightOnly: true,
    minDepth: -50,
    maxDepth: 50,
    knockbackResist: 0.2,
  },
  demon_eye: {
    type: 'demon_eye',
    name: 'Demon Eye',
    hp: 60,
    contactDamage: 18,
    width: 20,
    height: 20,
    color: [180, 30, 30],
    spawnWeight: 6,
    nightOnly: true,
    minDepth: -50,
    maxDepth: 50,
    knockbackResist: 0.3,
  },
  bat: {
    type: 'bat',
    name: 'Cave Bat',
    hp: 16,
    contactDamage: 13,
    width: 16,
    height: 14,
    color: [120, 100, 80],
    spawnWeight: 7,
    nightOnly: false,
    minDepth: 50,
    maxDepth: 9999,
    knockbackResist: 0.1,
  },
  skeleton: {
    type: 'skeleton',
    name: 'Skeleton',
    hp: 52,
    contactDamage: 20,
    width: 18,
    height: 40,
    color: [200, 200, 190],
    spawnWeight: 4,
    nightOnly: false,
    minDepth: 80,
    maxDepth: 9999,
    knockbackResist: 0.3,
  },
};

export function getEnemyDef(type: EnemyType): EnemyDef {
  return ENEMY_DEFS[type];
}

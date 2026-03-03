export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BlockId = number;

export interface BlockDef {
  id: BlockId;
  name: string;
  hardness: number;
  dropItemId: number;
  lightEmission: number;
  transparent: boolean;
  color: [number, number, number, number];
}

export type ItemId = number;

export interface ItemDef {
  id: ItemId;
  name: string;
  maxStack: number;
  isPlaceable: boolean;
  placesBlock: BlockId;
  isTool: boolean;
  toolType: 'pickaxe' | 'axe' | 'sword' | 'hammer' | 'none';
  toolPower: number;
  damage: number;
  iconColor: [number, number, number, number];
}

export interface ItemStack {
  itemId: ItemId;
  count: number;
}

export interface Inventory {
  slots: (ItemStack | null)[];
  hotbarSize: number;
  selectedSlot: number;
}

export interface Recipe {
  result: ItemStack;
  ingredients: ItemStack[];
  station: BlockId | null;
}

export interface EntityBase {
  id: number;
  pos: Vec2;
  vel: Vec2;
  size: Vec2;
  onGround: boolean;
  facingRight: boolean;
  hp: number;
  maxHp: number;
  invulnTimer: number;
}

export interface PlayerEntity extends EntityBase {
  type: 'player';
  inventory: Inventory;
  miningTarget: { tx: number; ty: number; progress: number } | null;
  jumpHeld: boolean;
  jumpTimer: number;       // ticks remaining of sustained jump ascent
  fallStartY: number;      // pixel Y where the player started falling (for fall damage)
  isFalling: boolean;      // true when falling (vel.y > 0 and not on ground)
  attackCooldown: number;
  selectedSlot: number;
}

export type EnemyType = 'slime' | 'zombie' | 'skeleton' | 'bat' | 'demon_eye';

export interface EnemyEntity extends EntityBase {
  type: 'enemy';
  enemyType: EnemyType;
  aiState: string;
  aiTimer: number;
  contactDamage: number;
}

export interface ProjectileEntity extends EntityBase {
  type: 'projectile';
  fromPlayer: boolean;
  damage: number;
  lifetime: number;
}

export interface ItemDropEntity extends EntityBase {
  type: 'item_drop';
  item: ItemStack;
  pickupDelay: number;
  lifetime: number;
}

export type Entity = PlayerEntity | EnemyEntity | ProjectileEntity | ItemDropEntity;

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  interact: boolean;
  cursorWorld: Vec2;
  cursorScreen: Vec2;
  inventoryToggle: boolean;
  hotbarSelect: number;
  scrollDelta: number;     // mouse wheel: -1 = scroll up (prev slot), +1 = scroll down (next slot)
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  viewportW: number;
  viewportH: number;
}

export interface GameClock {
  dayTime: number;
  totalTime: number;
  dayCount: number;
  isNight: boolean;
}

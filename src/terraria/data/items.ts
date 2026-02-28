import { ItemDef } from '../core/types';
import { BLOCK, ITEM } from './ids';

export { ITEM };

export const ITEM_DEFS: ItemDef[] = [
  { id: 0,  name: 'None',           maxStack: 0,   isPlaceable: false, placesBlock: 0,               isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [0, 0, 0, 0] },
  { id: 1,  name: 'Dirt',           maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.DIRT,       isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [139, 90, 43, 255] },
  { id: 2,  name: 'Stone',          maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.COBBLESTONE, isTool: false, toolType: 'none',   toolPower: 0,  damage: 0,  iconColor: [128, 128, 128, 255] },
  { id: 3,  name: 'Wood',           maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.WOOD,       isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [130, 90, 45, 255] },
  { id: 4,  name: 'Leaves',         maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.LEAVES,     isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [40, 120, 40, 255] },
  { id: 5,  name: 'Sand',           maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.SAND,       isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [210, 200, 130, 255] },
  { id: 6,  name: 'Copper Ore',     maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.COPPER_ORE, isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [180, 100, 60, 255] },
  { id: 7,  name: 'Iron Ore',       maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.IRON_ORE,   isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [165, 145, 135, 255] },
  { id: 8,  name: 'Silver Ore',     maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.SILVER_ORE, isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [190, 190, 205, 255] },
  { id: 9,  name: 'Gold Ore',       maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.GOLD_ORE,   isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [200, 180, 50, 255] },
  { id: 10, name: 'Torch',          maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.TORCH,      isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [255, 200, 50, 255] },
  { id: 11, name: 'Workbench',      maxStack: 99,  isPlaceable: true,  placesBlock: BLOCK.WORKBENCH,  isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [160, 120, 60, 255] },
  { id: 12, name: 'Furnace',        maxStack: 99,  isPlaceable: true,  placesBlock: BLOCK.FURNACE,    isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [100, 100, 100, 255] },
  { id: 13, name: 'Anvil',          maxStack: 99,  isPlaceable: true,  placesBlock: BLOCK.ANVIL,      isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [150, 150, 160, 255] },
  { id: 14, name: 'Chest',          maxStack: 99,  isPlaceable: true,  placesBlock: BLOCK.CHEST,      isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [140, 100, 50, 255] },
  { id: 15, name: 'Planks',         maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.PLANKS,     isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [180, 140, 80, 255] },
  { id: 16, name: 'Cobblestone',    maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.COBBLESTONE, isTool: false, toolType: 'none',   toolPower: 0,  damage: 0,  iconColor: [110, 110, 110, 255] },
  { id: 17, name: 'Clay',           maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.CLAY,       isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [150, 110, 90, 255] },
  { id: 18, name: 'Mud',            maxStack: 999, isPlaceable: true,  placesBlock: BLOCK.MUD,        isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [100, 75, 55, 255] },
  { id: 19, name: 'Wood Pickaxe',   maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'pickaxe', toolPower: 2,  damage: 4,  iconColor: [180, 140, 80, 255] },
  { id: 20, name: 'Wood Axe',       maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'axe',     toolPower: 2,  damage: 5,  iconColor: [180, 140, 80, 255] },
  { id: 21, name: 'Wood Sword',     maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'sword',   toolPower: 0,  damage: 10, iconColor: [180, 140, 80, 255] },
  { id: 22, name: 'Stone Pickaxe',  maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'pickaxe', toolPower: 3,  damage: 6,  iconColor: [128, 128, 128, 255] },
  { id: 23, name: 'Stone Sword',    maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'sword',   toolPower: 0,  damage: 14, iconColor: [128, 128, 128, 255] },
  { id: 24, name: 'Copper Pickaxe', maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'pickaxe', toolPower: 4,  damage: 7,  iconColor: [200, 120, 60, 255] },
  { id: 25, name: 'Copper Sword',   maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'sword',   toolPower: 0,  damage: 18, iconColor: [200, 120, 60, 255] },
  { id: 26, name: 'Iron Pickaxe',   maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'pickaxe', toolPower: 5,  damage: 8,  iconColor: [180, 180, 190, 255] },
  { id: 27, name: 'Iron Sword',     maxStack: 1,   isPlaceable: false, placesBlock: 0,               isTool: true,  toolType: 'sword',   toolPower: 0,  damage: 24, iconColor: [180, 180, 190, 255] },
  { id: 28, name: 'Copper Bar',     maxStack: 999, isPlaceable: false, placesBlock: 0,               isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [220, 140, 70, 255] },
  { id: 29, name: 'Iron Bar',       maxStack: 999, isPlaceable: false, placesBlock: 0,               isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [200, 200, 210, 255] },
  { id: 30, name: 'Silver Bar',     maxStack: 999, isPlaceable: false, placesBlock: 0,               isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [220, 220, 230, 255] },
  { id: 31, name: 'Gold Bar',       maxStack: 999, isPlaceable: false, placesBlock: 0,               isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [240, 210, 60, 255] },
  { id: 32, name: 'Gel',            maxStack: 999, isPlaceable: false, placesBlock: 0,               isTool: false, toolType: 'none',    toolPower: 0,  damage: 0,  iconColor: [0, 150, 255, 255] },
];

export function getItemDef(id: number): ItemDef {
  return ITEM_DEFS[id] ?? ITEM_DEFS[0];
}

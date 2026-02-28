import { BlockDef } from '../core/types';
import { BLOCK, ITEM } from './ids';

export { BLOCK };

export const BLOCK_DEFS: BlockDef[] = [
  { id: 0,  name: 'Air',         hardness: 0,   dropItemId: ITEM.NONE,         lightEmission: 0,  transparent: true,  color: [0, 0, 0, 0] },
  { id: 1,  name: 'Dirt',        hardness: 15,  dropItemId: ITEM.DIRT,         lightEmission: 0,  transparent: false, color: [139, 90, 43, 255] },
  { id: 2,  name: 'Grass',       hardness: 15,  dropItemId: ITEM.DIRT,         lightEmission: 0,  transparent: false, color: [106, 80, 48, 255] },
  { id: 3,  name: 'Stone',       hardness: 40,  dropItemId: ITEM.COBBLESTONE,  lightEmission: 0,  transparent: false, color: [128, 128, 128, 255] },
  { id: 4,  name: 'Wood',        hardness: 20,  dropItemId: ITEM.WOOD,         lightEmission: 0,  transparent: false, color: [130, 90, 45, 255] },
  { id: 5,  name: 'Leaves',      hardness: 5,   dropItemId: ITEM.NONE,         lightEmission: 0,  transparent: true,  color: [40, 120, 40, 255] },
  { id: 6,  name: 'Sand',        hardness: 10,  dropItemId: ITEM.SAND,         lightEmission: 0,  transparent: false, color: [210, 200, 130, 255] },
  { id: 7,  name: 'Copper Ore',  hardness: 50,  dropItemId: ITEM.COPPER_ORE,   lightEmission: 0,  transparent: false, color: [150, 90, 50, 255] },
  { id: 8,  name: 'Iron Ore',    hardness: 60,  dropItemId: ITEM.IRON_ORE,     lightEmission: 0,  transparent: false, color: [165, 145, 135, 255] },
  { id: 9,  name: 'Silver Ore',  hardness: 65,  dropItemId: ITEM.SILVER_ORE,   lightEmission: 0,  transparent: false, color: [190, 190, 205, 255] },
  { id: 10, name: 'Gold Ore',    hardness: 70,  dropItemId: ITEM.GOLD_ORE,     lightEmission: 0,  transparent: false, color: [200, 180, 50, 255] },
  { id: 11, name: 'Torch',       hardness: 1,   dropItemId: ITEM.TORCH,        lightEmission: 12, transparent: true,  color: [255, 200, 50, 255] },
  { id: 12, name: 'Workbench',   hardness: 20,  dropItemId: ITEM.WORKBENCH,    lightEmission: 0,  transparent: false, color: [160, 120, 60, 255] },
  { id: 13, name: 'Furnace',     hardness: 30,  dropItemId: ITEM.FURNACE,      lightEmission: 8,  transparent: false, color: [100, 100, 100, 255] },
  { id: 14, name: 'Anvil',       hardness: 35,  dropItemId: ITEM.ANVIL,        lightEmission: 0,  transparent: false, color: [150, 150, 160, 255] },
  { id: 15, name: 'Chest',       hardness: 15,  dropItemId: ITEM.CHEST,        lightEmission: 0,  transparent: false, color: [140, 100, 50, 255] },
  { id: 16, name: 'Planks',      hardness: 15,  dropItemId: ITEM.PLANKS,       lightEmission: 0,  transparent: false, color: [180, 140, 80, 255] },
  { id: 17, name: 'Cobblestone', hardness: 45,  dropItemId: ITEM.COBBLESTONE,  lightEmission: 0,  transparent: false, color: [110, 110, 110, 255] },
  { id: 18, name: 'Bedrock',     hardness: -1,  dropItemId: ITEM.NONE,         lightEmission: 0,  transparent: false, color: [50, 50, 50, 255] },
  { id: 19, name: 'Clay',        hardness: 12,  dropItemId: ITEM.CLAY,         lightEmission: 0,  transparent: false, color: [150, 110, 90, 255] },
  { id: 20, name: 'Mud',         hardness: 10,  dropItemId: ITEM.MUD,          lightEmission: 0,  transparent: false, color: [100, 75, 55, 255] },
];

export function getBlockDef(id: number): BlockDef {
  return BLOCK_DEFS[id] ?? BLOCK_DEFS[0];
}

export function isBlockSolid(id: number): boolean {
  if (id === 0) return false;
  const def = BLOCK_DEFS[id];
  return def ? !def.transparent : false;
}

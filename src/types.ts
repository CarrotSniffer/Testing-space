export type BuildingType =
  | 'empty'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'park'
  | 'road'
  | 'power';

export interface Building {
  type: BuildingType;
  level: number;
}

export interface GameState {
  grid: Building[][];
  money: number;
  population: number;
  happiness: number;
  tick: number;
}

export interface BuildingInfo {
  type: BuildingType;
  label: string;
  emoji: string;
  cost: number;
  description: string;
  popEffect: number;
  incomeEffect: number;
  happinessEffect: number;
  height: number;
  topColor: string;
  leftColor: string;
  rightColor: string;
}

export const GRID_SIZE = 12;

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const BUILDINGS: Record<BuildingType, BuildingInfo> = {
  empty: {
    type: 'empty',
    label: 'Clear',
    emoji: '',
    cost: 0,
    description: 'Remove a building',
    popEffect: 0,
    incomeEffect: 0,
    happinessEffect: 0,
    height: 0,
    topColor: '#4a7c3f',
    leftColor: '#3d6834',
    rightColor: '#35592d',
  },
  residential: {
    type: 'residential',
    label: 'House',
    emoji: '🏠',
    cost: 100,
    description: '+10 pop, +$5 tax',
    popEffect: 10,
    incomeEffect: 5,
    happinessEffect: -1,
    height: 20,
    topColor: '#5b8dd9',
    leftColor: '#4070b8',
    rightColor: '#345d9a',
  },
  commercial: {
    type: 'commercial',
    label: 'Shop',
    emoji: '🏪',
    cost: 200,
    description: '+$15 income',
    popEffect: 0,
    incomeEffect: 15,
    happinessEffect: 2,
    height: 28,
    topColor: '#d4a843',
    leftColor: '#b8902a',
    rightColor: '#9a7a22',
  },
  industrial: {
    type: 'industrial',
    label: 'Factory',
    emoji: '🏭',
    cost: 300,
    description: '+$25 income, -5 happy',
    popEffect: 0,
    incomeEffect: 25,
    happinessEffect: -5,
    height: 24,
    topColor: '#b05a4a',
    leftColor: '#954838',
    rightColor: '#7d3c2f',
  },
  park: {
    type: 'park',
    label: 'Park',
    emoji: '🌳',
    cost: 50,
    description: '+8 happy',
    popEffect: 0,
    incomeEffect: -2,
    happinessEffect: 8,
    height: 6,
    topColor: '#5aad4e',
    leftColor: '#4a9340',
    rightColor: '#3d7d35',
  },
  road: {
    type: 'road',
    label: 'Road',
    emoji: '',
    cost: 25,
    description: 'Connect zones',
    popEffect: 0,
    incomeEffect: 0,
    happinessEffect: 0,
    height: 1,
    topColor: '#777777',
    leftColor: '#666666',
    rightColor: '#555555',
  },
  power: {
    type: 'power',
    label: 'Power',
    emoji: '⚡',
    cost: 500,
    description: 'Powers 20 buildings',
    popEffect: 0,
    incomeEffect: -10,
    happinessEffect: -2,
    height: 32,
    topColor: '#d4c44a',
    leftColor: '#b8a83a',
    rightColor: '#9a8e30',
  },
};

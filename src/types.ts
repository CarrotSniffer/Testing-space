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
}

export const GRID_SIZE = 12;

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
  },
};

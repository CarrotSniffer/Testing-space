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

export interface BuildingInfo {
  type: BuildingType;
  label: string;
  emoji: string;
  cost: number;
  description: string;
  popEffect: number;
  incomeEffect: number;
  happinessEffect: number;
  height: number;       // visual height in px for 3D extrusion
  topColor: string;     // roof / top face
  leftColor: string;    // left face (lit)
  rightColor: string;   // right face (shadow)
}

export interface GameState {
  grid: Building[][];
  money: number;
  population: number;
  happiness: number;
  tick: number;
}

export const GRID = 14;
export const TW = 56;   // tile width
export const TH = 28;   // tile height (2:1 iso ratio)

export const BUILDINGS: Record<BuildingType, BuildingInfo> = {
  empty: {
    type: 'empty', label: 'Clear', emoji: '🗑️', cost: 0,
    description: 'Demolish', popEffect: 0, incomeEffect: 0, happinessEffect: 0,
    height: 0, topColor: '', leftColor: '', rightColor: '',
  },
  residential: {
    type: 'residential', label: 'House', emoji: '🏠', cost: 100,
    description: '+10 pop, +$5', popEffect: 10, incomeEffect: 5, happinessEffect: -1,
    height: 16, topColor: '#6b9ee0', leftColor: '#4a7cc4', rightColor: '#3966a8',
  },
  commercial: {
    type: 'commercial', label: 'Shop', emoji: '🏪', cost: 200,
    description: '+$15', popEffect: 0, incomeEffect: 15, happinessEffect: 2,
    height: 22, topColor: '#e0b84a', leftColor: '#c49a30', rightColor: '#a88028',
  },
  industrial: {
    type: 'industrial', label: 'Factory', emoji: '🏭', cost: 300,
    description: '+$25, -5 happy', popEffect: 0, incomeEffect: 25, happinessEffect: -5,
    height: 18, topColor: '#c06050', leftColor: '#a04838', rightColor: '#883830',
  },
  park: {
    type: 'park', label: 'Park', emoji: '🌳', cost: 50,
    description: '+8 happy', popEffect: 0, incomeEffect: -2, happinessEffect: 8,
    height: 4, topColor: '#5ab84e', leftColor: '#489a3e', rightColor: '#3a8032',
  },
  road: {
    type: 'road', label: 'Road', emoji: '🛤️', cost: 25,
    description: 'Connect', popEffect: 0, incomeEffect: 0, happinessEffect: 0,
    height: 2, topColor: '#888888', leftColor: '#707070', rightColor: '#5a5a5a',
  },
  power: {
    type: 'power', label: 'Power', emoji: '⚡', cost: 500,
    description: 'Powers 20', popEffect: 0, incomeEffect: -10, happinessEffect: -2,
    height: 28, topColor: '#e0cc50', leftColor: '#c4b038', rightColor: '#a89428',
  },
};

export const BUILD_ORDER: BuildingType[] = [
  'residential', 'commercial', 'industrial', 'park', 'road', 'power', 'empty',
];

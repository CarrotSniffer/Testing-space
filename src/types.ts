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
  icon: string;
  cost: number;
  description: string;
  popEffect: number;
  incomeEffect: number;
  happinessEffect: number;
  height: number;
  wallLeft: string;
  wallRight: string;
  roofColor: string;
}

export interface Citizen {
  x: number;   // world x (isometric)
  y: number;   // world y (isometric)
  tx: number;  // target x
  ty: number;  // target y
  color: string;
  speed: number;
}

export interface SmokeParticle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  vx: number;
  vy: number;
  size: number;
}

export interface GameState {
  grid: Building[][];
  money: number;
  population: number;
  happiness: number;
  tick: number;
  citizens: Citizen[];
  smoke: SmokeParticle[];
}

export const GRID = 14;
export const TW = 64;
export const TH = 32;
export const HW = TW / 2;
export const HH = TH / 2;

const CITIZEN_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e84393', '#00b894', '#fdcb6e',
];

export function randomCitizenColor(): string {
  return CITIZEN_COLORS[Math.floor(Math.random() * CITIZEN_COLORS.length)];
}

export const BUILDINGS: Record<BuildingType, BuildingInfo> = {
  empty: {
    type: 'empty', label: 'Clear', icon: 'X', cost: 0,
    description: 'Demolish', popEffect: 0, incomeEffect: 0, happinessEffect: 0,
    height: 0, wallLeft: '', wallRight: '', roofColor: '',
  },
  residential: {
    type: 'residential', label: 'House', icon: 'H', cost: 100,
    description: '+10 pop, +$5', popEffect: 10, incomeEffect: 5, happinessEffect: -1,
    height: 18, wallLeft: '#d4c4a0', wallRight: '#baa880', roofColor: '#b04030',
  },
  commercial: {
    type: 'commercial', label: 'Shop', icon: 'S', cost: 200,
    description: '+$15', popEffect: 0, incomeEffect: 15, happinessEffect: 2,
    height: 26, wallLeft: '#e8dcc8', wallRight: '#ccc0a8', roofColor: '#3080c0',
  },
  industrial: {
    type: 'industrial', label: 'Factory', icon: 'F', cost: 300,
    description: '+$25, -5 happy', popEffect: 0, incomeEffect: 25, happinessEffect: -5,
    height: 20, wallLeft: '#a0a0a0', wallRight: '#888888', roofColor: '#606060',
  },
  park: {
    type: 'park', label: 'Park', icon: 'P', cost: 50,
    description: '+8 happy', popEffect: 0, incomeEffect: -2, happinessEffect: 8,
    height: 2, wallLeft: '#3a8032', wallRight: '#2e6828', roofColor: '#4aa040',
  },
  road: {
    type: 'road', label: 'Road', icon: 'R', cost: 25,
    description: 'Connect', popEffect: 0, incomeEffect: 0, happinessEffect: 0,
    height: 1, wallLeft: '#555', wallRight: '#444', roofColor: '#666',
  },
  power: {
    type: 'power', label: 'Power', icon: 'Z', cost: 500,
    description: 'Powers 20', popEffect: 0, incomeEffect: -10, happinessEffect: -2,
    height: 30, wallLeft: '#c0b070', wallRight: '#a09060', roofColor: '#d0c050',
  },
};

export const BUILD_ORDER: BuildingType[] = [
  'residential', 'commercial', 'industrial', 'park', 'road', 'power', 'empty',
];

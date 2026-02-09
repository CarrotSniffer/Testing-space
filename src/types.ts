export type BuildingType =
  | 'empty'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'park'
  | 'road'
  | 'power'
  | 'hospital'
  | 'school'
  | 'fire_station'
  | 'police';

export interface Building {
  type: BuildingType;
  level: number;
  onFire?: boolean;
  fireTimer?: number;
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
  category: 'zone' | 'service' | 'infrastructure' | 'special';
  upgradeCostMult: number; // multiplier for upgrade cost
}

export interface Citizen {
  x: number;
  y: number;
  tx: number;
  ty: number;
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

export type GameSpeed = 0 | 1 | 2 | 3;

export interface GameEvent {
  type: 'fire' | 'boom' | 'storm' | 'festival' | 'population_surge';
  label: string;
  description: string;
  duration: number; // ticks remaining
  effect: Partial<{ incomeMult: number; happinessAdd: number; popAdd: number }>;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string;
  check: (state: GameState) => boolean;
  unlocked: boolean;
}

export interface Notification {
  text: string;
  color: string;
  time: number; // timestamp
}

export interface GameState {
  grid: Building[][];
  money: number;
  population: number;
  happiness: number;
  tick: number;
  citizens: Citizen[];
  smoke: SmokeParticle[];
  speed: GameSpeed;
  events: GameEvent[];
  dayTime: number; // 0-1 representing time of day (0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk)
  totalBuildings: number;
  totalMoneyEarned: number;
  notifications: Notification[];
  achievementsUnlocked: string[];
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
    category: 'special', upgradeCostMult: 0,
  },
  residential: {
    type: 'residential', label: 'House', icon: 'H', cost: 100,
    description: '+10 pop, +$5/s', popEffect: 10, incomeEffect: 5, happinessEffect: -1,
    height: 18, wallLeft: '#d4c4a0', wallRight: '#baa880', roofColor: '#b04030',
    category: 'zone', upgradeCostMult: 1.5,
  },
  commercial: {
    type: 'commercial', label: 'Shop', icon: 'S', cost: 200,
    description: '+$15/s, +2 happy', popEffect: 0, incomeEffect: 15, happinessEffect: 2,
    height: 26, wallLeft: '#e8dcc8', wallRight: '#ccc0a8', roofColor: '#3080c0',
    category: 'zone', upgradeCostMult: 1.5,
  },
  industrial: {
    type: 'industrial', label: 'Factory', icon: 'F', cost: 300,
    description: '+$25/s, -5 happy', popEffect: 0, incomeEffect: 25, happinessEffect: -5,
    height: 20, wallLeft: '#a0a0a0', wallRight: '#888888', roofColor: '#606060',
    category: 'zone', upgradeCostMult: 1.5,
  },
  park: {
    type: 'park', label: 'Park', icon: 'P', cost: 50,
    description: '+8 happy, -$2/s', popEffect: 0, incomeEffect: -2, happinessEffect: 8,
    height: 2, wallLeft: '#3a8032', wallRight: '#2e6828', roofColor: '#4aa040',
    category: 'infrastructure', upgradeCostMult: 1.2,
  },
  road: {
    type: 'road', label: 'Road', icon: 'R', cost: 25,
    description: 'Connect areas', popEffect: 0, incomeEffect: 0, happinessEffect: 0,
    height: 1, wallLeft: '#555', wallRight: '#444', roofColor: '#666',
    category: 'infrastructure', upgradeCostMult: 0,
  },
  power: {
    type: 'power', label: 'Power', icon: 'Z', cost: 500,
    description: 'Powers 20 bldgs', popEffect: 0, incomeEffect: -10, happinessEffect: -2,
    height: 30, wallLeft: '#c0b070', wallRight: '#a09060', roofColor: '#d0c050',
    category: 'infrastructure', upgradeCostMult: 2,
  },
  hospital: {
    type: 'hospital', label: 'Hospital', icon: '+', cost: 400,
    description: '+15% pop cap, +5 happy', popEffect: 15, incomeEffect: -8, happinessEffect: 5,
    height: 24, wallLeft: '#e8e8e8', wallRight: '#d0d0d0', roofColor: '#f0f0f0',
    category: 'service', upgradeCostMult: 1.8,
  },
  school: {
    type: 'school', label: 'School', icon: 'B', cost: 350,
    description: '+10% income, +3 happy', popEffect: 0, incomeEffect: -5, happinessEffect: 3,
    height: 22, wallLeft: '#c8a878', wallRight: '#b09060', roofColor: '#904030',
    category: 'service', upgradeCostMult: 1.6,
  },
  fire_station: {
    type: 'fire_station', label: 'Fire Stn', icon: '!', cost: 250,
    description: 'Prevents fires, +3 happy', popEffect: 0, incomeEffect: -3, happinessEffect: 3,
    height: 20, wallLeft: '#d04040', wallRight: '#b03030', roofColor: '#cc3333',
    category: 'service', upgradeCostMult: 1.4,
  },
  police: {
    type: 'police', label: 'Police', icon: 'P', cost: 300,
    description: '+4 happy, reduces crime', popEffect: 0, incomeEffect: -4, happinessEffect: 4,
    height: 22, wallLeft: '#4060a0', wallRight: '#305080', roofColor: '#3050a0',
    category: 'service', upgradeCostMult: 1.5,
  },
};

export const BUILD_ORDER: BuildingType[] = [
  'residential', 'commercial', 'industrial',
  'park', 'road', 'power',
  'hospital', 'school', 'fire_station', 'police',
  'empty',
];

export const CATEGORY_LABELS: Record<string, string> = {
  zone: 'Zones',
  service: 'Services',
  infrastructure: 'Infra',
  special: 'Other',
};

export function getUpgradeCost(type: BuildingType, currentLevel: number): number {
  const info = BUILDINGS[type];
  if (info.upgradeCostMult === 0 || currentLevel >= 3) return Infinity;
  return Math.round(info.cost * info.upgradeCostMult * currentLevel);
}

export function getLevelMultiplier(level: number): number {
  return 1 + (level - 1) * 0.5; // 1x, 1.5x, 2x for levels 1, 2, 3
}

// Achievements definitions (check functions reference GameState)
export function createAchievements(): Achievement[] {
  return [
    {
      id: 'first_house', label: 'First Home', icon: '\u2302',
      description: 'Build your first house',
      check: (s) => countType(s.grid, 'residential') >= 1,
      unlocked: false,
    },
    {
      id: 'growing_town', label: 'Growing Town', icon: '\u263A',
      description: 'Reach 50 population',
      check: (s) => s.population >= 50,
      unlocked: false,
    },
    {
      id: 'thriving_city', label: 'Thriving City', icon: '\u2605',
      description: 'Reach 150 population',
      check: (s) => s.population >= 150,
      unlocked: false,
    },
    {
      id: 'wealthy', label: 'Wealthy', icon: '$',
      description: 'Accumulate $10,000',
      check: (s) => s.money >= 10000,
      unlocked: false,
    },
    {
      id: 'tycoon', label: 'Tycoon', icon: '\u2660',
      description: 'Earn $50,000 total',
      check: (s) => s.totalMoneyEarned >= 50000,
      unlocked: false,
    },
    {
      id: 'happy_citizens', label: 'Happy Citizens', icon: '\u2764',
      description: 'Reach 90% happiness',
      check: (s) => s.happiness >= 90,
      unlocked: false,
    },
    {
      id: 'industrial_rev', label: 'Industrial Revolution', icon: '\u2699',
      description: 'Build 5 factories',
      check: (s) => countType(s.grid, 'industrial') >= 5,
      unlocked: false,
    },
    {
      id: 'green_city', label: 'Green City', icon: '\u2663',
      description: 'Build 5 parks',
      check: (s) => countType(s.grid, 'park') >= 5,
      unlocked: false,
    },
    {
      id: 'diversified', label: 'Diversified', icon: '\u2726',
      description: 'Build one of every type',
      check: (s) => {
        const types: BuildingType[] = ['residential', 'commercial', 'industrial', 'park', 'power', 'hospital', 'school', 'fire_station', 'police'];
        return types.every(t => countType(s.grid, t) >= 1);
      },
      unlocked: false,
    },
    {
      id: 'full_grid', label: 'Metropolis', icon: '\u2588',
      description: 'Fill every tile',
      check: (s) => countType(s.grid, 'empty') === 0,
      unlocked: false,
    },
    {
      id: 'upgrader', label: 'Upgrader', icon: '\u2191',
      description: 'Upgrade any building to level 3',
      check: (s) => {
        for (const row of s.grid) for (const cell of row) if (cell.level >= 3) return true;
        return false;
      },
      unlocked: false,
    },
    {
      id: 'safe_city', label: 'Safe City', icon: '!',
      description: 'Build a fire station and police station',
      check: (s) => countType(s.grid, 'fire_station') >= 1 && countType(s.grid, 'police') >= 1,
      unlocked: false,
    },
  ];
}

function countType(grid: Building[][], type: BuildingType): number {
  let c = 0;
  for (const row of grid) for (const cell of row) if (cell.type === type) c++;
  return c;
}

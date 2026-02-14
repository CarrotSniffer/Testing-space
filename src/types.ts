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

// ── Citizen needs & states ─────────────────────────────────

export type CitizenState =
  | 'idle'        // at home, deciding what to do
  | 'walking'     // moving to a destination
  | 'visiting'    // inside a building (consuming service)
  | 'returning';  // heading home

export interface CitizenNeeds {
  shopping: number;    // 0-100, increases over time
  entertainment: number;
  work: number;        // need to earn money / contribute
  health: number;      // decreases slowly, hospital fixes
  education: number;   // school need
}

export interface Citizen {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  speed: number;
  state: CitizenState;
  homeR: number;       // home tile row
  homeC: number;       // home tile col
  targetR: number;     // destination tile row
  targetC: number;     // destination tile col
  targetType: BuildingType | null;
  needs: CitizenNeeds;
  satisfaction: number; // 0-100 overall happiness
  visitTimer: number;   // ticks remaining at current building
  wallet: number;       // personal money (cosmetic)
}

// ── Building ───────────────────────────────────────────────

export interface Building {
  type: BuildingType;
  level: number;
  onFire?: boolean;
  fireTimer?: number;
  visitors: number;     // current visitors inside
  totalVisits: number;  // lifetime visits (for stats)
  revenue: number;      // money earned this cycle
}

export interface BuildingInfo {
  type: BuildingType;
  label: string;
  icon: string;
  cost: number;
  description: string;
  capacity: number;       // max simultaneous visitors
  revenuePerVisit: number; // money earned per visitor
  upkeepPerTick: number;   // maintenance cost per tick
  happinessEffect: number; // passive area happiness
  popCapacity: number;     // how many citizens can live here (residential only)
  needFulfilled: keyof CitizenNeeds | null; // which need this satisfies
  fulfillAmount: number;   // how much of that need is satisfied per visit
  visitDuration: number;   // ticks to complete a visit
  height: number;
  wallLeft: string;
  wallRight: string;
  roofColor: string;
  category: 'zone' | 'service' | 'infrastructure' | 'special';
  upgradeCostMult: number;
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
  duration: number;
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
  time: number;
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
  dayTime: number;
  totalBuildings: number;
  totalMoneyEarned: number;
  totalVisits: number;
  incomeThisCycle: number;  // income earned since last tick (from visitor transactions)
  upkeepThisCycle: number;  // total upkeep costs
  notifications: Notification[];
  achievementsUnlocked: string[];
  nextCitizenId: number;
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
    description: 'Demolish building',
    capacity: 0, revenuePerVisit: 0, upkeepPerTick: 0, happinessEffect: 0,
    popCapacity: 0, needFulfilled: null, fulfillAmount: 0, visitDuration: 0,
    height: 0, wallLeft: '', wallRight: '', roofColor: '',
    category: 'special', upgradeCostMult: 0,
  },
  residential: {
    type: 'residential', label: 'House', icon: 'H', cost: 100,
    description: 'Home for 4 citizens',
    capacity: 0, revenuePerVisit: 0, upkeepPerTick: 2, happinessEffect: 0,
    popCapacity: 4, needFulfilled: null, fulfillAmount: 0, visitDuration: 0,
    height: 18, wallLeft: '#d4c4a0', wallRight: '#baa880', roofColor: '#b04030',
    category: 'zone', upgradeCostMult: 1.5,
  },
  commercial: {
    type: 'commercial', label: 'Shop', icon: 'S', cost: 200,
    description: 'Citizens shop here for $8/visit',
    capacity: 6, revenuePerVisit: 8, upkeepPerTick: 3, happinessEffect: 1,
    popCapacity: 0, needFulfilled: 'shopping', fulfillAmount: 40, visitDuration: 3,
    height: 26, wallLeft: '#e8dcc8', wallRight: '#ccc0a8', roofColor: '#3080c0',
    category: 'zone', upgradeCostMult: 1.5,
  },
  industrial: {
    type: 'industrial', label: 'Factory', icon: 'F', cost: 300,
    description: 'Workers earn $12/shift',
    capacity: 8, revenuePerVisit: 12, upkeepPerTick: 5, happinessEffect: -3,
    popCapacity: 0, needFulfilled: 'work', fulfillAmount: 50, visitDuration: 5,
    height: 20, wallLeft: '#a0a0a0', wallRight: '#888888', roofColor: '#606060',
    category: 'zone', upgradeCostMult: 1.5,
  },
  park: {
    type: 'park', label: 'Park', icon: 'P', cost: 50,
    description: 'Free entertainment, +6 happy',
    capacity: 10, revenuePerVisit: 0, upkeepPerTick: 1, happinessEffect: 6,
    popCapacity: 0, needFulfilled: 'entertainment', fulfillAmount: 35, visitDuration: 2,
    height: 2, wallLeft: '#3a8032', wallRight: '#2e6828', roofColor: '#4aa040',
    category: 'infrastructure', upgradeCostMult: 1.2,
  },
  road: {
    type: 'road', label: 'Road', icon: 'R', cost: 25,
    description: 'Connects areas, speeds travel',
    capacity: 0, revenuePerVisit: 0, upkeepPerTick: 0, happinessEffect: 0,
    popCapacity: 0, needFulfilled: null, fulfillAmount: 0, visitDuration: 0,
    height: 1, wallLeft: '#555', wallRight: '#444', roofColor: '#666',
    category: 'infrastructure', upgradeCostMult: 0,
  },
  power: {
    type: 'power', label: 'Power', icon: 'Z', cost: 500,
    description: 'Powers 20 buildings',
    capacity: 0, revenuePerVisit: 0, upkeepPerTick: 8, happinessEffect: -2,
    popCapacity: 0, needFulfilled: null, fulfillAmount: 0, visitDuration: 0,
    height: 30, wallLeft: '#c0b070', wallRight: '#a09060', roofColor: '#d0c050',
    category: 'infrastructure', upgradeCostMult: 2,
  },
  hospital: {
    type: 'hospital', label: 'Hospital', icon: '+', cost: 400,
    description: 'Heals citizens, +4 happy',
    capacity: 4, revenuePerVisit: 0, upkeepPerTick: 6, happinessEffect: 4,
    popCapacity: 0, needFulfilled: 'health', fulfillAmount: 60, visitDuration: 4,
    height: 24, wallLeft: '#e8e8e8', wallRight: '#d0d0d0', roofColor: '#f0f0f0',
    category: 'service', upgradeCostMult: 1.8,
  },
  school: {
    type: 'school', label: 'School', icon: 'B', cost: 350,
    description: 'Educates citizens, +10% revenue',
    capacity: 6, revenuePerVisit: 0, upkeepPerTick: 4, happinessEffect: 3,
    popCapacity: 0, needFulfilled: 'education', fulfillAmount: 45, visitDuration: 4,
    height: 22, wallLeft: '#c8a878', wallRight: '#b09060', roofColor: '#904030',
    category: 'service', upgradeCostMult: 1.6,
  },
  fire_station: {
    type: 'fire_station', label: 'Fire Stn', icon: '!', cost: 250,
    description: 'Prevents fires, +3 happy',
    capacity: 0, revenuePerVisit: 0, upkeepPerTick: 3, happinessEffect: 3,
    popCapacity: 0, needFulfilled: null, fulfillAmount: 0, visitDuration: 0,
    height: 20, wallLeft: '#d04040', wallRight: '#b03030', roofColor: '#cc3333',
    category: 'service', upgradeCostMult: 1.4,
  },
  police: {
    type: 'police', label: 'Police', icon: 'P', cost: 300,
    description: '+4 happy, reduces crime',
    capacity: 0, revenuePerVisit: 0, upkeepPerTick: 4, happinessEffect: 4,
    popCapacity: 0, needFulfilled: null, fulfillAmount: 0, visitDuration: 0,
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
  return 1 + (level - 1) * 0.5;
}

// Achievements
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
      description: 'Reach 20 citizens',
      check: (s) => s.population >= 20,
      unlocked: false,
    },
    {
      id: 'thriving_city', label: 'Thriving City', icon: '\u2605',
      description: 'Reach 60 citizens',
      check: (s) => s.population >= 60,
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
      id: 'busy_city', label: 'Busy City', icon: '\u2699',
      description: 'Reach 500 total visits',
      check: (s) => s.totalVisits >= 500,
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

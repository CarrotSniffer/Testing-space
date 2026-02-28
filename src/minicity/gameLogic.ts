import {
  GameState, Building, BuildingType, BUILDINGS, GRID,
  Citizen, SmokeParticle, HW, HH, randomCitizenColor,
} from './types';
import { gridToScreen } from './renderer';

export function createInitialState(): GameState {
  const grid: Building[][] = [];
  for (let r = 0; r < GRID; r++) {
    const row: Building[] = [];
    for (let c = 0; c < GRID; c++) {
      row.push({ type: 'empty', level: 1 });
    }
    grid.push(row);
  }
  return { grid, money: 1000, population: 0, happiness: 50, tick: 0, citizens: [], smoke: [] };
}

// ── Economy ─────────────────────────────────────────────────

function countBuildings(grid: Building[][]): Record<BuildingType, number> {
  const c: Record<string, number> = {
    empty: 0, residential: 0, commercial: 0, industrial: 0, park: 0, road: 0, power: 0,
  };
  for (const row of grid) for (const cell of row) c[cell.type]++;
  return c as Record<BuildingType, number>;
}

export function calculateIncome(grid: Building[][]): number {
  const ct = countBuildings(grid);
  let income = 0;
  income += ct.residential * BUILDINGS.residential.incomeEffect;
  const popMul = Math.min(2, 1 + ct.residential * 0.1);
  income += ct.commercial * BUILDINGS.commercial.incomeEffect * popMul;
  income += ct.industrial * BUILDINGS.industrial.incomeEffect;
  income += ct.park * BUILDINGS.park.incomeEffect;
  income += ct.power * BUILDINGS.power.incomeEffect;
  return Math.round(income);
}

export function calculatePopulation(grid: Building[][]): number {
  const ct = countBuildings(grid);
  const basePop = ct.residential * BUILDINGS.residential.popEffect;
  const commBonus = ct.commercial * 3;
  const total = ct.residential + ct.commercial + ct.industrial;
  const powered = ct.power * 20;
  const ratio = total > 0 ? Math.min(1, powered / total) : 1;
  return Math.round((basePop + commBonus) * ratio);
}

export function calculateHappiness(grid: Building[][]): number {
  const ct = countBuildings(grid);
  let h = 50;
  h += ct.park * BUILDINGS.park.happinessEffect;
  h += ct.residential * BUILDINGS.residential.happinessEffect;
  h += ct.commercial * BUILDINGS.commercial.happinessEffect;
  h += ct.industrial * BUILDINGS.industrial.happinessEffect;
  h += ct.power * BUILDINGS.power.happinessEffect;
  if (ct.residential > 0 && ct.commercial > 0 && ct.industrial > 0) h += 10;
  return Math.max(0, Math.min(100, h));
}

// ── Citizens ────────────────────────────────────────────────

function findTilesOfType(grid: Building[][], types: BuildingType[]): [number, number][] {
  const tiles: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (types.includes(grid[r][c].type)) tiles.push([r, c]);
    }
  }
  return tiles;
}

function randomNearTile(r: number, c: number): [number, number] {
  const [sx, sy] = gridToScreen(r, c);
  return [
    sx + (Math.random() - 0.5) * HW * 1.2,
    sy + HH + (Math.random() - 0.5) * HH * 0.8,
  ];
}

function spawnCitizens(state: GameState): Citizen[] {
  const citizens = [...state.citizens];
  const homes = findTilesOfType(state.grid, ['residential']);
  const destinations = findTilesOfType(state.grid, ['commercial', 'industrial', 'park', 'road']);

  // Target citizen count: ~2 per residential building
  const target = Math.min(homes.length * 2, 30);

  while (citizens.length < target && homes.length > 0) {
    const home = homes[Math.floor(Math.random() * homes.length)];
    const [x, y] = randomNearTile(home[0], home[1]);

    let tx = x, ty = y;
    if (destinations.length > 0) {
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      [tx, ty] = randomNearTile(dest[0], dest[1]);
    }

    citizens.push({
      x, y, tx, ty,
      color: randomCitizenColor(),
      speed: 0.3 + Math.random() * 0.4,
    });
  }

  // Remove excess citizens if buildings demolished
  while (citizens.length > target) {
    citizens.pop();
  }

  return citizens;
}

export function updateCitizens(state: GameState, dt: number): Citizen[] {
  const destinations = findTilesOfType(state.grid, ['commercial', 'industrial', 'park', 'road', 'residential']);

  return state.citizens.map((c) => {
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      // Pick new target
      if (destinations.length > 0) {
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        const [tx, ty] = randomNearTile(dest[0], dest[1]);
        return { ...c, tx, ty };
      }
      return c;
    }

    const speed = c.speed * dt * 0.06;
    return {
      ...c,
      x: c.x + (dx / dist) * speed,
      y: c.y + (dy / dist) * speed,
    };
  });
}

// ── Smoke ───────────────────────────────────────────────────

function spawnSmoke(state: GameState): SmokeParticle[] {
  const smoke = [...state.smoke];
  const factories = findTilesOfType(state.grid, ['industrial']);

  for (const [r, c] of factories) {
    // Spawn 1-2 particles per factory per tick
    if (Math.random() < 0.6) {
      const [sx, sy] = gridToScreen(r, c);
      // From smokestack positions
      const stack = Math.random() > 0.5 ? -8 : 6;
      smoke.push({
        x: sx + stack + (Math.random() - 0.5) * 3,
        y: sy - 14 + (Math.random() - 0.5) * 2,
        age: 0,
        maxAge: 60 + Math.random() * 40,
        vx: (Math.random() - 0.3) * 0.3,
        vy: -0.4 - Math.random() * 0.3,
        size: 3 + Math.random() * 3,
      });
    }
  }

  return smoke;
}

export function updateSmoke(smoke: SmokeParticle[], dt: number): SmokeParticle[] {
  return smoke
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 0.06,
      y: p.y + p.vy * dt * 0.06,
      age: p.age + dt * 0.06,
    }))
    .filter((p) => p.age < p.maxAge);
}

// ── Game tick (called every 2s) ─────────────────────────────

export function gameTick(state: GameState): GameState {
  const income = calculateIncome(state.grid);
  const population = calculatePopulation(state.grid);
  const happiness = calculateHappiness(state.grid);
  const hMul = happiness >= 50 ? 1 + (happiness - 50) / 200 : happiness / 50;

  const citizens = spawnCitizens(state);
  const smoke = spawnSmoke(state);

  return {
    ...state,
    money: state.money + Math.round(income * hMul),
    population,
    happiness,
    tick: state.tick + 1,
    citizens,
    smoke,
  };
}

// ── Place building ──────────────────────────────────────────

export function placeBuilding(
  state: GameState, row: number, col: number, type: BuildingType,
): GameState | null {
  if (type === 'empty') {
    if (state.grid[row][col].type === 'empty') return null;
    const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
    const refund = Math.round(BUILDINGS[state.grid[row][col].type].cost * 0.25);
    newGrid[row][col] = { type: 'empty', level: 1 };
    return { ...state, grid: newGrid, money: state.money + refund };
  }
  if (state.grid[row][col].type !== 'empty') return null;
  if (state.money < BUILDINGS[type].cost) return null;
  const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
  newGrid[row][col] = { type, level: 1 };
  return { ...state, grid: newGrid, money: state.money - BUILDINGS[type].cost };
}

import { GameState, Building, BuildingType, BUILDINGS, GRID } from './types';

export function createInitialState(): GameState {
  const grid: Building[][] = [];
  for (let r = 0; r < GRID; r++) {
    const row: Building[] = [];
    for (let c = 0; c < GRID; c++) {
      row.push({ type: 'empty', level: 1 });
    }
    grid.push(row);
  }
  return { grid, money: 1000, population: 0, happiness: 50, tick: 0 };
}

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

export function gameTick(state: GameState): GameState {
  const income = calculateIncome(state.grid);
  const population = calculatePopulation(state.grid);
  const happiness = calculateHappiness(state.grid);
  const hMul = happiness >= 50 ? 1 + (happiness - 50) / 200 : happiness / 50;
  return {
    ...state,
    money: state.money + Math.round(income * hMul),
    population,
    happiness,
    tick: state.tick + 1,
  };
}

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

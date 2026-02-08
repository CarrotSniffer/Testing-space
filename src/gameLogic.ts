import { GameState, Building, BuildingType, BUILDINGS, GRID_SIZE } from './types';

export function createInitialState(): GameState {
  const grid: Building[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Building[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({ type: 'empty', level: 1 });
    }
    grid.push(row);
  }
  return {
    grid,
    money: 1000,
    population: 0,
    happiness: 50,
    tick: 0,
  };
}

function countBuildings(grid: Building[][]): Record<BuildingType, number> {
  const counts: Record<BuildingType, number> = {
    empty: 0,
    residential: 0,
    commercial: 0,
    industrial: 0,
    park: 0,
    road: 0,
    power: 0,
  };
  for (const row of grid) {
    for (const cell of row) {
      counts[cell.type]++;
    }
  }
  return counts;
}

export function calculateIncome(grid: Building[][]): number {
  const counts = countBuildings(grid);
  let income = 0;

  // Residential tax: scales with population density
  income += counts.residential * BUILDINGS.residential.incomeEffect;

  // Commercial: earns more when there's population to serve
  const popMultiplier = Math.min(2, 1 + counts.residential * 0.1);
  income += counts.commercial * BUILDINGS.commercial.incomeEffect * popMultiplier;

  // Industrial: flat income
  income += counts.industrial * BUILDINGS.industrial.incomeEffect;

  // Park maintenance
  income += counts.park * BUILDINGS.park.incomeEffect;

  // Power maintenance
  income += counts.power * BUILDINGS.power.incomeEffect;

  return Math.round(income);
}

export function calculatePopulation(grid: Building[][]): number {
  const counts = countBuildings(grid);

  let basePop = counts.residential * BUILDINGS.residential.popEffect;

  // Commercial attracts more people
  const commercialBonus = counts.commercial * 3;

  // People leave if no power (need 1 power per 20 buildings)
  const totalBuildings = counts.residential + counts.commercial + counts.industrial;
  const poweredCapacity = counts.power * 20;
  const powerRatio = totalBuildings > 0
    ? Math.min(1, poweredCapacity / totalBuildings)
    : 1;

  return Math.round((basePop + commercialBonus) * powerRatio);
}

export function calculateHappiness(grid: Building[][]): number {
  const counts = countBuildings(grid);
  let happiness = 50; // baseline

  happiness += counts.park * BUILDINGS.park.happinessEffect;
  happiness += counts.residential * BUILDINGS.residential.happinessEffect;
  happiness += counts.commercial * BUILDINGS.commercial.happinessEffect;
  happiness += counts.industrial * BUILDINGS.industrial.happinessEffect;
  happiness += counts.power * BUILDINGS.power.happinessEffect;

  // Bonus for balanced city (has all zone types)
  if (counts.residential > 0 && counts.commercial > 0 && counts.industrial > 0) {
    happiness += 10;
  }

  return Math.max(0, Math.min(100, happiness));
}

export function gameTick(state: GameState): GameState {
  const income = calculateIncome(state.grid);
  const population = calculatePopulation(state.grid);
  const happiness = calculateHappiness(state.grid);

  // Happiness affects income: unhappy cities earn less
  const happinessMultiplier = happiness >= 50 ? 1 + (happiness - 50) / 200 : happiness / 50;

  const adjustedIncome = Math.round(income * happinessMultiplier);

  return {
    ...state,
    money: state.money + adjustedIncome,
    population,
    happiness,
    tick: state.tick + 1,
  };
}

export function placeBuilding(
  state: GameState,
  row: number,
  col: number,
  type: BuildingType
): GameState | null {
  const info = BUILDINGS[type];

  // Demolishing is free
  if (type === 'empty') {
    const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
    // Refund 25% of original building cost
    const existing = state.grid[row][col];
    const refund = Math.round(BUILDINGS[existing.type].cost * 0.25);
    newGrid[row][col] = { type: 'empty', level: 1 };
    return { ...state, grid: newGrid, money: state.money + refund };
  }

  // Can't build on occupied tile
  if (state.grid[row][col].type !== 'empty') {
    return null;
  }

  // Can't afford
  if (state.money < info.cost) {
    return null;
  }

  const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
  newGrid[row][col] = { type, level: 1 };

  return {
    ...state,
    grid: newGrid,
    money: state.money - info.cost,
  };
}

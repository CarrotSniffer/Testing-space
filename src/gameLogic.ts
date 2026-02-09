import {
  GameState, Building, BuildingType, BUILDINGS, GRID,
  Citizen, SmokeParticle, HW, HH, randomCitizenColor,
  getLevelMultiplier, GameEvent, Notification, getUpgradeCost,
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
  return {
    grid, money: 1000, population: 0, happiness: 50, tick: 0,
    citizens: [], smoke: [], speed: 1, events: [],
    dayTime: 0.35, totalBuildings: 0, totalMoneyEarned: 0,
    notifications: [], achievementsUnlocked: [],
  };
}

// ── Counting helpers ────────────────────────────────────────

export function countBuildings(grid: Building[][]): Record<BuildingType, number> {
  const c: Record<string, number> = {
    empty: 0, residential: 0, commercial: 0, industrial: 0,
    park: 0, road: 0, power: 0,
    hospital: 0, school: 0, fire_station: 0, police: 0,
  };
  for (const row of grid) for (const cell of row) c[cell.type]++;
  return c as Record<BuildingType, number>;
}

function countTotalNonEmpty(grid: Building[][]): number {
  let c = 0;
  for (const row of grid) for (const cell of row) if (cell.type !== 'empty') c++;
  return c;
}

// ── Adjacency ──────────────────────────────────────────────

function getNeighborTypes(grid: Building[][], r: number, c: number): BuildingType[] {
  const types: BuildingType[] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
      types.push(grid[nr][nc].type);
    }
  }
  return types;
}

export function calculateAdjacencyBonus(grid: Building[][], r: number, c: number): { income: number; happiness: number } {
  const cell = grid[r][c];
  const neighbors = getNeighborTypes(grid, r, c);
  let income = 0;
  let happiness = 0;

  switch (cell.type) {
    case 'residential':
      if (neighbors.includes('park')) happiness += 3;
      if (neighbors.includes('industrial')) happiness -= 2;
      if (neighbors.includes('hospital')) happiness += 2;
      if (neighbors.includes('police')) happiness += 1;
      break;
    case 'commercial':
      if (neighbors.includes('road')) income += 3;
      if (neighbors.includes('residential')) income += 2;
      break;
    case 'industrial':
      if (neighbors.includes('road')) income += 4;
      if (neighbors.includes('residential')) happiness -= 1;
      break;
    case 'park':
      // Parks near residential boost extra
      if (neighbors.includes('residential')) happiness += 2;
      break;
  }

  return { income, happiness };
}

// ── Economy ─────────────────────────────────────────────────

export function calculateIncome(grid: Building[][]): number {
  const ct = countBuildings(grid);
  let income = 0;

  // Base income from buildings with level multipliers
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = grid[r][c];
      if (cell.type === 'empty') continue;
      const info = BUILDINGS[cell.type];
      const lvlMul = getLevelMultiplier(cell.level);
      const adj = calculateAdjacencyBonus(grid, r, c);

      if (cell.type === 'commercial') {
        const popMul = Math.min(2, 1 + ct.residential * 0.1);
        income += info.incomeEffect * lvlMul * popMul + adj.income;
      } else {
        income += info.incomeEffect * lvlMul + adj.income;
      }
    }
  }

  // School bonus: +10% income per school
  const schoolBonus = 1 + ct.school * 0.1;
  income *= schoolBonus;

  return Math.round(income);
}

export function calculatePopulation(grid: Building[][]): number {
  const ct = countBuildings(grid);
  let basePop = 0;

  // Sum population from buildings with level multipliers
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type !== 'empty') {
        const lvlMul = getLevelMultiplier(cell.level);
        basePop += BUILDINGS[cell.type].popEffect * lvlMul;
      }
    }
  }

  const commBonus = ct.commercial * 3;
  const total = countTotalNonEmpty(grid) - ct.road;
  const powered = ct.power * 20 * (1 + (ct.power > 0 ? 0 : 0)); // power plants power 20 each
  const ratio = total > 0 ? Math.min(1, powered / total) : 1;

  // Hospital bonus: +15% pop cap per hospital
  const hospitalMul = 1 + ct.hospital * 0.15;

  return Math.round((basePop + commBonus) * ratio * hospitalMul);
}

export function calculateHappiness(grid: Building[][]): number {
  const ct = countBuildings(grid);
  let h = 50;

  // Base effects with level multipliers
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = grid[r][c];
      if (cell.type === 'empty') continue;
      const info = BUILDINGS[cell.type];
      const lvlMul = getLevelMultiplier(cell.level);
      const adj = calculateAdjacencyBonus(grid, r, c);
      h += info.happinessEffect * lvlMul + adj.happiness;

      // Fire penalty
      if (cell.onFire) h -= 5;
    }
  }

  // Diversity bonus
  if (ct.residential > 0 && ct.commercial > 0 && ct.industrial > 0) h += 10;

  // Police reduce crime effect (general boost when you have police)
  if (ct.police > 0) h += ct.police * 2;

  return Math.max(0, Math.min(100, Math.round(h)));
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
  const destinations = findTilesOfType(state.grid, [
    'commercial', 'industrial', 'park', 'road', 'hospital', 'school', 'police',
  ]);

  const target = Math.min(homes.length * 2, 40);

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

  while (citizens.length > target) citizens.pop();
  return citizens;
}

export function updateCitizens(state: GameState, dt: number): Citizen[] {
  const destinations = findTilesOfType(state.grid, [
    'commercial', 'industrial', 'park', 'road', 'residential', 'hospital', 'school',
  ]);

  return state.citizens.map((c) => {
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
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
    if (Math.random() < 0.6) {
      const [sx, sy] = gridToScreen(r, c);
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

  // Fire smoke (red-tinted, from burning buildings)
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (state.grid[r][c].onFire && Math.random() < 0.4) {
        const [sx, sy] = gridToScreen(r, c);
        smoke.push({
          x: sx + (Math.random() - 0.5) * 10,
          y: sy - 5 + (Math.random() - 0.5) * 5,
          age: 0,
          maxAge: 40 + Math.random() * 30,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.6 - Math.random() * 0.4,
          size: 4 + Math.random() * 4,
        });
      }
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

// ── Random Events ──────────────────────────────────────────

function trySpawnEvent(state: GameState): GameEvent | null {
  const ct = countBuildings(state.grid);
  const totalBuildings = countTotalNonEmpty(state.grid);
  if (totalBuildings < 5) return null; // Need at least 5 buildings for events
  if (state.events.length >= 2) return null; // Max 2 concurrent events
  if (Math.random() > 0.08) return null; // ~8% chance per tick

  const roll = Math.random();

  if (roll < 0.2 && ct.fire_station === 0 && totalBuildings > 3) {
    return {
      type: 'fire', label: 'Fire!',
      description: 'A building caught fire!',
      duration: 8,
      effect: {},
    };
  } else if (roll < 0.45) {
    return {
      type: 'boom', label: 'Economic Boom',
      description: 'Trade is thriving! +50% income',
      duration: 15,
      effect: { incomeMult: 1.5 },
    };
  } else if (roll < 0.65) {
    return {
      type: 'storm', label: 'Storm',
      description: 'Bad weather! -10 happiness',
      duration: 10,
      effect: { happinessAdd: -10 },
    };
  } else if (roll < 0.85) {
    return {
      type: 'festival', label: 'Festival!',
      description: 'Citizens celebrate! +12 happiness',
      duration: 12,
      effect: { happinessAdd: 12 },
    };
  } else {
    return {
      type: 'population_surge', label: 'Population Surge',
      description: 'New residents arrive! +20 pop',
      duration: 10,
      effect: { popAdd: 20 },
    };
  }
}

function applyFireEvent(state: GameState): GameState {
  const grid = state.grid.map(r => r.map(c => ({ ...c })));
  // Find a non-empty, non-fire building to set on fire
  const candidates: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c].type !== 'empty' && grid[r][c].type !== 'road' && !grid[r][c].onFire) {
        candidates.push([r, c]);
      }
    }
  }
  if (candidates.length > 0) {
    const [fr, fc] = candidates[Math.floor(Math.random() * candidates.length)];
    grid[fr][fc].onFire = true;
    grid[fr][fc].fireTimer = 8;
  }
  return { ...state, grid };
}

function tickFireTimers(state: GameState): GameState {
  const grid = state.grid.map(r => r.map(c => ({ ...c })));
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c].onFire) {
        grid[r][c].fireTimer = (grid[r][c].fireTimer || 1) - 1;
        if (grid[r][c].fireTimer! <= 0) {
          grid[r][c].onFire = false;
          grid[r][c].fireTimer = undefined;
          // Building damaged - reduce level
          if (grid[r][c].level > 1) {
            grid[r][c].level--;
          }
        }
      }
    }
  }
  return { ...state, grid };
}

// ── Day/Night Cycle ─────────────────────────────────────────

function advanceDayTime(dayTime: number): number {
  // Full cycle every ~120 ticks (240 seconds = 4 minutes)
  return (dayTime + 1 / 120) % 1;
}

// ── Game tick (called every 2s at 1x speed) ─────────────────

export function gameTick(state: GameState): GameState {
  if (state.speed === 0) return state; // Paused

  let newState = { ...state };

  // Advance day/night
  newState.dayTime = advanceDayTime(state.dayTime);

  // Tick fire timers
  newState = tickFireTimers(newState);

  // Calculate base stats
  const income = calculateIncome(newState.grid);
  const population = calculatePopulation(newState.grid);
  let happiness = calculateHappiness(newState.grid);

  // Process active events
  let eventIncomeMult = 1;
  let eventHappinessAdd = 0;
  let eventPopAdd = 0;
  const activeEvents: GameEvent[] = [];

  for (const evt of newState.events) {
    const remaining = { ...evt, duration: evt.duration - 1 };
    if (remaining.duration > 0) {
      activeEvents.push(remaining);
    }
    if (evt.effect.incomeMult) eventIncomeMult *= evt.effect.incomeMult;
    if (evt.effect.happinessAdd) eventHappinessAdd += evt.effect.happinessAdd;
    if (evt.effect.popAdd) eventPopAdd += evt.effect.popAdd;
  }

  // Try spawn new event
  const newEvent = trySpawnEvent(newState);
  const notifications = [...newState.notifications];
  if (newEvent) {
    activeEvents.push(newEvent);
    notifications.push({
      text: newEvent.label + ': ' + newEvent.description,
      color: newEvent.type === 'fire' || newEvent.type === 'storm' ? '#f87171' :
             newEvent.type === 'boom' ? '#4ade80' : '#facc15',
      time: Date.now(),
    });
    if (newEvent.type === 'fire') {
      newState = applyFireEvent(newState);
    }
  }

  // Apply happiness modifier
  happiness = Math.max(0, Math.min(100, happiness + eventHappinessAdd));
  const hMul = happiness >= 50 ? 1 + (happiness - 50) / 200 : happiness / 50;
  const finalIncome = Math.round(income * hMul * eventIncomeMult);

  const citizens = spawnCitizens(newState);
  const smoke = spawnSmoke(newState);

  // Trim old notifications (keep last 20)
  while (notifications.length > 20) notifications.shift();

  return {
    ...newState,
    money: newState.money + finalIncome,
    population: population + eventPopAdd,
    happiness,
    tick: newState.tick + 1,
    citizens,
    smoke,
    events: activeEvents,
    totalBuildings: countTotalNonEmpty(newState.grid),
    totalMoneyEarned: newState.totalMoneyEarned + Math.max(0, finalIncome),
    notifications,
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

// ── Upgrade building ────────────────────────────────────────

export function upgradeBuilding(
  state: GameState, row: number, col: number,
): GameState | null {
  const cell = state.grid[row][col];
  if (cell.type === 'empty' || cell.type === 'road') return null;
  if (cell.level >= 3) return null;
  const cost = getUpgradeCost(cell.type, cell.level);
  if (state.money < cost) return null;

  const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
  newGrid[row][col].level = cell.level + 1;
  return { ...state, grid: newGrid, money: state.money - cost };
}

// ── Building info ───────────────────────────────────────────

export function getBuildingStats(state: GameState, r: number, c: number): {
  income: number;
  happiness: number;
  population: number;
  adjacencyIncome: number;
  adjacencyHappiness: number;
  level: number;
  upgradeCost: number;
} | null {
  const cell = state.grid[r][c];
  if (cell.type === 'empty') return null;
  const info = BUILDINGS[cell.type];
  const lvlMul = getLevelMultiplier(cell.level);
  const adj = calculateAdjacencyBonus(state.grid, r, c);

  return {
    income: Math.round(info.incomeEffect * lvlMul),
    happiness: Math.round(info.happinessEffect * lvlMul),
    population: Math.round(info.popEffect * lvlMul),
    adjacencyIncome: adj.income,
    adjacencyHappiness: adj.happiness,
    level: cell.level,
    upgradeCost: getUpgradeCost(cell.type, cell.level),
  };
}

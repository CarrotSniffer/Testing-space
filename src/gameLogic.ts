import {
  GameState, Building, BuildingType, BUILDINGS, GRID,
  Citizen, SmokeParticle, HW, HH, randomCitizenColor,
  getLevelMultiplier, GameEvent, Notification, getUpgradeCost,
  CitizenNeeds,
} from './types';
import { gridToScreen } from './renderer';

// ── Initial state ────────────────────────────────────────────

export function createInitialState(): GameState {
  const grid: Building[][] = [];
  for (let r = 0; r < GRID; r++) {
    const row: Building[] = [];
    for (let c = 0; c < GRID; c++) {
      row.push({ type: 'empty', level: 1, visitors: 0, totalVisits: 0, revenue: 0 });
    }
    grid.push(row);
  }
  return {
    grid, money: 1000, population: 0, happiness: 50, tick: 0,
    citizens: [], smoke: [], speed: 1, events: [],
    dayTime: 0.35, totalBuildings: 0, totalMoneyEarned: 0,
    totalVisits: 0, incomeThisCycle: 0, upkeepThisCycle: 0,
    notifications: [], achievementsUnlocked: [], nextCitizenId: 1,
  };
}

// ── Counting helpers ─────────────────────────────────────────

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

// ── Population capacity ──────────────────────────────────────

function getPopulationCapacity(grid: Building[][]): number {
  let cap = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type === 'residential') {
        cap += BUILDINGS.residential.popCapacity * getLevelMultiplier(cell.level);
      }
    }
  }
  return Math.floor(cap);
}

// ── Citizen AI ───────────────────────────────────────────────

function createCitizen(id: number, homeR: number, homeC: number): Citizen {
  const [hx, hy] = gridToScreen(homeR, homeC);
  return {
    id,
    x: hx + (Math.random() - 0.5) * HW * 0.6,
    y: hy + HH + (Math.random() - 0.5) * HH * 0.4,
    tx: hx, ty: hy + HH,
    color: randomCitizenColor(),
    speed: 0.3 + Math.random() * 0.4,
    state: 'idle',
    homeR, homeC,
    targetR: -1, targetC: -1,
    targetType: null,
    needs: {
      shopping: 20 + Math.random() * 30,
      entertainment: 10 + Math.random() * 20,
      work: 30 + Math.random() * 20,
      health: 0,
      education: 5 + Math.random() * 15,
    },
    satisfaction: 70,
    visitTimer: 0,
    wallet: 50,
  };
}

function getHighestNeed(needs: CitizenNeeds): { need: keyof CitizenNeeds; value: number } {
  let highest: keyof CitizenNeeds = 'shopping';
  let highestVal = 0;
  for (const key of Object.keys(needs) as (keyof CitizenNeeds)[]) {
    if (needs[key] > highestVal) {
      highestVal = needs[key];
      highest = key;
    }
  }
  return { need: highest, value: highestVal };
}

function findBuildingForNeed(
  grid: Building[][], need: keyof CitizenNeeds,
): [number, number] | null {
  const candidates: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = grid[r][c];
      if (cell.type === 'empty') continue;
      const info = BUILDINGS[cell.type];
      if (info.needFulfilled === need) {
        const cap = Math.floor(info.capacity * getLevelMultiplier(cell.level));
        if (cell.visitors < cap) {
          candidates.push([r, c]);
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function randomNearTile(r: number, c: number): [number, number] {
  const [sx, sy] = gridToScreen(r, c);
  return [
    sx + (Math.random() - 0.5) * HW * 0.8,
    sy + HH + (Math.random() - 0.5) * HH * 0.5,
  ];
}

function tickCitizenNeeds(citizen: Citizen): CitizenNeeds {
  return {
    shopping: Math.min(100, citizen.needs.shopping + 2 + Math.random() * 1.5),
    entertainment: Math.min(100, citizen.needs.entertainment + 1.5 + Math.random()),
    work: Math.min(100, citizen.needs.work + 2.5 + Math.random()),
    health: Math.min(100, citizen.needs.health + 0.3 + Math.random() * 0.3),
    education: Math.min(100, citizen.needs.education + 0.8 + Math.random() * 0.5),
  };
}

// Decision threshold - citizens only seek buildings when need is above this
const NEED_THRESHOLD = 40;

function citizenDecide(citizen: Citizen, grid: Building[][]): Citizen {
  // Idle citizens check their needs and find somewhere to go
  const { need, value } = getHighestNeed(citizen.needs);

  if (value < NEED_THRESHOLD) {
    // No pressing need, just wander near home
    if (Math.random() < 0.3) {
      const [tx, ty] = randomNearTile(citizen.homeR, citizen.homeC);
      return { ...citizen, tx, ty };
    }
    return citizen;
  }

  // Find a building that can fulfill this need
  const target = findBuildingForNeed(grid, need);
  if (!target) {
    // No building available - satisfaction drops
    const sat = Math.max(0, citizen.satisfaction - 2);
    return { ...citizen, satisfaction: sat };
  }

  const [tr, tc] = target;
  const [tx, ty] = randomNearTile(tr, tc);

  return {
    ...citizen,
    state: 'walking',
    targetR: tr,
    targetC: tc,
    targetType: grid[tr][tc].type,
    tx, ty,
  };
}

// ── Citizen movement (per-frame, smooth) ─────────────────────

export function updateCitizens(state: GameState, dt: number): Citizen[] {
  return state.citizens.map(c => {
    if (c.state === 'visiting') return c; // Don't move while visiting

    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      // Arrived at destination
      if (c.state === 'returning') {
        return { ...c, state: 'idle', x: c.tx, y: c.ty };
      }
      return { ...c, x: c.tx, y: c.ty };
    }

    const speed = c.speed * dt * 0.06;
    return {
      ...c,
      x: c.x + (dx / dist) * speed,
      y: c.y + (dy / dist) * speed,
    };
  });
}

// ── Citizen tick logic (per game tick, not per frame) ─────────

function tickCitizens(state: GameState): {
  citizens: Citizen[];
  grid: Building[][];
  visitRevenue: number;
  visitCount: number;
} {
  const grid = state.grid.map(r => r.map(c => ({ ...c })));
  let visitRevenue = 0;
  let visitCount = 0;

  // Reset visitor counts each tick (recalculated below)
  for (const row of grid) for (const cell of row) cell.visitors = 0;

  const citizens = state.citizens.map(citizen => {
    let c = { ...citizen, needs: { ...citizen.needs } };

    // Increase needs over time
    c.needs = tickCitizenNeeds(c);

    switch (c.state) {
      case 'idle':
        c = citizenDecide(c, grid);
        break;

      case 'walking': {
        // Check if arrived at target building
        const dx = c.tx - c.x;
        const dy = c.ty - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4 && c.targetR >= 0 && c.targetC >= 0) {
          const building = grid[c.targetR][c.targetC];
          const info = BUILDINGS[building.type];
          const cap = Math.floor(info.capacity * getLevelMultiplier(building.level));

          if (building.visitors < cap && info.needFulfilled) {
            // Enter building
            building.visitors++;
            c.state = 'visiting';
            c.visitTimer = info.visitDuration;
          } else {
            // Building full or changed, go home
            const [tx, ty] = randomNearTile(c.homeR, c.homeC);
            c = { ...c, state: 'returning', tx, ty, targetR: -1, targetC: -1, targetType: null };
            c.satisfaction = Math.max(0, c.satisfaction - 5);
          }
        }
        break;
      }

      case 'visiting': {
        c.visitTimer--;
        if (c.targetR >= 0 && c.targetC >= 0) {
          grid[c.targetR][c.targetC].visitors++;
        }

        if (c.visitTimer <= 0) {
          // Visit complete!
          if (c.targetR >= 0 && c.targetC >= 0) {
            const building = grid[c.targetR][c.targetC];
            const info = BUILDINGS[building.type];
            const lvlMul = getLevelMultiplier(building.level);

            // Fulfill need
            if (info.needFulfilled) {
              c.needs[info.needFulfilled] = Math.max(0,
                c.needs[info.needFulfilled] - info.fulfillAmount * lvlMul
              );
            }

            // Generate revenue
            const rev = Math.round(info.revenuePerVisit * lvlMul);
            visitRevenue += rev;
            building.revenue += rev;
            building.totalVisits++;
            visitCount++;

            // Boost satisfaction
            c.satisfaction = Math.min(100, c.satisfaction + 8);
          }

          // Head home
          const [tx, ty] = randomNearTile(c.homeR, c.homeC);
          c = { ...c, state: 'returning', tx, ty, targetR: -1, targetC: -1, targetType: null };
        }
        break;
      }

      case 'returning': {
        const dx = c.tx - c.x;
        const dy = c.ty - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 4) {
          c.state = 'idle';
        }
        break;
      }
    }

    return c;
  });

  return { citizens, grid, visitRevenue, visitCount };
}

// ── Spawn / remove citizens based on housing ─────────────────

function managePopulation(state: GameState): { citizens: Citizen[]; nextId: number } {
  const popCap = getPopulationCapacity(state.grid);
  let citizens = [...state.citizens];
  let nextId = state.nextCitizenId;

  // Find all residential tiles
  const homes: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (state.grid[r][c].type === 'residential') homes.push([r, c]);
    }
  }

  // Spawn new citizens if under cap (max 2 per tick to feel organic)
  let spawned = 0;
  while (citizens.length < popCap && homes.length > 0 && spawned < 2) {
    const home = homes[Math.floor(Math.random() * homes.length)];
    citizens.push(createCitizen(nextId++, home[0], home[1]));
    spawned++;
  }

  // Remove citizens if over cap (when housing demolished)
  while (citizens.length > popCap && citizens.length > 0) {
    // Remove idle citizens first
    const idleIdx = citizens.findIndex(c => c.state === 'idle');
    if (idleIdx >= 0) {
      citizens.splice(idleIdx, 1);
    } else {
      citizens.pop();
    }
  }

  // Remove citizens whose homes no longer exist
  citizens = citizens.filter(c => {
    return state.grid[c.homeR]?.[c.homeC]?.type === 'residential';
  });

  return { citizens, nextId };
}

// ── Happiness calculation ────────────────────────────────────

function calculateHappiness(state: GameState): number {
  // Base: average citizen satisfaction
  let avgSat = 50;
  if (state.citizens.length > 0) {
    avgSat = state.citizens.reduce((sum, c) => sum + c.satisfaction, 0) / state.citizens.length;
  }

  // Building effects (passive bonuses from parks, services, etc.)
  let buildingBonus = 0;
  const ct = countBuildings(state.grid);
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = state.grid[r][c];
      if (cell.type === 'empty') continue;
      buildingBonus += BUILDINGS[cell.type].happinessEffect * getLevelMultiplier(cell.level) * 0.5;
      if (cell.onFire) buildingBonus -= 5;
    }
  }

  // Diversity bonus
  if (ct.residential > 0 && ct.commercial > 0 && ct.industrial > 0) buildingBonus += 5;
  if (ct.police > 0) buildingBonus += ct.police * 2;

  // Combine: 70% citizen satisfaction + 30% building bonuses
  const combined = avgSat * 0.7 + (50 + buildingBonus) * 0.3;
  return Math.max(0, Math.min(100, Math.round(combined)));
}

// ── Upkeep calculation ───────────────────────────────────────

function calculateUpkeep(grid: Building[][]): number {
  let upkeep = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type === 'empty') continue;
      upkeep += BUILDINGS[cell.type].upkeepPerTick * getLevelMultiplier(cell.level);
    }
  }
  return Math.round(upkeep);
}

// ── Income calculation (for HUD display) ─────────────────────

export function calculateIncome(state: GameState): number {
  return state.incomeThisCycle - state.upkeepThisCycle;
}

// ── Smoke ────────────────────────────────────────────────────

function spawnSmoke(state: GameState): SmokeParticle[] {
  const smoke = [...state.smoke];

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = state.grid[r][c];

      // Factory smoke (more smoke when visitors/workers inside)
      if (cell.type === 'industrial' && Math.random() < 0.4 + cell.visitors * 0.1) {
        const [sx, sy] = gridToScreen(r, c);
        const stack = Math.random() > 0.5 ? -8 : 6;
        smoke.push({
          x: sx + stack + (Math.random() - 0.5) * 3,
          y: sy - 14 + (Math.random() - 0.5) * 2,
          age: 0, maxAge: 60 + Math.random() * 40,
          vx: (Math.random() - 0.3) * 0.3,
          vy: -0.4 - Math.random() * 0.3,
          size: 3 + Math.random() * 3,
        });
      }

      // Fire smoke
      if (cell.onFire && Math.random() < 0.4) {
        const [sx, sy] = gridToScreen(r, c);
        smoke.push({
          x: sx + (Math.random() - 0.5) * 10,
          y: sy - 5 + (Math.random() - 0.5) * 5,
          age: 0, maxAge: 40 + Math.random() * 30,
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
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt * 0.06,
      y: p.y + p.vy * dt * 0.06,
      age: p.age + dt * 0.06,
    }))
    .filter(p => p.age < p.maxAge);
}

// ── Random Events ────────────────────────────────────────────

function trySpawnEvent(state: GameState): GameEvent | null {
  const ct = countBuildings(state.grid);
  const totalBuildings = countTotalNonEmpty(state.grid);
  if (totalBuildings < 5) return null;
  if (state.events.length >= 2) return null;
  if (Math.random() > 0.08) return null;

  const roll = Math.random();
  if (roll < 0.2 && ct.fire_station === 0 && totalBuildings > 3) {
    return { type: 'fire', label: 'Fire!', description: 'A building caught fire!', duration: 8, effect: {} };
  } else if (roll < 0.45) {
    return { type: 'boom', label: 'Economic Boom', description: 'Visitors spending more! +50% revenue', duration: 15, effect: { incomeMult: 1.5 } };
  } else if (roll < 0.65) {
    return { type: 'storm', label: 'Storm', description: 'Bad weather! Citizens stay home', duration: 10, effect: { happinessAdd: -10 } };
  } else if (roll < 0.85) {
    return { type: 'festival', label: 'Festival!', description: 'Citizens celebrate! More visits', duration: 12, effect: { happinessAdd: 12 } };
  } else {
    return { type: 'population_surge', label: 'Population Surge', description: 'New residents!', duration: 10, effect: { popAdd: 20 } };
  }
}

function applyFireEvent(state: GameState): GameState {
  const grid = state.grid.map(r => r.map(c => ({ ...c })));
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
          if (grid[r][c].level > 1) grid[r][c].level--;
        }
      }
    }
  }
  return { ...state, grid };
}

// ── Day/Night ────────────────────────────────────────────────

function advanceDayTime(dayTime: number): number {
  return (dayTime + 1 / 120) % 1;
}

// ── Game tick ────────────────────────────────────────────────

export function gameTick(state: GameState): GameState {
  if (state.speed === 0) return state;

  let newState = { ...state };

  // Advance day/night
  newState.dayTime = advanceDayTime(state.dayTime);

  // Tick fire timers
  newState = tickFireTimers(newState);

  // Manage population (spawn/remove citizens based on housing)
  const { citizens: managedCitizens, nextId } = managePopulation(newState);
  newState.citizens = managedCitizens;
  newState.nextCitizenId = nextId;

  // Tick citizen AI - this is where visits happen and revenue is generated
  const citizenResult = tickCitizens(newState);
  newState.citizens = citizenResult.citizens;
  newState.grid = citizenResult.grid;

  // Reset building revenue counters periodically
  // (revenue accumulates for display, reset each tick)
  for (const row of newState.grid) {
    for (const cell of row) {
      cell.revenue = 0;
    }
  }

  // Calculate upkeep
  const upkeep = calculateUpkeep(newState.grid);

  // Process events
  let eventIncomeMult = 1;
  let eventHappinessAdd = 0;
  const activeEvents: GameEvent[] = [];

  for (const evt of newState.events) {
    const remaining = { ...evt, duration: evt.duration - 1 };
    if (remaining.duration > 0) activeEvents.push(remaining);
    if (evt.effect.incomeMult) eventIncomeMult *= evt.effect.incomeMult;
    if (evt.effect.happinessAdd) eventHappinessAdd += evt.effect.happinessAdd;
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

  // School bonus to revenue
  const ct = countBuildings(newState.grid);
  const schoolBonus = 1 + ct.school * 0.1;

  // Final revenue = visitor revenue * event mult * school bonus
  const tickRevenue = Math.round(citizenResult.visitRevenue * eventIncomeMult * schoolBonus);
  const netIncome = tickRevenue - upkeep;

  // Calculate happiness (based on citizen satisfaction + building effects)
  let happiness = calculateHappiness(newState);
  happiness = Math.max(0, Math.min(100, happiness + eventHappinessAdd));

  const smoke = spawnSmoke(newState);
  while (notifications.length > 20) notifications.shift();

  return {
    ...newState,
    money: newState.money + netIncome,
    population: newState.citizens.length,
    happiness,
    tick: newState.tick + 1,
    smoke,
    events: activeEvents,
    totalBuildings: countTotalNonEmpty(newState.grid),
    totalMoneyEarned: newState.totalMoneyEarned + Math.max(0, tickRevenue),
    totalVisits: newState.totalVisits + citizenResult.visitCount,
    incomeThisCycle: tickRevenue,
    upkeepThisCycle: upkeep,
    notifications,
  };
}

// ── Place building ───────────────────────────────────────────

export function placeBuilding(
  state: GameState, row: number, col: number, type: BuildingType,
): GameState | null {
  if (type === 'empty') {
    if (state.grid[row][col].type === 'empty') return null;
    const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
    const refund = Math.round(BUILDINGS[state.grid[row][col].type].cost * 0.25);
    newGrid[row][col] = { type: 'empty', level: 1, visitors: 0, totalVisits: 0, revenue: 0 };
    return { ...state, grid: newGrid, money: state.money + refund };
  }
  if (state.grid[row][col].type !== 'empty') return null;
  if (state.money < BUILDINGS[type].cost) return null;
  const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
  newGrid[row][col] = { type, level: 1, visitors: 0, totalVisits: 0, revenue: 0 };
  return { ...state, grid: newGrid, money: state.money - BUILDINGS[type].cost };
}

// ── Upgrade building ─────────────────────────────────────────

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

// ── Building stats ───────────────────────────────────────────

export function getBuildingStats(state: GameState, r: number, c: number): {
  revenuePerVisit: number;
  upkeep: number;
  capacity: number;
  visitors: number;
  totalVisits: number;
  happinessEffect: number;
  level: number;
  upgradeCost: number;
  needFulfilled: string | null;
} | null {
  const cell = state.grid[r][c];
  if (cell.type === 'empty') return null;
  const info = BUILDINGS[cell.type];
  const lvlMul = getLevelMultiplier(cell.level);

  return {
    revenuePerVisit: Math.round(info.revenuePerVisit * lvlMul),
    upkeep: Math.round(info.upkeepPerTick * lvlMul),
    capacity: Math.floor(info.capacity * lvlMul),
    visitors: cell.visitors,
    totalVisits: cell.totalVisits,
    happinessEffect: Math.round(info.happinessEffect * lvlMul),
    level: cell.level,
    upgradeCost: getUpgradeCost(cell.type, cell.level),
    needFulfilled: info.needFulfilled,
  };
}

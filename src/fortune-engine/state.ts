import { GameState, BUSINESSES, ASSETS, BusinessState, AssetPriceState, MarketState } from './types';

const SAVE_KEY = 'fortune_engine_save';
const SAVE_VERSION = 1;

export function createInitialState(): GameState {
  const businesses: BusinessState[] = BUSINESSES.map(def => ({
    id: def.id,
    level: 0,
    managerHired: false,
    lastCollectTime: 0,
    progress: 0,
  }));

  const prices: Record<string, AssetPriceState> = {};
  for (const a of ASSETS) {
    prices[a.id] = {
      currentPrice: a.basePrice,
      priceHistory: [a.basePrice],
      cyclePhase: Math.random() * Math.PI * 2,
      trendAccum: 0,
    };
  }

  const market: MarketState = {
    prices,
    events: [],
    nextEventTick: 60 + Math.floor(Math.random() * 60),
    sentiment: 0,
  };

  const now = Date.now();

  return {
    cash: 1,
    insiderKnowledge: 0,
    legacyPoints: 0,
    luckTokens: 0,
    marketIntel: 0,
    businesses,
    portfolio: [],
    market,
    liquidationCount: 0,
    ascensionCount: 0,
    totalIKEarned: 0,
    unlocked: [],
    insiderPurchases: [],
    stats: {
      totalCashEarned: 0,
      totalTaps: 0,
      totalGambled: 0,
      gamblingWins: 0,
      gamblingLosses: 0,
      fastestLiquidationMs: 0,
      highestNetWorth: 0,
    },
    lastSaveTime: now,
    lastOnlineTime: now,
    gameStartTime: now,
    tick: 0,
    activeTab: 'business',
    particles: [],
    activeGamble: null,
  };
}

interface SaveData {
  version: number;
  state: Omit<GameState, 'particles' | 'activeGamble'>;
}

export function saveGame(state: GameState): void {
  const { particles: _p, activeGamble: _g, ...saveable } = state;
  // Trim price history to last 60 entries
  const trimmedMarket = { ...saveable.market, prices: { ...saveable.market.prices } };
  for (const key of Object.keys(trimmedMarket.prices)) {
    const ps = trimmedMarket.prices[key];
    trimmedMarket.prices[key] = {
      ...ps,
      priceHistory: ps.priceHistory.slice(-60),
    };
  }
  const data: SaveData = {
    version: SAVE_VERSION,
    state: { ...saveable, market: trimmedMarket, lastSaveTime: Date.now() },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage full */ }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (!data.state || data.version !== SAVE_VERSION) return null;
    return {
      ...data.state,
      particles: [],
      activeGamble: null,
    };
  } catch {
    return null;
  }
}

export function getStartingCash(state: GameState): number {
  let cash = 1;
  if (state.insiderPurchases.includes('start_cash')) cash = 1000;
  if (state.insiderPurchases.includes('start_10k')) cash = 10000;
  return cash;
}

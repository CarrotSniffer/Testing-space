import { GameState, BUSINESSES, ASSETS, BusinessState, AssetPriceState } from './types';
import { getNetWorth } from './market';
import { getStartingCash } from './state';

export function canLiquidate(state: GameState): boolean {
  return getNetWorth(state) >= 1_000_000;
}

export function projectedIK(state: GameState): number {
  const nw = getNetWorth(state);
  return Math.floor(Math.sqrt(nw / 1_000_000));
}

export function liquidate(state: GameState): GameState {
  const ikGain = projectedIK(state);
  const newIK = state.insiderKnowledge + ikGain;
  const newTotalIK = state.totalIKEarned + ikGain;

  // Reset businesses
  const businesses: BusinessState[] = BUSINESSES.map(def => ({
    id: def.id,
    level: 0,
    managerHired: false,
    lastCollectTime: 0,
    progress: 0,
  }));

  // Reset market
  const prices: Record<string, AssetPriceState> = {};
  for (const a of ASSETS) {
    prices[a.id] = {
      currentPrice: a.basePrice,
      priceHistory: [a.basePrice],
      cyclePhase: Math.random() * Math.PI * 2,
      trendAccum: 0,
    };
  }

  const now = Date.now();
  const cycleTime = now - (state.gameStartTime || now);
  const fastest = state.stats.fastestLiquidationMs > 0
    ? Math.min(state.stats.fastestLiquidationMs, cycleTime)
    : cycleTime;

  const startCash = getStartingCash({ ...state, insiderKnowledge: newIK });

  return {
    ...state,
    cash: startCash,
    insiderKnowledge: newIK,
    totalIKEarned: newTotalIK,
    businesses,
    portfolio: [],
    market: {
      prices,
      events: [],
      nextEventTick: 60 + Math.floor(Math.random() * 60),
      sentiment: 0,
    },
    liquidationCount: state.liquidationCount + 1,
    tick: 0,
    gameStartTime: now,
    activeGamble: null,
    particles: [],
    stats: {
      ...state.stats,
      fastestLiquidationMs: fastest,
      highestNetWorth: Math.max(state.stats.highestNetWorth, getNetWorth(state)),
    },
  };
}

export function canAscend(state: GameState): boolean {
  return state.insiderKnowledge >= 1000;
}

export function projectedLP(state: GameState): number {
  return Math.floor(Math.sqrt(state.insiderKnowledge / 100));
}

export function ascend(state: GameState): GameState {
  const lpGain = projectedLP(state);

  // Full liquidation first
  const liquidated = liquidate(state);

  return {
    ...liquidated,
    insiderKnowledge: 0,
    legacyPoints: state.legacyPoints + lpGain,
    ascensionCount: state.ascensionCount + 1,
    insiderPurchases: [], // Reset insider shop
    totalIKEarned: 0,
  };
}

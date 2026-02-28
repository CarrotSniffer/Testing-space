import { GameState, ASSETS, AssetDef, AssetPriceState, MarketEvent, AssetHolding, getAssetDef } from './types';

const EVENT_TYPES = [
  { type: 'bull_run', weight: 20, headline: (a: string) => `${a} surges on strong earnings!`, mul: 1.2, duration: 30 },
  { type: 'flash_crash', weight: 15, headline: (a: string) => `${a} flash crashes!`, mul: 0.8, duration: 10 },
  { type: 'earnings', weight: 20, headline: (a: string) => `${a} beats expectations`, mul: 1.1, duration: 20 },
  { type: 'regulation', weight: 10, headline: (_a: string) => `New regulations announced`, mul: 0.85, duration: 15 },
  { type: 'euphoria', weight: 5, headline: (_a: string) => `Market euphoria! Everything up`, mul: 1.08, duration: 60 },
  { type: 'black_swan', weight: 2, headline: (_a: string) => `BLACK SWAN EVENT`, mul: 0.65, duration: 20 },
];

function pickWeightedEvent(): typeof EVENT_TYPES[number] {
  const total = EVENT_TYPES.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EVENT_TYPES) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return EVENT_TYPES[0];
}

export function getAvailableAssets(state: GameState): AssetDef[] {
  return ASSETS.filter(a => a.unlockLiquidation <= state.liquidationCount);
}

export function getAssetPrice(state: GameState, assetId: string): number {
  return state.market.prices[assetId]?.currentPrice ?? 0;
}

export function getHolding(state: GameState, assetId: string): AssetHolding | undefined {
  return state.portfolio.find(h => h.assetId === assetId);
}

export function getPortfolioValue(state: GameState): number {
  let value = 0;
  for (const h of state.portfolio) {
    const price = getAssetPrice(state, h.assetId);
    value += h.units * price;
  }
  return value;
}

export function getNetWorth(state: GameState): number {
  return state.cash + getPortfolioValue(state);
}

export function buyAsset(state: GameState, assetId: string, amount: number): GameState {
  const price = getAssetPrice(state, assetId);
  const cost = price * amount;
  if (state.cash < cost || amount <= 0) return state;

  const existing = state.portfolio.find(h => h.assetId === assetId);
  let newPortfolio: AssetHolding[];
  if (existing) {
    const totalUnits = existing.units + amount;
    const newAvg = (existing.avgBuyPrice * existing.units + price * amount) / totalUnits;
    newPortfolio = state.portfolio.map(h =>
      h.assetId === assetId ? { ...h, units: totalUnits, avgBuyPrice: newAvg } : h
    );
  } else {
    newPortfolio = [...state.portfolio, { assetId, units: amount, avgBuyPrice: price }];
  }

  return { ...state, cash: state.cash - cost, portfolio: newPortfolio };
}

export function sellAsset(state: GameState, assetId: string, amount: number): GameState {
  const existing = state.portfolio.find(h => h.assetId === assetId);
  if (!existing || existing.units < amount || amount <= 0) return state;

  const price = getAssetPrice(state, assetId);
  const revenue = price * amount;
  const remainingUnits = existing.units - amount;

  let newPortfolio: AssetHolding[];
  if (remainingUnits <= 0.0001) {
    newPortfolio = state.portfolio.filter(h => h.assetId !== assetId);
  } else {
    newPortfolio = state.portfolio.map(h =>
      h.assetId === assetId ? { ...h, units: remainingUnits } : h
    );
  }

  return { ...state, cash: state.cash + revenue, portfolio: newPortfolio };
}

function updateAssetPrice(ps: AssetPriceState, def: AssetDef, sentiment: number, activeEvent: MarketEvent | null): AssetPriceState {
  if (def.volatility === 0) {
    // Bond: fixed price
    return ps;
  }

  const newPhase = ps.cyclePhase + (Math.PI * 2) / def.cyclePeriodS;
  const newTrend = ps.trendAccum + 0.0003;
  const cycle = Math.sin(newPhase) * def.cycleAmplitude;
  const noise = (Math.random() - 0.5) * def.volatility * 0.02;
  const sentimentEffect = sentiment * 0.005;

  let eventMod = 0;
  if (activeEvent) {
    if (activeEvent.affectedAssets.includes(def.id) || activeEvent.affectedAssets.includes('all')) {
      eventMod = (activeEvent.multiplier - 1.0) * 0.1; // spread over duration
    }
  }

  const change = cycle + noise + sentimentEffect + eventMod;
  const newPrice = Math.max(0.01, def.basePrice * (1 + newTrend + change));

  const history = [...ps.priceHistory, newPrice];
  if (history.length > 300) history.shift();

  return {
    currentPrice: newPrice,
    priceHistory: history,
    cyclePhase: newPhase,
    trendAccum: newTrend,
  };
}

export function tickMarket(state: GameState): GameState {
  const available = getAvailableAssets(state);
  const market = { ...state.market };
  const newPrices: Record<string, AssetPriceState> = { ...market.prices };

  // Check for new events
  let events = [...market.events];
  let nextEventTick = market.nextEventTick;

  if (state.tick >= nextEventTick && available.length > 0) {
    const evtDef = pickWeightedEvent();
    const isGlobal = evtDef.type === 'euphoria' || evtDef.type === 'black_swan';
    const target = isGlobal
      ? 'all'
      : available[Math.floor(Math.random() * available.length)].id;
    const targetName = isGlobal ? '' : getAssetDef(target).ticker;

    events.push({
      type: evtDef.type,
      headline: evtDef.headline(targetName),
      affectedAssets: isGlobal ? ['all'] : [target],
      multiplier: evtDef.mul,
      startTick: state.tick,
      durationTicks: evtDef.duration,
    });

    nextEventTick = state.tick + 60 + Math.floor(Math.random() * 60);
  }

  // Remove expired events
  events = events.filter(e => state.tick < e.startTick + e.durationTicks);

  // Get active event for each asset
  const activeEvent = events.length > 0 ? events[events.length - 1] : null;

  // Update prices
  for (const def of available) {
    if (newPrices[def.id]) {
      newPrices[def.id] = updateAssetPrice(newPrices[def.id], def, market.sentiment, activeEvent);
    }
  }

  // Drift sentiment
  const newSentiment = market.sentiment * 0.99 + (Math.random() - 0.5) * 0.1;

  // Dividend payouts
  let cash = state.cash;
  for (const h of state.portfolio) {
    const def = getAssetDef(h.assetId);
    if (def.dividendRate > 0) {
      cash += h.units * newPrices[h.assetId].currentPrice * def.dividendRate;
    }
  }

  return {
    ...state,
    cash,
    market: { ...market, prices: newPrices, events, nextEventTick, sentiment: newSentiment },
  };
}

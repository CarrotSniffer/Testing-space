import { Stock, Sector, Volatility, Trend, ActiveEvent, VOLATILITY_RANGE, TREND_DRIFT } from './types';

// ── Stock Name Generation ───────────────────────────────────

const PREFIXES: Record<Sector, string[]> = {
  tech:      ['Nova', 'Quantum', 'Cyber', 'Pixel', 'Data', 'Cloud', 'Byte', 'Nano'],
  energy:    ['Solar', 'Wind', 'Green', 'Hydro', 'Volt', 'Watt', 'Flux', 'Arc'],
  finance:   ['Capital', 'Trust', 'Prime', 'Apex', 'Vault', 'Crown', 'Peak', 'Solid'],
  consumer:  ['Fresh', 'Bright', 'Swift', 'Urban', 'Lux', 'Zen', 'Pure', 'Wild'],
  crypto:    ['Moon', 'Chain', 'Block', 'Hash', 'Bit', 'Doge', 'Meta', 'Hyper'],
  commodity: ['Gold', 'Iron', 'Copper', 'Silver', 'Steel', 'Rare', 'Ore', 'Titan'],
};

const SUFFIXES: Record<Sector, string[]> = {
  tech:      ['Tech', 'Labs', 'AI', 'Sys', 'Net', 'Logic', 'Core', 'Ware'],
  energy:    ['Power', 'Energy', 'Grid', 'Fuel', 'Charge', 'Cell', 'Gen', 'Flow'],
  finance:   ['Bank', 'Fund', 'Corp', 'Group', 'Holdings', 'Partners', 'Assets', 'Wealth'],
  consumer:  ['Goods', 'Co', 'Brand', 'Style', 'Life', 'Home', 'Plus', 'Hub'],
  crypto:    ['Coin', 'Token', 'Cash', 'Swap', 'Fi', 'DAO', 'Verse', 'X'],
  commodity: ['Mine', 'Resources', 'Supply', 'Trade', 'Works', 'Metals', 'Core', 'Base'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStockName(sector: Sector): { name: string; ticker: string } {
  const prefix = pick(PREFIXES[sector]);
  const suffix = pick(SUFFIXES[sector]);
  const name = prefix + suffix;
  const ticker = (prefix.slice(0, 2) + suffix.slice(0, 2)).toUpperCase();
  return { name, ticker };
}

// ── Stock Generation ────────────────────────────────────────

const VOLATILITIES: Volatility[] = ['low', 'medium', 'medium', 'high', 'high', 'extreme'];
const TRENDS: Trend[] = ['bull', 'bull', 'neutral', 'neutral', 'bear', 'bear'];

const TRAITS = ['dividend', 'meme', 'bluechip', null, null, null];

export function generateStocks(hasCrypto: boolean, hasCommodity: boolean): Stock[] {
  const sectors: Sector[] = ['tech', 'energy', 'finance', 'consumer'];
  if (hasCrypto) sectors.push('crypto');
  if (hasCommodity) sectors.push('commodity');

  // Ensure at least 6 stocks
  while (sectors.length < 6) sectors.push(pick(['tech', 'energy', 'finance', 'consumer']));

  // Shuffle and take 6
  const shuffled = sectors.sort(() => Math.random() - 0.5).slice(0, 6);

  return shuffled.map((sector, i) => {
    const { name, ticker } = generateStockName(sector);
    const volatility = VOLATILITIES[i] || pick(VOLATILITIES);
    const trend = TRENDS[i] || pick(TRENDS);
    const basePrice = Math.floor(5 + Math.random() * 195);
    const trait = pick(TRAITS);

    return {
      id: `stock_${i}`,
      name,
      ticker,
      sector,
      volatility,
      trend,
      basePrice,
      price: basePrice,
      priceHistory: [basePrice],
      trait,
      frozen: false,
      frozenDays: 0,
      dead: false,
    };
  });
}

// ── Price Simulation ────────────────────────────────────────

function gaussianRandom(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function simulateDay(stocks: Stock[], events: ActiveEvent[]): Stock[] {
  // Compute sector average movement for correlation
  const sectorMoves: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};

  // First pass: generate base moves
  const baseMoves: number[] = stocks.map(stock => {
    if (stock.frozen || stock.dead) return 0;
    const vol = VOLATILITY_RANGE[stock.volatility];
    const drift = TREND_DRIFT[stock.trend];
    return drift + gaussianRandom() * vol;
  });

  // Compute sector averages
  stocks.forEach((stock, i) => {
    if (stock.dead) return;
    const s = stock.sector;
    sectorMoves[s] = (sectorMoves[s] || 0) + baseMoves[i];
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });
  for (const s of Object.keys(sectorMoves)) {
    sectorMoves[s] /= sectorCounts[s];
  }

  return stocks.map((stock, i) => {
    if (stock.dead) return stock;
    if (stock.frozen) {
      const newFrozen = stock.frozenDays - 1;
      return { ...stock, frozenDays: newFrozen, frozen: newFrozen > 0 };
    }

    let move = baseMoves[i];

    // Sector correlation (40% pull toward sector average)
    const sectorAvg = sectorMoves[stock.sector] || 0;
    move = move * 0.6 + sectorAvg * 0.4;

    // Event modifiers
    for (const evt of events) {
      if (evt.stockId && evt.stockId !== stock.id) continue;
      move += evt.modifier;
    }

    // Mean reversion (if >25% from base, pull back gently)
    const deviation = (stock.price - stock.basePrice) / stock.basePrice;
    if (Math.abs(deviation) > 0.25) {
      move -= deviation * 0.03;
    }

    // Meme stock random pumps
    if (stock.trait === 'meme' && Math.random() < 0.08) {
      move += (Math.random() > 0.5 ? 1 : -1) * 0.15;
    }

    const newPrice = Math.max(0.01, stock.price * (1 + move));
    const history = [...stock.priceHistory, newPrice].slice(-30);

    return { ...stock, price: newPrice, priceHistory: history };
  });
}

// ── Market Events ───────────────────────────────────────────

export interface EventTemplate {
  name: string;
  description: string;
  create: (stocks: Stock[]) => ActiveEvent[];
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    name: 'Bull Run',
    description: 'Market surges on positive sentiment',
    create: () => [{ name: 'Bull Run', description: 'All stocks +8%', daysLeft: 2, modifier: 0.04 }],
  },
  {
    name: 'Flash Crash',
    description: 'Sudden market sell-off',
    create: (stocks) => {
      const s = pick(stocks.filter(s => !s.dead && !s.frozen));
      return s ? [{ name: 'Flash Crash', description: `${s.ticker} crashes -30%`, daysLeft: 1, stockId: s.id, modifier: -0.30 }] : [];
    },
  },
  {
    name: 'SEC Investigation',
    description: 'Trading halted on suspicious activity',
    create: (stocks) => {
      const s = pick(stocks.filter(s => !s.dead && !s.frozen));
      return s ? [{ name: 'SEC Probe', description: `${s.ticker} frozen 3 days`, daysLeft: 3, stockId: s.id, modifier: 0 }] : [];
    },
  },
  {
    name: 'Earnings Beat',
    description: 'Strong quarterly results',
    create: (stocks) => {
      const s = pick(stocks.filter(s => !s.dead && !s.frozen));
      return s ? [{ name: 'Earnings Beat', description: `${s.ticker} up +20%`, daysLeft: 1, stockId: s.id, modifier: 0.20 }] : [];
    },
  },
  {
    name: 'Earnings Miss',
    description: 'Disappointing results',
    create: (stocks) => {
      const s = pick(stocks.filter(s => !s.dead && !s.frozen));
      return s ? [{ name: 'Earnings Miss', description: `${s.ticker} down -15%`, daysLeft: 1, stockId: s.id, modifier: -0.15 }] : [];
    },
  },
  {
    name: 'Whale Pump',
    description: 'Big money flows in',
    create: (stocks) => {
      const s = pick(stocks.filter(s => !s.dead && !s.frozen));
      return s ? [{ name: 'Whale Pump', description: `${s.ticker} pumped +35%`, daysLeft: 1, stockId: s.id, modifier: 0.35 }] : [];
    },
  },
  {
    name: 'Rate Hike',
    description: 'Central bank raises rates',
    create: () => [{ name: 'Rate Hike', description: 'All stocks -5%', daysLeft: 2, modifier: -0.025 }],
  },
];

export function rollDailyEvent(stocks: Stock[], day: number): ActiveEvent[] {
  // ~30% chance of event on any day
  if (Math.random() > 0.30) return [];
  const template = pick(EVENT_TEMPLATES);
  const events = template.create(stocks);

  // Handle SEC freeze
  for (const evt of events) {
    if (evt.name === 'SEC Probe' && evt.stockId) {
      const s = stocks.find(s => s.id === evt.stockId);
      if (s) {
        s.frozen = true;
        s.frozenDays = 3;
      }
    }
  }

  return events;
}

// ── Boss Events ─────────────────────────────────────────────

export function createBossEvent(week: number): ActiveEvent[] {
  if (week === 2) {
    return [{ name: 'THE CORRECTION', description: 'Market drops 20% over 2 days', daysLeft: 2, modifier: -0.10 }];
  }
  if (week === 4) {
    return [{ name: 'MARKET MELTDOWN', description: 'Cascading crash: -10%/day for 3 days', daysLeft: 3, modifier: -0.10 }];
  }
  return [];
}

// ── Net Worth Calculation ───────────────────────────────────

export function getPortfolioValue(stocks: Stock[], portfolio: { stockId: string; units: number }[]): number {
  let total = 0;
  for (const h of portfolio) {
    const stock = stocks.find(s => s.id === h.stockId);
    if (stock) total += h.units * stock.price;
  }
  return total;
}

export function getNetWorth(state: { cash: number; stocks: Stock[]; portfolio: { stockId: string; units: number }[] }): number {
  return state.cash + getPortfolioValue(state.stocks, state.portfolio);
}

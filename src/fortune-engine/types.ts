// ── Currency & Core ──────────────────────────────────────────

export type TabId = 'business' | 'portfolio' | 'casino' | 'more';

export interface GameState {
  // Currencies
  cash: number;
  insiderKnowledge: number;
  legacyPoints: number;
  luckTokens: number;
  marketIntel: number;

  // Businesses
  businesses: BusinessState[];

  // Portfolio
  portfolio: AssetHolding[];

  // Market
  market: MarketState;

  // Prestige
  liquidationCount: number;
  ascensionCount: number;
  totalIKEarned: number;

  // Unlocks (serialized as string[])
  unlocked: string[];

  // Insider Shop purchases
  insiderPurchases: string[];

  // Stats
  stats: GameStats;

  // Timing
  lastSaveTime: number;
  lastOnlineTime: number;
  gameStartTime: number;
  tick: number;

  // UI
  activeTab: TabId;

  // Particles (not saved)
  particles: Particle[];

  // Gambling state (not saved)
  activeGamble: ActiveGamble | null;
}

// ── Businesses ──────────────────────────────────────────────

export interface BusinessState {
  id: string;
  level: number;
  managerHired: boolean;
  lastCollectTime: number;
  progress: number; // 0-1 for cooldown progress
}

export interface BusinessDef {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  costMul: number;
  baseEarning: number;
  earningMul: number;
  cooldownMs: number;
  unlockLiquidation: number;
  managerCost: number;
}

export const BUSINESSES: BusinessDef[] = [
  // Tier 1 — Start
  { id: 'lemonade', name: 'Lemonade Stand', icon: 'L', baseCost: 10, costMul: 1.15, baseEarning: 0.5, earningMul: 1.12, cooldownMs: 1000, unlockLiquidation: 0, managerCost: 100 },
  { id: 'hotdog', name: 'Hot Dog Cart', icon: 'H', baseCost: 50, costMul: 1.15, baseEarning: 3, earningMul: 1.12, cooldownMs: 2000, unlockLiquidation: 0, managerCost: 500 },
  { id: 'lawn', name: 'Lawn Care', icon: 'G', baseCost: 250, costMul: 1.15, baseEarning: 12, earningMul: 1.12, cooldownMs: 3000, unlockLiquidation: 0, managerCost: 2000 },
  // Tier 2 — Liquidation 1
  { id: 'foodtruck', name: 'Food Truck', icon: 'F', baseCost: 1500, costMul: 1.14, baseEarning: 60, earningMul: 1.11, cooldownMs: 4000, unlockLiquidation: 1, managerCost: 15000 },
  { id: 'laundry', name: 'Laundromat', icon: 'W', baseCost: 8000, costMul: 1.14, baseEarning: 250, earningMul: 1.11, cooldownMs: 5000, unlockLiquidation: 1, managerCost: 80000 },
  { id: 'carwash', name: 'Car Wash', icon: 'C', baseCost: 40000, costMul: 1.14, baseEarning: 1000, earningMul: 1.11, cooldownMs: 6000, unlockLiquidation: 1, managerCost: 400000 },
  // Tier 3 — Liquidation 2
  { id: 'restaurant', name: 'Restaurant', icon: 'R', baseCost: 250000, costMul: 1.13, baseEarning: 5000, earningMul: 1.10, cooldownMs: 8000, unlockLiquidation: 2, managerCost: 2500000 },
  { id: 'gym', name: 'Gym', icon: 'Y', baseCost: 1500000, costMul: 1.13, baseEarning: 25000, earningMul: 1.10, cooldownMs: 10000, unlockLiquidation: 2, managerCost: 15000000 },
  // Tier 4 — Liquidation 3+
  { id: 'startup', name: 'Tech Startup', icon: 'T', baseCost: 10000000, costMul: 1.12, baseEarning: 150000, earningMul: 1.09, cooldownMs: 12000, unlockLiquidation: 3, managerCost: 100000000 },
  { id: 'realestate', name: 'Real Estate', icon: 'E', baseCost: 100000000, costMul: 1.12, baseEarning: 1000000, earningMul: 1.09, cooldownMs: 15000, unlockLiquidation: 3, managerCost: 1000000000 },
];

// ── Assets / Market ─────────────────────────────────────────

export type AssetClass = 'bond' | 'stock' | 'commodity' | 'crypto';

export interface AssetDef {
  id: string;
  name: string;
  ticker: string;
  class: AssetClass;
  basePrice: number;
  volatility: number;
  cyclePeriodS: number;
  cycleAmplitude: number;
  dividendRate: number;
  unlockLiquidation: number;
}

export const ASSETS: AssetDef[] = [
  // Bonds — Start
  { id: 'bonds', name: 'Savings Bonds', ticker: 'BOND', class: 'bond', basePrice: 100, volatility: 0, cyclePeriodS: 9999, cycleAmplitude: 0, dividendRate: 0.005, unlockLiquidation: 0 },
  // Stocks — Liquidation 1
  { id: 'stdy', name: 'SteadyCorp', ticker: 'STDY', class: 'stock', basePrice: 50, volatility: 0.15, cyclePeriodS: 300, cycleAmplitude: 0.08, dividendRate: 0.001, unlockLiquidation: 1 },
  { id: 'grwx', name: 'GrowthMax', ticker: 'GRWX', class: 'stock', basePrice: 120, volatility: 0.3, cyclePeriodS: 240, cycleAmplitude: 0.15, dividendRate: 0, unlockLiquidation: 1 },
  { id: 'vltl', name: 'VolatileTech', ticker: 'VLTL', class: 'stock', basePrice: 200, volatility: 0.6, cyclePeriodS: 180, cycleAmplitude: 0.25, dividendRate: 0, unlockLiquidation: 1 },
  { id: 'dvdk', name: 'DividendKing', ticker: 'DVDK', class: 'stock', basePrice: 80, volatility: 0.1, cyclePeriodS: 360, cycleAmplitude: 0.05, dividendRate: 0.003, unlockLiquidation: 1 },
  // Commodities — Liquidation 2
  { id: 'gold', name: 'Gold', ticker: 'GOLD', class: 'commodity', basePrice: 1800, volatility: 0.2, cyclePeriodS: 400, cycleAmplitude: 0.12, dividendRate: 0, unlockLiquidation: 2 },
  { id: 'oil', name: 'Crude Oil', ticker: 'OIL', class: 'commodity', basePrice: 70, volatility: 0.35, cyclePeriodS: 250, cycleAmplitude: 0.18, dividendRate: 0, unlockLiquidation: 2 },
  { id: 'wheat', name: 'Wheat', ticker: 'WHT', class: 'commodity', basePrice: 6, volatility: 0.25, cyclePeriodS: 350, cycleAmplitude: 0.10, dividendRate: 0, unlockLiquidation: 2 },
  // Crypto — Liquidation 3
  { id: 'btc', name: 'BitCash', ticker: 'BTC', class: 'crypto', basePrice: 40000, volatility: 0.8, cyclePeriodS: 150, cycleAmplitude: 0.35, dividendRate: 0, unlockLiquidation: 3 },
  { id: 'alt', name: 'AltMoon', ticker: 'ALT', class: 'crypto', basePrice: 1.5, volatility: 1.0, cyclePeriodS: 120, cycleAmplitude: 0.5, dividendRate: 0, unlockLiquidation: 3 },
];

export interface AssetHolding {
  assetId: string;
  units: number;
  avgBuyPrice: number;
}

export interface AssetPriceState {
  currentPrice: number;
  priceHistory: number[];
  cyclePhase: number;
  trendAccum: number;
}

export interface MarketEvent {
  type: string;
  headline: string;
  affectedAssets: string[];
  multiplier: number;
  startTick: number;
  durationTicks: number;
}

export interface MarketState {
  prices: Record<string, AssetPriceState>;
  events: MarketEvent[];
  nextEventTick: number;
  sentiment: number;
}

// ── Gambling ────────────────────────────────────────────────

export type GambleGameId = 'quickflip' | 'roulette' | 'options' | 'cardshark' | 'vault';

export interface ActiveGamble {
  gameId: GambleGameId;
  betAmount: number;
  phase: 'betting' | 'animating' | 'result';
  animProgress: number;
  result: number; // multiplier
  data: Record<string, unknown>;
}

// ── Insider Shop ────────────────────────────────────────────

export interface InsiderUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: string;
}

export const INSIDER_UPGRADES: InsiderUpgrade[] = [
  { id: 'tap2x', name: 'Golden Touch', description: 'Tap value x2', cost: 5, effect: 'tapMul' },
  { id: 'biz_speed', name: 'Fast Track', description: 'Businesses 20% faster', cost: 10, effect: 'bizSpeed' },
  { id: 'start_cash', name: 'Seed Money', description: 'Start with $1,000', cost: 15, effect: 'startCash' },
  { id: 'interest', name: 'Compound Eye', description: 'Cash earns 0.1%/min interest', cost: 20, effect: 'interest' },
  { id: 'luck_rate', name: 'Lucky Streak', description: '+50% Luck Token drop rate', cost: 25, effect: 'luckRate' },
  { id: 'auto_bet', name: 'Auto-Bet', description: 'Gamble while offline', cost: 50, effect: 'autoBet' },
  { id: 'market_intel', name: 'Insider Info', description: 'Preview 30s of price movement', cost: 40, effect: 'intel' },
  { id: 'tap5x', name: 'Diamond Fingers', description: 'Tap value x5', cost: 100, effect: 'tapMul2' },
  { id: 'biz_earn', name: 'Efficiency Expert', description: 'Business earnings +50%', cost: 75, effect: 'bizEarn' },
  { id: 'start_10k', name: 'Trust Fund', description: 'Start with $10,000', cost: 150, effect: 'startCash2' },
];

// ── Particles ───────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

// ── Stats ───────────────────────────────────────────────────

export interface GameStats {
  totalCashEarned: number;
  totalTaps: number;
  totalGambled: number;
  gamblingWins: number;
  gamblingLosses: number;
  fastestLiquidationMs: number;
  highestNetWorth: number;
}

// ── Helpers ─────────────────────────────────────────────────

export function getBusinessDef(id: string): BusinessDef {
  return BUSINESSES.find(b => b.id === id)!;
}

export function getAssetDef(id: string): AssetDef {
  return ASSETS.find(a => a.id === id)!;
}

export function businessCost(def: BusinessDef, level: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costMul, level));
}

export function businessEarning(def: BusinessDef, level: number): number {
  return def.baseEarning * Math.pow(def.earningMul, level - 1);
}

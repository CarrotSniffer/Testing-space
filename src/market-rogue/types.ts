// ── Core Types ──────────────────────────────────────────────

export type Phase = 'setup' | 'trading' | 'endDay' | 'animatingPrices' | 'weekSummary' | 'shop' | 'boss' | 'result' | 'meta' | 'pickAmount';

export type Sector = 'tech' | 'energy' | 'finance' | 'consumer' | 'crypto' | 'commodity';
export type Volatility = 'low' | 'medium' | 'high' | 'extreme';
export type Trend = 'bull' | 'neutral' | 'bear';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// ── Stock ───────────────────────────────────────────────────

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  sector: Sector;
  volatility: Volatility;
  trend: Trend;
  basePrice: number;
  price: number;
  priceHistory: number[];
  trait: string | null;        // 'dividend' | 'meme' | 'bluechip' | null
  frozen: boolean;             // SEC investigation
  frozenDays: number;
  dead: boolean;               // merged away
}

// ── Card ────────────────────────────────────────────────────

export interface CardDef {
  id: string;
  name: string;
  description: string;
  cost: number;         // fee to play (deducted from cash)
  rarity: CardRarity;
  needsTarget: boolean; // requires selecting a stock
  shopPrice: number;    // cost to buy in shop
}

export interface Card {
  defId: string;
  uid: number;          // unique instance id
  upgraded: boolean;
}

// ── Holdings & Orders ───────────────────────────────────────

export interface Holding {
  stockId: string;
  units: number;
  avgPrice: number;
}

export interface ShortPosition {
  stockId: string;
  units: number;
  entryPrice: number;
  daysLeft: number;
}

export interface PendingOrder {
  type: 'limit' | 'stopLoss';
  stockId: string;
  triggerPrice: number;
  amount: number;       // cash for limit, units for stopLoss
  daysLeft: number;
}

export interface HedgeEffect {
  stockId: string;
  absorption: number;   // 0.5 = absorb 50%
  daysLeft: number;
}

// ── Market Events ───────────────────────────────────────────

export interface MarketEventDef {
  id: string;
  name: string;
  description: string;
  apply: (stocks: Stock[], day: number) => EventResult;
}

export interface ActiveEvent {
  name: string;
  description: string;
  daysLeft: number;
  stockId?: string;     // affected stock, if specific
  modifier: number;     // price multiplier
}

export interface EventResult {
  events: ActiveEvent[];
  message: string;
}

// ── Particles ───────────────────────────────────────────────

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  text?: string;
}

// ── Meta-Progression ────────────────────────────────────────

export interface MetaState {
  reputation: number;
  totalRuns: number;
  bestNetWorth: number;
  unlockedStrategies: string[];
  unlockedCards: string[];
  unlocks: string[];       // generic unlock flags
}

export interface StrategyDef {
  id: string;
  name: string;
  description: string;
  startingCards: string[]; // card def IDs
  unlockCost: number;      // 0 = available from start
}

export interface MetaUnlockDef {
  id: string;
  name: string;
  description: string;
  cost: number;
}

// ── Animation ───────────────────────────────────────────────

export interface AnimState {
  type: 'priceUpdate' | 'cardPlay' | 'eventReveal' | 'bossCrash';
  progress: number;     // 0-1
  duration: number;     // ms
  data: Record<string, unknown>;
}

// ── Game State ──────────────────────────────────────────────

export interface GameState {
  phase: Phase;
  cash: number;
  startingCash: number;
  portfolio: Holding[];
  shorts: ShortPosition[];
  hedges: HedgeEffect[];
  pendingOrders: PendingOrder[];

  // Deck
  deck: Card[];
  hand: Card[];
  discard: Card[];
  cardsPlayedToday: number;
  maxCardsPerDay: number;

  // Market
  stocks: Stock[];
  events: ActiveEvent[];
  eventLog: string[];      // messages for recent events

  // Run progress
  day: number;             // 1-20
  week: number;            // 1-4
  weekStartNW: number;     // net worth at start of week (for P&L)
  bossDefeated: number[];

  // UI state
  selectedCard: number | null;  // hand index
  selectedStock: number | null; // stock index for card targeting
  pickAmountValue: number;      // for amount picker
  pickAmountMax: number;
  pickAmountCallback: string;   // action to execute after amount picked

  // Leverage
  leverageMultiplier: number;   // 1 = normal, 2 = leveraged

  // Golden parachute
  hasParachute: boolean;
  parachuteAmount: number;

  // Insider tip
  insiderTipStock: string | null;
  insiderTipDirection: number;   // +1 up, -1 down

  // Run result
  finalNetWorth: number;
  rpEarned: number;

  // Meta (persisted across runs)
  meta: MetaState;

  // Visual
  particles: Particle[];
  animState: AnimState | null;
  toast: string | null;
  toastTimer: number;

  // Card UID counter
  nextCardUid: number;

  // Strategy chosen for this run
  strategyId: string;
}

// ── Volatility Helpers ──────────────────────────────────────

export const VOLATILITY_RANGE: Record<Volatility, number> = {
  low: 0.02,
  medium: 0.05,
  high: 0.10,
  extreme: 0.20,
};

export const TREND_DRIFT: Record<Trend, number> = {
  bull: 0.005,
  neutral: 0,
  bear: -0.005,
};

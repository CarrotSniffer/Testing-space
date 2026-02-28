import { MetaState, StrategyDef, MetaUnlockDef } from './types';

// ── Strategies ──────────────────────────────────────────────

export const STRATEGIES: StrategyDef[] = [
  {
    id: 'value',
    name: 'Value Investor',
    description: 'Safe and steady. Hedge your bets.',
    startingCards: ['buy', 'buy', 'buy', 'sell', 'sell', 'hedge', 'hedge', 'dividend'],
    unlockCost: 0,
  },
  {
    id: 'daytrader',
    name: 'Day Trader',
    description: 'Fast moves. High turnover.',
    startingCards: ['buy', 'buy', 'buy', 'sell', 'sell', 'sell', 'short', 'leverage'],
    unlockCost: 0,
  },
  {
    id: 'insider',
    name: 'The Insider',
    description: 'Information is power.',
    startingCards: ['buy', 'buy', 'sell', 'sell', 'insider', 'insider', 'hedge'],
    unlockCost: 50,
  },
  {
    id: 'degen',
    name: 'Degen',
    description: 'All-in or nothing. High risk, high reward.',
    startingCards: ['buy', 'buy', 'sell', 'allin', 'allin', 'leverage', 'leverage', 'short'],
    unlockCost: 100,
  },
];

export function getAvailableStrategies(meta: MetaState): StrategyDef[] {
  return STRATEGIES.filter(s => s.unlockCost === 0 || meta.unlockedStrategies.includes(s.id));
}

export function getLockedStrategies(meta: MetaState): StrategyDef[] {
  return STRATEGIES.filter(s => s.unlockCost > 0 && !meta.unlockedStrategies.includes(s.id));
}

// ── Meta Unlocks ────────────────────────────────────────────

export const META_UNLOCKS: MetaUnlockDef[] = [
  { id: 'crypto',      name: 'Crypto Markets',  description: 'Crypto stocks can appear in runs',    cost: 30 },
  { id: 'commodity',   name: 'Commodities',     description: 'Commodity stocks can appear in runs', cost: 40 },
  { id: 'draw6',       name: 'Extra Draw',      description: 'Draw 6 cards per day (was 5)',        cost: 80 },
  { id: 'bigstart',    name: 'Bigger Portfolio', description: 'Start with $12,000 (was $10,000)',   cost: 120 },
  { id: 'intel',       name: 'Market Intel',    description: 'See stock volatility ratings',         cost: 40 },
  { id: 'lucky',       name: 'Lucky Trader',    description: '10% better market event odds',         cost: 150 },
];

// ── Reputation Calculation ──────────────────────────────────

export function calculateRP(finalNW: number, weeksCompleted: number, bossesBeaten: number): number {
  let rp = Math.max(0, Math.floor(finalNW / 1000));
  rp += weeksCompleted * Math.floor(rp * 0.25); // +25% per week
  if (bossesBeaten >= 1) rp = Math.floor(rp * 1.5);
  if (bossesBeaten >= 2) rp = Math.floor(rp * 2);
  return Math.max(1, rp); // minimum 1 RP per run
}

// ── Default Meta State ──────────────────────────────────────

export function createDefaultMeta(): MetaState {
  return {
    reputation: 0,
    totalRuns: 0,
    bestNetWorth: 0,
    unlockedStrategies: [],
    unlockedCards: [],
    unlocks: [],
  };
}

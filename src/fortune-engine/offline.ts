import { GameState } from './types';
import { getTotalCashPerSecond } from './economy';

export interface OfflineReport {
  elapsedMs: number;
  businessIncome: number;
  interest: number;
  totalEarned: number;
}

const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 8 hours

export function calculateOfflineProgress(state: GameState): OfflineReport {
  const now = Date.now();
  const elapsed = now - state.lastOnlineTime;
  const capped = Math.min(elapsed, MAX_OFFLINE_MS);

  if (capped < 5000) {
    return { elapsedMs: capped, businessIncome: 0, interest: 0, totalEarned: 0 };
  }

  // Business income
  const cashPerSecond = getTotalCashPerSecond(state);
  const businessIncome = cashPerSecond * (capped / 1000);

  // Interest (if upgrade purchased)
  let interest = 0;
  if (state.insiderPurchases.includes('interest')) {
    const ratePerHour = 0.001 * (1 + state.insiderKnowledge * 0.01);
    const hours = capped / (60 * 60 * 1000);
    interest = state.cash * (Math.pow(1 + ratePerHour, hours) - 1);
  }

  const totalEarned = businessIncome + interest;

  return { elapsedMs: capped, businessIncome, interest, totalEarned };
}

export function applyOfflineProgress(state: GameState, report: OfflineReport): GameState {
  return {
    ...state,
    cash: state.cash + report.totalEarned,
    lastOnlineTime: Date.now(),
    stats: {
      ...state.stats,
      totalCashEarned: state.stats.totalCashEarned + report.totalEarned,
    },
  };
}

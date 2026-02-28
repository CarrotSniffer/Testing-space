import { GameState, BusinessState, BUSINESSES, businessCost, businessEarning, getBusinessDef } from './types';

export function getTapValue(state: GameState): number {
  let base = 1 + state.insiderKnowledge * 0.01;
  if (state.insiderPurchases.includes('tap2x')) base *= 2;
  if (state.insiderPurchases.includes('tap5x')) base *= 5;
  return base;
}

export function getBusinessSpeedMul(state: GameState): number {
  let mul = 1;
  if (state.insiderPurchases.includes('biz_speed')) mul *= 1.2;
  return mul;
}

export function getBusinessEarnMul(state: GameState): number {
  let mul = 1 + state.insiderKnowledge * 0.01;
  if (state.insiderPurchases.includes('biz_earn')) mul *= 1.5;
  return mul;
}

export function getBusinessCashPerSecond(biz: BusinessState, state: GameState): number {
  if (biz.level === 0) return 0;
  const def = getBusinessDef(biz.id);
  const earning = businessEarning(def, biz.level);
  const earnMul = getBusinessEarnMul(state);
  const speedMul = getBusinessSpeedMul(state);
  const perCooldown = earning * earnMul;
  const cooldownS = def.cooldownMs / 1000 / speedMul;
  return perCooldown / cooldownS;
}

export function getTotalCashPerSecond(state: GameState): number {
  let total = 0;
  for (const biz of state.businesses) {
    if (biz.level > 0 && biz.managerHired) {
      total += getBusinessCashPerSecond(biz, state);
    }
  }
  return total;
}

export function getAvailableBusinesses(state: GameState): typeof BUSINESSES {
  return BUSINESSES.filter(b => b.unlockLiquidation <= state.liquidationCount);
}

export function canAffordBusiness(state: GameState, bizId: string): boolean {
  const biz = state.businesses.find(b => b.id === bizId);
  if (!biz) return false;
  const def = getBusinessDef(bizId);
  return state.cash >= businessCost(def, biz.level);
}

export function buyBusiness(state: GameState, bizId: string): GameState {
  const idx = state.businesses.findIndex(b => b.id === bizId);
  if (idx < 0) return state;
  const biz = state.businesses[idx];
  const def = getBusinessDef(bizId);
  const cost = businessCost(def, biz.level);
  if (state.cash < cost) return state;

  const newBiz = [...state.businesses];
  newBiz[idx] = { ...biz, level: biz.level + 1 };

  return { ...state, cash: state.cash - cost, businesses: newBiz };
}

export function buyManager(state: GameState, bizId: string): GameState {
  const idx = state.businesses.findIndex(b => b.id === bizId);
  if (idx < 0) return state;
  const biz = state.businesses[idx];
  if (biz.managerHired || biz.level === 0) return state;
  const def = getBusinessDef(bizId);
  if (state.cash < def.managerCost) return state;

  const newBiz = [...state.businesses];
  newBiz[idx] = { ...biz, managerHired: true };

  return { ...state, cash: state.cash - def.managerCost, businesses: newBiz };
}

export function tickBusinesses(state: GameState, dtMs: number): GameState {
  let cash = state.cash;
  let totalEarned = state.stats.totalCashEarned;
  const speedMul = getBusinessSpeedMul(state);
  const earnMul = getBusinessEarnMul(state);
  const newBiz = state.businesses.map(biz => {
    if (biz.level === 0) return biz;
    const def = getBusinessDef(biz.id);
    const cooldown = def.cooldownMs / speedMul;

    if (biz.managerHired) {
      // Auto-collect: calculate earnings for dtMs
      const cycles = dtMs / cooldown;
      const earning = businessEarning(def, biz.level) * earnMul * cycles;
      cash += earning;
      totalEarned += earning;
      return { ...biz, progress: (biz.progress + dtMs / cooldown) % 1 };
    } else {
      // Manual: advance progress bar
      const newProgress = biz.progress + dtMs / cooldown;
      if (newProgress >= 1) {
        const earning = businessEarning(def, biz.level) * earnMul;
        cash += earning;
        totalEarned += earning;
        return { ...biz, progress: 0 };
      }
      return { ...biz, progress: newProgress };
    }
  });

  return {
    ...state,
    cash,
    businesses: newBiz,
    stats: { ...state.stats, totalCashEarned: totalEarned },
  };
}

export function collectBusiness(state: GameState, bizId: string): GameState {
  const idx = state.businesses.findIndex(b => b.id === bizId);
  if (idx < 0) return state;
  const biz = state.businesses[idx];
  if (biz.level === 0 || biz.managerHired) return state;
  if (biz.progress < 1) return state;

  const def = getBusinessDef(bizId);
  const earning = businessEarning(def, biz.level) * getBusinessEarnMul(state);
  const newBiz = [...state.businesses];
  newBiz[idx] = { ...biz, progress: 0 };

  return {
    ...state,
    cash: state.cash + earning,
    businesses: newBiz,
    stats: { ...state.stats, totalCashEarned: state.stats.totalCashEarned + earning },
  };
}

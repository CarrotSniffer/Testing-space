import { GameState, Holding, ShortPosition, ActiveEvent } from './types';
import { drawCards, makeCard } from './cards';
import { simulateDay, rollDailyEvent, createBossEvent, getNetWorth } from './market';

// ── Start New Day ───────────────────────────────────────────

export function startDay(state: GameState): GameState {
  const { hand, deck, discard } = drawCards(state.deck, state.discard, state.maxCardsPerDay === 6 ? 6 : 5);

  return {
    ...state,
    phase: 'trading',
    hand,
    deck,
    discard,
    cardsPlayedToday: 0,
    selectedCard: null,
    selectedStock: null,
    insiderTipStock: null,
    insiderTipDirection: 0,
    leverageMultiplier: 1,
  };
}

// ── End Day (advance market) ────────────────────────────────

export function endDay(state: GameState): GameState {
  // Move remaining hand cards to discard
  const discard = [...state.discard, ...state.hand];

  // Roll for daily event
  let newEvents = rollDailyEvent(state.stocks, state.day);

  // Check for boss events at start of boss weeks
  const dayInWeek = ((state.day - 1) % 5) + 1;
  if (dayInWeek === 1 && (state.week === 2 || state.week === 4)) {
    const bossEvts = createBossEvent(state.week);
    newEvents = [...newEvents, ...bossEvts];
  }

  // Tick existing events
  const events: ActiveEvent[] = [
    ...state.events.filter(e => e.daysLeft > 1).map(e => ({ ...e, daysLeft: e.daysLeft - 1 })),
    ...newEvents,
  ];

  // Simulate market
  let stocks = simulateDay([...state.stocks.map(s => ({ ...s }))], events);

  // Process pending orders
  let cash = state.cash;
  const portfolio = [...state.portfolio.map(h => ({ ...h }))];
  const remainingOrders = state.pendingOrders
    .map(o => ({ ...o, daysLeft: o.daysLeft - 1 }))
    .filter(o => {
      const stock = stocks.find(s => s.id === o.stockId);
      if (!stock) return false;

      if (o.type === 'limit' && stock.price <= o.triggerPrice && o.daysLeft >= 0) {
        // Execute limit buy
        const units = Math.floor(o.amount / stock.price);
        if (units > 0 && cash >= units * stock.price) {
          const cost = units * stock.price;
          cash -= cost;
          const existing = portfolio.find(h => h.stockId === o.stockId);
          if (existing) {
            const totalUnits = existing.units + units;
            existing.avgPrice = (existing.avgPrice * existing.units + cost) / totalUnits;
            existing.units = totalUnits;
          } else {
            portfolio.push({ stockId: o.stockId, units, avgPrice: stock.price });
          }
        }
        return false; // order consumed
      }

      if (o.type === 'stopLoss') {
        const holding = portfolio.find(h => h.stockId === o.stockId);
        if (holding && stock.price <= o.triggerPrice) {
          cash += holding.units * stock.price;
          holding.units = 0;
          return false;
        }
      }

      return o.daysLeft > 0;
    });

  // Process shorts
  const shorts = state.shorts.map(s => ({ ...s, daysLeft: s.daysLeft - 1 }));
  const resolvedShorts = shorts.filter(s => s.daysLeft <= 0);
  const activeShorts = shorts.filter(s => s.daysLeft > 0);

  for (const short of resolvedShorts) {
    const stock = stocks.find(s => s.id === short.stockId);
    if (stock) {
      // Short profit = (entry - current) * units
      const profit = (short.entryPrice - stock.price) * short.units;
      cash += short.entryPrice * short.units + profit; // return collateral + profit
    }
  }

  // Apply hedge damage absorption
  const hedges = state.hedges.map(h => ({ ...h, daysLeft: h.daysLeft - 1 })).filter(h => h.daysLeft > 0);

  // Process dividends from held stocks
  for (const h of portfolio) {
    const stock = stocks.find(s => s.id === h.stockId);
    if (stock && stock.trait === 'dividend' && h.units > 0) {
      cash += h.units * 0.50; // $0.50/share/day
    }
  }

  // Remove zero-unit holdings
  const cleanPortfolio = portfolio.filter(h => h.units > 0);

  // Check golden parachute
  let hasParachute = state.hasParachute;
  const nw = cash + cleanPortfolio.reduce((sum, h) => {
    const stock = stocks.find(s => s.id === h.stockId);
    return sum + (stock ? h.units * stock.price : 0);
  }, 0);

  if (nw <= 0 && hasParachute) {
    cash = state.parachuteAmount;
    hasParachute = false;
  }

  // Build event log
  const eventLog = newEvents.map(e => e.description);

  // Advance day
  const newDay = state.day + 1;
  const newWeek = Math.ceil(newDay / 5);
  const dayInNewWeek = ((newDay - 1) % 5) + 1;

  // Determine next phase
  let nextPhase: GameState['phase'] = 'animatingPrices';

  return {
    ...state,
    phase: nextPhase,
    cash,
    portfolio: cleanPortfolio,
    shorts: activeShorts,
    hedges,
    pendingOrders: remainingOrders,
    stocks,
    events,
    eventLog,
    hand: [],
    discard,
    day: newDay,
    week: newWeek,
    hasParachute,
    animState: {
      type: 'priceUpdate',
      progress: 0,
      duration: 800,
      data: {},
    },
  };
}

// ── Post-Animation Phase Resolution ─────────────────────────

export function resolveEndDay(state: GameState): GameState {
  const nw = getNetWorth(state);

  // Bankrupt?
  if (nw <= 0) {
    return {
      ...state,
      phase: 'result',
      finalNetWorth: 0,
      animState: null,
    };
  }

  // End of run (day > 20)?
  if (state.day > 20) {
    return {
      ...state,
      phase: 'result',
      finalNetWorth: nw,
      animState: null,
    };
  }

  // End of week?
  const dayInWeek = ((state.day - 1) % 5) + 1;
  if (dayInWeek === 1 && state.day > 1) {
    return {
      ...state,
      phase: 'weekSummary',
      animState: null,
    };
  }

  // Next trading day
  return startDay({ ...state, animState: null });
}

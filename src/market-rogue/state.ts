import { GameState, MetaState } from './types';
import { generateStocks } from './market';
import { makeCard, shuffleDeck } from './cards';
import { STRATEGIES, createDefaultMeta } from './meta';

const META_KEY = 'market_rogue_meta';

// ── Meta Persistence ────────────────────────────────────────

export function saveMeta(meta: MetaState): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch { /* storage full */ }
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return createDefaultMeta();
    return JSON.parse(raw);
  } catch {
    return createDefaultMeta();
  }
}

// ── Create New Run ──────────────────────────────────────────

export function createNewRun(strategyId: string, meta: MetaState): GameState {
  const strategy = STRATEGIES.find(s => s.id === strategyId) || STRATEGIES[0];

  // Generate starting deck
  let uid = 0;
  const deckCards = strategy.startingCards.map(defId => makeCard(defId, uid++));
  const deck = shuffleDeck(deckCards);

  // Generate market
  const hasCrypto = meta.unlocks.includes('crypto');
  const hasCommodity = meta.unlocks.includes('commodity');
  const stocks = generateStocks(hasCrypto, hasCommodity);

  // Starting cash
  const startCash = meta.unlocks.includes('bigstart') ? 12000 : 10000;

  // Max cards per day
  const maxCards = meta.unlocks.includes('draw6') ? 6 : 5;

  return {
    phase: 'trading',
    cash: startCash,
    startingCash: startCash,
    portfolio: [],
    shorts: [],
    hedges: [],
    pendingOrders: [],
    deck,
    hand: [],
    discard: [],
    cardsPlayedToday: 0,
    maxCardsPerDay: maxCards,
    stocks,
    events: [],
    eventLog: [],
    day: 1,
    week: 1,
    weekStartNW: startCash,
    bossDefeated: [],
    selectedCard: null,
    selectedStock: null,
    pickAmountValue: 0,
    pickAmountMax: 0,
    pickAmountCallback: '',
    leverageMultiplier: 1,
    hasParachute: false,
    parachuteAmount: 3000,
    insiderTipStock: null,
    insiderTipDirection: 0,
    finalNetWorth: 0,
    rpEarned: 0,
    meta,
    particles: [],
    animState: null,
    toast: null,
    toastTimer: 0,
    nextCardUid: uid,
    strategyId,
  };
}

import { GameState, ActiveGamble, GambleGameId } from './types';

// ── Game Definitions ────────────────────────────────────────

export interface GambleDef {
  id: GambleGameId;
  name: string;
  description: string;
  minBet: number;
  maxBetFraction: number;
  unlockLiquidation: number;
}

export const GAMBLE_GAMES: GambleDef[] = [
  { id: 'quickflip', name: 'Quick Flip', description: 'Coin flip — 2x or nothing', minBet: 1, maxBetFraction: 0.5, unlockLiquidation: 0 },
  { id: 'roulette', name: 'Market Roulette', description: 'Spin the wheel — up to 5x', minBet: 5, maxBetFraction: 0.3, unlockLiquidation: 0 },
  { id: 'options', name: 'Options Lottery', description: 'Call or Put — watch the chart', minBet: 100, maxBetFraction: 0.25, unlockLiquidation: 2 },
  { id: 'cardshark', name: 'Card Shark', description: 'Poker hands — skill + luck', minBet: 500, maxBetFraction: 0.2, unlockLiquidation: 4 },
  { id: 'vault', name: 'The Vault', description: 'Spend Luck Tokens for rare loot', minBet: 0, maxBetFraction: 0, unlockLiquidation: 5 },
];

export function getAvailableGames(state: GameState): GambleDef[] {
  return GAMBLE_GAMES.filter(g => g.unlockLiquidation <= state.liquidationCount);
}

// ── Start Gamble ────────────────────────────────────────────

export function startGamble(state: GameState, gameId: GambleGameId, betAmount: number): GameState {
  if (state.activeGamble) return state;
  if (gameId === 'vault') {
    if (state.luckTokens < 1) return state;
    return {
      ...state,
      luckTokens: state.luckTokens - 1,
      activeGamble: {
        gameId, betAmount: 0, phase: 'animating', animProgress: 0, result: 0,
        data: { vaultRoll: Math.random() },
      },
      stats: { ...state.stats, totalGambled: state.stats.totalGambled },
    };
  }

  if (betAmount <= 0 || state.cash < betAmount) return state;

  const data: Record<string, unknown> = {};

  if (gameId === 'quickflip') {
    data.coinResult = Math.random() < 0.48 ? 'win' : 'lose'; // 48% win
    data.doubleOrNothing = Math.random() < 0.05; // 5% D-or-N opportunity
  } else if (gameId === 'roulette') {
    // 8 segments: [0, 0.5, 1, 1, 1.5, 2, 3, 5]
    const segments = [0, 0.5, 1, 1, 1.5, 2, 3, 5];
    const idx = Math.floor(Math.random() * segments.length);
    data.wheelResult = idx;
    data.segments = segments;
    data.wheelAngle = 0;
    data.targetAngle = Math.PI * 2 * 4 + (idx / segments.length) * Math.PI * 2 + Math.random() * (Math.PI * 2 / segments.length) * 0.8;
  } else if (gameId === 'options') {
    data.isCall = true; // default to Call, player can toggle
    data.strikePrice = 100;
    data.prices = [100]; // will animate
    data.elapsed = 0;
    data.duration = 10000; // 10 seconds
    // Pre-generate random walk
    const walk = [100];
    for (let i = 1; i <= 100; i++) {
      const prev = walk[i - 1];
      const change = (Math.random() - 0.48) * 4; // slight upward bias
      // 5% chance of flash event
      const flash = Math.random() < 0.05 ? (Math.random() > 0.5 ? 15 : -15) : 0;
      walk.push(Math.max(10, prev + change + flash));
    }
    data.priceWalk = walk;
  } else if (gameId === 'cardshark') {
    // Generate 3 player cards + 1 community card
    const deck = makeDeck();
    shuffle(deck);
    data.playerCards = [deck[0], deck[1], deck[2]];
    data.communityCard = deck[3];
    data.revealed = false;
  }

  return {
    ...state,
    cash: state.cash - betAmount,
    activeGamble: { gameId, betAmount, phase: 'animating', animProgress: 0, result: 0, data },
    stats: { ...state.stats, totalGambled: state.stats.totalGambled + betAmount },
  };
}

// ── Update Animation ────────────────────────────────────────

export function updateGamble(state: GameState, dt: number): GameState {
  if (!state.activeGamble || state.activeGamble.phase !== 'animating') return state;
  const g = { ...state.activeGamble, data: { ...state.activeGamble.data } };
  g.animProgress += dt / 16;

  let done = false;

  if (g.gameId === 'quickflip') {
    if (g.animProgress > 40) {
      done = true;
      g.result = g.data.coinResult === 'win' ? 2 : 0;
    }
  } else if (g.gameId === 'roulette') {
    const target = g.data.targetAngle as number;
    const progress = Math.min(1, g.animProgress / 120);
    const eased = 1 - Math.pow(1 - progress, 3);
    g.data.wheelAngle = eased * target;
    if (progress >= 1) {
      done = true;
      const segments = g.data.segments as number[];
      const idx = g.data.wheelResult as number;
      g.result = segments[idx];
    }
  } else if (g.gameId === 'options') {
    const elapsed = (g.data.elapsed as number) + dt;
    g.data.elapsed = elapsed;
    const walk = g.data.priceWalk as number[];
    const idx = Math.min(walk.length - 1, Math.floor((elapsed / (g.data.duration as number)) * walk.length));
    const prices = walk.slice(0, idx + 1);
    g.data.prices = prices;
    if (elapsed >= (g.data.duration as number)) {
      done = true;
      const finalPrice = walk[walk.length - 1];
      const strike = g.data.strikePrice as number;
      const isCall = g.data.isCall as boolean;
      if (isCall) {
        g.result = finalPrice > strike ? 1 + (finalPrice - strike) / strike * 3 : 0;
      } else {
        g.result = finalPrice < strike ? 1 + (strike - finalPrice) / strike * 3 : 0;
      }
    }
  } else if (g.gameId === 'cardshark') {
    if (g.animProgress > 30) {
      done = true;
      const cards = [...(g.data.playerCards as number[]), g.data.communityCard as number];
      g.result = evaluatePokerHand(cards);
    }
  } else if (g.gameId === 'vault') {
    if (g.animProgress > 60) {
      done = true;
      const roll = g.data.vaultRoll as number;
      if (roll < 0.03) g.result = 100; // Legendary: 10x cash back as percent of current cash
      else if (roll < 0.15) g.result = 20; // Rare
      else if (roll < 0.40) g.result = 5; // Uncommon
      else g.result = 1; // Common
    }
  }

  if (done) {
    g.phase = 'result';
  }

  return { ...state, activeGamble: g };
}

// ── Resolve Gamble ──────────────────────────────────────────

export function resolveGamble(state: GameState): GameState {
  if (!state.activeGamble || state.activeGamble.phase !== 'result') return state;
  const g = state.activeGamble;
  let cash = state.cash;
  let luckTokens = state.luckTokens;
  let wins = state.stats.gamblingWins;
  let losses = state.stats.gamblingLosses;

  if (g.gameId === 'vault') {
    // Vault: result is percent of current cash
    const bonus = cash * (g.result / 100);
    cash += bonus;
    if (g.result >= 20) wins++;
    else losses++;
  } else {
    const payout = g.betAmount * g.result;
    cash += payout;
    if (g.result > 0) wins++;
    else losses++;
  }

  // Luck token drop: 10% on any gamble
  const luckDrop = Math.random() < (state.insiderPurchases.includes('luck_rate') ? 0.15 : 0.10);
  if (luckDrop) luckTokens++;

  return {
    ...state,
    cash,
    luckTokens,
    activeGamble: null,
    stats: { ...state.stats, gamblingWins: wins, gamblingLosses: losses },
  };
}

// ── Card Helpers ─────────────────────────────────────────────

function makeDeck(): number[] {
  const deck: number[] = [];
  for (let i = 0; i < 52; i++) deck.push(i);
  return deck;
}

function shuffle(arr: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function cardRank(c: number): number { return c % 13; }

function evaluatePokerHand(cards: number[]): number {
  const ranks = cards.map(cardRank).sort((a, b) => a - b);
  const suits = cards.map(c => Math.floor(c / 13));
  const isFlush = suits.every(s => s === suits[0]);

  // Count rank occurrences
  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const vals = Object.values(counts).sort((a, b) => b - a);

  // Check straight
  const uniqueRanks = [...new Set(ranks)];
  let isStraight = false;
  if (uniqueRanks.length >= 4) {
    uniqueRanks.sort((a, b) => a - b);
    for (let i = 0; i <= uniqueRanks.length - 4; i++) {
      if (uniqueRanks[i + 3] - uniqueRanks[i] === 3) isStraight = true;
    }
  }

  // Royal flush (4 cards, all same suit, contains 10-J-Q-K or 10-J-Q-A)
  if (isFlush && isStraight && ranks.includes(12)) return 100;
  // Straight flush
  if (isFlush && isStraight) return 50;
  // Four of a kind (not possible with 4 cards unless paired community)
  if (vals[0] === 4) return 25;
  // Full house
  if (vals[0] === 3 && vals[1] >= 1) return 15;
  // Flush
  if (isFlush) return 10;
  // Straight
  if (isStraight) return 8;
  // Three of a kind
  if (vals[0] === 3) return 5;
  // Two pair
  if (vals[0] === 2 && vals[1] === 2) return 3;
  // Pair
  if (vals[0] === 2) return 2;
  // High card
  return 0;
}

// ── Card Display Helpers ────────────────────────────────────

const SUIT_SYMBOLS = ['\u2660', '\u2665', '\u2666', '\u2663']; // spade, heart, diamond, club
const RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_COLORS = ['#aabbdd', '#e94560', '#e94560', '#aabbdd'];

export function cardSuitSymbol(c: number): string { return SUIT_SYMBOLS[Math.floor(c / 13)]; }
export function cardRankName(c: number): string { return RANK_NAMES[c % 13]; }
export function cardColor(c: number): string { return SUIT_COLORS[Math.floor(c / 13)]; }

export const ROULETTE_SEGMENTS = [0, 0.5, 1, 1, 1.5, 2, 3, 5];
export const ROULETTE_COLORS = ['#444', '#e94560', '#334', '#334', '#4ade80', '#4ade80', '#facc15', '#f0d000'];

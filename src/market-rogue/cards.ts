import { CardDef, Card, CardRarity } from './types';
export type { CardDef } from './types';

// ── Card Definitions ────────────────────────────────────────

export const CARD_DEFS: CardDef[] = [
  // Common
  { id: 'buy',        name: 'Market Buy',    description: 'Buy shares of a stock',                    cost: 0,    rarity: 'common',    needsTarget: true,  shopPrice: 150 },
  { id: 'sell',       name: 'Market Sell',   description: 'Sell all shares of a stock',               cost: 0,    rarity: 'common',    needsTarget: true,  shopPrice: 150 },
  { id: 'short',      name: 'Short Sell',    description: 'Bet against a stock for 3 days',           cost: 50,   rarity: 'common',    needsTarget: true,  shopPrice: 250 },
  { id: 'limit',      name: 'Limit Order',   description: 'Auto-buy if stock drops 10%+ within 2 days', cost: 0,  rarity: 'common',    needsTarget: true,  shopPrice: 200 },
  { id: 'stoploss',   name: 'Stop Loss',     description: 'Auto-sell if stock drops 15%+',            cost: 0,    rarity: 'common',    needsTarget: true,  shopPrice: 200 },

  // Uncommon
  { id: 'hedge',      name: 'Hedge',         description: 'Absorb 50% of losses on a stock for 5 days', cost: 100, rarity: 'uncommon', needsTarget: true,  shopPrice: 400 },
  { id: 'insider',    name: 'Insider Tip',   description: 'See tomorrow\'s price direction for 1 stock', cost: 200, rarity: 'uncommon', needsTarget: true,  shopPrice: 500 },
  { id: 'diversify',  name: 'Diversify',     description: 'Split cash evenly across all stocks',      cost: 0,    rarity: 'uncommon',  needsTarget: false, shopPrice: 350 },
  { id: 'sectorbuy',  name: 'Sector Bet',    description: 'Buy the best-performing sector\'s stock',  cost: 0,    rarity: 'uncommon',  needsTarget: false, shopPrice: 350 },
  { id: 'dividend',   name: 'Dividend Play', description: 'Collect $1/share from dividend stocks',    cost: 0,    rarity: 'uncommon',  needsTarget: false, shopPrice: 300 },

  // Rare
  { id: 'leverage',   name: 'Leverage x2',   description: 'Next Buy or Short has double effect',      cost: 0,    rarity: 'rare',      needsTarget: false, shopPrice: 800 },
  { id: 'allin',      name: 'All-In',        description: 'Put ALL cash into one stock',              cost: 0,    rarity: 'rare',      needsTarget: true,  shopPrice: 600 },
  { id: 'manipulate', name: 'Manipulation',  description: 'Pump a stock +15%, then it corrects',      cost: 500,  rarity: 'rare',      needsTarget: true,  shopPrice: 1000 },
  { id: 'shortall',   name: 'Bear Raid',     description: 'Short ALL stocks at once for 2 days',      cost: 200,  rarity: 'rare',      needsTarget: false, shopPrice: 900 },

  // Legendary
  { id: 'parachute',  name: 'Golden Chute',  description: 'If bankrupt this week, restore to $3000',  cost: 1000, rarity: 'legendary', needsTarget: false, shopPrice: 2000 },
  { id: 'whale',      name: 'Whale Buy',     description: 'Pump a stock +30%, keep some gains',       cost: 2000, rarity: 'legendary', needsTarget: true,  shopPrice: 3000 },
  { id: 'rewind',     name: 'Time Rewind',   description: 'Undo yesterday\'s price movement',         cost: 500,  rarity: 'legendary', needsTarget: false, shopPrice: 2500 },
];

export function getCardDef(id: string): CardDef {
  return CARD_DEFS.find(c => c.id === id)!;
}

export function getCardsByRarity(rarity: CardRarity): CardDef[] {
  return CARD_DEFS.filter(c => c.rarity === rarity);
}

export function makeCard(defId: string, uid: number): Card {
  return { defId, uid, upgraded: false };
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawCards(deck: Card[], discard: Card[], count: number): { hand: Card[]; deck: Card[]; discard: Card[] } {
  let d = [...deck];
  let disc = [...discard];

  if (d.length < count) {
    // Shuffle discard back into deck
    d = [...d, ...shuffleDeck(disc)];
    disc = [];
  }

  const hand = d.splice(0, count);
  return { hand, deck: d, discard: disc };
}

// ── Card Rarity Colors ──────────────────────────────────────

export const RARITY_COLORS: Record<CardRarity, string> = {
  common: '#8899bb',
  uncommon: '#4ade80',
  rare: '#3b82f6',
  legendary: '#facc15',
};

export const RARITY_BG: Record<CardRarity, string> = {
  common: 'rgba(136,153,187,0.08)',
  uncommon: 'rgba(74,222,128,0.08)',
  rare: 'rgba(59,130,246,0.08)',
  legendary: 'rgba(250,204,21,0.08)',
};

// ── Shop helpers ────────────────────────────────────────────

export function generateShopCards(meta: { unlockedCards: string[] }, count: number): CardDef[] {
  // Pool: all cards + unlocked ones, weighted by rarity
  const pool = CARD_DEFS.filter(c => {
    if (c.rarity === 'legendary') return Math.random() < 0.15;
    if (c.rarity === 'rare') return Math.random() < 0.4;
    return true;
  });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

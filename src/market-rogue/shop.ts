import { GameState, Card } from './types';
import { generateShopCards, makeCard, getCardDef, CardDef } from './cards';

export interface ShopState {
  offerings: CardDef[];
  removeCost: number;
  upgradeCost: number;
}

export function createShop(state: GameState): ShopState {
  return {
    offerings: generateShopCards(state.meta, 5),
    removeCost: 300,
    upgradeCost: 500,
  };
}

export function buyShopCard(state: GameState, cardDef: CardDef): GameState {
  if (state.cash < cardDef.shopPrice) return state;

  const newCard = makeCard(cardDef.id, state.nextCardUid);
  return {
    ...state,
    cash: state.cash - cardDef.shopPrice,
    deck: [...state.deck, newCard],
    discard: [...state.discard],
    nextCardUid: state.nextCardUid + 1,
  };
}

export function removeCardFromDeck(state: GameState, cardUid: number, cost: number): GameState {
  if (state.cash < cost) return state;
  const deckIdx = state.deck.findIndex(c => c.uid === cardUid);
  const discardIdx = state.discard.findIndex(c => c.uid === cardUid);

  let newDeck = state.deck;
  let newDiscard = state.discard;

  if (deckIdx >= 0) {
    newDeck = [...state.deck];
    newDeck.splice(deckIdx, 1);
  } else if (discardIdx >= 0) {
    newDiscard = [...state.discard];
    newDiscard.splice(discardIdx, 1);
  } else {
    return state; // card not found
  }

  return {
    ...state,
    cash: state.cash - cost,
    deck: newDeck,
    discard: newDiscard,
  };
}

export function upgradeCard(state: GameState, cardUid: number, cost: number): GameState {
  if (state.cash < cost) return state;

  const upgrade = (cards: Card[]) =>
    cards.map(c => c.uid === cardUid ? { ...c, upgraded: true } : c);

  return {
    ...state,
    cash: state.cash - cost,
    deck: upgrade(state.deck),
    discard: upgrade(state.discard),
    hand: upgrade(state.hand),
  };
}

import { GameState } from './types';
import { createNewRun, loadMeta, saveMeta } from './state';
import { getCardDef, makeCard, drawCards } from './cards';
import { getNetWorth } from './market';
import { startDay, endDay, resolveEndDay } from './run';
import { createShop, buyShopCard, removeCardFromDeck, ShopState } from './shop';
import { calculateRP, STRATEGIES, META_UNLOCKS } from './meta';
import { render, getHitZones, setShopData } from './renderer';
import { createInputState, setupInput, updateScroll, consumeTap } from './input';
import { updateParticles, spawnGainParticles, spawnLossParticles, spawnEventParticles, spawnBossParticles } from './particles';
import { formatCash, formatPrice } from './format';

// ── State ───────────────────────────────────────────────────

let meta = loadMeta();
let state: GameState = { ...createNewRun('value', meta), phase: 'setup' };
let shop: ShopState | null = null;

const input = createInputState();

// ── Canvas ──────────────────────────────────────────────────

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── HUD ─────────────────────────────────────────────────────

const hudEl = document.getElementById('hud')!;
const barEl = document.getElementById('bottombar')!;
const hudCash = document.getElementById('hud-cash')!;
const hudNW = document.getElementById('hud-nw')!;
const hudDay = document.getElementById('hud-day')!;
const hudWeek = document.getElementById('hud-week')!;

function updateHUD() {
  hudCash.textContent = formatCash(state.cash);
  hudNW.textContent = formatCash(getNetWorth(state));
  hudDay.textContent = `Day ${Math.min(state.day, 20)}`;
  hudWeek.textContent = `Week ${Math.min(state.week, 4)}`;
}

// ── Toast ───────────────────────────────────────────────────

function showToast(msg: string) {
  state = { ...state, toast: msg, toastTimer: 1500 };
}

// ── Input ───────────────────────────────────────────────────

function getScrollKey(): string {
  if (state.phase === 'shop') return 'shop';
  if (state.phase === 'meta') return 'meta';
  return 'market';
}

setupInput(canvas, input, getScrollKey);

// ── Action Handler ──────────────────────────────────────────

function handleAction(action: string, data?: string, tx = 0, ty = 0) {
  switch (action) {

    // ── Setup ──
    case 'selectStrategy': {
      if (!data) break;
      state = createNewRun(data, meta);
      state = startDay(state);
      shop = null;
      showToast(`${STRATEGIES.find(s => s.id === data)?.name || data} selected`);
      break;
    }
    case 'unlockStrategy': {
      if (!data) break;
      const strat = STRATEGIES.find(s => s.id === data);
      if (strat && meta.reputation >= strat.unlockCost) {
        meta = { ...meta, reputation: meta.reputation - strat.unlockCost, unlockedStrategies: [...meta.unlockedStrategies, data] };
        state = { ...state, meta };
        saveMeta(meta);
        showToast(`${strat.name} unlocked!`);
      }
      break;
    }
    case 'goMeta': {
      state = { ...state, phase: 'meta' };
      break;
    }
    case 'backFromMeta': {
      state = { ...state, phase: 'setup' };
      break;
    }

    // ── Trading ──
    case 'selectCard': {
      if (!data) break;
      const idx = parseInt(data);
      if (state.selectedCard === idx) {
        // Deselect
        state = { ...state, selectedCard: null, selectedStock: null };
      } else {
        const card = state.hand[idx];
        if (!card) break;
        const def = getCardDef(card.defId);
        if (def.needsTarget) {
          // Need to select a stock next
          state = { ...state, selectedCard: idx, selectedStock: null };
        } else {
          // Execute immediately (no target needed)
          state = { ...state, selectedCard: idx };
          executeCard(idx, -1, tx, ty);
        }
      }
      break;
    }

    case 'selectStock': {
      if (!data || state.selectedCard === null) break;
      const stockIdx = parseInt(data);
      const stock = state.stocks[stockIdx];
      if (!stock || stock.frozen || stock.dead) {
        showToast('Can\'t target this stock');
        break;
      }
      executeCard(state.selectedCard, stockIdx, tx, ty);
      break;
    }

    case 'endDay': {
      if (state.phase !== 'trading') break;
      state = endDay(state);
      break;
    }

    // ── Amount Picker ──
    case 'pickAmountPreset': {
      if (!data) break;
      const frac = parseFloat(data);
      state = { ...state, pickAmountValue: Math.floor(state.pickAmountMax * frac) };
      break;
    }
    case 'confirmAmount': {
      if (state.pickAmountValue <= 0) break;
      executeAmountCallback();
      break;
    }
    case 'cancelAmount': {
      state = { ...state, phase: 'trading', selectedCard: null, selectedStock: null };
      break;
    }

    // ── Week Summary ──
    case 'goShop': {
      shop = createShop(state);
      setShopData(shop);
      state = { ...state, phase: 'shop' };
      break;
    }

    // ── Shop ──
    case 'buyShopCard': {
      if (!data || !shop) break;
      const idx = parseInt(data);
      const cardDef = shop.offerings[idx];
      if (!cardDef || state.cash < cardDef.shopPrice) {
        showToast('Not enough cash');
        break;
      }
      state = buyShopCard(state, cardDef);
      showToast(`Bought ${cardDef.name}`);
      // Remove from offerings
      shop = { ...shop, offerings: shop.offerings.filter((_, i) => i !== idx) };
      setShopData(shop);
      break;
    }
    case 'removeCardMode': {
      // TODO: Show deck for removal selection
      showToast('Pick a card to remove (tap a card)');
      break;
    }
    case 'continueWeek': {
      // Check for boss week
      if (state.week === 2 || state.week === 4) {
        if (!state.bossDefeated.includes(state.week)) {
          state = { ...state, phase: 'boss' };
          break;
        }
      }
      state = { ...state, weekStartNW: getNetWorth(state) };
      state = startDay(state);
      shop = null;
      setShopData(null);
      break;
    }

    // ── Boss ──
    case 'startBoss': {
      state = {
        ...state,
        bossDefeated: [...state.bossDefeated, state.week],
        weekStartNW: getNetWorth(state),
      };
      state.particles.push(...spawnBossParticles(window.innerWidth, window.innerHeight));
      state = startDay(state);
      break;
    }

    // ── Result ──
    case 'playAgain': {
      state = { ...createNewRun('value', meta), phase: 'setup', meta };
      break;
    }

    // ── Meta Unlocks ──
    case 'buyMetaUnlock': {
      if (!data) break;
      const unlock = META_UNLOCKS.find(u => u.id === data);
      if (unlock && meta.reputation >= unlock.cost && !meta.unlocks.includes(data)) {
        meta = { ...meta, reputation: meta.reputation - unlock.cost, unlocks: [...meta.unlocks, data] };
        state = { ...state, meta };
        saveMeta(meta);
        showToast(`${unlock.name} unlocked!`);
      }
      break;
    }
  }
}

// ── Card Execution ──────────────────────────────────────────

function executeCard(handIdx: number, stockIdx: number, tx = 0, ty = 0) {
  const card = state.hand[handIdx];
  if (!card) return;
  const def = getCardDef(card.defId);

  // Check card play limit
  if (state.cardsPlayedToday >= state.maxCardsPerDay) {
    showToast('No more card plays today');
    state = { ...state, selectedCard: null };
    return;
  }

  // Check card cost
  if (def.cost > 0 && state.cash < def.cost) {
    showToast(`Need ${formatCash(def.cost)} to play`);
    state = { ...state, selectedCard: null };
    return;
  }

  const stock = stockIdx >= 0 ? state.stocks[stockIdx] : null;
  let newState = { ...state };

  // Deduct card cost
  if (def.cost > 0) {
    newState.cash -= def.cost;
  }

  switch (def.id) {
    case 'buy': {
      if (!stock) break;
      // Show amount picker
      newState = {
        ...newState,
        phase: 'pickAmount',
        pickAmountMax: Math.floor(newState.cash / stock.price) > 0 ? newState.cash : 0,
        pickAmountValue: Math.floor(newState.cash * 0.25),
        pickAmountCallback: `buy:${stockIdx}`,
        selectedStock: stockIdx,
      };
      state = newState;
      return; // Don't consume card yet
    }

    case 'sell': {
      if (!stock) break;
      const holding = newState.portfolio.find(h => h.stockId === stock.id);
      if (!holding || holding.units <= 0) {
        showToast('No shares to sell');
        newState.selectedCard = null;
        state = newState;
        return;
      }
      const proceeds = holding.units * stock.price;
      const pnl = proceeds - holding.units * holding.avgPrice;
      newState.cash += proceeds;
      newState.portfolio = newState.portfolio.filter(h => h.stockId !== stock.id);
      showToast(`Sold ${stock.ticker} for ${formatCash(proceeds)}`);
      if (pnl >= 0) newState.particles.push(...spawnGainParticles(tx, ty, formatCash(pnl)));
      else newState.particles.push(...spawnLossParticles(tx, ty, formatCash(Math.abs(pnl))));
      break;
    }

    case 'short': {
      if (!stock) break;
      const shortUnits = Math.max(1, Math.floor(newState.cash * 0.2 / stock.price));
      const collateral = shortUnits * stock.price;
      if (newState.cash < collateral) {
        showToast('Not enough collateral');
        newState.selectedCard = null;
        state = newState;
        return;
      }
      newState.cash -= collateral;
      const days = card.upgraded ? 5 : 3;
      newState.shorts = [...newState.shorts, { stockId: stock.id, units: shortUnits, entryPrice: stock.price, daysLeft: days }];
      showToast(`Shorted ${shortUnits} ${stock.ticker}`);
      break;
    }

    case 'limit': {
      if (!stock) break;
      const triggerPrice = stock.price * 0.90; // 10% below current
      newState.pendingOrders = [...newState.pendingOrders, {
        type: 'limit', stockId: stock.id, triggerPrice, amount: newState.cash * 0.25, daysLeft: card.upgraded ? 4 : 2,
      }];
      showToast(`Limit order: ${stock.ticker} @ ${formatPrice(triggerPrice)}`);
      break;
    }

    case 'stoploss': {
      if (!stock) break;
      const holding = newState.portfolio.find(h => h.stockId === stock.id);
      if (!holding) {
        showToast('No position to protect');
        newState.selectedCard = null;
        state = newState;
        return;
      }
      const trigger = stock.price * 0.85;
      newState.pendingOrders = [...newState.pendingOrders, {
        type: 'stopLoss', stockId: stock.id, triggerPrice: trigger, amount: holding.units, daysLeft: 99,
      }];
      showToast(`Stop-loss: ${stock.ticker} @ ${formatPrice(trigger)}`);
      break;
    }

    case 'hedge': {
      if (!stock) break;
      const absorption = card.upgraded ? 0.75 : 0.5;
      const days = card.upgraded ? 7 : 5;
      newState.hedges = [...newState.hedges, { stockId: stock.id, absorption, daysLeft: days }];
      showToast(`Hedged ${stock.ticker} (${Math.round(absorption * 100)}% protection)`);
      break;
    }

    case 'insider': {
      if (!stock) break;
      const direction = stock.trend === 'bull' ? 1 : stock.trend === 'bear' ? -1 : (Math.random() > 0.5 ? 1 : -1);
      // Add some randomness (70% accurate)
      const actualDir = Math.random() < 0.7 ? direction : -direction;
      newState.insiderTipStock = stock.id;
      newState.insiderTipDirection = actualDir;
      showToast(`Insider tip received for ${stock.ticker}`);
      break;
    }

    case 'diversify': {
      const activeStocks = newState.stocks.filter(s => !s.frozen && !s.dead);
      const perStock = Math.floor(newState.cash / activeStocks.length);
      if (perStock <= 0) {
        showToast('Not enough cash');
        newState.selectedCard = null;
        state = newState;
        return;
      }
      for (const s of activeStocks) {
        const units = Math.floor(perStock / s.price);
        if (units > 0) {
          const cost = units * s.price;
          newState.cash -= cost;
          const existing = newState.portfolio.find(h => h.stockId === s.id);
          if (existing) {
            const totalUnits = existing.units + units;
            existing.avgPrice = (existing.avgPrice * existing.units + cost) / totalUnits;
            existing.units = totalUnits;
          } else {
            newState.portfolio = [...newState.portfolio, { stockId: s.id, units, avgPrice: s.price }];
          }
        }
      }
      showToast('Diversified across all stocks');
      break;
    }

    case 'sectorbuy': {
      // Find best performing sector
      const sectorPerf: Record<string, number> = {};
      for (const s of newState.stocks) {
        if (s.dead || s.frozen) continue;
        const prev = s.priceHistory.length > 1 ? s.priceHistory[s.priceHistory.length - 2] : s.price;
        const perf = (s.price - prev) / prev;
        sectorPerf[s.sector] = (sectorPerf[s.sector] || 0) + perf;
      }
      let bestSector = '';
      let bestPerf = -Infinity;
      for (const [sector, perf] of Object.entries(sectorPerf)) {
        if (perf > bestPerf) { bestPerf = perf; bestSector = sector; }
      }
      const sectorStocks = newState.stocks.filter(s => s.sector === bestSector && !s.frozen && !s.dead);
      const target = sectorStocks[0];
      if (target) {
        const amount = Math.floor(newState.cash * 0.5);
        const units = Math.floor(amount / target.price);
        if (units > 0) {
          const cost = units * target.price;
          newState.cash -= cost;
          const existing = newState.portfolio.find(h => h.stockId === target.id);
          if (existing) {
            const total = existing.units + units;
            existing.avgPrice = (existing.avgPrice * existing.units + cost) / total;
            existing.units = total;
          } else {
            newState.portfolio = [...newState.portfolio, { stockId: target.id, units, avgPrice: target.price }];
          }
          showToast(`Sector bet: ${target.ticker} (${bestSector})`);
        }
      }
      break;
    }

    case 'dividend': {
      let total = 0;
      for (const h of newState.portfolio) {
        const s = newState.stocks.find(st => st.id === h.stockId);
        if (s && s.trait === 'dividend') {
          const bonus = h.units * (card.upgraded ? 2.0 : 1.0);
          total += bonus;
        }
      }
      newState.cash += total;
      showToast(`Collected ${formatCash(total)} in dividends`);
      if (total > 0) newState.particles.push(...spawnGainParticles(window.innerWidth / 2, 100, formatCash(total)));
      break;
    }

    case 'leverage': {
      newState.leverageMultiplier = card.upgraded ? 3 : 2;
      showToast(`Leverage x${newState.leverageMultiplier} active!`);
      break;
    }

    case 'allin': {
      if (!stock) break;
      const units = Math.floor(newState.cash / stock.price);
      if (units <= 0) {
        showToast('Not enough cash');
        newState.selectedCard = null;
        state = newState;
        return;
      }
      // Sell everything else
      for (const h of newState.portfolio) {
        const s = newState.stocks.find(st => st.id === h.stockId);
        if (s) newState.cash += h.units * s.price;
      }
      newState.portfolio = [];
      const cost = units * stock.price;
      newState.cash -= cost;
      newState.portfolio = [{ stockId: stock.id, units, avgPrice: stock.price }];
      showToast(`ALL IN on ${stock.ticker}!`);
      newState.particles.push(...spawnEventParticles(window.innerWidth / 2, window.innerHeight / 2));
      break;
    }

    case 'manipulate': {
      if (!stock) break;
      newState.stocks = newState.stocks.map(s =>
        s.id === stock.id ? { ...s, price: s.price * 1.15, priceHistory: [...s.priceHistory, s.price * 1.15] } : s
      );
      showToast(`Pumped ${stock.ticker} +15%`);
      newState.particles.push(...spawnEventParticles(tx, ty));
      break;
    }

    case 'shortall': {
      for (const s of newState.stocks.filter(s => !s.frozen && !s.dead)) {
        const units = Math.max(1, Math.floor(newState.cash * 0.05 / s.price));
        const collateral = units * s.price;
        if (newState.cash >= collateral) {
          newState.cash -= collateral;
          newState.shorts = [...newState.shorts, { stockId: s.id, units, entryPrice: s.price, daysLeft: card.upgraded ? 4 : 2 }];
        }
      }
      showToast('Bear Raid: shorted everything!');
      break;
    }

    case 'parachute': {
      newState.hasParachute = true;
      newState.parachuteAmount = card.upgraded ? 5000 : 3000;
      showToast('Golden Parachute activated');
      break;
    }

    case 'whale': {
      if (!stock) break;
      newState.stocks = newState.stocks.map(s =>
        s.id === stock.id ? { ...s, price: s.price * 1.30, priceHistory: [...s.priceHistory, s.price * 1.30] } : s
      );
      showToast(`Whale buy on ${stock.ticker}! +30%`);
      newState.particles.push(...spawnEventParticles(tx, ty));
      break;
    }

    case 'rewind': {
      newState.stocks = newState.stocks.map(s => {
        if (s.priceHistory.length > 1) {
          const prev = s.priceHistory[s.priceHistory.length - 2];
          return { ...s, price: prev, priceHistory: s.priceHistory.slice(0, -1) };
        }
        return s;
      });
      showToast('Time Rewind! Market reset to yesterday');
      newState.particles.push(...spawnEventParticles(window.innerWidth / 2, window.innerHeight / 2));
      break;
    }
  }

  // Consume card (move from hand to discard)
  if (newState.phase !== 'pickAmount') {
    const newHand = [...newState.hand];
    const played = newHand.splice(handIdx, 1);
    newState = {
      ...newState,
      hand: newHand,
      discard: [...newState.discard, ...played],
      cardsPlayedToday: newState.cardsPlayedToday + 1,
      selectedCard: null,
      selectedStock: null,
    };
  }

  state = newState;
}

// ── Amount Callback ─────────────────────────────────────────

function executeAmountCallback() {
  const [action, idxStr] = state.pickAmountCallback.split(':');
  const stockIdx = parseInt(idxStr);
  const stock = state.stocks[stockIdx];
  if (!stock) return;

  const amount = state.pickAmountValue;
  let mult = state.leverageMultiplier;

  if (action === 'buy') {
    const effectiveAmount = amount * mult;
    const units = Math.floor(effectiveAmount / stock.price);
    if (units <= 0 || amount > state.cash) {
      showToast('Not enough cash');
      state = { ...state, phase: 'trading', selectedCard: null };
      return;
    }
    const cost = Math.min(amount, units * stock.price);
    const newPortfolio = [...state.portfolio];
    const existing = newPortfolio.find(h => h.stockId === stock.id);
    if (existing) {
      const totalUnits = existing.units + units;
      existing.avgPrice = (existing.avgPrice * existing.units + cost) / totalUnits;
      existing.units = totalUnits;
    } else {
      newPortfolio.push({ stockId: stock.id, units, avgPrice: stock.price });
    }

    // Consume the card
    const handIdx = state.selectedCard!;
    const newHand = [...state.hand];
    const played = newHand.splice(handIdx, 1);

    state = {
      ...state,
      phase: 'trading',
      cash: state.cash - cost,
      portfolio: newPortfolio,
      hand: newHand,
      discard: [...state.discard, ...played],
      cardsPlayedToday: state.cardsPlayedToday + 1,
      selectedCard: null,
      selectedStock: null,
      leverageMultiplier: 1,
    };
    showToast(`Bought ${units} ${stock.ticker} @ ${formatPrice(stock.price)}`);
    state.particles.push(...spawnGainParticles(window.innerWidth / 2, 100, `${units} shares`));
  }
}

// ── Tap Handling ────────────────────────────────────────────

function handleTaps() {
  const tap = consumeTap(input);
  if (!tap) return;
  const zones = getHitZones();
  for (const zone of zones) {
    if (tap.x >= zone.x && tap.x <= zone.x + zone.w && tap.y >= zone.y && tap.y <= zone.y + zone.h) {
      handleAction(zone.action, zone.data, tap.x, tap.y);
      return;
    }
  }
  // Tapped empty space: deselect card
  if (state.selectedCard !== null && state.phase === 'trading') {
    state = { ...state, selectedCard: null, selectedStock: null };
  }
}

// ── Render Loop ─────────────────────────────────────────────

let lastTime = 0;

function frame(now: number) {
  const dt = lastTime ? now - lastTime : 16;
  lastTime = now;

  handleTaps();
  updateScroll(input, getScrollKey());

  // Update animation
  if (state.animState) {
    const anim = { ...state.animState, progress: state.animState.progress + dt / state.animState.duration };
    if (anim.progress >= 1) {
      // Animation complete
      if (anim.type === 'priceUpdate') {
        state = resolveEndDay({ ...state, animState: null });
      } else {
        state = { ...state, animState: null };
      }
    } else {
      state = { ...state, animState: anim };
    }
  }

  // Update particles
  state = { ...state, particles: updateParticles(state.particles, dt) };

  // Toast timer
  if (state.toastTimer > 0) {
    state = { ...state, toastTimer: state.toastTimer - dt };
    if (state.toastTimer <= 0) {
      state = { ...state, toast: null, toastTimer: 0 };
    }
  }

  // Render
  const scrollY = input.scrollY[getScrollKey()] || 0;
  const hudH = hudEl.offsetHeight;
  const barH = barEl.offsetHeight;
  render(ctx, canvas, state, scrollY, hudH, barH);
  updateHUD();

  requestAnimationFrame(frame);
}

// ── Init ────────────────────────────────────────────────────

updateHUD();
requestAnimationFrame(frame);

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

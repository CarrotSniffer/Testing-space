import { GameState, TabId, GambleGameId, INSIDER_UPGRADES } from './types';
import { createInitialState, saveGame, loadGame } from './state';
import { getTapValue, buyBusiness, buyManager, collectBusiness, tickBusinesses, getTotalCashPerSecond } from './economy';
import { tickMarket, getNetWorth, getAssetPrice, getHolding, buyAsset, sellAsset } from './market';
import { startGamble, updateGamble, resolveGamble, getAvailableGames } from './gambling';
import { canLiquidate, liquidate, canAscend, ascend, projectedIK } from './prestige';
import { calculateOfflineProgress, applyOfflineProgress } from './offline';
import { render, getHitZones } from './renderer';
import { createInputState, setupInput, updateScroll, consumeTap } from './input';
import { spawnTapParticles, spawnWinParticles, spawnPrestigeParticles, updateParticles } from './particles';
import { formatCash, formatNumber } from './format';

// ── State ───────────────────────────────────────────────────

let state: GameState = loadGame() || createInitialState();
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

const hud = document.getElementById('hud')!;
const tabbar = document.getElementById('tabbar')!;
const hudCash = document.getElementById('hud-cash')!;
const hudCps = document.getElementById('hud-cps')!;
const hudNw = document.getElementById('hud-nw')!;
const hudIk = document.getElementById('hud-ik')!;
const toast = document.getElementById('toast')!;

let toastTimer = 0;
function showToast(msg: string) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
}

function updateHUD() {
  hudCash.textContent = formatCash(state.cash);
  hudCps.textContent = formatCash(getTotalCashPerSecond(state)) + '/s';
  hudNw.textContent = formatCash(getNetWorth(state));
  hudIk.textContent = state.insiderKnowledge.toString();
}

// ── Tab Bar ─────────────────────────────────────────────────

const tabBtns = document.querySelectorAll('.tab-btn') as NodeListOf<HTMLElement>;
function setActiveTab(tab: TabId) {
  state = { ...state, activeTab: tab };
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}
tabBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setActiveTab(btn.dataset.tab as TabId);
  });
});

// ── Offline Progress ────────────────────────────────────────

const offlineReport = calculateOfflineProgress(state);
if (offlineReport.totalEarned > 0) {
  state = applyOfflineProgress(state, offlineReport);
  showToast('Welcome back! +' + formatCash(offlineReport.totalEarned));
}
state = { ...state, lastOnlineTime: Date.now() };

// ── Input Handling ──────────────────────────────────────────

setupInput(canvas, input, () => state.activeTab);

function handleTaps() {
  const tap = consumeTap(input);
  if (!tap) return;

  // Check hit zones
  const zones = getHitZones();
  for (const zone of zones) {
    if (tap.x >= zone.x && tap.x <= zone.x + zone.w && tap.y >= zone.y && tap.y <= zone.y + zone.h) {
      handleAction(zone.action, zone.data, tap.x, tap.y);
      return;
    }
  }
}

function handleAction(action: string, data?: string, tapX = 0, tapY = 0) {
  switch (action) {
    case 'tap': {
      const value = getTapValue(state);
      state = { ...state, cash: state.cash + value, stats: { ...state.stats, totalTaps: state.stats.totalTaps + 1, totalCashEarned: state.stats.totalCashEarned + value } };
      state.particles.push(...spawnTapParticles(tapX, tapY, value));
      break;
    }
    case 'buyBiz':
      if (data) {
        const prev = state.cash;
        state = buyBusiness(state, data);
        if (state.cash < prev) showToast('Purchased!');
      }
      break;
    case 'buyMgr':
      if (data) {
        const prev = state.cash;
        state = buyManager(state, data);
        if (state.cash < prev) showToast('Manager hired!');
      }
      break;
    case 'collect':
      if (data) state = collectBusiness(state, data);
      break;
    case 'buyAsset':
      if (data) {
        const price = getAssetPrice(state, data);
        const units = Math.max(1, Math.floor(state.cash * 0.1 / price));
        const prev = state.cash;
        state = buyAsset(state, data, units);
        if (state.cash < prev) showToast(`Bought ${formatNumber(units)} units`);
      }
      break;
    case 'sellAsset':
      if (data) {
        const holding = getHolding(state, data);
        if (holding) {
          state = sellAsset(state, data, holding.units);
          showToast('Sold all units!');
        }
      }
      break;
    case 'startGamble':
      if (data) {
        const gameId = data as GambleGameId;
        if (gameId === 'vault') {
          state = startGamble(state, gameId, 0);
        } else {
          const games = getAvailableGames(state);
          const gameDef = games.find(g => g.id === gameId);
          if (gameDef) {
            const bet = Math.min(state.cash * gameDef.maxBetFraction, Math.max(gameDef.minBet, state.cash * 0.1));
            state = startGamble(state, gameId, bet);
            if (state.activeGamble) showToast('Bet: ' + formatCash(bet));
          }
        }
      }
      break;
    case 'resolveGamble': {
      const g = state.activeGamble;
      if (g && g.phase === 'result') {
        if (g.result > 0) {
          state.particles.push(...spawnWinParticles(tapX, tapY, g.betAmount * g.result));
        }
        state = resolveGamble(state);
      }
      break;
    }
    case 'liquidate':
      if (canLiquidate(state)) {
        const ik = projectedIK(state);
        state = liquidate(state);
        state.particles.push(...spawnPrestigeParticles(window.innerWidth, window.innerHeight));
        showToast(`Liquidated! +${ik} IK`);
      }
      break;
    case 'ascend':
      if (canAscend(state)) {
        state = ascend(state);
        state.particles.push(...spawnPrestigeParticles(window.innerWidth, window.innerHeight));
        showToast('Ascended!');
      }
      break;
    case 'buyUpgrade':
      if (data) {
        const upgrade = INSIDER_UPGRADES.find(u => u.id === data);
        if (upgrade && state.insiderKnowledge >= upgrade.cost && !state.insiderPurchases.includes(data)) {
          state = {
            ...state,
            insiderKnowledge: state.insiderKnowledge - upgrade.cost,
            insiderPurchases: [...state.insiderPurchases, data],
          };
          showToast(upgrade.name + ' purchased!');
        }
      }
      break;
  }
}

// ── Economy Tick (1s) ───────────────────────────────────────

setInterval(() => {
  // Business tick
  state = tickBusinesses(state, 1000);

  // Market tick
  state = tickMarket(state);
  state = { ...state, tick: state.tick + 1 };

  // Interest
  if (state.insiderPurchases.includes('interest')) {
    const rate = 0.001 * (1 + state.insiderKnowledge * 0.01) / 60;
    state = { ...state, cash: state.cash + state.cash * rate };
  }

  // Update net worth tracking
  const nw = getNetWorth(state);
  state = { ...state, stats: { ...state.stats, highestNetWorth: Math.max(state.stats.highestNetWorth, nw) } };

  updateHUD();
  saveGame(state);
}, 1000);

// ── Render Loop (60fps) ─────────────────────────────────────

let lastTime = 0;

function frame(now: number) {
  const dt = lastTime ? now - lastTime : 16;
  lastTime = now;

  // Handle taps
  handleTaps();

  // Update scroll
  updateScroll(input, state.activeTab);

  // Update gambling animation
  state = updateGamble(state, dt);

  // Update particles
  state = { ...state, particles: updateParticles(state.particles, dt) };

  // Business progress (visual, for non-manager businesses)
  state = tickBusinesses(state, dt);

  // Render
  const scrollY = input.scrollY[state.activeTab] || 0;
  const hudH = hud.offsetHeight;
  const tabH = tabbar.offsetHeight;
  render(ctx, canvas, state, scrollY, hudH, tabH);

  // Update HUD
  updateHUD();

  requestAnimationFrame(frame);
}

// ── Init ────────────────────────────────────────────────────

setActiveTab(state.activeTab);
updateHUD();
requestAnimationFrame(frame);

// Service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

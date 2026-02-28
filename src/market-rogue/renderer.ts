import { GameState, Stock, Card, AnimState, Phase } from './types';
import { getCardDef, RARITY_COLORS, RARITY_BG, CardDef } from './cards';
import { getNetWorth, getPortfolioValue } from './market';
import { getAvailableStrategies, getLockedStrategies, STRATEGIES, META_UNLOCKS } from './meta';
import { formatCash, formatPercent, formatPrice } from './format';
import { drawParticles } from './particles';
import { ShopState } from './shop';

// ── Colors ──────────────────────────────────────────────────

const BG = '#0a0e1a';
const CARD_BG = 'rgba(30,40,65,0.6)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#fff';
const TEXT2 = '#8899bb';
const TEXT3 = '#546080';
const ACCENT = '#e94560';
const GREEN = '#4ade80';
const RED = '#f87171';
const GOLD = '#facc15';
const BLUE = '#3b82f6';

// ── Hit Zones ───────────────────────────────────────────────

export interface HitZone {
  x: number; y: number; w: number; h: number;
  action: string;
  data?: string;
}

let hitZones: HitZone[] = [];
export function getHitZones(): HitZone[] { return hitZones; }

// ── Helpers ─────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBtn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, color: string, enabled = true) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = enabled ? color : 'rgba(255,255,255,0.05)';
  ctx.fill();
  if (enabled) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = enabled ? '#fff' : TEXT3;
  ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function drawSparkline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, data: number[], color: string) {
  if (data.length < 2) return;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < data.length; i++) {
    const px = x + (i / (data.length - 1)) * w;
    const py = y + h - ((data[i] - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

// ── Shared shop state (set from main.ts) ────────────────────
let shopData: ShopState | null = null;
export function setShopData(s: ShopState | null) { shopData = s; }

// ── Main Render ─────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  scrollY: number,
  hudHeight: number,
  bottomBarHeight: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const topY = hudHeight + 2;
  const bottomY = h - bottomBarHeight;
  const contentH = bottomY - topY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, topY, w, contentH);
  ctx.clip();
  ctx.translate(0, topY - scrollY);

  hitZones = [];

  switch (state.phase) {
    case 'setup':
      drawSetupScreen(ctx, state, w, scrollY, topY);
      break;
    case 'trading':
      drawTradingScreen(ctx, state, w, contentH, scrollY, topY);
      break;
    case 'animatingPrices':
      drawTradingScreen(ctx, state, w, contentH, scrollY, topY);
      break;
    case 'pickAmount':
      drawAmountPicker(ctx, state, w, contentH, scrollY, topY);
      break;
    case 'weekSummary':
      drawWeekSummary(ctx, state, w, scrollY, topY);
      break;
    case 'shop':
      drawShopScreen(ctx, state, w, scrollY, topY);
      break;
    case 'boss':
      drawBossScreen(ctx, state, w, contentH, scrollY, topY);
      break;
    case 'result':
      drawResultScreen(ctx, state, w, contentH, scrollY, topY);
      break;
    case 'meta':
      drawMetaScreen(ctx, state, w, scrollY, topY);
      break;
  }

  ctx.restore();

  // Particles
  drawParticles(ctx, state.particles);

  // Toast
  if (state.toast) {
    ctx.globalAlpha = Math.min(1, state.toastTimer / 200);
    roundRect(ctx, w / 2 - 140, topY + 10, 280, 36, 18);
    ctx.fillStyle = 'rgba(233,69,96,0.92)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.toast, w / 2, topY + 28);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Setup Screen (Strategy Selection) ───────────────────────

function drawSetupScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number) {
  const pad = 16;
  const cardW = w - pad * 2;
  let y = 20;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MARKET ROGUE', w / 2, y + 10);
  y += 40;

  ctx.fillStyle = TEXT2;
  ctx.font = '14px -apple-system, system-ui, sans-serif';
  ctx.fillText('Choose your strategy', w / 2, y);
  y += 30;

  // Available strategies
  const available = getAvailableStrategies(state.meta);
  for (const strat of available) {
    const cardH = 90;
    roundRect(ctx, pad, y, cardW, cardH, 12);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = CARD_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
    ctx.fillText(strat.name, pad + 16, y + 28);

    ctx.fillStyle = TEXT2;
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.fillText(strat.description, pad + 16, y + 50);

    ctx.fillStyle = TEXT3;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillText(strat.startingCards.length + ' cards', pad + 16, y + 70);

    drawBtn(ctx, pad + cardW - 80, y + cardH / 2 - 18, 65, 36, 'START', 'rgba(74,222,128,0.2)', true);
    hitZones.push({ x: pad, y: y + topY - scrollY, w: cardW, h: cardH, action: 'selectStrategy', data: strat.id });

    y += cardH + 10;
  }

  // Locked strategies
  const locked = getLockedStrategies(state.meta);
  for (const strat of locked) {
    const cardH = 70;
    roundRect(ctx, pad, y, cardW, cardH, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fill();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT3;
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillText(strat.name, pad + 16, y + 28);
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillText(`Unlock: ${strat.unlockCost} RP`, pad + 16, y + 48);

    if (state.meta.reputation >= strat.unlockCost) {
      drawBtn(ctx, pad + cardW - 85, y + cardH / 2 - 15, 70, 30, 'UNLOCK', 'rgba(250,204,21,0.2)', true);
      hitZones.push({ x: pad + cardW - 85, y: y + cardH / 2 - 15 + topY - scrollY, w: 70, h: 30, action: 'unlockStrategy', data: strat.id });
    }

    y += cardH + 10;
  }

  // Reputation display
  y += 10;
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Reputation: ${state.meta.reputation} RP`, w / 2, y);
  y += 25;

  // Meta unlocks button
  drawBtn(ctx, w / 2 - 60, y, 120, 36, 'UPGRADES', 'rgba(59,130,246,0.15)', true);
  hitZones.push({ x: w / 2 - 60, y: y + topY - scrollY, w: 120, h: 36, action: 'goMeta' });
}

// ── Trading Screen ──────────────────────────────────────────

function drawTradingScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, contentH: number, scrollY: number, topY: number) {
  const pad = 12;
  const cardW = w - pad * 2;
  let y = 6;

  // Event log
  if (state.eventLog.length > 0) {
    const evtH = 28;
    roundRect(ctx, pad, y, cardW, evtH, 8);
    ctx.fillStyle = 'rgba(250,204,21,0.08)';
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.eventLog[state.eventLog.length - 1], w / 2, y + evtH / 2 + 4);
    y += evtH + 6;
  }

  // Insider tip banner
  if (state.insiderTipStock) {
    const stock = state.stocks.find(s => s.id === state.insiderTipStock);
    if (stock) {
      const tipH = 24;
      roundRect(ctx, pad, y, cardW, tipH, 6);
      ctx.fillStyle = 'rgba(168,85,247,0.1)';
      ctx.fill();
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`TIP: ${stock.ticker} likely going ${state.insiderTipDirection > 0 ? 'UP' : 'DOWN'} tomorrow`, w / 2, y + tipH / 2 + 4);
      y += tipH + 6;
    }
  }

  // Stock list
  for (let i = 0; i < state.stocks.length; i++) {
    const stock = state.stocks[i];
    if (stock.dead) continue;
    const rowH = 52;
    const isSelected = state.selectedStock === i;

    roundRect(ctx, pad, y, cardW, rowH, 10);
    ctx.fillStyle = isSelected ? 'rgba(233,69,96,0.12)' : CARD_BG;
    ctx.fill();
    ctx.strokeStyle = isSelected ? ACCENT : CARD_BORDER;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    if (stock.frozen) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('FROZEN', pad + cardW - 12, y + 14);
    }

    // Ticker
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 15px -apple-system, system-ui, sans-serif';
    ctx.fillText(stock.ticker, pad + 12, y + 22);

    // Sector + trait
    ctx.fillStyle = TEXT3;
    ctx.font = '10px -apple-system, system-ui, sans-serif';
    let label = stock.sector.toUpperCase();
    if (stock.trait) label += ' · ' + stock.trait;
    ctx.fillText(label, pad + 12, y + 38);

    // Price
    ctx.textAlign = 'right';
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillText(formatPrice(stock.price), pad + cardW - 80, y + 22);

    // Change
    const prevPrice = stock.priceHistory.length > 1 ? stock.priceHistory[stock.priceHistory.length - 2] : stock.price;
    const change = ((stock.price - prevPrice) / prevPrice) * 100;
    ctx.fillStyle = change >= 0 ? GREEN : RED;
    ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
    ctx.fillText(formatPercent(change), pad + cardW - 80, y + 40);

    // Sparkline
    drawSparkline(ctx, pad + cardW - 70, y + 8, 58, 35, stock.priceHistory.slice(-20), change >= 0 ? GREEN : RED);

    // Hit zone for stock selection (only when a card needs a target)
    if (state.selectedCard !== null) {
      hitZones.push({ x: pad, y: y + topY - scrollY, w: cardW, h: rowH, action: 'selectStock', data: i.toString() });
    }

    y += rowH + 4;
  }

  // Portfolio holdings
  if (state.portfolio.length > 0) {
    y += 6;
    ctx.fillStyle = TEXT3;
    ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HOLDINGS', pad + 4, y + 4);
    y += 14;

    for (const h of state.portfolio) {
      const stock = state.stocks.find(s => s.id === h.stockId);
      if (!stock) continue;
      const value = h.units * stock.price;
      const pnl = value - h.units * h.avgPrice;
      const pnlPct = ((stock.price - h.avgPrice) / h.avgPrice) * 100;

      ctx.fillStyle = TEXT2;
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${stock.ticker} ×${h.units}`, pad + 8, y + 4);

      ctx.textAlign = 'right';
      ctx.fillStyle = pnl >= 0 ? GREEN : RED;
      ctx.fillText(`${formatCash(value)} (${formatPercent(pnlPct)})`, pad + cardW - 8, y + 4);
      y += 18;
    }
  }

  // Shorts
  if (state.shorts.length > 0) {
    y += 6;
    ctx.fillStyle = TEXT3;
    ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SHORTS', pad + 4, y + 4);
    y += 14;

    for (const s of state.shorts) {
      const stock = state.stocks.find(st => st.id === s.stockId);
      if (!stock) continue;
      const pnl = (s.entryPrice - stock.price) * s.units;

      ctx.fillStyle = TEXT2;
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${stock.ticker} ×${s.units} (${s.daysLeft}d)`, pad + 8, y + 4);

      ctx.textAlign = 'right';
      ctx.fillStyle = pnl >= 0 ? GREEN : RED;
      ctx.fillText(formatCash(pnl), pad + cardW - 8, y + 4);
      y += 18;
    }
  }

  y += 10;

  // Hand of cards (fixed at bottom of content area, not scrolled)
  const handY = contentH - 110 + scrollY; // relative to translated context
  const handH = 105;
  roundRect(ctx, 0, handY, w, handH + 10, 0);
  ctx.fillStyle = 'rgba(10,14,26,0.95)';
  ctx.fill();

  // Cards played counter
  ctx.fillStyle = TEXT3;
  ctx.font = '11px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Cards: ${state.cardsPlayedToday}/${state.maxCardsPerDay}`, pad, handY + 12);

  // End Day button
  const endDayW = 80;
  drawBtn(ctx, w - pad - endDayW, handY + 2, endDayW, 24, 'END DAY', 'rgba(233,69,96,0.2)', state.cardsPlayedToday > 0 || state.hand.length === 0);
  hitZones.push({ x: w - pad - endDayW, y: handY + 2 + topY - scrollY, w: endDayW, h: 24, action: 'endDay' });

  // Draw cards in hand
  const cardHandW = 72;
  const cardHandH = 72;
  const totalHandW = state.hand.length * (cardHandW + 6);
  const startX = Math.max(pad, (w - totalHandW) / 2);

  for (let i = 0; i < state.hand.length; i++) {
    const card = state.hand[i];
    const def = getCardDef(card.defId);
    const cx = startX + i * (cardHandW + 6);
    const cy = handY + 30;
    const isSelected = state.selectedCard === i;

    roundRect(ctx, cx, cy - (isSelected ? 8 : 0), cardHandW, cardHandH, 8);
    ctx.fillStyle = isSelected ? 'rgba(233,69,96,0.25)' : RARITY_BG[def.rarity];
    ctx.fill();
    ctx.strokeStyle = isSelected ? ACCENT : RARITY_COLORS[def.rarity];
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Card name
    ctx.fillStyle = RARITY_COLORS[def.rarity];
    ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.name, cx + cardHandW / 2, cy + 18 - (isSelected ? 8 : 0));

    // Card cost
    if (def.cost > 0) {
      ctx.fillStyle = RED;
      ctx.font = '9px -apple-system, system-ui, sans-serif';
      ctx.fillText('-' + formatCash(def.cost), cx + cardHandW / 2, cy + 32 - (isSelected ? 8 : 0));
    }

    // Upgraded indicator
    if (card.upgraded) {
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 9px -apple-system, system-ui, sans-serif';
      ctx.fillText('★', cx + cardHandW - 10, cy + 12 - (isSelected ? 8 : 0));
    }

    // Short description
    ctx.fillStyle = TEXT3;
    ctx.font = '8px -apple-system, system-ui, sans-serif';
    const shortDesc = def.description.length > 20 ? def.description.slice(0, 18) + '…' : def.description;
    ctx.fillText(shortDesc, cx + cardHandW / 2, cy + 48 - (isSelected ? 8 : 0));

    hitZones.push({ x: cx, y: cy + topY - scrollY - (isSelected ? 8 : 0), w: cardHandW, h: cardHandH, action: 'selectCard', data: i.toString() });
  }
}

// ── Amount Picker ───────────────────────────────────────────

function drawAmountPicker(ctx: CanvasRenderingContext2D, state: GameState, w: number, contentH: number, scrollY: number, topY: number) {
  const cx = w / 2;
  let y = contentH / 2 - 100 + scrollY;

  ctx.fillStyle = TEXT2;
  ctx.font = '14px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Choose amount', cx, y);
  y += 30;

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
  ctx.fillText(formatCash(state.pickAmountValue), cx, y);
  y += 15;

  ctx.fillStyle = TEXT3;
  ctx.font = '12px -apple-system, system-ui, sans-serif';
  ctx.fillText(`Max: ${formatCash(state.pickAmountMax)}`, cx, y);
  y += 30;

  // Preset buttons
  const presets = [
    { label: '10%', frac: 0.1 },
    { label: '25%', frac: 0.25 },
    { label: '50%', frac: 0.5 },
    { label: 'ALL', frac: 1.0 },
  ];
  const btnW = 65;
  const btnH = 36;
  const totalW = presets.length * (btnW + 8);
  const startX = (w - totalW) / 2;

  for (let i = 0; i < presets.length; i++) {
    const bx = startX + i * (btnW + 8);
    drawBtn(ctx, bx, y, btnW, btnH, presets[i].label, 'rgba(255,255,255,0.08)', true);
    hitZones.push({ x: bx, y: y + topY - scrollY, w: btnW, h: btnH, action: 'pickAmountPreset', data: presets[i].frac.toString() });
  }
  y += btnH + 24;

  // Confirm + Cancel
  drawBtn(ctx, cx - 70, y, 60, 40, 'OK', 'rgba(74,222,128,0.2)', state.pickAmountValue > 0);
  hitZones.push({ x: cx - 70, y: y + topY - scrollY, w: 60, h: 40, action: 'confirmAmount' });

  drawBtn(ctx, cx + 10, y, 60, 40, 'Cancel', 'rgba(248,113,113,0.15)', true);
  hitZones.push({ x: cx + 10, y: y + topY - scrollY, w: 60, h: 40, action: 'cancelAmount' });
}

// ── Week Summary ────────────────────────────────────────────

function drawWeekSummary(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number) {
  const cx = w / 2;
  let y = 40;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Week ${state.week - 1} Complete`, cx, y);
  y += 40;

  const nw = getNetWorth(state);
  const pnl = nw - state.weekStartNW;
  const pnlPct = state.weekStartNW > 0 ? (pnl / state.weekStartNW) * 100 : 0;

  ctx.fillStyle = TEXT2;
  ctx.font = '14px -apple-system, system-ui, sans-serif';
  ctx.fillText('Net Worth', cx, y);
  y += 24;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
  ctx.fillText(formatCash(nw), cx, y);
  y += 28;

  ctx.fillStyle = pnl >= 0 ? GREEN : RED;
  ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
  ctx.fillText(`${pnl >= 0 ? '+' : ''}${formatCash(pnl)} (${formatPercent(pnlPct)})`, cx, y);
  y += 50;

  drawBtn(ctx, cx - 75, y, 150, 44, 'CARD SHOP →', 'rgba(59,130,246,0.2)', true);
  hitZones.push({ x: cx - 75, y: y + topY - scrollY, w: 150, h: 44, action: 'goShop' });
}

// ── Shop Screen ─────────────────────────────────────────────

function drawShopScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number) {
  const pad = 14;
  const cardW = w - pad * 2;
  let y = 10;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CARD SHOP', w / 2, y + 10);
  y += 30;

  ctx.fillStyle = TEXT2;
  ctx.font = '13px -apple-system, system-ui, sans-serif';
  ctx.fillText(`Cash: ${formatCash(state.cash)}`, w / 2, y);
  y += 24;

  // Shop offerings
  if (shopData) {
    for (let i = 0; i < shopData.offerings.length; i++) {
      const def = shopData.offerings[i];
      const cardH = 70;
      const canBuy = state.cash >= def.shopPrice;

      roundRect(ctx, pad, y, cardW, cardH, 10);
      ctx.fillStyle = RARITY_BG[def.rarity];
      ctx.fill();
      ctx.strokeStyle = RARITY_COLORS[def.rarity];
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = RARITY_COLORS[def.rarity];
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.fillText(def.name, pad + 14, y + 24);

      ctx.fillStyle = TEXT2;
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillText(def.description, pad + 14, y + 44);

      drawBtn(ctx, pad + cardW - 80, y + cardH / 2 - 15, 65, 30, formatCash(def.shopPrice), canBuy ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.03)', canBuy);
      hitZones.push({ x: pad + cardW - 80, y: y + cardH / 2 - 15 + topY - scrollY, w: 65, h: 30, action: 'buyShopCard', data: i.toString() });

      y += cardH + 8;
    }
  }

  // Remove card option
  y += 10;
  drawBtn(ctx, pad, y, cardW, 36, `Remove a card (${formatCash(shopData?.removeCost || 300)})`, 'rgba(248,113,113,0.1)', state.cash >= (shopData?.removeCost || 300));
  hitZones.push({ x: pad, y: y + topY - scrollY, w: cardW, h: 36, action: 'removeCardMode' });
  y += 44;

  // Continue button
  drawBtn(ctx, w / 2 - 75, y, 150, 44, `WEEK ${state.week} →`, 'rgba(74,222,128,0.2)', true);
  hitZones.push({ x: w / 2 - 75, y: y + topY - scrollY, w: 150, h: 44, action: 'continueWeek' });
}

// ── Boss Screen ─────────────────────────────────────────────

function drawBossScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, contentH: number, scrollY: number, topY: number) {
  const cx = w / 2;
  const cy = contentH / 2 + scrollY;

  ctx.fillStyle = RED;
  ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.week === 2 ? 'THE CORRECTION' : 'MARKET MELTDOWN', cx, cy - 40);

  ctx.fillStyle = TEXT2;
  ctx.font = '14px -apple-system, system-ui, sans-serif';
  ctx.fillText(state.week === 2 ? 'Market drops 20% over 2 days' : 'Cascading crash: -10%/day for 3 days', cx, cy);
  ctx.fillText('Survive without going bankrupt!', cx, cy + 22);

  drawBtn(ctx, cx - 60, cy + 50, 120, 40, 'BRACE', 'rgba(233,69,96,0.2)', true);
  hitZones.push({ x: cx - 60, y: cy + 50 + topY - scrollY, w: 120, h: 40, action: 'startBoss' });
}

// ── Result Screen ───────────────────────────────────────────

function drawResultScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, contentH: number, scrollY: number, topY: number) {
  const cx = w / 2;
  let y = 40 + scrollY;

  const won = state.finalNetWorth >= 25000;

  ctx.fillStyle = won ? GREEN : RED;
  ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? 'PROFIT!' : 'BANKRUPT', cx, y);
  y += 40;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
  ctx.fillText(formatCash(state.finalNetWorth), cx, y);
  y += 20;

  ctx.fillStyle = TEXT2;
  ctx.font = '14px -apple-system, system-ui, sans-serif';
  ctx.fillText(`Day ${Math.min(state.day, 20)} / Week ${Math.min(state.week, 4)}`, cx, y);
  y += 40;

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
  ctx.fillText(`+${state.rpEarned} RP`, cx, y);
  y += 14;
  ctx.fillStyle = TEXT3;
  ctx.font = '12px -apple-system, system-ui, sans-serif';
  ctx.fillText(`Total: ${state.meta.reputation} RP`, cx, y);
  y += 40;

  drawBtn(ctx, cx - 70, y, 140, 44, 'PLAY AGAIN', 'rgba(74,222,128,0.2)', true);
  hitZones.push({ x: cx - 70, y: y + topY - scrollY, w: 140, h: 44, action: 'playAgain' });
}

// ── Meta/Upgrades Screen ────────────────────────────────────

function drawMetaScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number) {
  const pad = 14;
  const cardW = w - pad * 2;
  let y = 10;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('UPGRADES', w / 2, y + 10);
  y += 30;

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
  ctx.fillText(`${state.meta.reputation} RP`, w / 2, y);
  y += 30;

  for (const unlock of META_UNLOCKS) {
    const owned = state.meta.unlocks.includes(unlock.id);
    const canBuy = state.meta.reputation >= unlock.cost && !owned;
    const cardH = 60;

    roundRect(ctx, pad, y, cardW, cardH, 10);
    ctx.fillStyle = owned ? 'rgba(74,222,128,0.06)' : CARD_BG;
    ctx.fill();
    ctx.strokeStyle = owned ? GREEN : CARD_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = owned ? GREEN : TEXT;
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.fillText(unlock.name + (owned ? ' ✓' : ''), pad + 14, y + 24);

    ctx.fillStyle = TEXT2;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillText(unlock.description, pad + 14, y + 44);

    if (!owned) {
      drawBtn(ctx, pad + cardW - 75, y + cardH / 2 - 14, 60, 28, `${unlock.cost} RP`, canBuy ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.03)', canBuy);
      hitZones.push({ x: pad + cardW - 75, y: y + cardH / 2 - 14 + topY - scrollY, w: 60, h: 28, action: 'buyMetaUnlock', data: unlock.id });
    }

    y += cardH + 8;
  }

  y += 20;
  drawBtn(ctx, w / 2 - 50, y, 100, 36, '← BACK', 'rgba(255,255,255,0.08)', true);
  hitZones.push({ x: w / 2 - 50, y: y + topY - scrollY, w: 100, h: 36, action: 'backFromMeta' });
}

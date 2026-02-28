import { GameState, BUSINESSES, ASSETS, INSIDER_UPGRADES, TabId, businessCost, businessEarning, getBusinessDef, getAssetDef } from './types';
import { formatCash, formatPercent, formatPrice, formatNumber } from './format';
import { getBusinessCashPerSecond, getBusinessEarnMul, getTapValue, getAvailableBusinesses } from './economy';
import { getAvailableAssets, getAssetPrice, getHolding, getNetWorth, getPortfolioValue } from './market';
import { canLiquidate, projectedIK, canAscend, projectedLP } from './prestige';
import { GAMBLE_GAMES, getAvailableGames, ROULETTE_SEGMENTS, ROULETTE_COLORS, cardRankName, cardSuitSymbol, cardColor } from './gambling';
import { drawSparkline, drawPriceChart } from './charts';
import { drawParticles } from './particles';

const BG = '#0a0e1a';
const CARD_BG = 'rgba(30,40,65,0.6)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#8899bb';
const TEXT_DIM = '#546080';
const ACCENT = '#e94560';
const GREEN = '#4ade80';
const RED = '#f87171';
const GOLD = '#facc15';

// ── Hit Zones (for tap detection) ───────────────────────────

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

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, highlight = false) {
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = CARD_BG;
  ctx.fill();
  ctx.strokeStyle = highlight ? ACCENT : CARD_BORDER;
  ctx.lineWidth = highlight ? 2 : 1;
  ctx.stroke();
}

function drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, color: string, enabled = true) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = enabled ? color : 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.fillStyle = enabled ? '#fff' : TEXT_DIM;
  ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

// ── Main Render ─────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  scrollY: number,
  hudHeight?: number,
  tabBarHeight?: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Content area (between HUD and tab bar)
  const topY = (hudHeight || 70) + 4;
  const bottomY = h - (tabBarHeight || 60);
  const contentH = bottomY - topY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, topY, w, contentH);
  ctx.clip();
  ctx.translate(0, topY - scrollY);

  hitZones = [];

  switch (state.activeTab) {
    case 'business': drawBusinessTab(ctx, state, w, scrollY, topY); break;
    case 'portfolio': drawPortfolioTab(ctx, state, w, scrollY, topY); break;
    case 'casino': drawCasinoTab(ctx, state, w, contentH, scrollY, topY); break;
    case 'more': drawMoreTab(ctx, state, w, scrollY, topY); break;
  }

  ctx.restore();

  // Particles (full screen)
  drawParticles(ctx, state.particles);

  ctx.restore();
}

// ── Business Tab ────────────────────────────────────────────

function drawBusinessTab(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number): void {
  const pad = 12;
  const cardW = w - pad * 2;
  let y = 10;

  // Tap button
  const tapBtnY = y;
  const tapBtnH = 70;
  drawCard(ctx, pad, y, cardW, tapBtnH, true);
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAP to earn ' + formatCash(getTapValue(state)), pad + cardW / 2, y + tapBtnH / 2);
  hitZones.push({ x: pad, y: tapBtnY + topY - scrollY, w: cardW, h: tapBtnH, action: 'tap' });
  y += tapBtnH + 10;

  // Liquidation banner
  if (canLiquidate(state)) {
    const liqH = 50;
    roundRect(ctx, pad, y, cardW, liqH, 12);
    ctx.fillStyle = 'rgba(250,204,21,0.12)';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LIQUIDATE for +${projectedIK(state)} IK`, pad + cardW / 2, y + liqH / 2);
    hitZones.push({ x: pad, y: y + topY - scrollY, w: cardW, h: liqH, action: 'liquidate' });
    y += liqH + 10;
  }

  // Business list
  const available = getAvailableBusinesses(state);
  for (const def of available) {
    const biz = state.businesses.find(b => b.id === def.id)!;
    const cardH = 80;

    drawCard(ctx, pad, y, cardW, cardH);

    // Icon circle
    const iconX = pad + 16;
    const iconY = y + cardH / 2;
    ctx.beginPath();
    ctx.arc(iconX + 16, iconY, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, iconX + 16, iconY);

    // Name and level
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.fillText(def.name + (biz.level > 0 ? ` Lv.${biz.level}` : ''), iconX + 42, y + 20);

    // Earnings
    if (biz.level > 0) {
      const cps = getBusinessCashPerSecond(biz, state);
      ctx.fillStyle = GREEN;
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.fillText(formatCash(cps) + '/s', iconX + 42, y + 38);

      // Progress bar
      if (!biz.managerHired) {
        const barX = iconX + 42;
        const barY = y + 48;
        const barW = 120;
        const barH = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        roundRect(ctx, barX, barY, barW, barH, 3);
        ctx.fill();
        ctx.fillStyle = ACCENT;
        roundRect(ctx, barX, barY, barW * Math.min(1, biz.progress), barH, 3);
        ctx.fill();

        if (biz.progress >= 1) {
          hitZones.push({ x: pad, y: y + topY - scrollY, w: cardW, h: cardH, action: 'collect', data: def.id });
        }
      } else {
        ctx.fillStyle = TEXT_DIM;
        ctx.font = '10px -apple-system, system-ui, sans-serif';
        ctx.fillText('Manager hired', iconX + 42, y + 52);
      }
    }

    // Buy button
    const cost = businessCost(def, biz.level);
    const canAfford = state.cash >= cost;
    const btnW = 80;
    const btnH = 30;
    const btnX = pad + cardW - btnW - 10;
    const btnY = y + 10;
    drawButton(ctx, btnX, btnY, btnW, btnH, formatCash(cost), canAfford ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.03)', canAfford);
    hitZones.push({ x: btnX, y: btnY + topY - scrollY, w: btnW, h: btnH, action: 'buyBiz', data: def.id });

    // Manager button (if owned and no manager)
    if (biz.level > 0 && !biz.managerHired) {
      const mBtnY = y + 45;
      const canAffordM = state.cash >= def.managerCost;
      drawButton(ctx, btnX, mBtnY, btnW, 24, 'Mgr ' + formatCash(def.managerCost), canAffordM ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.03)', canAffordM);
      hitZones.push({ x: btnX, y: mBtnY + topY - scrollY, w: btnW, h: 24, action: 'buyMgr', data: def.id });
    }

    y += cardH + 8;
  }
}

// ── Portfolio Tab ───────────────────────────────────────────

function drawPortfolioTab(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number): void {
  const pad = 12;
  const cardW = w - pad * 2;
  let y = 10;

  // Portfolio summary
  const summH = 60;
  drawCard(ctx, pad, y, cardW, summH);
  ctx.fillStyle = TEXT_DIM;
  ctx.font = '10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PORTFOLIO VALUE', pad + 16, y + 18);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
  ctx.fillText(formatCash(getPortfolioValue(state)), pad + 16, y + 42);

  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_DIM;
  ctx.font = '10px -apple-system, system-ui, sans-serif';
  ctx.fillText('NET WORTH', pad + cardW - 16, y + 18);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
  ctx.fillText(formatCash(getNetWorth(state)), pad + cardW - 16, y + 42);
  y += summH + 10;

  // News ticker
  if (state.market.events.length > 0) {
    const evt = state.market.events[state.market.events.length - 1];
    const newsH = 30;
    roundRect(ctx, pad, y, cardW, newsH, 8);
    ctx.fillStyle = evt.multiplier > 1 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)';
    ctx.fill();
    ctx.fillStyle = evt.multiplier > 1 ? GREEN : RED;
    ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(evt.headline, pad + cardW / 2, y + newsH / 2 + 4);
    y += newsH + 10;
  }

  // Asset list
  const available = getAvailableAssets(state);
  for (const def of available) {
    const ps = state.market.prices[def.id];
    if (!ps) continue;
    const holding = getHolding(state, def.id);
    const price = ps.currentPrice;
    const history = ps.priceHistory;
    const change = history.length > 1 ? ((price - history[0]) / history[0]) * 100 : 0;
    const isUp = change >= 0;

    const cardH = 100;
    drawCard(ctx, pad, y, cardW, cardH);

    // Ticker + Name
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.fillText(def.ticker, pad + 14, y + 20);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillText(def.name, pad + 14, y + 36);

    // Class badge
    const classColors: Record<string, string> = { bond: '#546080', stock: '#3b82f6', commodity: '#f59e0b', crypto: '#a855f7' };
    ctx.fillStyle = classColors[def.class] || TEXT_DIM;
    ctx.font = 'bold 9px -apple-system, system-ui, sans-serif';
    ctx.fillText(def.class.toUpperCase(), pad + 14, y + 50);

    // Price + Change
    ctx.textAlign = 'right';
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillText(formatPrice(price), pad + cardW - 14, y + 22);
    ctx.fillStyle = isUp ? GREEN : RED;
    ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
    ctx.fillText(formatPercent(change), pad + cardW - 14, y + 38);

    // Sparkline
    const sparkX = pad + cardW / 2;
    const sparkW = cardW / 3;
    drawSparkline(ctx, sparkX, y + 8, sparkW, 35, history.slice(-60), isUp ? GREEN : RED);

    // Holdings
    if (holding && holding.units > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = TEXT_DIM;
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.fillText(`Holding: ${formatNumber(holding.units)} units`, pad + 14, y + 66);
      const value = holding.units * price;
      const pnl = value - holding.units * holding.avgBuyPrice;
      ctx.fillStyle = pnl >= 0 ? GREEN : RED;
      ctx.fillText(`Value: ${formatCash(value)} (${formatPercent((pnl / (holding.units * holding.avgBuyPrice)) * 100)})`, pad + 14, y + 80);
    }

    // Buy/Sell buttons
    const btnW = 55;
    const btnH = 26;
    const btnY2 = y + cardH - btnH - 10;

    const buyUnits = def.class === 'bond' ? 1 : Math.max(1, Math.floor(state.cash * 0.1 / price));
    const canBuy = state.cash >= price;
    drawButton(ctx, pad + cardW - btnW * 2 - 20, btnY2, btnW, btnH, 'Buy', canBuy ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.03)', canBuy);
    hitZones.push({ x: pad + cardW - btnW * 2 - 20, y: btnY2 + topY - scrollY, w: btnW, h: btnH, action: 'buyAsset', data: def.id });

    if (holding && holding.units > 0) {
      drawButton(ctx, pad + cardW - btnW - 10, btnY2, btnW, btnH, 'Sell', 'rgba(248,113,113,0.2)', true);
      hitZones.push({ x: pad + cardW - btnW - 10, y: btnY2 + topY - scrollY, w: btnW, h: btnH, action: 'sellAsset', data: def.id });
    }

    y += cardH + 8;
  }
}

// ── Casino Tab ──────────────────────────────────────────────

function drawCasinoTab(ctx: CanvasRenderingContext2D, state: GameState, w: number, contentH: number, scrollY: number, topY: number): void {
  const pad = 12;
  const cardW = w - pad * 2;
  let y = 10;

  // If a gamble is active, draw it
  if (state.activeGamble) {
    drawActiveGamble(ctx, state, w, contentH);
    return;
  }

  // Luck tokens
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Luck Tokens: ' + state.luckTokens, pad + cardW, y + 14);
  y += 24;

  // Game cards
  const available = getAvailableGames(state);
  const locked = GAMBLE_GAMES.filter(g => g.unlockLiquidation > state.liquidationCount);

  for (const game of available) {
    const cardH = 80;
    drawCard(ctx, pad, y, cardW, cardH);

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillText(game.name, pad + 16, y + 26);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillText(game.description, pad + 16, y + 46);

    if (game.minBet > 0) {
      ctx.fillStyle = TEXT_DIM;
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.fillText('Min bet: ' + formatCash(game.minBet), pad + 16, y + 62);
    }

    // Play button
    const btnW = 65;
    const btnH = 30;
    const canPlay = game.id === 'vault' ? state.luckTokens >= 1 : state.cash >= game.minBet;
    drawButton(ctx, pad + cardW - btnW - 10, y + cardH / 2 - btnH / 2, btnW, btnH, 'Play', canPlay ? 'rgba(233,69,96,0.3)' : 'rgba(255,255,255,0.03)', canPlay);
    hitZones.push({ x: pad + cardW - btnW - 10, y: y + cardH / 2 - btnH / 2 + topY - scrollY, w: btnW, h: btnH, action: 'startGamble', data: game.id });

    y += cardH + 8;
  }

  // Locked games
  for (const game of locked) {
    const cardH = 60;
    roundRect(ctx, pad, y, cardW, cardH, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fill();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_DIM;
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillText(game.name, pad + 16, y + 24);
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillText(`Unlocks at Liquidation ${game.unlockLiquidation}`, pad + 16, y + 42);

    y += cardH + 8;
  }
}

function drawActiveGamble(ctx: CanvasRenderingContext2D, state: GameState, w: number, contentH: number): void {
  const g = state.activeGamble!;
  const cx = w / 2;
  const cy = contentH / 2;

  if (g.gameId === 'quickflip') {
    // Coin flip animation
    const progress = Math.min(1, g.animProgress / 40);
    const flipAngle = progress * Math.PI * 8;
    const scaleY = Math.abs(Math.cos(flipAngle));
    const coinR = 50;

    ctx.save();
    ctx.translate(cx, cy - 20);
    ctx.scale(1, scaleY || 0.01);
    ctx.beginPath();
    ctx.arc(0, 0, coinR, 0, Math.PI * 2);
    ctx.fillStyle = g.phase === 'result' ? (g.result > 0 ? GOLD : '#666') : GOLD;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (scaleY > 0.3) {
      ctx.fillStyle = '#0a0e1a';
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    }
    ctx.restore();

    if (g.phase === 'result') {
      ctx.fillStyle = g.result > 0 ? GREEN : RED;
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.result > 0 ? `WIN! +${formatCash(g.betAmount * g.result)}` : 'LOSS!', cx, cy + 60);
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText('Tap to continue', cx, cy + 90);
      hitZones.push({ x: 0, y: 0, w, h: contentH + 100, action: 'resolveGamble' });
    }
  } else if (g.gameId === 'roulette') {
    // Wheel
    const angle = g.data.wheelAngle as number;
    const segments = ROULETTE_SEGMENTS;
    const sliceAngle = (Math.PI * 2) / segments.length;

    ctx.save();
    ctx.translate(cx, cy - 10);
    ctx.rotate(-angle);
    for (let i = 0; i < segments.length; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 90, i * sliceAngle, (i + 1) * sliceAngle);
      ctx.closePath();
      ctx.fillStyle = ROULETTE_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(i * sliceAngle + sliceAngle / 2);
      ctx.translate(55, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(segments[i] + 'x', 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx, cy - 110);
    ctx.lineTo(cx - 8, cy - 125);
    ctx.lineTo(cx + 8, cy - 125);
    ctx.closePath();
    ctx.fillStyle = ACCENT;
    ctx.fill();

    if (g.phase === 'result') {
      const idx = g.data.wheelResult as number;
      ctx.fillStyle = segments[idx] > 0 ? GREEN : RED;
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(segments[idx] > 0 ? `${segments[idx]}x! +${formatCash(g.betAmount * segments[idx])}` : 'BUST!', cx, cy + 110);
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText('Tap to continue', cx, cy + 140);
      hitZones.push({ x: 0, y: 0, w, h: contentH + 100, action: 'resolveGamble' });
    }
  } else if (g.gameId === 'options') {
    // Candlestick-like chart
    const prices = g.data.prices as number[];
    drawPriceChart(ctx, 20, 20, w - 40, contentH * 0.5, prices, prices.length > 1 && prices[prices.length - 1] >= prices[0] ? GREEN : RED);

    const elapsed = g.data.elapsed as number;
    const duration = g.data.duration as number;
    const timeLeft = Math.max(0, (duration - elapsed) / 1000);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const isCall = g.data.isCall as boolean;
    ctx.fillText(`${isCall ? 'CALL' : 'PUT'} @ $${(g.data.strikePrice as number).toFixed(0)}`, cx, contentH * 0.6);

    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillText(g.phase === 'result' ? '' : `${timeLeft.toFixed(1)}s remaining`, cx, contentH * 0.6 + 24);

    if (g.phase === 'result') {
      ctx.fillStyle = g.result > 0 ? GREEN : RED;
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.fillText(g.result > 0 ? `WIN! ${g.result.toFixed(1)}x (+${formatCash(g.betAmount * g.result)})` : 'Expired worthless!', cx, contentH * 0.7);
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText('Tap to continue', cx, contentH * 0.7 + 30);
      hitZones.push({ x: 0, y: 0, w, h: contentH + 100, action: 'resolveGamble' });
    }
  } else if (g.gameId === 'cardshark') {
    // Cards
    const cards = g.data.playerCards as number[];
    const community = g.data.communityCard as number;
    const cardW2 = 50;
    const cardH2 = 72;
    const startX = cx - (cards.length * (cardW2 + 8)) / 2;

    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Your Hand', cx, cy - cardH2 / 2 - 20);

    for (let i = 0; i < cards.length; i++) {
      const cx2 = startX + i * (cardW2 + 8);
      roundRect(ctx, cx2, cy - cardH2 / 2, cardW2, cardH2, 6);
      ctx.fillStyle = '#1a2040';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = cardColor(cards[i]);
      ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cardRankName(cards[i]) + cardSuitSymbol(cards[i]), cx2 + cardW2 / 2, cy + 5);
    }

    // Community card
    const ccX = cx + (cards.length * (cardW2 + 8)) / 2 + 10;
    roundRect(ctx, ccX, cy - cardH2 / 2, cardW2, cardH2, 6);
    ctx.fillStyle = 'rgba(250,204,21,0.08)';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = cardColor(community);
    ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cardRankName(community) + cardSuitSymbol(community), ccX + cardW2 / 2, cy + 5);

    if (g.phase === 'result') {
      ctx.fillStyle = g.result > 0 ? GREEN : RED;
      ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.result > 0 ? `${g.result}x! +${formatCash(g.betAmount * g.result)}` : 'No hand', cx, cy + cardH2 / 2 + 40);
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText('Tap to continue', cx, cy + cardH2 / 2 + 65);
      hitZones.push({ x: 0, y: 0, w, h: contentH + 100, action: 'resolveGamble' });
    }
  } else if (g.gameId === 'vault') {
    // Vault door animation
    const progress = Math.min(1, g.animProgress / 60);
    const doorOpenAngle = progress * 0.4;
    const vaultR = 70;

    ctx.save();
    ctx.translate(cx, cy - 20);

    // Vault circle
    ctx.beginPath();
    ctx.arc(0, 0, vaultR, 0, Math.PI * 2);
    ctx.fillStyle = '#2a3050';
    ctx.fill();
    ctx.strokeStyle = '#556';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Door
    ctx.save();
    ctx.scale(1 - doorOpenAngle, 1);
    ctx.beginPath();
    ctx.arc(0, 0, vaultR - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3a4060';
    ctx.fill();
    // Handle
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.stroke();
    ctx.restore();

    // Light beam when open
    if (progress > 0.5) {
      const beamAlpha = (progress - 0.5) * 2;
      ctx.globalAlpha = beamAlpha * 0.3;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-60, -80);
      ctx.lineTo(60, -80);
      ctx.lineTo(10, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (g.phase === 'result') {
      const rarityLabels = ['Common', 'Uncommon', 'Rare', 'LEGENDARY'];
      const rarityColors = [TEXT_DIM, GREEN, '#3b82f6', GOLD];
      const rarityIdx = g.result >= 100 ? 3 : g.result >= 20 ? 2 : g.result >= 5 ? 1 : 0;

      ctx.fillStyle = rarityColors[rarityIdx];
      ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rarityLabels[rarityIdx] + '!', cx, cy + 80);
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText(`+${g.result}% of current cash`, cx, cy + 105);
      ctx.fillText('Tap to continue', cx, cy + 130);
      hitZones.push({ x: 0, y: 0, w, h: contentH + 100, action: 'resolveGamble' });
    }
  }
}

// ── More Tab ────────────────────────────────────────────────

function drawMoreTab(ctx: CanvasRenderingContext2D, state: GameState, w: number, scrollY: number, topY: number): void {
  const pad = 12;
  const cardW = w - pad * 2;
  let y = 10;

  // Stats header
  const statsH = 120;
  drawCard(ctx, pad, y, cardW, statsH);
  ctx.fillStyle = TEXT_DIM;
  ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STATISTICS', pad + 16, y + 18);

  const stats = [
    ['Total Cash Earned', formatCash(state.stats.totalCashEarned)],
    ['Total Taps', formatNumber(state.stats.totalTaps)],
    ['Gambling W/L', `${state.stats.gamblingWins}/${state.stats.gamblingLosses}`],
    ['Liquidations', state.liquidationCount.toString()],
    ['Highest Net Worth', formatCash(state.stats.highestNetWorth)],
  ];
  for (let i = 0; i < stats.length; i++) {
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stats[i][0], pad + 16, y + 36 + i * 16);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.textAlign = 'right';
    ctx.fillText(stats[i][1], pad + cardW - 16, y + 36 + i * 16);
  }
  y += statsH + 10;

  // Insider Shop
  if (state.liquidationCount > 0) {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Insider Shop (IK: ' + state.insiderKnowledge + ')', pad + 16, y + 14);
    y += 28;

    for (const upgrade of INSIDER_UPGRADES) {
      const owned = state.insiderPurchases.includes(upgrade.id);
      const canAfford = state.insiderKnowledge >= upgrade.cost && !owned;
      const cardH = 60;
      drawCard(ctx, pad, y, cardW, cardH, owned);

      ctx.textAlign = 'left';
      ctx.fillStyle = owned ? GREEN : TEXT_PRIMARY;
      ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
      ctx.fillText(upgrade.name + (owned ? ' (Owned)' : ''), pad + 16, y + 22);
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillText(upgrade.description, pad + 16, y + 40);

      if (!owned) {
        const btnW = 70;
        const btnH = 28;
        drawButton(ctx, pad + cardW - btnW - 10, y + cardH / 2 - btnH / 2, btnW, btnH,
          upgrade.cost + ' IK', canAfford ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.03)', canAfford);
        hitZones.push({ x: pad + cardW - btnW - 10, y: y + cardH / 2 - btnH / 2 + topY - scrollY, w: btnW, h: btnH, action: 'buyUpgrade', data: upgrade.id });
      }

      y += cardH + 6;
    }
  }

  // Ascension
  if (canAscend(state)) {
    y += 10;
    const ascH = 60;
    roundRect(ctx, pad, y, cardW, ascH, 12);
    ctx.fillStyle = 'rgba(168,85,247,0.12)';
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ASCEND for +${projectedLP(state)} Legacy Points`, pad + cardW / 2, y + ascH / 2 + 4);
    hitZones.push({ x: pad, y: y + topY - scrollY, w: cardW, h: ascH, action: 'ascend' });
    y += ascH + 10;
  }
}

import {
  BuildingType, BUILDINGS, BUILD_ORDER, GameState, Building, GRID,
  GameSpeed, Achievement, createAchievements, CATEGORY_LABELS, getUpgradeCost,
} from './types';
import {
  createInitialState, gameTick, placeBuilding, upgradeBuilding,
  calculateIncome, updateCitizens, updateSmoke, getBuildingStats,
  countBuildings,
} from './gameLogic';
import { render, getTimeOfDayLabel } from './renderer';
import { createInputState, setupInput } from './input';

// ── Save / Load ─────────────────────────────────────────────

const SAVE_KEY = 'minicity_save_v2';
const TUTORIAL_KEY = 'minicity_tutorial_done';

interface SaveData {
  grid: Building[][];
  money: number;
  population: number;
  happiness: number;
  tick: number;
  speed: GameSpeed;
  dayTime: number;
  totalBuildings: number;
  totalMoneyEarned: number;
  achievementsUnlocked: string[];
}

function saveGame(state: GameState) {
  const data: SaveData = {
    grid: state.grid,
    money: state.money,
    population: state.population,
    happiness: state.happiness,
    tick: state.tick,
    speed: state.speed,
    dayTime: state.dayTime,
    totalBuildings: state.totalBuildings,
    totalMoneyEarned: state.totalMoneyEarned,
    achievementsUnlocked: state.achievementsUnlocked,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (_) { /* storage full or unavailable */ }
}

function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (!data.grid || data.grid.length !== GRID) return null;
    return {
      grid: data.grid,
      money: data.money ?? 1000,
      population: data.population ?? 0,
      happiness: data.happiness ?? 50,
      tick: data.tick ?? 0,
      citizens: [],
      smoke: [],
      speed: data.speed ?? 1,
      events: [],
      dayTime: data.dayTime ?? 0.35,
      totalBuildings: data.totalBuildings ?? 0,
      totalMoneyEarned: data.totalMoneyEarned ?? 0,
      notifications: [],
      achievementsUnlocked: data.achievementsUnlocked ?? [],
    };
  } catch (_) {
    return null;
  }
}

// ── State ───────────────────────────────────────────────────

let state = loadGame() || createInitialState();
let selected: BuildingType = 'residential';
let inspectMode = false;
const input = createInputState();
const achievements: Achievement[] = createAchievements();

// Restore achievement state
for (const a of achievements) {
  if (state.achievementsUnlocked.includes(a.id)) a.unlocked = true;
}

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

const hudMoney = document.getElementById('hud-money')!;
const hudIncome = document.getElementById('hud-income')!;
const hudPop = document.getElementById('hud-pop')!;
const hudHappy = document.getElementById('hud-happy')!;
const hudTime = document.getElementById('hud-time')!;
const toast = document.getElementById('toast')!;

let toastTimer = 0;

function showToast(msg: string, color?: string) {
  toast.textContent = msg;
  toast.style.background = color || 'rgba(233,69,96,0.92)';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateHUD() {
  hudMoney.textContent = '$' + state.money.toLocaleString();
  const income = calculateIncome(state.grid);
  hudIncome.textContent = (income >= 0 ? '+' : '') + income + '/s';
  hudIncome.style.color = income >= 0 ? '#4ade80' : '#f87171';
  hudPop.textContent = state.population.toLocaleString();
  hudHappy.textContent = state.happiness + '%';
  hudHappy.style.color =
    state.happiness >= 70 ? '#4ade80' : state.happiness >= 40 ? '#facc15' : '#f87171';
  hudTime.textContent = getTimeOfDayLabel(state.dayTime);
}

// ── Speed Controls ──────────────────────────────────────────

const speedBtns = document.querySelectorAll('.speed-btn') as NodeListOf<HTMLElement>;

function updateSpeedUI() {
  speedBtns.forEach(btn => {
    const spd = parseInt(btn.dataset.speed || '1');
    btn.classList.toggle('active', spd === state.speed);
  });
}

speedBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const spd = parseInt(btn.dataset.speed || '1') as GameSpeed;
    state = { ...state, speed: spd };
    updateSpeedUI();
    const labels = ['Paused', 'Normal', 'Fast', 'Turbo'];
    showToast('Speed: ' + labels[spd], 'rgba(100,120,180,0.92)');
  });
});

// ── Toolbar ─────────────────────────────────────────────────

const TOOL_ICONS: Record<BuildingType, string> = {
  empty: '\u2715',
  residential: '\u2302',
  commercial: '$',
  industrial: '\u2699',
  park: '\u2663',
  road: '\u2550',
  power: '\u26A1',
  hospital: '+',
  school: '\u{1D5E5}',
  fire_station: '\u{1F6A8}',
  police: '\u2691',
};

function buildToolbar() {
  const toolbar = document.getElementById('toolbar')!;
  toolbar.innerHTML = '';

  // Group by category
  const categories: Record<string, BuildingType[]> = {};
  for (const type of BUILD_ORDER) {
    const cat = BUILDINGS[type].category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(type);
  }

  for (const [cat, types] of Object.entries(categories)) {
    // Category label
    const label = document.createElement('div');
    label.className = 'toolbar-cat';
    label.textContent = CATEGORY_LABELS[cat] || cat;
    toolbar.appendChild(label);

    for (const type of types) {
      const info = BUILDINGS[type];
      const btn = document.createElement('div');
      btn.className = 'tool-btn' + (type === selected && !inspectMode ? ' active' : '');
      if (info.cost > state.money && type !== 'empty') btn.classList.add('disabled');

      btn.innerHTML = `
        <span class="tool-icon">${TOOL_ICONS[type]}</span>
        <span class="tool-name">${info.label}</span>
        ${info.cost > 0 ? `<span class="tool-cost">$${info.cost}</span>` : ''}
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selected = type;
        inspectMode = false;
        buildToolbar();
      });

      toolbar.appendChild(btn);
    }
  }

  // Inspect button
  const inspBtn = document.createElement('div');
  inspBtn.className = 'tool-btn' + (inspectMode ? ' active inspect-active' : '');
  inspBtn.innerHTML = `
    <span class="tool-icon">\u{1F50D}</span>
    <span class="tool-name">Inspect</span>
  `;
  inspBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    inspectMode = !inspectMode;
    buildToolbar();
  });
  toolbar.appendChild(inspBtn);
}

// ── Building Info Panel ─────────────────────────────────────

const infoPanel = document.getElementById('info-panel')!;
const infoPanelClose = document.getElementById('info-close')!;
let infoPanelRow = -1, infoPanelCol = -1;

function showBuildingInfo(r: number, c: number) {
  const cell = state.grid[r][c];
  if (cell.type === 'empty') {
    hideInfoPanel();
    return;
  }

  infoPanelRow = r;
  infoPanelCol = c;
  const info = BUILDINGS[cell.type];
  const stats = getBuildingStats(state, r, c);
  if (!stats) return;

  const upgradeAvailable = cell.level < 3 && info.upgradeCostMult > 0;
  const upgradeCost = getUpgradeCost(cell.type, cell.level);
  const canAffordUpgrade = state.money >= upgradeCost;

  let html = `
    <div class="info-header">
      <span class="info-icon">${TOOL_ICONS[cell.type]}</span>
      <div>
        <div class="info-title">${info.label} <span class="info-level">Lv.${cell.level}</span></div>
        <div class="info-desc">${info.description}</div>
      </div>
    </div>
    <div class="info-stats">
      ${stats.income !== 0 ? `<div class="info-stat"><span>Income</span><span style="color:${stats.income >= 0 ? '#4ade80' : '#f87171'}">${stats.income >= 0 ? '+' : ''}$${stats.income}/s</span></div>` : ''}
      ${stats.population !== 0 ? `<div class="info-stat"><span>Population</span><span style="color:#60a0ff">+${stats.population}</span></div>` : ''}
      ${stats.happiness !== 0 ? `<div class="info-stat"><span>Happiness</span><span style="color:${stats.happiness >= 0 ? '#4ade80' : '#f87171'}">${stats.happiness >= 0 ? '+' : ''}${stats.happiness}</span></div>` : ''}
      ${stats.adjacencyIncome !== 0 ? `<div class="info-stat adj"><span>Adj. Income</span><span style="color:#facc15">+$${stats.adjacencyIncome}/s</span></div>` : ''}
      ${stats.adjacencyHappiness !== 0 ? `<div class="info-stat adj"><span>Adj. Happy</span><span style="color:${stats.adjacencyHappiness >= 0 ? '#facc15' : '#f87171'}">${stats.adjacencyHappiness >= 0 ? '+' : ''}${stats.adjacencyHappiness}</span></div>` : ''}
    </div>
    ${cell.onFire ? '<div class="info-fire">ON FIRE! Waiting for fire to end...</div>' : ''}
    ${upgradeAvailable ? `
      <button class="info-upgrade-btn ${canAffordUpgrade ? '' : 'disabled'}" id="upgrade-btn">
        Upgrade to Lv.${cell.level + 1} - $${upgradeCost.toLocaleString()}
      </button>
    ` : cell.level >= 3 ? '<div class="info-maxlevel">MAX LEVEL</div>' : ''}
  `;

  document.getElementById('info-content')!.innerHTML = html;
  infoPanel.classList.add('show');

  // Bind upgrade button
  const upgradeBtn = document.getElementById('upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const result = upgradeBuilding(state, r, c);
      if (result) {
        state = result;
        showToast('Upgraded to Lv.' + state.grid[r][c].level, 'rgba(74,222,128,0.92)');
        showBuildingInfo(r, c);
        updateHUD();
        buildToolbar();
        saveGame(state);
      } else {
        showToast('Not enough $');
      }
    });
  }
}

function hideInfoPanel() {
  infoPanel.classList.remove('show');
  infoPanelRow = -1;
  infoPanelCol = -1;
}

infoPanelClose.addEventListener('click', (e) => {
  e.stopPropagation();
  hideInfoPanel();
});

// ── Stats Panel ─────────────────────────────────────────────

const statsBtn = document.getElementById('stats-btn')!;
const statsPanel = document.getElementById('stats-panel')!;
const statsClose = document.getElementById('stats-close')!;

function updateStatsPanel() {
  const ct = countBuildings(state.grid);
  const income = calculateIncome(state.grid);

  // Power info
  const totalPowerable = Object.entries(ct).reduce((sum, [k, v]) =>
    k !== 'empty' && k !== 'road' ? sum + v : sum, 0);
  const powerCap = ct.power * 20;

  let html = `
    <div class="stats-section">
      <div class="stats-title">Economy</div>
      <div class="stats-row"><span>Balance</span><span>$${state.money.toLocaleString()}</span></div>
      <div class="stats-row"><span>Income/tick</span><span style="color:${income >= 0 ? '#4ade80' : '#f87171'}">${income >= 0 ? '+' : ''}$${income}</span></div>
      <div class="stats-row"><span>Total Earned</span><span>$${state.totalMoneyEarned.toLocaleString()}</span></div>
    </div>
    <div class="stats-section">
      <div class="stats-title">Population</div>
      <div class="stats-row"><span>Citizens</span><span>${state.population}</span></div>
      <div class="stats-row"><span>Happiness</span><span>${state.happiness}%</span></div>
    </div>
    <div class="stats-section">
      <div class="stats-title">Infrastructure</div>
      <div class="stats-row"><span>Power</span><span>${powerCap} / ${totalPowerable} needed</span></div>
      <div class="stats-row"><span>Buildings</span><span>${state.totalBuildings} / ${GRID * GRID}</span></div>
    </div>
    <div class="stats-section">
      <div class="stats-title">Buildings</div>
      ${Object.entries(ct)
        .filter(([k, v]) => k !== 'empty' && v > 0)
        .map(([k, v]) => `<div class="stats-row"><span>${BUILDINGS[k as BuildingType].label}</span><span>${v}</span></div>`)
        .join('')}
    </div>
    <div class="stats-section">
      <div class="stats-title">Active Events</div>
      ${state.events.length === 0 ? '<div class="stats-row dim">No active events</div>' :
        state.events.map(e => `<div class="stats-row event-row"><span>${e.label}</span><span>${e.duration} ticks left</span></div>`).join('')}
    </div>
  `;
  document.getElementById('stats-content')!.innerHTML = html;
}

statsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  updateStatsPanel();
  statsPanel.classList.toggle('show');
});
statsClose.addEventListener('click', (e) => {
  e.stopPropagation();
  statsPanel.classList.remove('show');
});

// ── Achievements Panel ──────────────────────────────────────

const achBtn = document.getElementById('achievements-btn')!;
const achPanel = document.getElementById('achievements-panel')!;
const achClose = document.getElementById('ach-close')!;

function updateAchievementsPanel() {
  let html = '';
  for (const a of achievements) {
    html += `
      <div class="ach-item ${a.unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${a.unlocked ? a.icon : '?'}</span>
        <div class="ach-info">
          <div class="ach-name">${a.unlocked ? a.label : '???'}</div>
          <div class="ach-desc">${a.description}</div>
        </div>
      </div>
    `;
  }
  document.getElementById('ach-content')!.innerHTML = html;

  const unlocked = achievements.filter(a => a.unlocked).length;
  document.getElementById('ach-count')!.textContent = `${unlocked}/${achievements.length}`;
}

achBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  updateAchievementsPanel();
  achPanel.classList.toggle('show');
});
achClose.addEventListener('click', (e) => {
  e.stopPropagation();
  achPanel.classList.remove('show');
});

function checkAchievements() {
  for (const a of achievements) {
    if (!a.unlocked && a.check(state)) {
      a.unlocked = true;
      if (!state.achievementsUnlocked.includes(a.id)) {
        state = {
          ...state,
          achievementsUnlocked: [...state.achievementsUnlocked, a.id],
        };
      }
      showAchievementToast(a);
    }
  }
}

function showAchievementToast(a: Achievement) {
  const el = document.getElementById('achievement-toast')!;
  el.innerHTML = `<span class="ach-toast-icon">${a.icon}</span> ${a.label}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Notifications ───────────────────────────────────────────

const notifContainer = document.getElementById('notifications')!;

function renderNotifications() {
  const recent = state.notifications.slice(-5);
  notifContainer.innerHTML = '';
  for (const n of recent) {
    const age = Date.now() - n.time;
    if (age > 10000) continue; // Fade after 10s
    const opacity = Math.max(0, 1 - age / 10000);
    const el = document.createElement('div');
    el.className = 'notif-item';
    el.style.opacity = String(opacity);
    el.style.borderLeftColor = n.color;
    el.textContent = n.text;
    notifContainer.appendChild(el);
  }
}

// ── Event Banner ────────────────────────────────────────────

function updateEventBanner() {
  const banner = document.getElementById('event-banner')!;
  if (state.events.length === 0) {
    banner.classList.remove('show');
    return;
  }
  const evt = state.events[0];
  banner.textContent = evt.label + ' (' + evt.duration + ' ticks)';
  banner.className = 'event-banner show event-' + evt.type;
}

// ── Rotation button ─────────────────────────────────────────

const rotateBtn = document.getElementById('rotate-btn')!;
rotateBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  input.rotation = (input.rotation + 1) % 4;
  const dirs = ['N', 'E', 'S', 'W'];
  showToast('View: ' + dirs[input.rotation], 'rgba(100,120,180,0.92)');
});

// ── Tutorial ────────────────────────────────────────────────

const tutorialOverlay = document.getElementById('tutorial')!;
const tutorialDone = localStorage.getItem(TUTORIAL_KEY);
let tutorialStep = 0;
const tutorialSteps = [
  { text: 'Welcome to MiniCity! Build and manage your own isometric city.', target: '' },
  { text: 'Select buildings from the toolbar below. Start with a House to get population.', target: 'toolbar' },
  { text: 'Tap on the grid to place buildings. Watch your money and income!', target: 'game' },
  { text: 'Use the stats panel to track your city, and upgrade buildings by inspecting them.', target: 'stats-btn' },
  { text: 'Build Fire Stations to prevent disasters, Schools for income bonuses, and Hospitals for population growth.', target: '' },
  { text: 'Place buildings strategically - adjacency bonuses reward good planning!', target: '' },
];

function showTutorial() {
  if (tutorialDone) {
    tutorialOverlay.style.display = 'none';
    return;
  }
  renderTutorialStep();
}

function renderTutorialStep() {
  if (tutorialStep >= tutorialSteps.length) {
    tutorialOverlay.style.display = 'none';
    localStorage.setItem(TUTORIAL_KEY, '1');
    return;
  }
  tutorialOverlay.style.display = 'flex';
  const step = tutorialSteps[tutorialStep];
  document.getElementById('tutorial-text')!.textContent = step.text;
  document.getElementById('tutorial-progress')!.textContent = `${tutorialStep + 1}/${tutorialSteps.length}`;
}

document.getElementById('tutorial-next')!.addEventListener('click', (e) => {
  e.stopPropagation();
  tutorialStep++;
  renderTutorialStep();
});
document.getElementById('tutorial-skip')!.addEventListener('click', (e) => {
  e.stopPropagation();
  tutorialOverlay.style.display = 'none';
  localStorage.setItem(TUTORIAL_KEY, '1');
});

// ── Input ───────────────────────────────────────────────────

setupInput(canvas, input, (r, c) => {
  // If inspect mode, show building info
  if (inspectMode) {
    showBuildingInfo(r, c);
    return;
  }

  // If clicking on existing building (not in build mode for same type), show info
  if (state.grid[r][c].type !== 'empty' && selected !== 'empty' && state.grid[r][c].type === selected) {
    showBuildingInfo(r, c);
    return;
  }

  const result = placeBuilding(state, r, c, selected);
  if (result) {
    state = result;
    if (selected === 'empty') {
      showToast('Demolished!');
    } else {
      showToast(BUILDINGS[selected].label + ' placed', 'rgba(74,222,128,0.85)');
    }
    updateHUD();
    buildToolbar();
    saveGame(state);
    checkAchievements();
  } else {
    if (state.grid[r][c].type !== 'empty' && selected !== 'empty') {
      // Tap existing building: show info
      showBuildingInfo(r, c);
    } else if (selected !== 'empty' && state.money < BUILDINGS[selected].cost) {
      showToast('Not enough $');
    }
  }
});

// ── Game tick ───────────────────────────────────────────────

let tickInterval: number | null = null;

function getTickRate(): number {
  switch (state.speed) {
    case 0: return 0;
    case 1: return 2000;
    case 2: return 1000;
    case 3: return 500;
    default: return 2000;
  }
}

function doTick() {
  state = gameTick(state);
  updateHUD();
  buildToolbar();
  updateEventBanner();
  renderNotifications();
  checkAchievements();
  saveGame(state);
}

function startTickLoop() {
  if (tickInterval) clearInterval(tickInterval);
  const rate = getTickRate();
  if (rate > 0) {
    tickInterval = window.setInterval(doTick, rate);
  }
}

// Watch for speed changes
let lastSpeed = state.speed;
function checkSpeedChange() {
  if (state.speed !== lastSpeed) {
    lastSpeed = state.speed;
    startTickLoop();
  }
}

startTickLoop();

// ── Render loop (60fps) ─────────────────────────────────────

let lastTime = 0;

function frame(now: number) {
  const dt = lastTime ? now - lastTime : 16;
  lastTime = now;

  checkSpeedChange();

  // Update animations (even when paused for visual polish)
  state = {
    ...state,
    citizens: updateCitizens(state, state.speed === 0 ? 0 : dt),
    smoke: updateSmoke(state.smoke, state.speed === 0 ? 0 : dt),
  };

  render(ctx, canvas, state, input.camX, input.camY, input.zoom, input.rotation, input.hoverR, input.hoverC);

  // Update notification opacity
  renderNotifications();

  requestAnimationFrame(frame);
}

// ── New Game ────────────────────────────────────────────────

document.getElementById('new-game-btn')!.addEventListener('click', (e) => {
  e.stopPropagation();
  if (confirm('Start a new city? All progress will be lost.')) {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(TUTORIAL_KEY);
    state = createInitialState();
    for (const a of achievements) a.unlocked = false;
    updateHUD();
    buildToolbar();
    updateSpeedUI();
    hideInfoPanel();
    statsPanel.classList.remove('show');
    achPanel.classList.remove('show');
    showToast('New city started!', 'rgba(100,120,180,0.92)');
    saveGame(state);
    tutorialStep = 0;
    showTutorial();
  }
});

// ── Init ────────────────────────────────────────────────────

updateHUD();
buildToolbar();
updateSpeedUI();
updateEventBanner();
showTutorial();
requestAnimationFrame(frame);

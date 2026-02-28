import { BuildingType, BUILDINGS, BUILD_ORDER, GameState, Building, GRID } from './types';
import { createInitialState, gameTick, placeBuilding, calculateIncome, updateCitizens, updateSmoke } from './gameLogic';
import { render } from './renderer';
import { createInputState, setupInput } from './input';

// ── Save / Load ─────────────────────────────────────────────

const SAVE_KEY = 'minicity_save';

interface SaveData {
  grid: Building[][];
  money: number;
  population: number;
  happiness: number;
  tick: number;
}

function saveGame(state: GameState) {
  const data: SaveData = {
    grid: state.grid,
    money: state.money,
    population: state.population,
    happiness: state.happiness,
    tick: state.tick,
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
    // Validate grid
    if (!data.grid || data.grid.length !== GRID) return null;
    return {
      grid: data.grid,
      money: data.money ?? 1000,
      population: data.population ?? 0,
      happiness: data.happiness ?? 50,
      tick: data.tick ?? 0,
      citizens: [],
      smoke: [],
    };
  } catch (_) {
    return null;
  }
}

// ── State ───────────────────────────────────────────────────

let state = loadGame() || createInitialState();
let selected: BuildingType = 'residential';
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

const hudMoney = document.getElementById('hud-money')!;
const hudIncome = document.getElementById('hud-income')!;
const hudPop = document.getElementById('hud-pop')!;
const hudHappy = document.getElementById('hud-happy')!;
const toast = document.getElementById('toast')!;

let toastTimer = 0;

function showToast(msg: string) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1200);
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
}

// ── Toolbar ─────────────────────────────────────────────────

const TOOL_ICONS: Record<BuildingType, string> = {
  empty: '\u2715',
  residential: '\u2302',
  commercial: '$',
  industrial: '\u2699',
  park: '\u2663',
  road: '\u2550',
  power: '\u26A1',
};

function buildToolbar() {
  const toolbar = document.getElementById('toolbar')!;
  toolbar.innerHTML = '';

  for (const type of BUILD_ORDER) {
    const info = BUILDINGS[type];
    const btn = document.createElement('div');
    btn.className = 'tool-btn' + (type === selected ? ' active' : '');
    if (info.cost > state.money && type !== 'empty') btn.classList.add('disabled');

    btn.innerHTML = `
      <span class="tool-icon">${TOOL_ICONS[type]}</span>
      <span class="tool-name">${info.label}</span>
      ${info.cost > 0 ? `<span class="tool-cost">$${info.cost}</span>` : ''}
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selected = type;
      buildToolbar();
    });

    toolbar.appendChild(btn);
  }
}

// ── Rotation button ─────────────────────────────────────────

const rotateBtn = document.getElementById('rotate-btn')!;
rotateBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  input.rotation = (input.rotation + 1) % 4;
  const dirs = ['N', 'E', 'S', 'W'];
  showToast('View: ' + dirs[input.rotation]);
});

// ── Input ───────────────────────────────────────────────────

setupInput(canvas, input, (r, c) => {
  const result = placeBuilding(state, r, c, selected);
  if (result) {
    state = result;
    if (selected === 'empty') {
      showToast('Demolished!');
    } else {
      showToast(BUILDINGS[selected].label + ' placed');
    }
    updateHUD();
    buildToolbar();
    saveGame(state);
  } else {
    if (state.grid[r][c].type !== 'empty' && selected !== 'empty') {
      showToast('Tile occupied');
    } else if (selected !== 'empty' && state.money < BUILDINGS[selected].cost) {
      showToast('Not enough $');
    }
  }
});

// ── Game tick (economy, 2s interval) ────────────────────────

setInterval(() => {
  state = gameTick(state);
  updateHUD();
  buildToolbar();
  saveGame(state);
}, 2000);

// ── Render loop (60fps, updates citizens + smoke every frame) ──

let lastTime = 0;

function frame(now: number) {
  const dt = lastTime ? now - lastTime : 16;
  lastTime = now;

  // Update animations
  state = {
    ...state,
    citizens: updateCitizens(state, dt),
    smoke: updateSmoke(state.smoke, dt),
  };

  render(ctx, canvas, state, input.camX, input.camY, input.zoom, input.rotation, input.hoverR, input.hoverC);
  requestAnimationFrame(frame);
}

// ── Init ────────────────────────────────────────────────────

updateHUD();
buildToolbar();
requestAnimationFrame(frame);

import { BuildingType, BUILDINGS, BUILD_ORDER } from './types';
import { createInitialState, gameTick, placeBuilding, calculateIncome } from './gameLogic';
import { render } from './renderer';
import { createInputState, setupInput } from './input';

// --- State ---
let state = createInitialState();
let selected: BuildingType = 'residential';
const input = createInputState();

// --- Canvas setup ---
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

// --- HUD ---
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

// --- Toolbar ---
function buildToolbar() {
  const toolbar = document.getElementById('toolbar')!;
  toolbar.innerHTML = '';

  for (const type of BUILD_ORDER) {
    const info = BUILDINGS[type];
    const btn = document.createElement('div');
    btn.className = 'tool-btn' + (type === selected ? ' active' : '');
    if (info.cost > state.money && type !== 'empty') btn.classList.add('disabled');

    btn.innerHTML = `
      <span class="tool-emoji">${info.emoji}</span>
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

// --- Input ---
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
  } else {
    if (state.grid[r][c].type !== 'empty' && selected !== 'empty') {
      showToast('Tile occupied');
    } else if (selected !== 'empty' && state.money < BUILDINGS[selected].cost) {
      showToast('Not enough $');
    }
  }
});

// --- Game tick ---
setInterval(() => {
  state = gameTick(state);
  updateHUD();
  buildToolbar();
}, 2000);

// --- Render loop ---
function frame() {
  render(ctx, canvas, state, input.camX, input.camY, input.hoverR, input.hoverC);
  requestAnimationFrame(frame);
}

// --- Init ---
updateHUD();
buildToolbar();
requestAnimationFrame(frame);

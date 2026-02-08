import { screenToGrid, gridToScreen } from './renderer';
import { GRID, TW, TH } from './types';

export interface InputState {
  camX: number;
  camY: number;
  hoverR: number;
  hoverC: number;
  // Internal
  _dragging: boolean;
  _lastX: number;
  _lastY: number;
  _startX: number;
  _startY: number;
  _didDrag: boolean;
}

export function createInputState(): InputState {
  return {
    camX: 0, camY: 0,
    hoverR: -1, hoverC: -1,
    _dragging: false, _lastX: 0, _lastY: 0,
    _startX: 0, _startY: 0, _didDrag: false,
  };
}

type TapCallback = (row: number, col: number) => void;

export function setupInput(
  canvas: HTMLCanvasElement,
  input: InputState,
  onTap: TapCallback,
) {
  const dpr = () => window.devicePixelRatio || 1;

  function canvasToWorld(clientX: number, clientY: number): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    // Undo camera offset
    const w = rect.width;
    const h = rect.height;
    const wx = px - w / 2 - input.camX;
    const wy = py - h * 0.38 - input.camY;
    return [wx, wy];
  }

  function hitTest(clientX: number, clientY: number): [number, number] {
    const [wx, wy] = canvasToWorld(clientX, clientY);
    const [r, c] = screenToGrid(wx, wy);
    if (r >= 0 && r < GRID && c >= 0 && c < GRID) return [r, c];
    return [-1, -1];
  }

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      input._dragging = true;
      input._lastX = t.clientX;
      input._lastY = t.clientY;
      input._startX = t.clientX;
      input._startY = t.clientY;
      input._didDrag = false;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && input._dragging) {
      const t = e.touches[0];
      const dx = t.clientX - input._lastX;
      const dy = t.clientY - input._lastY;
      input.camX += dx;
      input.camY += dy;
      input._lastX = t.clientX;
      input._lastY = t.clientY;

      const totalDx = t.clientX - input._startX;
      const totalDy = t.clientY - input._startY;
      if (Math.abs(totalDx) > 8 || Math.abs(totalDy) > 8) {
        input._didDrag = true;
      }

      // Update hover
      const [r, c] = hitTest(t.clientX, t.clientY);
      input.hoverR = r;
      input.hoverC = c;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!input._didDrag && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const [r, c] = hitTest(t.clientX, t.clientY);
      if (r >= 0 && c >= 0) {
        onTap(r, c);
      }
    }
    input._dragging = false;
    input.hoverR = -1;
    input.hoverC = -1;
  }, { passive: false });

  // Mouse events (for desktop testing)
  canvas.addEventListener('mousedown', (e) => {
    input._dragging = true;
    input._lastX = e.clientX;
    input._lastY = e.clientY;
    input._startX = e.clientX;
    input._startY = e.clientY;
    input._didDrag = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const [r, c] = hitTest(e.clientX, e.clientY);
    input.hoverR = r;
    input.hoverC = c;

    if (input._dragging) {
      const dx = e.clientX - input._lastX;
      const dy = e.clientY - input._lastY;
      input.camX += dx;
      input.camY += dy;
      input._lastX = e.clientX;
      input._lastY = e.clientY;

      const totalDx = e.clientX - input._startX;
      const totalDy = e.clientY - input._startY;
      if (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5) {
        input._didDrag = true;
      }
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!input._didDrag) {
      const [r, c] = hitTest(e.clientX, e.clientY);
      if (r >= 0 && c >= 0) {
        onTap(r, c);
      }
    }
    input._dragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    input._dragging = false;
    input.hoverR = -1;
    input.hoverC = -1;
  });
}

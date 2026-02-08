import { screenToGrid } from './renderer';
import { GRID } from './types';

export interface InputState {
  camX: number;
  camY: number;
  zoom: number;
  hoverR: number;
  hoverC: number;
  rotation: number; // 0-3
  // Internal
  _dragging: boolean;
  _lastX: number;
  _lastY: number;
  _startX: number;
  _startY: number;
  _didDrag: boolean;
  _pinching: boolean;
  _pinchDist: number;
  _pinchZoomStart: number;
}

export function createInputState(): InputState {
  return {
    camX: 0, camY: 0, zoom: 1,
    hoverR: -1, hoverC: -1, rotation: 0,
    _dragging: false, _lastX: 0, _lastY: 0,
    _startX: 0, _startY: 0, _didDrag: false,
    _pinching: false, _pinchDist: 0, _pinchZoomStart: 1,
  };
}

type TapCallback = (row: number, col: number) => void;

function pinchDist(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function setupInput(
  canvas: HTMLCanvasElement,
  input: InputState,
  onTap: TapCallback,
) {
  function canvasToWorld(clientX: number, clientY: number): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const wx = (px - w / 2 - input.camX) / input.zoom;
    const wy = (py - h * 0.38 - input.camY) / input.zoom;
    return [wx, wy];
  }

  function hitTest(clientX: number, clientY: number): [number, number] {
    const [wx, wy] = canvasToWorld(clientX, clientY);
    const [r, c] = screenToGrid(wx, wy, input.rotation);
    if (r >= 0 && r < GRID && c >= 0 && c < GRID) return [r, c];
    return [-1, -1];
  }

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Start pinch
      input._pinching = true;
      input._dragging = false;
      input._pinchDist = pinchDist(e.touches[0], e.touches[1]);
      input._pinchZoomStart = input.zoom;
    } else if (e.touches.length === 1 && !input._pinching) {
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
    if (e.touches.length === 2 && input._pinching) {
      const dist = pinchDist(e.touches[0], e.touches[1]);
      const scale = dist / input._pinchDist;
      input.zoom = Math.max(0.4, Math.min(3, input._pinchZoomStart * scale));
    } else if (e.touches.length === 1 && input._dragging) {
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

      const [r, c] = hitTest(t.clientX, t.clientY);
      input.hoverR = r;
      input.hoverC = c;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (input._pinching) {
      if (e.touches.length < 2) input._pinching = false;
      return;
    }
    if (!input._didDrag && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const [r, c] = hitTest(t.clientX, t.clientY);
      if (r >= 0 && c >= 0) onTap(r, c);
    }
    input._dragging = false;
    input.hoverR = -1;
    input.hoverC = -1;
  }, { passive: false });

  // Mouse events
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
      if (r >= 0 && c >= 0) onTap(r, c);
    }
    input._dragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    input._dragging = false;
    input.hoverR = -1;
    input.hoverC = -1;
  });

  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    input.zoom = Math.max(0.4, Math.min(3, input.zoom * delta));
  }, { passive: false });
}

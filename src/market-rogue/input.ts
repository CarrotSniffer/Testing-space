export interface InputState {
  scrollY: Record<string, number>;
  tapX: number;
  tapY: number;
  tapped: boolean;
  _dragging: boolean;
  _lastY: number;
  _startX: number;
  _startY: number;
  _didDrag: boolean;
  _velocity: number;
}

export function createInputState(): InputState {
  return {
    scrollY: { market: 0, shop: 0, meta: 0, deck: 0 },
    tapX: 0, tapY: 0, tapped: false,
    _dragging: false, _lastY: 0, _startX: 0, _startY: 0, _didDrag: false, _velocity: 0,
  };
}

export function setupInput(canvas: HTMLCanvasElement, input: InputState, scrollKey: () => string): void {
  const dpr = () => window.devicePixelRatio || 1;

  function onStart(x: number, y: number) {
    input._dragging = true;
    input._lastY = y;
    input._startX = x;
    input._startY = y;
    input._didDrag = false;
    input._velocity = 0;
  }

  function onMove(_x: number, y: number) {
    if (!input._dragging) return;
    const dy = y - input._lastY;
    const key = scrollKey();
    input.scrollY[key] = (input.scrollY[key] || 0) - dy;
    input._velocity = -dy;
    input._lastY = y;
    if (Math.abs(y - input._startY) > 8 || Math.abs(_x - input._startX) > 8) {
      input._didDrag = true;
    }
  }

  function onEnd(x: number, y: number) {
    if (!input._didDrag) {
      // Convert to logical canvas coordinates
      input.tapX = x;
      input.tapY = y;
      input.tapped = true;
    }
    input._dragging = false;
  }

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
  canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  canvas.addEventListener('mouseup', (e) => onEnd(e.clientX, e.clientY));
  canvas.addEventListener('mouseleave', () => { input._dragging = false; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const key = scrollKey();
    input.scrollY[key] = (input.scrollY[key] || 0) + e.deltaY * 0.5;
  }, { passive: false });
}

export function updateScroll(input: InputState, key: string): void {
  if (!input._dragging && Math.abs(input._velocity) > 0.1) {
    input.scrollY[key] = (input.scrollY[key] || 0) + input._velocity;
    input._velocity *= 0.92;
  }
  if (input.scrollY[key] < 0) input.scrollY[key] = 0;
}

export function consumeTap(input: InputState): { x: number; y: number } | null {
  if (input.tapped) {
    input.tapped = false;
    return { x: input.tapX, y: input.tapY };
  }
  return null;
}

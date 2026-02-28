export interface InputState {
  scrollY: Record<string, number>;
  tapX: number;
  tapY: number;
  tapped: boolean;
  // internal
  _dragging: boolean;
  _lastY: number;
  _startX: number;
  _startY: number;
  _didDrag: boolean;
  _velocity: number;
}

export function createInputState(): InputState {
  return {
    scrollY: { business: 0, portfolio: 0, casino: 0, more: 0 },
    tapX: 0, tapY: 0, tapped: false,
    _dragging: false, _lastY: 0, _startX: 0, _startY: 0, _didDrag: false, _velocity: 0,
  };
}

export function setupInput(canvas: HTMLCanvasElement, input: InputState, activeTab: () => string): void {
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
    const tab = activeTab();
    input.scrollY[tab] = (input.scrollY[tab] || 0) - dy;
    input._velocity = -dy;
    input._lastY = y;

    const totalDy = Math.abs(y - input._startY);
    const totalDx = Math.abs(_x - input._startX);
    if (totalDy > 8 || totalDx > 8) input._didDrag = true;
  }

  function onEnd(x: number, y: number) {
    if (!input._didDrag) {
      input.tapX = x;
      input.tapY = y;
      input.tapped = true;
    }
    input._dragging = false;
  }

  // Touch
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

  // Mouse
  canvas.addEventListener('mousedown', (e) => { onStart(e.clientX, e.clientY); });
  canvas.addEventListener('mousemove', (e) => { onMove(e.clientX, e.clientY); });
  canvas.addEventListener('mouseup', (e) => { onEnd(e.clientX, e.clientY); });
  canvas.addEventListener('mouseleave', () => { input._dragging = false; });

  // Scroll momentum
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const tab = activeTab();
    input.scrollY[tab] = (input.scrollY[tab] || 0) + e.deltaY * 0.5;
  }, { passive: false });
}

export function updateScroll(input: InputState, tab: string): void {
  // Momentum
  if (!input._dragging && Math.abs(input._velocity) > 0.1) {
    input.scrollY[tab] = (input.scrollY[tab] || 0) + input._velocity;
    input._velocity *= 0.92;
  }
  // Clamp
  if (input.scrollY[tab] < 0) input.scrollY[tab] = 0;
}

export function consumeTap(input: InputState): { x: number; y: number } | null {
  if (input.tapped) {
    input.tapped = false;
    return { x: input.tapX, y: input.tapY };
  }
  return null;
}

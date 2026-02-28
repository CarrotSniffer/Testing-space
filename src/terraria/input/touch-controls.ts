import { Vec2 } from '../core/types';

interface ActiveTouch {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  zone: 'joystick' | 'action' | 'world' | 'hotbar';
}

export class TouchControls {
  active = false;

  // Joystick output
  moveX = 0; // -1 to 1
  moveY = 0; // -1 to 1

  // Buttons
  jumping = false;
  attacking = false;
  placing = false;

  // World tap target
  worldTap = false;
  worldTapX = 0;
  worldTapY = 0;

  // Hotbar tap
  hotbarTap = -1;

  private touches = new Map<number, ActiveTouch>();
  private joystickCenter = { x: 0, y: 0 };
  private readonly JOYSTICK_RADIUS = 50;
  private readonly DEADZONE = 0.15;

  // Button positions (computed on resize)
  private btnJump = { x: 0, y: 0, r: 30 };
  private btnAttack = { x: 0, y: 0, r: 30 };
  private btnPlace = { x: 0, y: 0, r: 26 };

  private screenW = 0;
  private screenH = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.updateLayout();

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.onStart(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.onMove(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.onEnd(e); }, { passive: false });
    canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); this.onEnd(e); }, { passive: false });

    window.addEventListener('resize', () => this.updateLayout());
  }

  private updateLayout() {
    this.screenW = window.innerWidth;
    this.screenH = window.innerHeight;

    // Right-side buttons
    const rx = this.screenW - 70;
    this.btnJump = { x: rx, y: this.screenH - 160, r: 32 };
    this.btnAttack = { x: rx - 10, y: this.screenH - 90, r: 32 };
    this.btnPlace = { x: rx - 70, y: this.screenH - 120, r: 26 };
  }

  private classifyZone(x: number, y: number): ActiveTouch['zone'] {
    // Hotbar at bottom center
    const hotbarY = this.screenH - 48;
    const hotbarW = 400;
    const hotbarX = (this.screenW - hotbarW) / 2;
    if (y > hotbarY && x > hotbarX && x < hotbarX + hotbarW) {
      return 'hotbar';
    }

    // Left third = joystick
    if (x < this.screenW * 0.35 && y > this.screenH * 0.4) {
      return 'joystick';
    }

    // Right side buttons
    if (x > this.screenW * 0.6 && y > this.screenH * 0.4) {
      return 'action';
    }

    return 'world';
  }

  private onStart(e: TouchEvent) {
    this.active = true;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const zone = this.classifyZone(t.clientX, t.clientY);
      const touch: ActiveTouch = {
        id: t.identifier,
        startX: t.clientX,
        startY: t.clientY,
        x: t.clientX,
        y: t.clientY,
        zone,
      };
      this.touches.set(t.identifier, touch);

      if (zone === 'joystick') {
        this.joystickCenter = { x: t.clientX, y: t.clientY };
      } else if (zone === 'hotbar') {
        this.handleHotbarTap(t.clientX);
      } else if (zone === 'world') {
        this.worldTap = true;
        this.worldTapX = t.clientX;
        this.worldTapY = t.clientY;
      }
    }
    this.updateState();
  }

  private onMove(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const touch = this.touches.get(t.identifier);
      if (touch) {
        touch.x = t.clientX;
        touch.y = t.clientY;
      }
    }
    this.updateState();
  }

  private onEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touches.delete(e.changedTouches[i].identifier);
    }
    this.updateState();
    if (this.touches.size === 0) {
      this.active = false;
    }
  }

  private handleHotbarTap(x: number) {
    const slotSize = 40;
    const hotbarSlots = 10;
    const hotbarW = slotSize * hotbarSlots + 4;
    const hotbarX = (this.screenW - hotbarW) / 2;
    const slot = Math.floor((x - hotbarX) / slotSize);
    if (slot >= 0 && slot < hotbarSlots) {
      this.hotbarTap = slot;
    }
  }

  private updateState() {
    this.moveX = 0;
    this.moveY = 0;
    this.jumping = false;
    this.attacking = false;
    this.placing = false;

    for (const touch of this.touches.values()) {
      if (touch.zone === 'joystick') {
        const dx = touch.x - this.joystickCenter.x;
        const dy = touch.y - this.joystickCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.JOYSTICK_RADIUS;

        if (dist > this.DEADZONE * maxDist) {
          this.moveX = Math.max(-1, Math.min(1, dx / maxDist));
          this.moveY = Math.max(-1, Math.min(1, dy / maxDist));
        }
      } else if (touch.zone === 'action') {
        // Which button is closest?
        const distJump = this.distToBtn(touch.x, touch.y, this.btnJump);
        const distAttack = this.distToBtn(touch.x, touch.y, this.btnAttack);
        const distPlace = this.distToBtn(touch.x, touch.y, this.btnPlace);

        if (distJump < this.btnJump.r * 1.5) this.jumping = true;
        if (distAttack < this.btnAttack.r * 1.5) this.attacking = true;
        if (distPlace < this.btnPlace.r * 1.5) this.placing = true;
      }
    }
  }

  private distToBtn(x: number, y: number, btn: { x: number; y: number; r: number }): number {
    const dx = x - btn.x;
    const dy = y - btn.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Draw touch control overlays on the UI canvas
  drawControls(ctx: CanvasRenderingContext2D) {
    if (!this.isMobile()) return;

    // Joystick base
    let joyActive = false;
    for (const t of this.touches.values()) {
      if (t.zone === 'joystick') { joyActive = true; break; }
    }

    if (joyActive) {
      // Base circle
      ctx.beginPath();
      ctx.arc(this.joystickCenter.x, this.joystickCenter.y, this.JOYSTICK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Thumb
      const thumbX = this.joystickCenter.x + this.moveX * this.JOYSTICK_RADIUS;
      const thumbY = this.joystickCenter.y + this.moveY * this.JOYSTICK_RADIUS;
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    } else {
      // Idle hint
      const hintX = 90;
      const hintY = this.screenH - 130;
      ctx.beginPath();
      ctx.arc(hintX, hintY, this.JOYSTICK_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MOVE', hintX, hintY + 4);
      ctx.textAlign = 'left';
    }

    // Action buttons
    this.drawButton(ctx, this.btnJump, 'JUMP', this.jumping);
    this.drawButton(ctx, this.btnAttack, 'MINE', this.attacking);
    this.drawButton(ctx, this.btnPlace, 'PLACE', this.placing);
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    btn: { x: number; y: number; r: number },
    label: string,
    pressed: boolean,
  ) {
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.fillStyle = pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = pressed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = pressed ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, btn.x, btn.y + 4);
    ctx.textAlign = 'left';
  }

  isMobile(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  consumeHotbarTap(): number {
    const t = this.hotbarTap;
    this.hotbarTap = -1;
    return t;
  }

  consumeWorldTap(): { x: number; y: number } | null {
    if (!this.worldTap) return null;
    this.worldTap = false;
    return { x: this.worldTapX, y: this.worldTapY };
  }
}

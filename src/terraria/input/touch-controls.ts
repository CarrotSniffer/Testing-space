/**
 * Terraria-style mobile touch controls:
 *
 * - LEFT STICK (bottom-left): Movement joystick, floating where you touch
 * - RIGHT STICK (bottom-right): Aim joystick, moves a crosshair cursor
 *   In "aim and use" mode: touching the aim stick also triggers item use (mine/attack)
 * - JUMP BUTTON: Upper-right area
 * - WORLD TAP: Tapping the middle/upper area of the screen directly sets cursor
 *   position AND triggers item use at that location (precision mining/placing)
 * - HOTBAR: Bottom-center strip, tap to select slots
 *
 * This mirrors Terraria mobile's dual-stick + direct-touch hybrid approach.
 */

interface ActiveTouch {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  zone: 'move_stick' | 'aim_stick' | 'jump' | 'world' | 'hotbar';
}

export class TouchControls {
  active = false;

  // Left stick output (movement)
  moveX = 0; // -1 to 1
  moveY = 0; // -1 to 1

  // Right stick output (aim direction, normalized)
  aimX = 0;  // -1 to 1
  aimY = 0;  // -1 to 1
  aimActive = false;     // true when right stick is being touched
  aimDistance = 0;        // 0-1, how far the stick is pushed (controls cursor reach)

  // Actions
  jumping = false;
  attacking = false;     // true when aim stick is active (aim-and-use) OR world tap
  placing = false;

  // World tap target (for direct precision taps on the game world)
  private _worldTap = false;
  private _worldTapX = 0;
  private _worldTapY = 0;

  // Hotbar tap
  private _hotbarTap = -1;

  // Place mode toggle (switch between mine and place)
  placeMode = false;

  private touches = new Map<number, ActiveTouch>();

  // Left stick
  private moveStickCenter = { x: 0, y: 0 };
  private readonly STICK_RADIUS = 55;
  private readonly DEADZONE = 0.15;

  // Right stick
  private aimStickCenter = { x: 0, y: 0 };

  // Button positions
  private btnJump = { x: 0, y: 0, r: 34 };
  private btnToggle = { x: 0, y: 0, r: 22 }; // mine/place toggle

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

    // Jump button — upper right
    this.btnJump = { x: this.screenW - 65, y: this.screenH - 190, r: 34 };
    // Mine/Place toggle — above the aim stick area
    this.btnToggle = { x: this.screenW - 130, y: this.screenH - 190, r: 22 };
  }

  private classifyZone(x: number, y: number): ActiveTouch['zone'] {
    // Hotbar at bottom center
    const hotbarY = this.screenH - 48;
    const hotbarW = 400;
    const hotbarX = (this.screenW - hotbarW) / 2;
    if (y > hotbarY && x > hotbarX && x < hotbarX + hotbarW) {
      return 'hotbar';
    }

    // Jump button check
    const jdx = x - this.btnJump.x;
    const jdy = y - this.btnJump.y;
    if (Math.sqrt(jdx * jdx + jdy * jdy) < this.btnJump.r * 1.5) {
      return 'jump';
    }

    // Toggle button check
    const tdx = x - this.btnToggle.x;
    const tdy = y - this.btnToggle.y;
    if (Math.sqrt(tdx * tdx + tdy * tdy) < this.btnToggle.r * 1.5) {
      // Toggle mine/place on tap — handle inline, classify as jump zone to ignore
      this.placeMode = !this.placeMode;
      return 'jump'; // just consume the tap
    }

    // Bottom-left area = movement stick
    if (x < this.screenW * 0.35 && y > this.screenH * 0.35) {
      return 'move_stick';
    }

    // Bottom-right area = aim stick
    if (x > this.screenW * 0.6 && y > this.screenH * 0.35) {
      return 'aim_stick';
    }

    // Everything else = world tap (direct precision targeting)
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

      if (zone === 'move_stick') {
        this.moveStickCenter = { x: t.clientX, y: t.clientY };
      } else if (zone === 'aim_stick') {
        this.aimStickCenter = { x: t.clientX, y: t.clientY };
      } else if (zone === 'hotbar') {
        this.handleHotbarTap(t.clientX);
      } else if (zone === 'world') {
        // Direct world tap = set cursor + trigger item use
        this._worldTap = true;
        this._worldTapX = t.clientX;
        this._worldTapY = t.clientY;
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

        // If world touch is being dragged, update cursor position continuously
        if (touch.zone === 'world') {
          this._worldTap = true;
          this._worldTapX = t.clientX;
          this._worldTapY = t.clientY;
        }
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
      this._hotbarTap = slot;
    }
  }

  private updateState() {
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.aimActive = false;
    this.aimDistance = 0;
    this.jumping = false;
    this.attacking = false;
    this.placing = false;

    let hasWorldTouch = false;

    for (const touch of this.touches.values()) {
      if (touch.zone === 'move_stick') {
        const dx = touch.x - this.moveStickCenter.x;
        const dy = touch.y - this.moveStickCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.STICK_RADIUS;

        if (dist > this.DEADZONE * maxDist) {
          this.moveX = Math.max(-1, Math.min(1, dx / maxDist));
          this.moveY = Math.max(-1, Math.min(1, dy / maxDist));
        }
      } else if (touch.zone === 'aim_stick') {
        const dx = touch.x - this.aimStickCenter.x;
        const dy = touch.y - this.aimStickCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.STICK_RADIUS;

        this.aimActive = true;
        if (dist > this.DEADZONE * maxDist) {
          this.aimX = Math.max(-1, Math.min(1, dx / maxDist));
          this.aimY = Math.max(-1, Math.min(1, dy / maxDist));
          this.aimDistance = Math.min(1, dist / maxDist);
        }

        // Aim stick = "aim and use" mode — touching it triggers item use
        if (this.placeMode) {
          this.placing = true;
        } else {
          this.attacking = true;
        }
      } else if (touch.zone === 'jump') {
        this.jumping = true;
      } else if (touch.zone === 'world') {
        hasWorldTouch = true;
        // World touch triggers attack/place based on mode
        if (this.placeMode) {
          this.placing = true;
        } else {
          this.attacking = true;
        }
      }
    }
  }

  // Draw touch control overlays on the UI canvas
  drawControls(ctx: CanvasRenderingContext2D) {
    if (!this.isMobile()) return;

    // --- Left movement stick ---
    let moveActive = false;
    for (const t of this.touches.values()) {
      if (t.zone === 'move_stick') { moveActive = true; break; }
    }

    if (moveActive) {
      ctx.beginPath();
      ctx.arc(this.moveStickCenter.x, this.moveStickCenter.y, this.STICK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const thumbX = this.moveStickCenter.x + this.moveX * this.STICK_RADIUS;
      const thumbY = this.moveStickCenter.y + this.moveY * this.STICK_RADIUS;
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    } else {
      const hintX = 90;
      const hintY = this.screenH - 130;
      ctx.beginPath();
      ctx.arc(hintX, hintY, this.STICK_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MOVE', hintX, hintY + 4);
      ctx.textAlign = 'left';
    }

    // --- Right aim stick ---
    let aimTouchActive = false;
    for (const t of this.touches.values()) {
      if (t.zone === 'aim_stick') { aimTouchActive = true; break; }
    }

    if (aimTouchActive) {
      ctx.beginPath();
      ctx.arc(this.aimStickCenter.x, this.aimStickCenter.y, this.STICK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,200,50,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,50,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const thumbX = this.aimStickCenter.x + this.aimX * this.STICK_RADIUS;
      const thumbY = this.aimStickCenter.y + this.aimY * this.STICK_RADIUS;
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,200,50,0.3)';
      ctx.fill();
    } else {
      const hintX = this.screenW - 90;
      const hintY = this.screenH - 110;
      ctx.beginPath();
      ctx.arc(hintX, hintY, this.STICK_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,200,50,0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,50,0.12)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AIM', hintX, hintY + 4);
      ctx.textAlign = 'left';
    }

    // --- Jump button ---
    this.drawButton(ctx, this.btnJump, 'JUMP', this.jumping, 'rgba(255,255,255,');

    // --- Mine/Place toggle ---
    const toggleLabel = this.placeMode ? 'PLACE' : 'MINE';
    const toggleColor = this.placeMode ? 'rgba(100,200,255,' : 'rgba(255,200,50,';
    this.drawButton(ctx, this.btnToggle, toggleLabel, false, toggleColor);
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    btn: { x: number; y: number; r: number },
    label: string,
    pressed: boolean,
    colorBase: string,
  ) {
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.fillStyle = pressed ? colorBase + '0.25)' : colorBase + '0.08)';
    ctx.fill();
    ctx.strokeStyle = pressed ? colorBase + '0.5)' : colorBase + '0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = pressed ? '#fff' : colorBase + '0.5)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, btn.x, btn.y + 4);
    ctx.textAlign = 'left';
  }

  isMobile(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  consumeHotbarTap(): number {
    const t = this._hotbarTap;
    this._hotbarTap = -1;
    return t;
  }

  consumeWorldTap(): { x: number; y: number } | null {
    if (!this._worldTap) return null;
    this._worldTap = false;
    return { x: this._worldTapX, y: this._worldTapY };
  }
}

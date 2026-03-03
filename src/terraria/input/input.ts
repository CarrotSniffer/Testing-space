import { InputState, CameraState } from '../core/types';
import { TILE_SIZE, REACH_RANGE_X, REACH_RANGE_Y } from '../core/config';
import { screenToWorld } from '../render/camera';
import { TouchControls } from './touch-controls';

export class InputManager {
  readonly state: InputState;
  readonly touch: TouchControls;
  private keys = new Set<string>();
  private mouseDown = false;
  private mouseRight = false;
  private mouseScreenX = 0;
  private mouseScreenY = 0;
  private inventoryPressed = false;
  private scrollAccum = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.touch = new TouchControls(canvas);

    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      attack: false,
      interact: false,
      cursorWorld: { x: 0, y: 0 },
      cursorScreen: { x: 0, y: 0 },
      inventoryToggle: false,
      hotbarSelect: -1,
      scrollDelta: 0,
    };

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.mouseRight = true;
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.mouseRight = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouseScreenX = e.clientX;
      this.mouseScreenY = e.clientY;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) this.scrollAccum++;
      else if (e.deltaY < 0) this.scrollAccum--;
    }, { passive: false });
  }

  poll(camera: CameraState) {
    const dpr = window.devicePixelRatio || 1;

    if (this.touch.active) {
      // --- Touch controls (Terraria mobile style) ---

      // Movement from left stick
      this.state.left = this.touch.moveX < -0.3;
      this.state.right = this.touch.moveX > 0.3;
      this.state.up = this.touch.moveY < -0.6;
      this.state.down = this.touch.moveY > 0.6;
      this.state.jump = this.touch.jumping || this.touch.moveY < -0.6;

      // Attack/place from aim stick or world tap
      this.state.attack = this.touch.attacking;
      this.state.interact = this.touch.placing;

      // --- Cursor position ---
      // Priority 1: Direct world tap (precision targeting — tap exactly where you want)
      const tap = this.touch.consumeWorldTap();
      if (tap) {
        this.state.cursorScreen = { x: tap.x, y: tap.y };
        this.state.cursorWorld = screenToWorld(camera, tap.x * dpr, tap.y * dpr);
      }

      // Priority 2: Right aim stick moves cursor relative to player (camera center)
      // The stick direction + distance maps to a point within the reach range
      if (this.touch.aimActive && this.touch.aimDistance > 0) {
        // Map aim stick to world cursor within reach range
        // aimX/Y are -1..1 direction, aimDistance is 0..1 push magnitude
        const reachPxX = REACH_RANGE_X * TILE_SIZE;
        const reachPxY = REACH_RANGE_Y * TILE_SIZE;
        this.state.cursorWorld = {
          x: camera.x + this.touch.aimX * reachPxX * this.touch.aimDistance,
          y: camera.y + this.touch.aimY * reachPxY * this.touch.aimDistance,
        };
      }

      // Hotbar tap
      const hotbar = this.touch.consumeHotbarTap();
      this.state.hotbarSelect = hotbar;
      this.state.scrollDelta = 0;
    } else {
      // --- Keyboard + mouse (Terraria PC controls) ---
      this.state.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      this.state.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      this.state.up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
      this.state.down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
      this.state.jump = this.keys.has('Space');

      this.state.attack = this.mouseDown;
      this.state.interact = this.mouseRight;

      this.state.cursorScreen = { x: this.mouseScreenX, y: this.mouseScreenY };
      this.state.cursorWorld = screenToWorld(camera, this.mouseScreenX * dpr, this.mouseScreenY * dpr);

      this.state.hotbarSelect = -1;
      for (let i = 0; i < 10; i++) {
        if (this.keys.has(`Digit${(i + 1) % 10}`)) {
          this.state.hotbarSelect = i;
        }
      }

      this.state.scrollDelta = this.scrollAccum;
      this.scrollAccum = 0;
    }

    // Inventory toggle: Escape key
    const escDown = this.keys.has('Escape');
    this.state.inventoryToggle = escDown && !this.inventoryPressed;
    this.inventoryPressed = escDown;
  }
}

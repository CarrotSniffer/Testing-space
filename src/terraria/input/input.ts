import { InputState, CameraState } from '../core/types';
import { TILE_SIZE, REACH_RANGE_X } from '../core/config';
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
  private scrollAccum = 0;  // accumulated scroll delta since last poll
  private touchFacingRight = true;  // track facing for mobile smart cursor

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

    // Scroll wheel for hotbar cycling (Terraria: scroll to change selected slot)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Accumulate scroll — positive deltaY = scroll down = next slot
      if (e.deltaY > 0) this.scrollAccum++;
      else if (e.deltaY < 0) this.scrollAccum--;
    }, { passive: false });
  }

  poll(camera: CameraState) {
    const dpr = window.devicePixelRatio || 1;

    if (this.touch.active) {
      // Touch controls active — override keyboard
      this.state.left = this.touch.moveX < -0.3;
      this.state.right = this.touch.moveX > 0.3;
      this.state.up = this.touch.moveY < -0.6;
      this.state.down = this.touch.moveY > 0.6;
      this.state.jump = this.touch.jumping || this.touch.moveY < -0.6;
      this.state.attack = this.touch.attacking;
      this.state.interact = this.touch.placing;

      // Track facing direction from joystick for smart cursor
      if (this.touch.moveX < -0.3) this.touchFacingRight = false;
      else if (this.touch.moveX > 0.3) this.touchFacingRight = true;

      // World tap sets cursor for mining/placing
      const tap = this.touch.consumeWorldTap();
      if (tap) {
        this.state.cursorScreen = { x: tap.x, y: tap.y };
        this.state.cursorWorld = screenToWorld(camera, tap.x * dpr, tap.y * dpr);
      }

      // Smart cursor: when mine/place buttons are held without a world tap,
      // auto-target the block in front of the player (camera center ≈ player center)
      if ((this.state.attack || this.state.interact) && !tap) {
        const dir = this.touchFacingRight ? 1 : -1;
        // Target ~2.5 tiles in front, at player's feet level (slightly below center)
        this.state.cursorWorld = {
          x: camera.x + dir * TILE_SIZE * Math.min(2.5, REACH_RANGE_X - 0.5),
          y: camera.y + TILE_SIZE * 0.5,
        };
      }

      // Hotbar tap
      const hotbar = this.touch.consumeHotbarTap();
      this.state.hotbarSelect = hotbar;
      this.state.scrollDelta = 0;
    } else {
      // Keyboard + mouse (Terraria PC controls)
      this.state.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      this.state.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      this.state.up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
      this.state.down = this.keys.has('KeyS') || this.keys.has('ArrowDown');

      // Jump = Space only (Terraria: Space is jump, W/Up is for climbing ropes/platforms)
      this.state.jump = this.keys.has('Space');

      this.state.attack = this.mouseDown;
      this.state.interact = this.mouseRight;

      this.state.cursorScreen = { x: this.mouseScreenX, y: this.mouseScreenY };
      this.state.cursorWorld = screenToWorld(camera, this.mouseScreenX * dpr, this.mouseScreenY * dpr);

      // Hotbar selection via number keys (1-9 = slots 0-8, 0 = slot 9)
      this.state.hotbarSelect = -1;
      for (let i = 0; i < 10; i++) {
        if (this.keys.has(`Digit${(i + 1) % 10}`)) {
          this.state.hotbarSelect = i;
        }
      }

      // Scroll wheel hotbar cycling
      this.state.scrollDelta = this.scrollAccum;
      this.scrollAccum = 0;
    }

    // Inventory toggle: Escape key (Terraria default)
    const escDown = this.keys.has('Escape');
    this.state.inventoryToggle = escDown && !this.inventoryPressed;
    this.inventoryPressed = escDown;
  }
}

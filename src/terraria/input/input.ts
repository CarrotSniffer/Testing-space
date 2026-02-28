import { InputState, CameraState } from '../core/types';
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

  constructor(private canvas: HTMLCanvasElement) {
    this.touch = new TouchControls(canvas);

    this.state = {
      left: false,
      right: false,
      jump: false,
      attack: false,
      interact: false,
      cursorWorld: { x: 0, y: 0 },
      cursorScreen: { x: 0, y: 0 },
      inventoryToggle: false,
      hotbarSelect: -1,
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
  }

  poll(camera: CameraState) {
    const dpr = window.devicePixelRatio || 1;

    if (this.touch.active) {
      // Touch controls active — override keyboard
      this.state.left = this.touch.moveX < -0.3;
      this.state.right = this.touch.moveX > 0.3;
      this.state.jump = this.touch.jumping || this.touch.moveY < -0.6;
      this.state.attack = this.touch.attacking;
      this.state.interact = this.touch.placing;

      // World tap sets cursor for mining/placing
      const tap = this.touch.consumeWorldTap();
      if (tap) {
        this.state.cursorScreen = { x: tap.x, y: tap.y };
        this.state.cursorWorld = screenToWorld(camera, tap.x * dpr, tap.y * dpr);
      }

      // Hotbar tap
      const hotbar = this.touch.consumeHotbarTap();
      this.state.hotbarSelect = hotbar;
    } else {
      // Keyboard + mouse
      this.state.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      this.state.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      this.state.jump = this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp');
      this.state.attack = this.mouseDown;
      this.state.interact = this.mouseRight;

      this.state.cursorScreen = { x: this.mouseScreenX, y: this.mouseScreenY };
      this.state.cursorWorld = screenToWorld(camera, this.mouseScreenX * dpr, this.mouseScreenY * dpr);

      // Hotbar selection via number keys
      this.state.hotbarSelect = -1;
      for (let i = 0; i < 10; i++) {
        if (this.keys.has(`Digit${(i + 1) % 10}`)) {
          this.state.hotbarSelect = i;
        }
      }
    }

    // Inventory toggle (consume on press) — keyboard only for now
    const eDown = this.keys.has('KeyE');
    this.state.inventoryToggle = eDown && !this.inventoryPressed;
    this.inventoryPressed = eDown;
  }
}

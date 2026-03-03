import { CameraState, GameClock, EnemyEntity } from './core/types';
import { TILE_SIZE, TICK_RATE, DAY_LENGTH, PLAYER_WIDTH, REACH_RANGE_X, REACH_RANGE_Y } from './core/config';
import { WebGLRenderer } from './render/webgl-renderer';
import { createCamera, cameraFollow, cameraResize } from './render/camera';
import { InputManager } from './input/input';
import { EntityManager } from './entity/entity-manager';
import { PhysicsEngine } from './physics/physics';
import { WorldManager } from './world/world';
import { generateWorld } from './world/generation';
import { BLOCK_DEFS } from './data/blocks';
import { MiningSystem } from './systems/mining';
import { CombatSystem } from './systems/combat';
import { addItem } from './systems/inventory';
import { getItemDef } from './data/items';
import { getEnemyDef } from './data/enemies';
import { ITEM } from './data/ids';

export class Game {
  private renderer: WebGLRenderer;
  private uiCtx: CanvasRenderingContext2D;
  private uiCanvas: HTMLCanvasElement;
  private camera: CameraState;
  private clock: GameClock;
  private input: InputManager;
  private entityManager!: EntityManager;
  private physics: PhysicsEngine;
  private mining: MiningSystem;
  private combat: CombatSystem;
  private world!: WorldManager;

  private lastTime = 0;
  private accumulator = 0;
  private readonly STEP = 1000 / TICK_RATE;

  private frameCount = 0;
  private fpsTime = 0;
  private fps = 0;

  // Death state
  private dead = false;
  private respawnTimer = 0;

  // Damage flash
  private damageFlash = 0;

  constructor(private glCanvas: HTMLCanvasElement, uiCanvas: HTMLCanvasElement) {
    this.uiCanvas = uiCanvas;
    this.renderer = new WebGLRenderer(glCanvas);
    this.uiCtx = uiCanvas.getContext('2d')!;
    this.input = new InputManager(uiCanvas);
    this.physics = new PhysicsEngine();
    this.mining = new MiningSystem();
    this.combat = new CombatSystem();

    this.camera = createCamera(glCanvas.width, glCanvas.height);
    this.clock = {
      dayTime: DAY_LENGTH * 0.25,
      totalTime: 0,
      dayCount: 0,
      isNight: false,
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      glCanvas.width = w * dpr;
      glCanvas.height = h * dpr;
      glCanvas.style.width = w + 'px';
      glCanvas.style.height = h + 'px';
      uiCanvas.width = w * dpr;
      uiCanvas.height = h * dpr;
      uiCanvas.style.width = w + 'px';
      uiCanvas.style.height = h + 'px';
      this.uiCtx = uiCanvas.getContext('2d')!;
      this.uiCtx.scale(dpr, dpr);
      this.renderer.resize(glCanvas.width, glCanvas.height);
      cameraResize(this.camera, glCanvas.width, glCanvas.height);
    };
    window.addEventListener('resize', resize);
    resize();
  }

  init() {
    this.renderer.init();
    const colors = BLOCK_DEFS.map((b) => b.color);
    this.renderer.buildAtlas(colors);

    const seed = (Math.random() * 2147483647) | 0;
    this.world = generateWorld(seed);
    this.renderer.setWorldData(this.world.blocks, this.world.width, this.world.height);

    const spawnX = Math.floor(this.world.width / 2);
    const spawnSurfaceY = this.world.getSurfaceY(spawnX);
    const playerPxX = spawnX * TILE_SIZE - PLAYER_WIDTH / 2;
    const playerPxY = (spawnSurfaceY - 3) * TILE_SIZE;

    this.entityManager = new EntityManager(playerPxX, playerPxY);

    addItem(this.entityManager.player.inventory, { itemId: ITEM.WOOD_PICKAXE, count: 1 });
    addItem(this.entityManager.player.inventory, { itemId: ITEM.WOOD_SWORD, count: 1 });
    addItem(this.entityManager.player.inventory, { itemId: ITEM.WOOD_AXE, count: 1 });
    addItem(this.entityManager.player.inventory, { itemId: ITEM.TORCH, count: 50 });

    this.camera.x = playerPxX;
    this.camera.y = playerPxY;
  }

  start() {
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(now: number) {
    const dt = Math.min(now - this.lastTime, 100);
    this.lastTime = now;
    this.accumulator += dt;

    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = now;
    }

    while (this.accumulator >= this.STEP) {
      this.fixedUpdate();
      this.accumulator -= this.STEP;
    }

    this.render(this.accumulator / this.STEP);
    requestAnimationFrame((t) => this.loop(t));
  }

  private fixedUpdate() {
    // Clock
    this.clock.dayTime += 1 / TICK_RATE;
    this.clock.totalTime += 1 / TICK_RATE;
    if (this.clock.dayTime >= DAY_LENGTH) {
      this.clock.dayTime -= DAY_LENGTH;
      this.clock.dayCount++;
    }
    const progress = this.clock.dayTime / DAY_LENGTH;
    this.clock.isNight = progress > 0.67 || progress < 0.17;

    // Damage flash decay
    if (this.damageFlash > 0) this.damageFlash--;

    // Dead state
    if (this.dead) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    this.input.poll(this.camera);

    // Update entities (updatePlayer returns fall damage)
    this.entityManager.update(this.input.state, this.physics, this.world);
    this.physics.moveAndCollide(this.entityManager.player, this.world);

    // Apply fall damage (calculated by updatePlayer after landing)
    const player = this.entityManager.player;
    const fallDmg = this.entityManager.lastFallDamage;
    if (fallDmg > 0) {
      player.hp = Math.max(0, player.hp - fallDmg);
      this.damageFlash = 10;
    }

    // Mining/placing
    this.mining.update(player, this.world, this.input.state);

    // Combat
    const prevHp = player.hp;
    const enemies = this.entityManager.getEnemies();
    const { killed } = this.combat.update(player, enemies, this.input.state.attack);

    // Damage flash
    if (player.hp < prevHp) {
      this.damageFlash = 8;
    }

    // Handle enemy deaths — drop loot
    for (const enemy of killed) {
      this.entityManager.handleEnemyDeath(enemy);
    }

    // Spawn enemies
    this.entityManager.spawnEnemies(this.world, this.clock, this.camera);

    // Clamp player
    const maxX = this.world.width * TILE_SIZE - player.size.x;
    const maxY = this.world.height * TILE_SIZE - player.size.y;
    if (player.pos.x < 0) { player.pos.x = 0; player.vel.x = 0; }
    if (player.pos.x > maxX) { player.pos.x = maxX; player.vel.x = 0; }
    if (player.pos.y < 0) { player.pos.y = 0; player.vel.y = 0; }
    if (player.pos.y > maxY) { player.pos.y = maxY; player.vel.y = 0; }

    // Player death
    if (player.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 180; // 3 seconds
    }

    // Fell to bedrock
    if (player.pos.y > (this.world.height - 10) * TILE_SIZE) {
      this.respawn();
    }
  }

  private respawn() {
    const player = this.entityManager.player;
    const spawnX = Math.floor(this.world.width / 2);
    const spawnY = this.world.getSurfaceY(spawnX);
    player.pos.x = spawnX * TILE_SIZE;
    player.pos.y = (spawnY - 3) * TILE_SIZE;
    player.vel.x = 0;
    player.vel.y = 0;
    player.hp = player.maxHp;
    player.invulnTimer = 60;
    player.jumpTimer = 0;
    player.isFalling = false;
    player.fallStartY = player.pos.y;
    this.dead = false;
  }

  private render(alpha: number) {
    const player = this.entityManager.player;

    // Sync dirty chunks
    const dirty = this.world.consumeDirtyChunks();
    for (const key of dirty) {
      const [cx, cy] = key.split(',').map(Number);
      this.renderer.markChunkDirty(cx * 32, cy * 32);
    }

    this.renderer.clear();
    this.renderer.renderSky(this.camera, this.clock);

    const camTarget = {
      x: player.pos.x + player.size.x / 2,
      y: player.pos.y + player.size.y / 2,
    };
    cameraFollow(this.camera, camTarget, alpha);
    this.renderer.renderWorld(this.camera);

    // Item drops
    for (const entity of this.entityManager.entities) {
      if (entity.type === 'item_drop') {
        const def = getItemDef(entity.item.itemId);
        const bob = Math.sin(this.clock.totalTime * 3 + entity.id) * 2;
        this.renderer.drawRect(
          this.camera,
          entity.pos.x, entity.pos.y + bob,
          entity.size.x, entity.size.y,
          def.iconColor[0] / 255, def.iconColor[1] / 255, def.iconColor[2] / 255, 1.0,
        );
      }
    }

    // Enemies
    for (const entity of this.entityManager.entities) {
      if (entity.type === 'enemy') {
        const def = getEnemyDef(entity.enemyType);
        const flash = entity.invulnTimer > 0 && entity.invulnTimer % 4 < 2;
        const r = flash ? 1 : def.color[0] / 255;
        const g = flash ? 0.5 : def.color[1] / 255;
        const b = flash ? 0.5 : def.color[2] / 255;

        // Body
        this.renderer.drawRect(
          this.camera,
          entity.pos.x, entity.pos.y,
          entity.size.x, entity.size.y,
          r, g, b, 1.0,
        );

        // Eyes for walkers
        if (entity.enemyType !== 'bat') {
          const eyeX = entity.facingRight
            ? entity.pos.x + entity.size.x - 5
            : entity.pos.x + 1;
          const eyeY = entity.pos.y + 3;
          const eyeColor = entity.enemyType === 'demon_eye' ? [1, 0.8, 0] : [1, 0, 0];
          this.renderer.drawRect(
            this.camera,
            eyeX, eyeY, 4, 3,
            eyeColor[0], eyeColor[1], eyeColor[2], 1.0,
          );
        }
      }
    }

    // Mining progress overlay
    if (this.mining.miningState) {
      const ms = this.mining.miningState;
      const bx = ms.tx * TILE_SIZE;
      const by = ms.ty * TILE_SIZE;
      const pct = ms.progress / ms.maxProgress;
      this.renderer.drawRect(this.camera, bx, by, TILE_SIZE, TILE_SIZE, 1, 1, 1, 0.15 + pct * 0.2);
      if (pct > 0.25) {
        const s = TILE_SIZE * pct * 0.6;
        const off = (TILE_SIZE - s) / 2;
        this.renderer.drawRect(this.camera, bx + off, by + off, s, s, 0, 0, 0, pct * 0.5);
      }
    }

    // Player
    if (!this.dead) {
      const flashAlpha = player.invulnTimer > 0 && player.invulnTimer % 6 < 3 ? 0.4 : 1.0;
      this.renderer.drawRect(
        this.camera,
        player.pos.x, player.pos.y,
        player.size.x, player.size.y,
        0.2, 0.55, 0.95, flashAlpha,
      );
      const eyeX = player.facingRight ? player.pos.x + player.size.x - 7 : player.pos.x + 3;
      this.renderer.drawRect(this.camera, eyeX, player.pos.y + 6, 4, 4, 1, 1, 1, flashAlpha);

      // Swing effect when attacking
      if (player.attackCooldown > 15) {
        const swingDir = player.facingRight ? 1 : -1;
        const swingX = player.pos.x + player.size.x / 2 + swingDir * 14;
        const swingY = player.pos.y + 8;
        this.renderer.drawRect(this.camera, swingX, swingY, 18 * swingDir, 3, 0.8, 0.8, 0.8, 0.6);
      }
    }

    // Block cursor — Terraria-style yellow outline (rectangular reach check)
    if (!this.dead) {
      const curTx = Math.floor(this.input.state.cursorWorld.x / TILE_SIZE);
      const curTy = Math.floor(this.input.state.cursorWorld.y / TILE_SIZE);
      const pcx = (player.pos.x + player.size.x / 2) / TILE_SIZE;
      const pcy = (player.pos.y + player.size.y / 2) / TILE_SIZE;
      const dx = Math.abs(curTx + 0.5 - pcx);
      const dy = Math.abs(curTy + 0.5 - pcy);
      if (dx <= REACH_RANGE_X && dy <= REACH_RANGE_Y) {
        // Yellow highlight fill (like Terraria's smart cursor target)
        this.renderer.drawRect(
          this.camera,
          curTx * TILE_SIZE, curTy * TILE_SIZE, TILE_SIZE, TILE_SIZE,
          1, 0.9, 0.2, 0.15,
        );
        // Yellow outline borders (top, bottom, left, right — 1px lines)
        const bx = curTx * TILE_SIZE;
        const by = curTy * TILE_SIZE;
        const borderW = 1;
        this.renderer.drawRect(this.camera, bx, by, TILE_SIZE, borderW, 1, 0.9, 0.2, 0.6);                   // top
        this.renderer.drawRect(this.camera, bx, by + TILE_SIZE - borderW, TILE_SIZE, borderW, 1, 0.9, 0.2, 0.6); // bottom
        this.renderer.drawRect(this.camera, bx, by, borderW, TILE_SIZE, 1, 0.9, 0.2, 0.6);                   // left
        this.renderer.drawRect(this.camera, bx + TILE_SIZE - borderW, by, borderW, TILE_SIZE, 1, 0.9, 0.2, 0.6); // right
      }
    }

    this.renderUI();
  }

  private renderUI() {
    const ctx = this.uiCtx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.uiCanvas.width / dpr;
    const h = this.uiCanvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    const player = this.entityManager.player;

    // Damage flash overlay
    if (this.damageFlash > 0) {
      ctx.fillStyle = `rgba(255,0,0,${this.damageFlash * 0.04})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Death screen
    if (this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e33';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You Died!', w / 2, h / 2 - 20);
      ctx.fillStyle = '#aaa';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Respawning in ${Math.ceil(this.respawnTimer / 60)}...`, w / 2, h / 2 + 20);
      ctx.textAlign = 'left';
      return;
    }

    // Health bar
    const hbW = 150;
    const hbH = 14;
    const hbX = 12;
    const hbY = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(hbX - 2, hbY - 2, hbW + 4, hbH + 4);
    ctx.fillStyle = '#400';
    ctx.fillRect(hbX, hbY, hbW, hbH);
    ctx.fillStyle = '#e33';
    ctx.fillRect(hbX, hbY, hbW * (player.hp / player.maxHp), hbH);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`${player.hp}/${player.maxHp}`, hbX + 4, hbY + 11);

    // Info bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hbX - 2, hbY + hbH + 8, 220, 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    const enemyCount = this.entityManager.getEnemies().length;
    ctx.fillText(
      `Day ${this.clock.dayCount + 1} ${this.clock.isNight ? 'Night' : 'Day'} | ${this.fps} FPS | E:${enemyCount}`,
      hbX + 2, hbY + hbH + 22,
    );

    // Enemy health bars (world-space, drawn on UI overlay)
    for (const entity of this.entityManager.entities) {
      if (entity.type === 'enemy' && entity.hp < entity.maxHp) {
        const ex = entity.pos.x + entity.size.x / 2;
        const ey = entity.pos.y - 6;
        // Convert to screen space approximately
        const sx = (ex - this.camera.x) * this.camera.zoom + w / 2;
        const sy = (ey - this.camera.y) * this.camera.zoom + h / 2;

        if (sx > -50 && sx < w + 50 && sy > -50 && sy < h + 50) {
          const barW = 30;
          const barH = 4;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(sx - barW / 2 - 1, sy - 1, barW + 2, barH + 2);
          ctx.fillStyle = '#600';
          ctx.fillRect(sx - barW / 2, sy, barW, barH);
          ctx.fillStyle = '#e33';
          ctx.fillRect(sx - barW / 2, sy, barW * (entity.hp / entity.maxHp), barH);
        }
      }
    }

    // Controls hint (only on desktop) — Terraria keybindings
    if (!this.input.touch.isMobile()) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(w - 248, h - 124, 240, 116);
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText('A/D: Move  Space: Jump', w - 240, h - 106);
      ctx.fillText('Left click: Mine / Attack', w - 240, h - 90);
      ctx.fillText('Right click: Place block', w - 240, h - 74);
      ctx.fillText('1-0: Hotbar  Scroll: Cycle', w - 240, h - 58);
      ctx.fillText('Esc: Inventory', w - 240, h - 42);
      ctx.fillText('Auto-step 1-block ledges', w - 240, h - 26);
    }

    // Mining progress bar
    if (this.mining.miningState) {
      const ms = this.mining.miningState;
      const pct = ms.progress / ms.maxProgress;
      const barW = 120;
      const barH = 8;
      const barX = (w - barW) / 2;
      const barY = h - 64;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#553';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#fc3';
      ctx.fillRect(barX, barY, barW * pct, barH);
    }

    // Hotbar
    const slotSize = 40;
    const hotbarSlots = 10;
    const hotbarW = slotSize * hotbarSlots + 4;
    const hotbarX = (w - hotbarW) / 2;
    const hotbarY = h - slotSize - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(hotbarX - 2, hotbarY - 2, hotbarW + 4, slotSize + 4);

    for (let i = 0; i < hotbarSlots; i++) {
      const sx = hotbarX + i * slotSize + 2;
      const selected = i === player.selectedSlot;
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(sx, hotbarY, slotSize - 4, slotSize);
      ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(sx, hotbarY, slotSize - 4, slotSize);

      const stack = player.inventory.slots[i];
      if (stack) {
        const itemDef = getItemDef(stack.itemId);
        const [ir, ig, ib] = itemDef.iconColor;
        ctx.fillStyle = `rgb(${ir},${ig},${ib})`;

        if (itemDef.isTool) {
          this.drawToolIcon(ctx, sx + 6, hotbarY + 5, slotSize - 16, itemDef.toolType);
        } else {
          ctx.fillRect(sx + 6, hotbarY + 5, slotSize - 16, slotSize - 16);
          ctx.strokeStyle = `rgba(${Math.max(0, ir - 40)},${Math.max(0, ig - 40)},${Math.max(0, ib - 40)},0.6)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 6, hotbarY + 5, slotSize - 16, slotSize - 16);
        }

        if (stack.count > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${stack.count}`, sx + slotSize - 8, hotbarY + slotSize - 4);
          ctx.textAlign = 'left';
        }
      }

      ctx.fillStyle = selected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
      ctx.font = '9px monospace';
      ctx.fillText(`${(i + 1) % 10}`, sx + 2, hotbarY + 10);
    }

    // Held item name
    const heldStack = player.inventory.slots[player.selectedSlot];
    if (heldStack) {
      const name = getItemDef(heldStack.itemId).name;
      ctx.font = '12px monospace';
      const tw = ctx.measureText(name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect((w - tw) / 2 - 4, hotbarY - 22, tw + 8, 18);
      ctx.fillStyle = '#ddd';
      ctx.fillText(name, (w - tw) / 2, hotbarY - 8);
    }

    // Touch controls overlay
    this.input.touch.drawControls(ctx);
  }

  private drawToolIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, toolType: string) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    if (toolType === 'pickaxe') {
      ctx.strokeStyle = ctx.fillStyle as string;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.35, cy + size * 0.35);
      ctx.lineTo(cx + size * 0.2, cy - size * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.1, cy - size * 0.4);
      ctx.lineTo(cx + size * 0.4, cy + size * 0.1);
      ctx.stroke();
    } else if (toolType === 'axe') {
      ctx.strokeStyle = ctx.fillStyle as string;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.3, cy + size * 0.4);
      ctx.lineTo(cx + size * 0.15, cy - size * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.1, cy - size * 0.35);
      ctx.lineTo(cx + size * 0.4, cy + size * 0.05);
      ctx.lineTo(cx + size * 0.15, cy - size * 0.15);
      ctx.fill();
    } else if (toolType === 'sword') {
      ctx.strokeStyle = ctx.fillStyle as string;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.3, cy + size * 0.35);
      ctx.lineTo(cx + size * 0.3, cy - size * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.2, cy - size * 0.05);
      ctx.lineTo(cx + size * 0.05, cy + size * 0.2);
      ctx.stroke();
    }
  }
}

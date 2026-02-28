import { CameraState, GameClock } from '../core/types';
import { TILE_SIZE, CHUNK_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../core/config';
import { getCameraProjection, getVisibleChunks } from './camera';
import {
  TILE_VERTEX, TILE_FRAGMENT,
  SOLID_VERTEX, SOLID_FRAGMENT,
  SKY_VERTEX, SKY_FRAGMENT,
} from './shaders';

interface ShaderProgram {
  program: WebGLProgram;
  attribs: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation>;
}

interface ChunkBuffer {
  vbo: WebGLBuffer;
  vertexCount: number;
  dirty: boolean;
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private tileShader!: ShaderProgram;
  private solidShader!: ShaderProgram;
  private skyShader!: ShaderProgram;
  private atlasTexture!: WebGLTexture;
  private chunkBuffers = new Map<string, ChunkBuffer>();
  private skyVbo!: WebGLBuffer;
  private quadVbo!: WebGLBuffer;

  // World tile data reference (set after world gen)
  private worldBlocks: Uint16Array | null = null;
  private worldWidth = 0;
  private worldHeight = 0;

  // Block color table for atlas generation
  private blockColors: [number, number, number, number][] = [];

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
  }

  init() {
    const gl = this.gl;

    // Compile shader programs
    this.tileShader = this.createShaderProgram(
      TILE_VERTEX, TILE_FRAGMENT,
      ['a_position', 'a_texcoord', 'a_light'],
      ['u_projection', 'u_atlas'],
    );
    this.solidShader = this.createShaderProgram(
      SOLID_VERTEX, SOLID_FRAGMENT,
      ['a_position'],
      ['u_projection', 'u_color'],
    );
    this.skyShader = this.createShaderProgram(
      SKY_VERTEX, SKY_FRAGMENT,
      ['a_position', 'a_t'],
      ['u_topColor', 'u_bottomColor'],
    );

    // Create sky fullscreen quad (2 triangles, clip space)
    // Each vertex: x, y, t (t=0 at top, t=1 at bottom)
    this.skyVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, 1, 0,    1, 1, 0,    -1, -1, 1,
       1, 1, 0,    1, -1, 1,   -1, -1, 1,
    ]), gl.STATIC_DRAW);

    // Reusable quad buffer for solid-color rects
    this.quadVbo = gl.createBuffer()!;

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  // Build a simple texture atlas: each block type gets a 16x16 tile in the atlas
  buildAtlas(blockColors: [number, number, number, number][]) {
    const gl = this.gl;
    this.blockColors = blockColors;

    const atlasSize = 256; // 16 blocks per row, 16x16 each = 256x256
    const data = new Uint8Array(atlasSize * atlasSize * 4);

    for (let blockId = 0; blockId < blockColors.length; blockId++) {
      const col = blockColors[blockId];
      const bx = (blockId % 16) * TILE_SIZE;
      const by = Math.floor(blockId / 16) * TILE_SIZE;

      for (let py = 0; py < TILE_SIZE; py++) {
        for (let px = 0; px < TILE_SIZE; px++) {
          const idx = ((by + py) * atlasSize + bx + px) * 4;
          if (col[3] === 0) {
            // Air: transparent
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
          } else {
            // Add slight noise for texture variation
            const noise = ((Math.sin(px * 12.9898 + py * 78.233 + blockId * 45.164) * 43758.5453) % 1) * 20 - 10;
            data[idx] = Math.max(0, Math.min(255, col[0] + noise));
            data[idx + 1] = Math.max(0, Math.min(255, col[1] + noise));
            data[idx + 2] = Math.max(0, Math.min(255, col[2] + noise));
            data[idx + 3] = col[3];

            // Grass block: green top strip
            if (blockId === 2 && py < 4) {
              data[idx] = Math.max(0, Math.min(255, 76 + noise));
              data[idx + 1] = Math.max(0, Math.min(255, 153 + noise));
              data[idx + 2] = Math.max(0, Math.min(255, 0 + noise));
              data[idx + 3] = 255;
            }

            // Edge darkening for depth
            if (px === 0 || py === 0 || px === TILE_SIZE - 1 || py === TILE_SIZE - 1) {
              data[idx] = Math.max(0, data[idx] - 15);
              data[idx + 1] = Math.max(0, data[idx + 1] - 15);
              data[idx + 2] = Math.max(0, data[idx + 2] - 15);
            }
          }
        }
      }
    }

    this.atlasTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasSize, atlasSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setWorldData(blocks: Uint16Array, width: number, height: number) {
    this.worldBlocks = blocks;
    this.worldWidth = width;
    this.worldHeight = height;
    this.chunkBuffers.clear();
  }

  markChunkDirty(tileX: number, tileY: number) {
    const cx = Math.floor(tileX / CHUNK_SIZE);
    const cy = Math.floor(tileY / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    const chunk = this.chunkBuffers.get(key);
    if (chunk) chunk.dirty = true;
  }

  // Build vertex data for a single chunk
  private buildChunkMesh(cx: number, cy: number): Float32Array {
    const verts: number[] = [];
    const blocks = this.worldBlocks!;
    const atlasSize = 256;
    const tileUV = TILE_SIZE / atlasSize;

    const startX = cx * CHUNK_SIZE;
    const startY = cy * CHUNK_SIZE;
    const endX = Math.min(startX + CHUNK_SIZE, this.worldWidth);
    const endY = Math.min(startY + CHUNK_SIZE, this.worldHeight);

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const blockId = blocks[ty * this.worldWidth + tx];
        if (blockId === 0) continue; // skip air

        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        // Atlas UV for this block
        const u0 = (blockId % 16) * tileUV;
        const v0 = Math.floor(blockId / 16) * tileUV;
        const u1 = u0 + tileUV;
        const v1 = v0 + tileUV;

        const light = 1.0; // placeholder — will be computed in Phase 7

        // Two triangles per tile
        // Each vertex: x, y, u, v, light
        verts.push(
          px, py, u0, v0, light,
          px + TILE_SIZE, py, u1, v0, light,
          px, py + TILE_SIZE, u0, v1, light,

          px + TILE_SIZE, py, u1, v0, light,
          px + TILE_SIZE, py + TILE_SIZE, u1, v1, light,
          px, py + TILE_SIZE, u0, v1, light,
        );
      }
    }

    return new Float32Array(verts);
  }

  private getOrBuildChunk(cx: number, cy: number): ChunkBuffer | null {
    const key = `${cx},${cy}`;
    let chunk = this.chunkBuffers.get(key);

    if (!chunk || chunk.dirty) {
      const mesh = this.buildChunkMesh(cx, cy);
      if (mesh.length === 0) return null;

      const gl = this.gl;
      if (!chunk) {
        chunk = {
          vbo: gl.createBuffer()!,
          vertexCount: 0,
          dirty: false,
        };
        this.chunkBuffers.set(key, chunk);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, chunk.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.DYNAMIC_DRAW);
      chunk.vertexCount = mesh.length / 5; // 5 floats per vertex
      chunk.dirty = false;
    }

    return chunk.vertexCount > 0 ? chunk : null;
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  renderSky(camera: CameraState, clock: GameClock) {
    const gl = this.gl;
    const prog = this.skyShader;

    // Day/night sky colors
    const dayProgress = clock.dayTime / 900; // 0-1 through the day
    let topR: number, topG: number, topB: number;
    let botR: number, botG: number, botB: number;

    if (dayProgress < 0.17) {
      // Dawn
      const t = dayProgress / 0.17;
      topR = 0.05 + t * 0.25; topG = 0.05 + t * 0.4; topB = 0.15 + t * 0.55;
      botR = 0.1 + t * 0.7;   botG = 0.05 + t * 0.45; botB = 0.15 + t * 0.3;
    } else if (dayProgress < 0.67) {
      // Day
      topR = 0.3; topG = 0.45; topB = 0.7;
      botR = 0.8; botG = 0.5;  botB = 0.45;
    } else if (dayProgress < 0.83) {
      // Dusk
      const t = (dayProgress - 0.67) / 0.16;
      topR = 0.3 - t * 0.25;  topG = 0.45 - t * 0.4; topB = 0.7 - t * 0.55;
      botR = 0.8 - t * 0.7;   botG = 0.5 - t * 0.45; botB = 0.45 - t * 0.3;
    } else {
      // Night
      topR = 0.05; topG = 0.05; topB = 0.15;
      botR = 0.1;  botG = 0.05; botB = 0.15;
    }

    gl.useProgram(prog.program);
    gl.uniform3f(prog.uniforms['u_topColor'], topR, topG, topB);
    gl.uniform3f(prog.uniforms['u_bottomColor'], botR, botG, botB);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyVbo);
    gl.enableVertexAttribArray(prog.attribs['a_position']);
    gl.vertexAttribPointer(prog.attribs['a_position'], 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(prog.attribs['a_t']);
    gl.vertexAttribPointer(prog.attribs['a_t'], 1, gl.FLOAT, false, 12, 8);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.disableVertexAttribArray(prog.attribs['a_t']);
  }

  renderWorld(camera: CameraState) {
    if (!this.worldBlocks) return;

    const gl = this.gl;
    const prog = this.tileShader;
    const proj = getCameraProjection(camera);

    gl.useProgram(prog.program);
    gl.uniformMatrix4fv(prog.uniforms['u_projection'], false, proj);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.uniform1i(prog.uniforms['u_atlas'], 0);

    const visible = getVisibleChunks(camera);
    const stride = 5 * 4; // 5 floats * 4 bytes

    for (let cy = visible.y0; cy <= visible.y1; cy++) {
      for (let cx = visible.x0; cx <= visible.x1; cx++) {
        const chunk = this.getOrBuildChunk(cx, cy);
        if (!chunk) continue;

        gl.bindBuffer(gl.ARRAY_BUFFER, chunk.vbo);
        gl.enableVertexAttribArray(prog.attribs['a_position']);
        gl.vertexAttribPointer(prog.attribs['a_position'], 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(prog.attribs['a_texcoord']);
        gl.vertexAttribPointer(prog.attribs['a_texcoord'], 2, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(prog.attribs['a_light']);
        gl.vertexAttribPointer(prog.attribs['a_light'], 1, gl.FLOAT, false, stride, 16);

        gl.drawArrays(gl.TRIANGLES, 0, chunk.vertexCount);
      }
    }

    gl.disableVertexAttribArray(prog.attribs['a_texcoord']);
    gl.disableVertexAttribArray(prog.attribs['a_light']);
  }

  // Draw a solid-color rectangle in world coordinates
  drawRect(camera: CameraState, x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number) {
    const gl = this.gl;
    const prog = this.solidShader;
    const proj = getCameraProjection(camera);

    gl.useProgram(prog.program);
    gl.uniformMatrix4fv(prog.uniforms['u_projection'], false, proj);
    gl.uniform4f(prog.uniforms['u_color'], r, g, b, a);

    const verts = new Float32Array([
      x, y,       x + w, y,       x, y + h,
      x + w, y,   x + w, y + h,   x, y + h,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(prog.attribs['a_position']);
    gl.vertexAttribPointer(prog.attribs['a_position'], 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  clear() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // === Shader compilation helpers ===

  private createShaderProgram(
    vsSrc: string, fsSrc: string,
    attribNames: string[], uniformNames: string[],
  ): ShaderProgram {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader link error: ' + gl.getProgramInfoLog(program));
    }

    const attribs: Record<string, number> = {};
    for (const name of attribNames) {
      attribs[name] = gl.getAttribLocation(program, name);
    }

    const uniforms: Record<string, WebGLUniformLocation> = {};
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name)!;
    }

    return { program, attribs, uniforms };
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }

    return shader;
  }
}

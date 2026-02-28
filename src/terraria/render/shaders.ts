export const TILE_VERTEX = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  attribute float a_light;

  uniform mat4 u_projection;

  varying vec2 v_texcoord;
  varying float v_light;

  void main() {
    gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
    v_light = a_light;
  }
`;

export const TILE_FRAGMENT = `
  precision mediump float;

  varying vec2 v_texcoord;
  varying float v_light;

  uniform sampler2D u_atlas;

  void main() {
    vec4 color = texture2D(u_atlas, v_texcoord);
    if (color.a < 0.1) discard;
    color.rgb *= v_light;
    gl_FragColor = color;
  }
`;

export const SPRITE_VERTEX = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  attribute vec4 a_color;

  uniform mat4 u_projection;

  varying vec2 v_texcoord;
  varying vec4 v_color;

  void main() {
    gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
    v_color = a_color;
  }
`;

export const SPRITE_FRAGMENT = `
  precision mediump float;

  varying vec2 v_texcoord;
  varying vec4 v_color;

  uniform sampler2D u_atlas;

  void main() {
    vec4 tex = texture2D(u_atlas, v_texcoord);
    gl_FragColor = v_color * tex;
  }
`;

// Simple solid-color shader for rectangles (player, debug)
export const SOLID_VERTEX = `
  attribute vec2 a_position;

  uniform mat4 u_projection;

  void main() {
    gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
  }
`;

export const SOLID_FRAGMENT = `
  precision mediump float;

  uniform vec4 u_color;

  void main() {
    gl_FragColor = u_color;
  }
`;

// Sky gradient shader
export const SKY_VERTEX = `
  attribute vec2 a_position;
  attribute float a_t;

  varying float v_t;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_t = a_t;
  }
`;

export const SKY_FRAGMENT = `
  precision mediump float;

  varying float v_t;

  uniform vec3 u_topColor;
  uniform vec3 u_bottomColor;

  void main() {
    vec3 color = mix(u_topColor, u_bottomColor, v_t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

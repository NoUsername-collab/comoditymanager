export type LiquidShaderColors = {
  c1: [number, number, number];
  c2: [number, number, number];
  c3: [number, number, number];
  bg: [number, number, number];
};

export type LiquidShaderHandle = {
  resize: () => void;
  setColors: (colors: LiquidShaderColors) => void;
  setIntensity: (opacity: number) => void;
  destroy: () => void;
};

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/** Metaballs + domain warp (fbm) — lichid în mișcare continuă. */
const FRAG = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;
uniform float u_opacity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float blob(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return r / dot(d, d);
}

vec2 lissajous(float t, float ax, float bx, float ph, vec2 amp) {
  return vec2(sin(t * ax + ph), cos(t * bx + ph * 1.37)) * amp;
}

vec2 flowField(vec2 p, float t) {
  float n1 = fbm(p * 1.6 + vec2(t * 0.11, t * 0.09));
  float n2 = fbm(p * 1.6 + vec2(5.2, 1.3) + vec2(-t * 0.1, t * 0.12));
  return (vec2(n1, n2) - 0.5) * 0.42;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;

  vec2 p = uv + flowField(uv, t);
  p += flowField(p * 1.4 + vec2(2.1, 4.7), t * 1.15) * 0.28;

  float f = 0.0;
  f += blob(p, lissajous(t * 0.55, 0.73, 0.91, 0.0, vec2(0.62, 0.48)), 0.058);
  f += blob(p, lissajous(t * 0.48, 0.61, 1.07, 1.8, vec2(0.54, 0.42)), 0.052);
  f += blob(p, lissajous(t * 0.62, 0.97, 0.68, 3.1, vec2(0.46, 0.58)), 0.048);
  f += blob(p, lissajous(t * 0.51, 0.84, 1.19, 4.6, vec2(0.68, 0.38)), 0.055);
  f += blob(p, lissajous(t * 0.58, 1.12, 0.79, 2.4, vec2(0.36, 0.62)), 0.044);
  f += blob(p, lissajous(t * 0.44, 0.55, 1.03, 5.9, vec2(0.58, 0.52)), 0.05);
  f += blob(p, lissajous(t * 0.67, 0.88, 0.74, 0.9, vec2(0.42, 0.44)), 0.042);
  f += blob(p, lissajous(t * 0.53, 1.05, 0.86, 6.8, vec2(0.5, 0.56)), 0.046);

  float goo = smoothstep(0.48, 1.02, f);
  float core = smoothstep(0.88, 1.22, f);
  float ripple = sin(t * 2.4 + f * 14.0 + uv.x * 8.0 + uv.y * 6.0) * 0.035;

  vec3 tint = mix(u_c1, u_c2, fbm(uv * 2.2 + t * 0.18));
  tint = mix(tint, u_c3, core * 0.72);
  tint += ripple;

  vec3 col = mix(u_bg, tint, goo * 0.94 + core * 0.28);
  float alpha = clamp(goo * u_opacity + core * u_opacity * 0.35, 0.0, u_opacity);
  gl_FragColor = vec4(col, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function createLiquidShader(canvas: HTMLCanvasElement): LiquidShaderHandle | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl) return null;

  const program = createProgram(gl);
  if (!program) return null;

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uC1 = gl.getUniformLocation(program, "u_c1");
  const uC2 = gl.getUniformLocation(program, "u_c2");
  const uC3 = gl.getUniformLocation(program, "u_c3");
  const uBg = gl.getUniformLocation(program, "u_bg");
  const uOpacity = gl.getUniformLocation(program, "u_opacity");

  let colors: LiquidShaderColors = {
    c1: [0.1, 0.45, 0.95],
    c2: [0.98, 0.82, 0.2],
    c3: [0.85, 0.15, 0.2],
    bg: [0.93, 0.95, 0.98],
  };
  let intensity = 0.78;

  let raf = 0;
  const start = performance.now();
  let width = 0;
  let height = 0;

  const render = (now: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    if (w !== width || h !== height) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniform2f(uResolution, width, height);
    gl.uniform1f(uTime, (now - start) * 0.001);
    gl.uniform3f(uC1, colors.c1[0], colors.c1[1], colors.c1[2]);
    gl.uniform3f(uC2, colors.c2[0], colors.c2[1], colors.c2[2]);
    gl.uniform3f(uC3, colors.c3[0], colors.c3[1], colors.c3[2]);
    gl.uniform3f(uBg, colors.bg[0], colors.bg[1], colors.bg[2]);
    gl.uniform1f(uOpacity, intensity);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(render);
  };

  raf = requestAnimationFrame(render);

  return {
    resize() {
      /* următorul frame actualizează dimensiunea */
    },
    setColors(next) {
      colors = next;
    },
    setIntensity(next) {
      intensity = next;
    },
    destroy() {
      cancelAnimationFrame(raf);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export function parseCssColor(input: string): [number, number, number] {
  const v = input.trim();
  if (!v) return [0.5, 0.5, 0.5];

  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.slice(0, 6);
    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return [0.5, 0.5, 0.5];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1]!.split(",").map((p) => Number.parseFloat(p.trim()));
    if (parts.length >= 3) {
      return [parts[0]! / 255, parts[1]! / 255, parts[2]! / 255];
    }
  }

  return [0.5, 0.5, 0.5];
}

export function themeLiquidColors(): LiquidShaderColors {
  if (typeof document === "undefined") {
    return {
      c1: [0.1, 0.45, 0.95],
      c2: [0.98, 0.82, 0.2],
      c3: [0.85, 0.15, 0.2],
      bg: [0.93, 0.95, 0.98],
    };
  }

  const root = getComputedStyle(document.documentElement);
  const pick = (name: string) => parseCssColor(root.getPropertyValue(name));

  return {
    c1: pick("--color-accent"),
    c2: pick("--color-accent-muted"),
    c3: pick("--color-focus"),
    bg: pick("--color-bg"),
  };
}

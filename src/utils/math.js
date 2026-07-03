/* ═══════════════════════════════════════════════════════
   Math Utilities — Vectors, noise, easing, random
   ═══════════════════════════════════════════════════════ */

// ─── Basic Math ───
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function degToRad(deg) {
  return deg * (Math.PI / 180);
}

export function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Easing Functions ───
export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  inCubic: t => t * t * t,
  outCubic: t => (--t) * t * t + 1,
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  inElastic: t => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  outElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  outBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

// ─── Vector 2D ───
export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vec2(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  scale(s) { this.x *= s; this.y *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const len = this.length();
    if (len > 0) { this.x /= len; this.y /= len; }
    return this;
  }
  distTo(v) { return distance(this.x, this.y, v.x, v.y); }
  angle() { return Math.atan2(this.y, this.x); }
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }
  lerp(v, t) {
    this.x = lerp(this.x, v.x, t);
    this.y = lerp(this.y, v.y, t);
    return this;
  }
}

// ─── Simplex-like Noise (value noise with smoothing) ───
const NOISE_SIZE = 256;
const _noisePerm = new Uint8Array(NOISE_SIZE * 2);
const _noiseGrad = new Float32Array(NOISE_SIZE);

// Initialize noise tables
(function initNoise() {
  for (let i = 0; i < NOISE_SIZE; i++) {
    _noisePerm[i] = i;
    _noiseGrad[i] = (Math.random() * 2 - 1);
  }
  // Shuffle
  for (let i = NOISE_SIZE - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_noisePerm[i], _noisePerm[j]] = [_noisePerm[j], _noisePerm[i]];
  }
  // Duplicate
  for (let i = 0; i < NOISE_SIZE; i++) {
    _noisePerm[NOISE_SIZE + i] = _noisePerm[i];
  }
})();

function _fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 1D value noise. Returns value in [-1, 1].
 */
export function noise1D(x) {
  const xi = Math.floor(x) & (NOISE_SIZE - 1);
  const xf = x - Math.floor(x);
  const u = _fade(xf);
  const a = _noiseGrad[_noisePerm[xi]];
  const b = _noiseGrad[_noisePerm[xi + 1]];
  return lerp(a, b, u);
}

/**
 * 2D value noise. Returns value in [-1, 1].
 */
export function noise2D(x, y) {
  const xi = Math.floor(x) & (NOISE_SIZE - 1);
  const yi = Math.floor(y) & (NOISE_SIZE - 1);
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = _fade(xf);
  const v = _fade(yf);

  const aa = _noiseGrad[_noisePerm[_noisePerm[xi] + yi]];
  const ab = _noiseGrad[_noisePerm[_noisePerm[xi] + yi + 1]];
  const ba = _noiseGrad[_noisePerm[_noisePerm[xi + 1] + yi]];
  const bb = _noiseGrad[_noisePerm[_noisePerm[xi + 1] + yi + 1]];

  const x1 = lerp(aa, ba, u);
  const x2 = lerp(ab, bb, u);
  return lerp(x1, x2, v);
}

/**
 * Fractal Brownian Motion — layered noise for organic terrain.
 */
export function fbm(x, octaves = 4, lacunarity = 2, gain = 0.5) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    sum += noise1D(x * freq) * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }

  return sum / maxAmp;
}

// ─── HSL Helpers ───
export function hslToString(h, s, l, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

export function lerpColor(c1, c2, t) {
  // c1, c2 are { r, g, b, a? }
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
    a: lerp(c1.a ?? 1, c2.a ?? 1, t),
  };
}

export function rgbToString({ r, g, b, a = 1 }) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: 1,
  } : { r: 0, g: 0, b: 0, a: 1 };
}

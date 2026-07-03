/* ═══════════════════════════════════════════════════════
   Terrain — Procedural ground with hills, soil layers
   ═══════════════════════════════════════════════════════ */

import { fbm, randomRange } from '../utils/math.js';

export class Terrain {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.groundLine = [];  // Array of y-values for each x
    this.seed = randomRange(0, 1000);
    this._generate();
  }

  _generate() {
    this.groundLine = [];
    const baseY = this.height * 0.78; // ground at ~78% height

    for (let x = 0; x <= this.width; x++) {
      // Use fractal noise for gentle rolling hills
      const noiseVal = fbm((x + this.seed) * 0.005, 4, 2, 0.5);
      const hillHeight = noiseVal * 40; // ±40px hills
      this.groundLine.push(baseY + hillHeight);
    }
  }

  /** Get the ground Y position at a given X. */
  getGroundY(x) {
    const ix = Math.floor(Math.max(0, Math.min(this.width, x)));
    return this.groundLine[ix] || this.height * 0.78;
  }

  /** Resize and regenerate terrain. */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this._generate();
  }
}

export default Terrain;

/* ═══════════════════════════════════════════════════════
   Weather — Rain, wind, snow, lightning
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import { randomRange } from '../utils/math.js';

export class Weather {
  constructor(world) {
    this.world = world;

    // Rain
    this.isRaining = false;
    this.rainIntensity = 0;       // 0..1
    this.rainTimer = 0;
    this.rainDuration = 0;

    // Wind
    this.windStrength = 0;        // -1..1 (negative = left, positive = right)
    this.windTarget = 0;

    // Lightning
    this.lightningActive = false;
    this.lightningX = 0;
    this.lightningY = 0;
    this.lightningTimer = 0;
    this.lightningFlash = 0;      // 0..1 screen flash intensity

    // Snow (only in winter)
    this.isSnowing = false;
    this.snowIntensity = 0;
  }

  update(dt) {
    // ─── Rain ───
    if (this.isRaining) {
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        this.isRaining = false;
        this.rainIntensity = Math.max(0, this.rainIntensity - 0.01);
      } else {
        // Ramp up
        this.rainIntensity = Math.min(1, this.rainIntensity + 0.02);
      }
    } else {
      this.rainIntensity = Math.max(0, this.rainIntensity - 0.005);
    }

    // ─── Wind ───
    this.windTarget += (Math.random() - 0.5) * 0.01;
    this.windTarget = Math.max(-0.6, Math.min(0.6, this.windTarget));
    this.windStrength += (this.windTarget - this.windStrength) * 0.02;

    // ─── Lightning ───
    if (this.lightningActive) {
      this.lightningTimer -= dt;
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 0.005);
      if (this.lightningTimer <= 0) {
        this.lightningActive = false;
        this.lightningFlash = 0;
      }
    }

    // ─── Snow ───
    const season = this.world.season;
    if (season === 'winter') {
      this.isSnowing = true;
      this.snowIntensity = 0.6;
    } else {
      this.isSnowing = false;
      this.snowIntensity = Math.max(0, this.snowIntensity - 0.01);
    }
    events.emit('weather:mix', { rainIntensity: this.rainIntensity });
  }

  /** Start rain from gesture. */
  startRain() {
    this.isRaining = true;
    this.rainDuration = 5000; // 5 seconds
    this.rainTimer = this.rainDuration;
  }

  /** Start natural rain (autonomous). */
  startNaturalRain() {
    this.isRaining = true;
    this.rainDuration = randomRange(8000, 20000);
    this.rainTimer = this.rainDuration;
    events.emit('weather:natural_rain');
  }

  /** Trigger lightning at a point. */
  triggerLightning(x, y) {
    this.lightningActive = true;
    this.lightningX = x;
    this.lightningY = y;
    this.lightningTimer = 800;
    this.lightningFlash = 1;
  }
}

export default Weather;

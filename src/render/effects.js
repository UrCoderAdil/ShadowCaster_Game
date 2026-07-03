/* ═══════════════════════════════════════════════════════
   Effects — Post-processing: bloom, screen shake,
   vignette, color grading, lightning bolts
   ═══════════════════════════════════════════════════════ */

import { clamp, randomRange, lerp } from '../utils/math.js';

export class Effects {
  constructor() {
    // Screen shake
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Lightning flash
    this.flashIntensity = 0;

    // Vignette
    this.vignetteIntensity = 0.3;

    // Transition
    this.transitionProgress = -1; // -1 = inactive
    this.transitionColor = '#000';
  }

  /** Update effects state. */
  update(dt, dayPhase, weather) {
    // Decay shake
    if (this.shakeIntensity > 0.01) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 20;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 20;
      this.shakeIntensity *= 0.9;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Lightning flash
    if (weather.lightningFlash > 0) {
      this.flashIntensity = weather.lightningFlash;
    } else {
      this.flashIntensity = Math.max(0, this.flashIntensity - dt * 0.005);
    }

    // Vignette intensity varies with day phase
    switch (dayPhase) {
      case 'night': this.vignetteIntensity = lerp(this.vignetteIntensity, 0.5, 0.02); break;
      case 'dusk': this.vignetteIntensity = lerp(this.vignetteIntensity, 0.4, 0.02); break;
      case 'dawn': this.vignetteIntensity = lerp(this.vignetteIntensity, 0.35, 0.02); break;
      default: this.vignetteIntensity = lerp(this.vignetteIntensity, 0.25, 0.02); break;
    }

    // Transition
    if (this.transitionProgress >= 0 && this.transitionProgress < 1) {
      this.transitionProgress += dt * 0.002;
      if (this.transitionProgress >= 1) this.transitionProgress = -1;
    }
  }

  /**
   * Draw all post-processing effects to the overlay canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} w
   * @param {number} h
   */
  draw(ctx, w, h) {
    // ─── Vignette ───
    this._drawVignette(ctx, w, h);

    // ─── Lightning flash ───
    if (this.flashIntensity > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 240, ${this.flashIntensity * 0.4})`;
      ctx.fillRect(0, 0, w, h);
    }

    // ─── Transition wipe ───
    if (this.transitionProgress >= 0) {
      const t = this.transitionProgress;
      const alpha = t < 0.5 ? t * 2 : (1 - t) * 2;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /**
   * Draw lightning bolt (procedural jagged line).
   */
  drawLightning(ctx, x, groundY, w, h) {
    if (this.flashIntensity < 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.flashIntensity;

    // Main bolt
    ctx.strokeStyle = 'rgba(255, 255, 220, 0.95)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(200, 200, 255, 0.8)';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    let bx = x;
    let by = 0;
    ctx.moveTo(bx, by);

    const segments = 12;
    const segHeight = groundY / segments;

    for (let i = 0; i < segments; i++) {
      bx += randomRange(-25, 25);
      by += segHeight;
      ctx.lineTo(bx, by);

      // Branch (random)
      if (Math.random() < 0.3 && i > 2) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by);
        const branchLen = randomRange(20, 60);
        const branchAngle = randomRange(-1, 1);
        ctx.lineTo(bx + Math.cos(branchAngle) * branchLen, by + Math.sin(branchAngle + 1) * branchLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by);
      }
    }

    ctx.stroke();

    // Inner bright core
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    bx = x;
    by = 0;
    ctx.moveTo(bx, by);
    for (let i = 0; i < segments; i++) {
      bx += randomRange(-20, 20);
      by += segHeight;
      ctx.lineTo(bx, by);
    }
    ctx.stroke();

    ctx.restore();
  }

  _drawVignette(ctx, w, h) {
    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, w * 0.3,
      w / 2, h / 2, w * 0.75
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${this.vignetteIntensity})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  /** Trigger screen shake. */
  triggerShake(intensity = 1) {
    this.shakeIntensity = intensity;
  }

  /** Start a biome transition. */
  startTransition() {
    this.transitionProgress = 0;
  }
}

export default Effects;

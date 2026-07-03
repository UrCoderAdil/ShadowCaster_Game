/* ═══════════════════════════════════════════════════════
   Sky Renderer — Day/night gradient, stars, moon, aurora
   ═══════════════════════════════════════════════════════ */

import { lerp, randomRange, clamp, hexToRgb, lerpColor, rgbToString } from '../utils/math.js';
import { SKY_COLORS } from '../core/constants.js';

// Pre-generate star positions
const STAR_COUNT = 120;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: Math.random(),
    y: Math.random() * 0.6,
    size: randomRange(0.5, 2),
    twinkleSpeed: randomRange(1, 4),
    twinkleOffset: randomRange(0, Math.PI * 2),
    brightness: randomRange(0.4, 1),
  });
}

export class SkyRenderer {
  constructor() {
    this._auroraPhase = 0;
    this._auroraActive = false;
  }

  /**
   * Draw the sky background.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} w - canvas width
   * @param {number} h - canvas height
   * @param {number} dayProgress - 0..1 through day cycle
   * @param {string} dayPhase - dawn/day/dusk/night
   * @param {string} season
   * @param {number} moonPhase - 0..1
   * @param {number} time - game time ms
   */
  draw(ctx, w, h, dayProgress, dayPhase, season, moonPhase, time) {
    // ─── Sky gradient ───
    const colors = this._getSkyColors(dayProgress);
    const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.8);
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(1, colors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // ─── Stars (visible at night and dusk/dawn edges) ───
    const starAlpha = this._getStarAlpha(dayProgress);
    if (starAlpha > 0.01) {
      this._drawStars(ctx, w, h, starAlpha, time);
    }

    // ─── Moon ───
    if (dayPhase === 'night' || dayPhase === 'dusk' || dayPhase === 'dawn') {
      this._drawMoon(ctx, w, h, moonPhase, dayProgress);
    }

    // ─── Aurora (winter nights, rare) ───
    if (season === 'winter' && dayPhase === 'night') {
      this._auroraActive = true;
      this._auroraPhase += 0.002;
      this._drawAurora(ctx, w, h, time);
    } else {
      this._auroraActive = false;
    }
  }

  _getSkyColors(dayProgress) {
    // Smooth blend between 4 phases
    // 0..0.2 = dawn, 0.2..0.5 = day, 0.5..0.7 = dusk, 0.7..1.0 = night
    const phases = [
      { start: 0, colors: SKY_COLORS.dawn },
      { start: 0.2, colors: SKY_COLORS.day },
      { start: 0.5, colors: SKY_COLORS.dusk },
      { start: 0.7, colors: SKY_COLORS.night },
      { start: 1.0, colors: SKY_COLORS.dawn }, // wrap
    ];

    let from = phases[0], to = phases[1];
    for (let i = 0; i < phases.length - 1; i++) {
      if (dayProgress >= phases[i].start && dayProgress < phases[i + 1].start) {
        from = phases[i];
        to = phases[i + 1];
        break;
      }
    }

    const t = (dayProgress - from.start) / (to.start - from.start);
    const topFrom = hexToRgb(from.colors.top);
    const topTo = hexToRgb(to.colors.top);
    const botFrom = hexToRgb(from.colors.bottom);
    const botTo = hexToRgb(to.colors.bottom);

    return {
      top: rgbToString(lerpColor(topFrom, topTo, t)),
      bottom: rgbToString(lerpColor(botFrom, botTo, t)),
    };
  }

  _getStarAlpha(dayProgress) {
    // Stars brightest at night (0.7-1.0), fade at dawn/dusk
    if (dayProgress > 0.75) return 1;
    if (dayProgress > 0.65) return (dayProgress - 0.65) / 0.1;
    if (dayProgress < 0.15) return 1 - (dayProgress / 0.15);
    return 0;
  }

  _drawStars(ctx, w, h, alpha, time) {
    const t = time / 1000;
    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset);
      const a = alpha * star.brightness * twinkle;
      if (a < 0.05) continue;

      ctx.fillStyle = `rgba(255, 255, 240, ${a})`;
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawMoon(ctx, w, h, moonPhase, dayProgress) {
    const moonAlpha = this._getStarAlpha(dayProgress) * 0.9;
    if (moonAlpha < 0.05) return;

    const mx = w * 0.82;
    const my = h * 0.12;
    const r = 22;

    ctx.save();
    ctx.globalAlpha = moonAlpha;

    // Moon glow
    const glow = ctx.createRadialGradient(mx, my, r, mx, my, r * 3);
    glow.addColorStop(0, 'rgba(200, 210, 255, 0.15)');
    glow.addColorStop(1, 'rgba(200, 210, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);

    // Moon disc
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();

    // Moon phase shadow (simplified crescent)
    const phaseOffset = (moonPhase * 2 - 1) * r * 1.5;
    ctx.fillStyle = 'rgba(20, 25, 50, 0.85)';
    ctx.beginPath();
    ctx.arc(mx + phaseOffset, my, r * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawAurora(ctx, w, h, time) {
    const t = time / 1000;
    ctx.save();
    ctx.globalAlpha = 0.15;

    for (let i = 0; i < 3; i++) {
      const yBase = h * 0.1 + i * 25;
      ctx.beginPath();
      ctx.moveTo(0, yBase);

      for (let x = 0; x <= w; x += 8) {
        const y = yBase + Math.sin(x * 0.008 + t * 0.3 + i) * 20
                        + Math.sin(x * 0.015 + t * 0.5 + i * 2) * 10;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, yBase + 50);
      ctx.lineTo(0, yBase + 50);
      ctx.closePath();

      const colors = ['rgba(100, 255, 150, 0.3)', 'rgba(80, 200, 255, 0.2)', 'rgba(150, 100, 255, 0.2)'];
      ctx.fillStyle = colors[i];
      ctx.fill();
    }

    ctx.restore();
  }

  get isAuroraActive() {
    return this._auroraActive;
  }
}

export default SkyRenderer;

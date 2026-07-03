/* ═══════════════════════════════════════════════════════
   Plant Renderer — L-system procedural drawing with
   growth animation, wind sway, seasonal colors
   ═══════════════════════════════════════════════════════ */

import { SEASON_PALETTE, GROWTH_STAGES } from '../core/constants.js';
import { clamp, lerp, degToRad, randomRange, hslToString } from '../utils/math.js';

export class PlantRenderer {
  constructor() {
    this._time = 0;
  }

  /**
   * Draw all plants.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Plant[]} plants
   * @param {string} season
   * @param {number} windStrength - -1..1
   * @param {number} time - game time ms
   */
  drawAll(ctx, plants, season, windStrength, time) {
    this._time = time / 1000;

    // Sort plants by Y (back to front) for depth illusion
    const sorted = [...plants].sort((a, b) => a.y - b.y);

    for (const plant of sorted) {
      if (plant.isDead) continue;
      this.drawPlant(ctx, plant, season, windStrength);
    }
  }

  drawPlant(ctx, plant, season, windStrength) {
    if (plant.scale < 0.01) return;
    if (!plant.lsystemCommands || plant.lsystemCommands.length === 0) return;

    ctx.save();
    ctx.translate(plant.x, plant.y);

    // Overall scale based on growth
    const s = plant.scale;
    ctx.scale(s, s);

    const palette = SEASON_PALETTE[season] || SEASON_PALETTE.spring;
    const baseHue = this._getSpeciesHue(plant.species.id) + plant.colorVariation;
    const windSway = windStrength * plant.swayAmount;
    const timeSway = Math.sin(this._time * 1.5 + plant.swayOffset) * plant.swayAmount;
    const totalSway = windSway + timeSway;

    // Apply gentle sway rotation at the base
    ctx.rotate(totalSway);

    // Draw using L-system commands
    const stateStack = [];
    let currentAngle = -Math.PI / 2; // Start pointing up
    let x = 0, y = 0;
    let lineWidth = Math.max(1, 4 * s);
    const stepScale = 1;
    let depth = 0;

    // Trunk/stem color
    const trunkColor = this._getTrunkColor(plant.species.id, season);

    for (const cmd of plant.lsystemCommands) {
      switch (cmd.type) {
        case 'draw': {
          const len = cmd.length * stepScale;
          const nx = x + Math.cos(currentAngle) * len;
          const ny = y + Math.sin(currentAngle) * len;

          // Sway increases with height (further from root)
          const swayFactor = Math.abs(y) * 0.001;
          const swayX = Math.sin(this._time * 2 + depth * 0.5) * swayFactor * windStrength * 20;

          ctx.strokeStyle = depth > 1 ? palette.leaf : trunkColor;
          ctx.lineWidth = Math.max(0.5, lineWidth - depth * 0.8);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x + swayX * 0.5, y);
          ctx.lineTo(nx + swayX, ny);
          ctx.stroke();

          x = nx + swayX;
          y = ny;
          break;
        }

        case 'move': {
          const len = cmd.length * stepScale;
          x += Math.cos(currentAngle) * len;
          y += Math.sin(currentAngle) * len;
          break;
        }

        case 'turn':
          currentAngle += cmd.angle;
          break;

        case 'push':
          stateStack.push({ x, y, angle: currentAngle, lineWidth, depth });
          depth++;
          break;

        case 'pop':
          if (stateStack.length > 0) {
            const s = stateStack.pop();
            x = s.x; y = s.y;
            currentAngle = s.angle;
            lineWidth = s.lineWidth;
            depth = s.depth;
          }
          break;

        case 'leaf':
          if (plant.stageIndex >= 2) { // Show leaves from sapling stage
            this._drawLeaf(ctx, x, y, currentAngle, baseHue, season, plant);
          }
          break;

        case 'flower':
          if (plant.stageIndex >= 4) { // Show flowers from flowering stage
            this._drawFlower(ctx, x, y, baseHue, plant);
          } else if (plant.species.id === 'mushroom' && plant.stageIndex >= 2) {
            this._drawMushroomCap(ctx, x, y, plant);
          }
          break;

        case 'thin':
          lineWidth *= 0.7;
          break;

        case 'thicken':
          lineWidth *= 1.3;
          break;
      }
    }

    // Draw fruit if in fruiting stage
    if (plant.stageIndex >= 5) {
      this._drawFruit(ctx, 0, -plant.species.maxHeight * 0.7, plant);
    }

    // Seed indicator for very early growth
    if (plant.stageIndex === 0) {
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawLeaf(ctx, x, y, angle, hue, season, plant) {
    const palette = SEASON_PALETTE[season];
    const leafSize = 5 + plant.scale * 4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.sin(this._time * 3 + x) * 0.1);

    // Leaf shape
    ctx.fillStyle = palette.leaf;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, leafSize, leafSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawFlower(ctx, x, y, hue, plant) {
    const flowerSize = 4 + plant.scale * 5;
    const petalCount = 5;

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.9;

    // Petals
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 + this._time * 0.2;
      ctx.fillStyle = hslToString((hue + 300) % 360, 70, 65);
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(angle) * flowerSize * 0.5,
        Math.sin(angle) * flowerSize * 0.5,
        flowerSize * 0.5,
        flowerSize * 0.25,
        angle,
        0, Math.PI * 2
      );
      ctx.fill();
    }

    // Center
    ctx.fillStyle = hslToString(45, 90, 60);
    ctx.beginPath();
    ctx.arc(0, 0, flowerSize * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawMushroomCap(ctx, x, y, plant) {
    const size = 8 + plant.scale * 12;
    ctx.save();
    ctx.translate(x, y);

    // Cap
    ctx.fillStyle = `hsl(0, 70%, ${40 + plant.colorVariation}%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Spots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 3; i++) {
      const sx = (i - 1) * size * 0.35;
      const sy = -size * 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawFruit(ctx, x, y, plant) {
    const size = 4 + plant.scale * 3;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = hslToString(40, 90, 55);
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-size * 0.25, -size * 0.25, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _getTrunkColor(speciesId, season) {
    const browns = {
      spring: '#6d4c2a',
      summer: '#5c3d1e',
      autumn: '#4a3015',
      winter: '#3d3d3d',
    };

    if (speciesId === 'cactus') return '#2d8a4e';
    if (speciesId === 'coral') return '#e06060';
    if (speciesId === 'crystal_shard') return '#8080c0';
    if (speciesId === 'kelp') return '#3a7a3a';

    return browns[season] || browns.spring;
  }

  _getSpeciesHue(speciesId) {
    const hues = {
      daisy: 50, tulip: 350, sunflower: 45, clover: 130,
      oak: 100, mushroom: 0, fern: 120, vine: 150,
      cactus: 135, agave: 100, desert_rose: 340,
      coral: 15, anemone: 310, kelp: 140,
      crystal_shard: 250, glow_moss: 80, gem_flower: 280,
      storm_flower: 200, moonbloom: 260,
    };
    return hues[speciesId] || 120;
  }
}

export default PlantRenderer;

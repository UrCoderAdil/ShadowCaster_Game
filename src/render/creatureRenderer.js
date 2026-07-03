/* ═══════════════════════════════════════════════════════
   Creature Renderer — Procedural animation (no sprites)
   ═══════════════════════════════════════════════════════ */

import { hslToString } from '../utils/math.js';

export class CreatureRenderer {

  drawAll(ctx, creatures, time) {
    const t = time / 1000;

    for (const c of creatures) {
      if (c.alpha < 0.02) continue;
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.pos.x, c.pos.y);
      ctx.scale(c.scale, c.scale);

      switch (c.type.id) {
        case 'butterfly':
          this._drawButterfly(ctx, c, t);
          break;
        case 'moth':
          this._drawMoth(ctx, c, t);
          break;
        case 'firefly':
          this._drawFirefly(ctx, c, t);
          break;
        case 'bird':
          this._drawBird(ctx, c, t);
          break;
        case 'frog':
          this._drawFrog(ctx, c, t);
          break;
        case 'fish':
          this._drawFish(ctx, c, t);
          break;
        default:
          // Fallback dot
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }
  }

  _drawButterfly(ctx, creature, t) {
    const wingFlap = Math.sin(creature.animPhase) * 0.8;
    const bodySize = 4;
    const wingSize = 10;

    // Direction based on velocity
    const facing = creature.vel.x >= 0 ? 1 : -1;

    // Body
    ctx.fillStyle = '#2d1b4e';
    ctx.beginPath();
    ctx.ellipse(0, 0, bodySize * 0.4, bodySize, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.save();

    // Left wing
    ctx.save();
    ctx.scale(1, Math.cos(wingFlap));
    ctx.fillStyle = hslToString(
      280 + Math.sin(creature.animPhase * 0.1) * 30,
      70, 55, 0.8
    );
    ctx.beginPath();
    ctx.ellipse(-wingSize * 0.4, -2, wingSize, wingSize * 0.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Wing pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-wingSize * 0.5, -3, wingSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.scale(1, Math.cos(wingFlap + 0.2));
    ctx.fillStyle = hslToString(
      280 + Math.sin(creature.animPhase * 0.1) * 30,
      70, 55, 0.8
    );
    ctx.beginPath();
    ctx.ellipse(wingSize * 0.4, -2, wingSize, wingSize * 0.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(wingSize * 0.5, -3, wingSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Antennae
    ctx.strokeStyle = '#2d1b4e';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1, -bodySize);
    ctx.quadraticCurveTo(-4, -bodySize - 6, -3, -bodySize - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -bodySize);
    ctx.quadraticCurveTo(4, -bodySize - 6, 3, -bodySize - 8);
    ctx.stroke();
  }

  _drawMoth(ctx, creature, t) {
    const wingFlap = Math.sin(creature.animPhase) * 0.6;

    // Body
    ctx.fillStyle = '#5c5c5c';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings (dusty)
    ctx.save();
    ctx.scale(1, Math.cos(wingFlap));
    ctx.fillStyle = 'rgba(180, 170, 160, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-5, -1, 9, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -1, 9, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eye spots
    ctx.fillStyle = 'rgba(50, 50, 80, 0.5)';
    ctx.beginPath();
    ctx.arc(-5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawFirefly(ctx, creature, t) {
    const glow = creature.glowIntensity;

    // Glow
    if (glow > 0.1) {
      const glowR = 12 + glow * 8;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      gradient.addColorStop(0, `rgba(200, 255, 100, ${glow * 0.6})`);
      gradient.addColorStop(0.5, `rgba(200, 255, 100, ${glow * 0.2})`);
      gradient.addColorStop(1, 'rgba(200, 255, 100, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-glowR, -glowR, glowR * 2, glowR * 2);
    }

    // Body
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Light abdomen
    ctx.fillStyle = `rgba(200, 255, 100, ${0.5 + glow * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, 2, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBird(ctx, creature, t) {
    const wingAngle = Math.sin(creature.animPhase) * 0.5;
    const facing = creature.vel.x >= 0 ? 1 : -1;

    ctx.save();
    ctx.scale(facing, 1);

    // Body
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.arc(7, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f6ad55';
    ctx.beginPath();
    ctx.moveTo(11, -2);
    ctx.lineTo(14, -1);
    ctx.lineTo(11, 0);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8.5, -3, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.fillStyle = '#718096';
    ctx.save();
    ctx.translate(0, -3);
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -10, -4, -2);
    ctx.fill();
    ctx.restore();

    // Tail
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-14, -3);
    ctx.lineTo(-14, 3);
    ctx.fill();

    ctx.restore();
  }

  _drawFrog(ctx, creature, t) {
    // Hop animation
    const hopPhase = Math.abs(Math.sin(creature.animPhase * 0.3));
    const hopY = -hopPhase * 8;

    ctx.save();
    ctx.translate(0, hopY);

    // Body
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#c6f6d5';
    ctx.beginPath();
    ctx.ellipse(0, 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Legs (back)
    ctx.strokeStyle = '#48bb78';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(-12, 8, -10, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.quadraticCurveTo(12, 8, 10, 2);
    ctx.stroke();

    ctx.restore();
  }

  _drawFish(ctx, creature, t) {
    const tailSwing = Math.sin(creature.animPhase) * 0.3;
    const facing = creature.vel.x >= 0 ? 1 : -1;

    ctx.save();
    ctx.scale(facing, 1);

    // Body
    ctx.fillStyle = hslToString(
      30 + Math.sin(creature.animPhase * 0.1) * 20,
      80, 55
    );
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.save();
    ctx.translate(-10, 0);
    ctx.rotate(tailSwing);
    ctx.fillStyle = hslToString(30, 70, 50);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(5.5, -1, 1, 0, Math.PI * 2);
    ctx.fill();

    // Fin
    ctx.fillStyle = 'rgba(255, 150, 50, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export default CreatureRenderer;

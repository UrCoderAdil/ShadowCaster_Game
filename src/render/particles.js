/* ═══════════════════════════════════════════════════════
   Particle System — Pooled, high-performance, 10+ types
   ═══════════════════════════════════════════════════════ */

import { Pool } from '../utils/pool.js';
import { randomRange, clamp, Vec2 } from '../utils/math.js';
import { MAX_PARTICLES, PARTICLE_POOL_SIZE } from '../core/constants.js';
import state from '../core/state.js';
import events from '../core/events.js';

// Particle object shape
function createParticle() {
  return {
    type: 'rain',
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: 1,
    life: 0, maxLife: 1000,
    alpha: 1,
    color: '#fff',
    rotation: 0,
    rotationSpeed: 0,
    // Extra fields for specific types
    length: 0,        // rain streak length
    glowRadius: 0,    // firefly glow
    swayPhase: 0,     // leaf/snow sway
    trailX: 0, trailY: 0,
  };
}

function resetParticle(p) {
  p.type = 'rain';
  p.x = 0; p.y = 0;
  p.vx = 0; p.vy = 0;
  p.size = 1;
  p.life = 0; p.maxLife = 1000;
  p.alpha = 1;
  p.color = '#fff';
  p.rotation = 0;
  p.rotationSpeed = 0;
  p.length = 0;
  p.glowRadius = 0;
  p.swayPhase = 0;
  p.trailX = 0; p.trailY = 0;
}

export class ParticleSystem {
  constructor() {
    this.pool = new Pool(createParticle, resetParticle, PARTICLE_POOL_SIZE);
    this._densityMultiplier = 1;
    this._bindEvents();
  }

  _bindEvents() {
    events.on('game:rain', () => {}); // rain particles emitted in update loop
    events.on('game:smash', ({ x, y }) => this.emitSmash(x, y));
    events.on('game:harvest', ({ x, y, reward }) => this.emitHarvest(x, y, reward));
    events.on('game:lightning', ({ x, y }) => this.emitLightning(x, y));
    events.on('game:summon', () => this.emitSummonSparkle());
    events.on('combo:triggered', (combo) => this.emitCombo(combo));
  }

  setDensity(level) {
    this._densityMultiplier = [0.4, 1, 1.8][level - 1] || 1;
  }

  /** Main update — move all particles, remove dead ones. */
  update(dt, weather, world) {
    // Emit weather particles
    if (weather.isRaining) {
      this._emitRain(weather.rainIntensity, world, dt);
    }
    if (weather.isSnowing) {
      this._emitSnow(weather.snowIntensity, world, dt);
    }

    const wind = weather.windStrength;

    // Update all active particles
    this.pool.forEach((p) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false; // release

      // Apply velocity
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.rotation += p.rotationSpeed * (dt / 16);

      // Type-specific updates
      switch (p.type) {
        case 'rain':
          p.vx += wind * 0.5;
          p.alpha = 0.6;
          // Off screen = dead
          if (p.y > world.height + 10) return false;
          break;

        case 'snow':
          p.swayPhase += dt * 0.003;
          p.x += Math.sin(p.swayPhase) * 0.5;
          p.vx += wind * 0.3;
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 0.8);
          if (p.y > world.height + 10) return false;
          break;

        case 'leaf':
          p.swayPhase += dt * 0.004;
          p.x += Math.sin(p.swayPhase) * 1.5;
          p.vx += wind * 0.4;
          p.vy += 0.02; // gravity
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 1);
          if (p.y > world.height) return false;
          break;

        case 'pollen':
          p.swayPhase += dt * 0.002;
          p.x += Math.sin(p.swayPhase) * 0.3;
          p.y += Math.cos(p.swayPhase * 0.7) * 0.2;
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 0.7);
          break;

        case 'spark':
        case 'ember':
          p.vy -= 0.05; // float up
          p.vx += wind * 0.2;
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 1);
          p.size *= 0.995;
          break;

        case 'essence':
          p.vy -= 0.1;
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 1);
          p.size *= 0.99;
          break;

        case 'shockwave':
          p.size += 3 * (dt / 16);
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 0.6);
          break;

        case 'petal':
          p.swayPhase += dt * 0.005;
          p.x += Math.sin(p.swayPhase) * 2;
          p.vy += 0.01;
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 1);
          break;

        case 'splash':
          p.vy += 0.15; // gravity
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 0.8);
          break;

        default:
          p.alpha = clamp(1 - p.life / p.maxLife, 0, 1);
      }

      return true; // keep alive
    });
  }

  /** Draw all particles. */
  draw(ctx, gameTime) {
    this.pool.forEach((p) => {
      if (p.alpha <= 0.01) return true;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      switch (p.type) {
        case 'rain':
          ctx.strokeStyle = 'rgba(180, 210, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.5, p.y - p.length);
          ctx.stroke();
          break;

        case 'snow':
          ctx.fillStyle = 'rgba(240, 245, 255, 0.9)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'leaf':
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'pollen':
          ctx.fillStyle = 'rgba(255, 215, 80, 0.8)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'spark':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Glow
          const sparkGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          sparkGlow.addColorStop(0, p.color);
          sparkGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = sparkGlow;
          ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
          break;

        case 'essence':
          ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Sparkle effect
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          glow.addColorStop(0, 'rgba(196, 181, 253, 0.5)');
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
          break;

        case 'shockwave':
          ctx.strokeStyle = `rgba(255, 200, 100, ${p.alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'ember':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'petal':
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // Heart-like petal shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'splash':
          ctx.fillStyle = 'rgba(180, 210, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        default:
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
      return true;
    });
  }

  // ─── Emitters ───

  _emitRain(intensity, world, dt) {
    const count = Math.floor(intensity * 4 * this._densityMultiplier * (dt / 16));
    for (let i = 0; i < count; i++) {
      if (this.pool.activeCount >= MAX_PARTICLES) break;
      const p = this.pool.acquire();
      p.type = 'rain';
      p.x = randomRange(-50, world.width + 50);
      p.y = randomRange(-20, -5);
      p.vx = randomRange(-1, 1);
      p.vy = randomRange(8, 14);
      p.length = randomRange(8, 18);
      p.maxLife = 3000;
      p.size = 1;
    }
  }

  _emitSnow(intensity, world, dt) {
    const count = Math.floor(intensity * 1.5 * this._densityMultiplier * (dt / 16));
    for (let i = 0; i < count; i++) {
      if (this.pool.activeCount >= MAX_PARTICLES) break;
      const p = this.pool.acquire();
      p.type = 'snow';
      p.x = randomRange(-20, world.width + 20);
      p.y = -5;
      p.vx = randomRange(-0.5, 0.5);
      p.vy = randomRange(0.5, 2);
      p.size = randomRange(1.5, 4);
      p.maxLife = 10000;
      p.swayPhase = randomRange(0, Math.PI * 2);
    }
  }

  emitSmash(x, y) {
    // Shockwave
    const sw = this.pool.acquire();
    sw.type = 'shockwave';
    sw.x = x;
    sw.y = y;
    sw.size = 5;
    sw.maxLife = 600;

    // Debris particles
    const count = Math.floor(20 * this._densityMultiplier);
    for (let i = 0; i < count; i++) {
      if (this.pool.activeCount >= MAX_PARTICLES) break;
      const p = this.pool.acquire();
      p.type = 'leaf';
      p.x = x + randomRange(-30, 30);
      p.y = y + randomRange(-20, 10);
      p.vx = randomRange(-4, 4);
      p.vy = randomRange(-6, -1);
      p.size = randomRange(2, 5);
      p.maxLife = randomRange(1500, 3000);
      p.rotation = randomRange(0, Math.PI * 2);
      p.rotationSpeed = randomRange(-0.1, 0.1);
      p.color = `hsl(${randomRange(80, 140)}, 60%, ${randomRange(30, 60)}%)`;
    }
  }

  emitHarvest(x, y, reward) {
    // Essence sparkles
    const count = Math.floor((8 + reward) * this._densityMultiplier);
    for (let i = 0; i < count; i++) {
      if (this.pool.activeCount >= MAX_PARTICLES) break;
      const p = this.pool.acquire();
      p.type = 'essence';
      p.x = x + randomRange(-20, 20);
      p.y = y + randomRange(-30, 0);
      p.vx = randomRange(-2, 2);
      p.vy = randomRange(-4, -1);
      p.size = randomRange(2, 4);
      p.maxLife = randomRange(1500, 2500);
    }

    // Petals
    for (let i = 0; i < 12; i++) {
      if (this.pool.activeCount >= MAX_PARTICLES) break;
      const p = this.pool.acquire();
      p.type = 'petal';
      p.x = x + randomRange(-15, 15);
      p.y = y + randomRange(-20, 0);
      p.vx = randomRange(-3, 3);
      p.vy = randomRange(-5, -2);
      p.size = randomRange(3, 6);
      p.maxLife = randomRange(2000, 3500);
      p.rotation = randomRange(0, Math.PI * 2);
      p.rotationSpeed = randomRange(-0.05, 0.05);
      p.color = `hsl(${randomRange(300, 360)}, 80%, ${randomRange(60, 80)}%)`;
      p.swayPhase = randomRange(0, Math.PI * 2);
    }
  }

  emitLightning(x, groundY) {
    // Embers at strike point
    const count = Math.floor(15 * this._densityMultiplier);
    for (let i = 0; i < count; i++) {
      if (this.pool.activeCount >= MAX_PARTICLES) break;
      const p = this.pool.acquire();
      p.type = 'ember';
      p.x = x + randomRange(-15, 15);
      p.y = groundY + randomRange(-10, 5);
      p.vx = randomRange(-3, 3);
      p.vy = randomRange(-5, -1);
      p.size = randomRange(1, 3);
      p.maxLife = randomRange(1000, 2000);
      p.color = `hsl(${randomRange(20, 50)}, 100%, ${randomRange(50, 80)}%)`;
    }

    // Spark flash
    for (let i = 0; i < 8; i++) {
      const p = this.pool.acquire();
      p.type = 'spark';
      p.x = x + randomRange(-10, 10);
      p.y = groundY + randomRange(-5, 5);
      p.vx = randomRange(-6, 6);
      p.vy = randomRange(-8, -2);
      p.size = randomRange(2, 4);
      p.maxLife = 500;
      p.color = 'rgba(255, 255, 200, 0.9)';
    }
  }

  emitSummonSparkle() {
    // Sparkle effect in the center of screen
    // Actual position will be updated by the caller if needed
  }

  emitCombo(combo) {
    // Rainbow particles for rainbow harvest
    if (combo.id === 'rainbow_harvest') {
      for (let i = 0; i < 30; i++) {
        if (this.pool.activeCount >= MAX_PARTICLES) break;
        const p = this.pool.acquire();
        p.type = 'essence';
        p.x = randomRange(100, 700);
        p.y = randomRange(100, 300);
        p.vx = randomRange(-2, 2);
        p.vy = randomRange(-3, 0);
        p.size = randomRange(3, 6);
        p.maxLife = 3000;
        p.color = `hsl(${(i * 12) % 360}, 80%, 65%)`;
      }
    }
  }

  /** Emit pollen from a flowering plant. */
  emitPollen(x, y) {
    if (this.pool.activeCount >= MAX_PARTICLES || Math.random() > 0.1) return;
    const p = this.pool.acquire();
    p.type = 'pollen';
    p.x = x + randomRange(-10, 10);
    p.y = y + randomRange(-5, 5);
    p.vx = randomRange(-0.3, 0.3);
    p.vy = randomRange(-0.5, 0.1);
    p.size = randomRange(1, 2.5);
    p.maxLife = randomRange(3000, 6000);
    p.swayPhase = randomRange(0, Math.PI * 2);
  }

  /** Emit rain splash at ground impact point. */
  emitSplash(x, y) {
    if (this.pool.activeCount >= MAX_PARTICLES - 50) return;
    for (let i = 0; i < 3; i++) {
      const p = this.pool.acquire();
      p.type = 'splash';
      p.x = x + randomRange(-3, 3);
      p.y = y;
      p.vx = randomRange(-1.5, 1.5);
      p.vy = randomRange(-3, -1);
      p.size = randomRange(1, 2);
      p.maxLife = 300;
    }
  }

  get activeCount() {
    return this.pool.activeCount;
  }
}

export default ParticleSystem;

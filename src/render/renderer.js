/* ═══════════════════════════════════════════════════════
   Main Renderer — 60fps loop, layer compositing
   ═══════════════════════════════════════════════════════ */

import { SkyRenderer } from './sky.js';
import { ParticleSystem } from './particles.js';
import { PlantRenderer } from './plantRenderer.js';
import { CreatureRenderer } from './creatureRenderer.js';
import { Effects } from './effects.js';
import { SEASON_PALETTE, SEASONS } from '../core/constants.js';
import state from '../core/state.js';
import events from '../core/events.js';
import { fbm, lerp, clamp } from '../utils/math.js';
import { Scene } from './scene.js';
import { SpellEffects } from './spells.js';
import { Terrain } from '../game/terrain.js';
import { Plant } from '../game/plant.js';
import { PLANT_SPECIES } from '../core/constants.js';

export class Renderer {
  constructor() {
    // Canvases
    this.gameCanvas = document.getElementById('game-canvas');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.debugCanvas = document.getElementById('debug-canvas');

    this.ctx = this.gameCanvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.debugCtx = this.debugCanvas.getContext('2d');

    // Sub-renderers
    this.sky = new SkyRenderer();
    this.particles = new ParticleSystem();
    this.plantRenderer = new PlantRenderer();
    this.creatureRenderer = new CreatureRenderer();
    this.effects = new Effects();
    this.scene = new Scene();
    this.spells = new SpellEffects();

    // State
    this._rafId = null;
    this._lastTime = 0;
    this._world = null;

    // Resize
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Listen for game events
    events.on('game:smash', () => this.effects.triggerShake(0.8));
    events.on('game:lightning', ({ x, y }) => {
      this._lightningX = x;
      this._lightningY = y;
    });
    events.on('biome:changed', () => this.effects.startTransition());

    this._lightningX = 0;
    this._lightningY = 0;
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.width = w;
    this.height = h;

    // Set canvas sizes
    for (const canvas of [this.gameCanvas, this.overlayCanvas]) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.getContext('2d').scale(dpr, dpr);
    }

    // Notify world of resize
    if (this._world) {
      this._world.resize(w, h);
    }
    this._attractTerrain = new Terrain(w, h);
    this._attractPlants = Array.from({ length: 16 }, (_, i) => {
      const x = w * (0.48 + i / 15 * 0.49);
      const plant = new Plant(PLANT_SPECIES[['sunflower','tulip','daisy','fern'][i % 4]], x, this._attractTerrain.getGroundY(x));
      plant.growthProgress = plant.scale = 0.75 + Math.random() * 0.25; plant._updateStage(); return plant;
    });
  }

  /** Set the game world reference. */
  setWorld(world) {
    this._world = world;
  }

  /** Start the render loop. */
  start() {
    if (this._rafId) return;
    this._lastTime = performance.now();
    this._loop();
  }

  _loop() {
    const now = performance.now();
    const dt = Math.min(50, now - this._lastTime);
    this._lastTime = now;

    if (!state.get('isPaused') || !this._world) {
      this._render(dt, now);
    }

    this._rafId = requestAnimationFrame(() => this._loop());
  }

  _render(dt, time) {
    const world = this._world;
    if (!world) {
      const ctx = this.ctx, w = this.width, h = this.height;
      const t = state.get('reducedMotion') ? 0 : time;
      this.overlayCtx.clearRect(0, 0, w, h);
      this.scene.draw(ctx,w,h,t,'meadow',true);
      this.scene.ground(ctx,w,h,this._attractTerrain,t);
      this.plantRenderer.drawAll(ctx,this._attractPlants,'spring',0.15,t);
      this.scene.foreground(ctx,w,h,t);
      return;
    }

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear
    ctx.clearRect(0, 0, w, h);
    this.overlayCtx.clearRect(0, 0, w, h);

    const dayProgress = state.get('dayProgress') || 0;
    const dayPhase = state.get('dayPhase') || 'day';
    const seasonIndex = state.get('seasonIndex') || 0;
    const season = SEASONS[seasonIndex];
    const moonPhase = state.get('moonPhase') || 0;
    const gameTime = state.get('gameTime') || 0;

    // Apply screen shake
    ctx.save();
    if (this.effects.shakeIntensity > 0.01) {
      ctx.translate(this.effects.shakeOffsetX, this.effects.shakeOffsetY);
    }

    // ─── Layer 1: Sky ───
    const visualTime = state.get('reducedMotion') ? 0 : gameTime;
    this.scene.draw(ctx,w,h,visualTime,state.get('currentBiome'),false,dayPhase);

    // ─── Layer 2: Terrain / Ground ───
    this.scene.ground(ctx,w,h,world.terrain,visualTime,state.get('currentBiome'));

    // ─── Layer 3: Plants ───
    this.plantRenderer.drawAll(ctx, world.plants, season, state.get('reducedMotion') ? 0 : world.weather.windStrength, visualTime);

    // ─── Layer 4: Creatures ───
    this.creatureRenderer.drawAll(ctx, world.creatures.creatures, gameTime);

    // ─── Layer 5: Particles (weather + effects) ───
    this.particles.update(dt, world.weather, world);
    this.particles.draw(ctx, gameTime);

    // ─── Layer 5b: Pollen from flowering plants ───
    for (const plant of world.plants) {
      if ((plant.stage === 'flowering' || plant.stage === 'fruiting') && !plant.isDead) {
        if (Math.random() < dt / 100) this.particles.emitPollen(plant.x, plant.y - plant.visualHeight * 0.8);
      }
    }

    // ─── Lightning bolt ───
    this.spells.draw(ctx,dt,w,h,world.terrain);
    this.scene.foreground(ctx,w,h,visualTime);

    ctx.restore();

    // ─── Overlay: Post-processing ───
    this.effects.update(dt, dayPhase, world.weather);
    this.effects.draw(this.overlayCtx, w, h);

    // ─── Debug overlay ───
    if (state.get('showDebug')) {
      this._drawDebugInfo(time);
    }
  }

  _drawTerrain(ctx, w, h, terrain, season, dayPhase) {
    const palette = SEASON_PALETTE[season] || SEASON_PALETTE.spring;

    // Ground fill
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 4) {
      ctx.lineTo(x, terrain.getGroundY(x));
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    // Gradient for ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
    const groundDarkness = dayPhase === 'night' ? 0.5 : 1;
    groundGrad.addColorStop(0, palette.ground);
    groundGrad.addColorStop(1, this._darkenColor(palette.ground, 0.5 * groundDarkness));
    ctx.fillStyle = groundGrad;
    ctx.fill();

    // Grass line on top
    ctx.strokeStyle = palette.leaf;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = terrain.getGroundY(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  _darkenColor(hex, amount) {
    // Simple darken by reducing brightness
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 255) * amount) | 0;
    const g = Math.max(0, ((num >> 8) & 255) * amount) | 0;
    const b = Math.max(0, (num & 255) * amount) | 0;
    return `rgb(${r},${g},${b})`;
  }

  _drawDebugInfo(time) {
    const cv = window.cv;
    if (!cv) return;

    // The debug canvas shows the binary mask from CV processor
    // This is handled in main.js where the processor writes to debug canvas
  }

  /** Get the particle system for external access. */
  getParticleSystem() {
    return this.particles;
  }

  clearEffects() { this.particles.pool.releaseAll(); this.spells.clear(); this.effects.shakeIntensity = 0; this.effects.flashIntensity = 0; }

  /** Stop the render loop. */
  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}

export default Renderer;

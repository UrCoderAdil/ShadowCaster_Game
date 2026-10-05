/* ═══════════════════════════════════════════════════════
   Creature — Butterflies, fireflies, birds, frogs, fish
   Simple AI with wandering, seeking, fleeing behaviors
   ═══════════════════════════════════════════════════════ */

import { CREATURE_TYPES } from '../core/constants.js';
import state from '../core/state.js';
import events from '../core/events.js';
import { Vec2, randomRange, randomPick, clamp, distance } from '../utils/math.js';

class Creature {
  constructor(type, x, y) {
    this.type = type;
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(0, 0);
    this.target = new Vec2(x, y);
    this.id = `creature_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    this.speed = type.speed || 1;
    this.age = 0;
    this.lifetime = randomRange(30_000, 90_000); // 30-90 seconds
    this.isDead = false;

    // Animation
    this.animPhase = randomRange(0, Math.PI * 2);
    this.animSpeed = randomRange(3, 8);
    this.scale = randomRange(0.7, 1.3);
    this.alpha = 0; // fade in

    // AI state
    this.state = 'wander'; // wander, seek, flee
    this.stateTimer = 0;

    // Firefly glow
    this.glowIntensity = 0;

    this._pickNewTarget(x - 200, x + 200, y - 150, y + 100);
  }

  update(dt, world) {
    if (this.isDead) return;

    this.age += dt;
    this.animPhase += (dt / 1000) * this.animSpeed;

    // Fade in
    this.alpha = clamp(this.alpha + dt * 0.003, 0, 1);

    // Die of old age
    if (this.age > this.lifetime) {
      this.alpha -= dt * 0.005;
      if (this.alpha <= 0) this.isDead = true;
      return;
    }

    // Nocturnal creatures hide during day
    if (this.type.nocturnal && world.dayPhase === 'day') {
      this.alpha = clamp(this.alpha - dt * 0.002, 0.1, 1);
    } else if (this.type.nocturnal) {
      this.alpha = clamp(this.alpha + dt * 0.002, 0, 1);
    }

    // Firefly glow pulse
    if (this.type.id === 'firefly') {
      this.glowIntensity = 0.5 + 0.5 * Math.sin(this.animPhase * 0.5);
    }

    // AI behavior
    this.stateTimer -= dt;

    if (this.stateTimer <= 0) {
      this.state = 'wander';
      this._pickNewTarget(
        clamp(this.pos.x - 200, 50, world.width - 50),
        clamp(this.pos.x + 200, 50, world.width - 50),
        clamp(this.pos.y - 100, 50, world.height - 100),
        clamp(this.pos.y + 100, 100, world.height - 50),
      );
      this.stateTimer = randomRange(2000, 5000);
    }

    // Move toward target
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.vel.x = (dx / dist) * this.speed * (dt / 16);
      this.vel.y = (dy / dist) * this.speed * (dt / 16);
    } else {
      this.vel.x *= 0.9;
      this.vel.y *= 0.9;
    }

    // Add some float/wobble
    if (this.type.id === 'butterfly' || this.type.id === 'moth') {
      this.vel.y += Math.sin(this.animPhase) * 0.3;
      this.vel.x += Math.cos(this.animPhase * 0.7) * 0.2;
    }

    if (this.type.id === 'bird') {
      this.vel.y += Math.sin(this.animPhase * 0.3) * 0.5;
    }

    this.pos.add(this.vel);

    // Keep in bounds
    this.pos.x = clamp(this.pos.x, 10, world.width - 10);
    this.pos.y = clamp(this.pos.y, 30, world.height - 30);
  }

  _pickNewTarget(minX, maxX, minY, maxY) {
    this.target.set(
      randomRange(minX, maxX),
      randomRange(minY, maxY),
    );
  }

  /** Flee from a point (fist smash). */
  fleeFrom(x, y) {
    this.state = 'flee';
    // Move away from the smash point
    const dx = this.pos.x - x;
    const dy = this.pos.y - y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    this.target.set(
      this.pos.x + (dx / dist) * 200,
      this.pos.y + (dy / dist) * 150,
    );
    this.stateTimer = 3000;
  }
}

export class CreatureManager {
  constructor(world) {
    this.world = world;
    this.creatures = [];
    this.maxCreatures = 15;

    this._unsubSmash = events.on('game:smash', ({ x, y }) => {
      for (const c of this.creatures) {
        if (distance(c.pos.x, c.pos.y, x, y) < 300) {
          c.fleeFrom(x, y);
        }
      }
    });
  }

  update(dt) {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      this.creatures[i].update(dt, this.world);
      if (this.creatures[i].isDead) {
        this.creatures.splice(i, 1);
      }
    }
  }

  summonCreature() {
    if (this.creatures.length >= this.maxCreatures) return;

    const biome = state.get('currentBiome') || 'meadow';
    const validTypes = Object.values(CREATURE_TYPES).filter(t => t.biomes.includes(biome));
    if (validTypes.length === 0) return;

    const type = randomPick(validTypes);
    const x = randomRange(this.world.width * 0.1, this.world.width * 0.9);
    const y = randomRange(this.world.height * 0.2, this.world.height * 0.6);

    const creature = new Creature(type, x, y);
    this.creatures.push(creature);
  }

  clear() {
    this.creatures = [];
  }

  destroy() { this.clear(); this._unsubSmash?.(); }
}

export default CreatureManager;

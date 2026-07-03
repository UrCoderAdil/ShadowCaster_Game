/* ═══════════════════════════════════════════════════════
   Plant — Entity with growth stages, species, L-system structure
   ═══════════════════════════════════════════════════════ */

import { GROWTH_STAGES, PLANT_SPECIES } from '../core/constants.js';
import { generateLSystem, interpretLSystem, getPlantLSystem } from '../utils/lsystem.js';
import { clamp, randomRange } from '../utils/math.js';

export class Plant {
  constructor(species, x, y) {
    this.species = species;
    this.x = x;
    this.y = y;
    this.id = `plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Growth
    this.growthProgress = 0;      // 0..1 overall growth
    this.stageIndex = 0;          // index into GROWTH_STAGES
    this.stage = GROWTH_STAGES[0]; // current stage name
    this.hydration = 0.5;         // 0..1
    this.health = 100;            // 0..100
    this.age = 0;                 // ms alive

    // Visual
    this.scale = 0;               // 0..1 current visual scale (smoothly animated)
    this.targetScale = 0;
    this.swayOffset = randomRange(0, Math.PI * 2);
    this.swayAmount = randomRange(0.02, 0.05);
    this.colorVariation = randomRange(-15, 15); // slight hue shift for uniqueness

    // L-System structure (generated once on first mature stage)
    this.lsystemCommands = null;
    this._lsystemGenerated = false;

    // State
    this.isDead = false;
    this.isHarvested = false;

    // Pre-generate L-system
    this._generateStructure();
  }

  _generateStructure() {
    const def = getPlantLSystem(this.species.id);
    const str = generateLSystem(def);
    const stepSize = (this.species.maxHeight || 60) / (def.iterations * 3);
    this.lsystemCommands = interpretLSystem(str, stepSize, def.angle);
    this._lsystemGenerated = true;
  }

  /** Main update tick. */
  update(dt, isRaining, dayPhase, season) {
    if (this.isDead) return;

    this.age += dt;

    // ─── Hydration ───
    if (isRaining) {
      this.hydration = clamp(this.hydration + 0.002 * (dt / 50), 0, 1);
    } else {
      // Evaporation (faster in day, slower at night)
      const evapRate = dayPhase === 'day' ? 0.0005 : 0.0002;
      this.hydration = clamp(this.hydration - evapRate * (dt / 50), 0, 1);
    }

    // ─── Growth ───
    if (this.hydration > 0.2 && this.health > 0) {
      const rate = this.species.growthRate * 0.0003 * (dt / 50);
      const hydrationBonus = this.hydration > 0.6 ? 1.5 : 1.0;
      const seasonMultiplier = this._getSeasonMultiplier(season);
      const nightBonus = (this.species.id === 'moonbloom' && dayPhase === 'night') ? 3.0 : 1.0;

      this.growthProgress = clamp(
        this.growthProgress + rate * hydrationBonus * seasonMultiplier * nightBonus,
        0, 1
      );
    }

    // ─── Dehydration damage ───
    if (this.hydration <= 0.05) {
      this.health = clamp(this.health - 0.1 * (dt / 50), 0, 100);
    }

    if (this.health <= 0) {
      this.isDead = true;
    }

    // ─── Update growth stage ───
    this._updateStage();

    // ─── Visual scale animation ───
    this.targetScale = this.growthProgress;
    this.scale += (this.targetScale - this.scale) * 0.05;
  }

  _updateStage() {
    const stageCount = GROWTH_STAGES.length;
    const newIndex = Math.min(
      stageCount - 1,
      Math.floor(this.growthProgress * stageCount)
    );
    if (newIndex !== this.stageIndex) {
      this.stageIndex = newIndex;
      this.stage = GROWTH_STAGES[newIndex];
    }
  }

  _getSeasonMultiplier(season) {
    switch (season) {
      case 'spring': return 1.5;
      case 'summer': return 1.2;
      case 'autumn': return 0.7;
      case 'winter': return 0.3;
      default: return 1.0;
    }
  }

  /** Take damage (from fist smash). */
  takeDamage(amount) {
    this.health = clamp(this.health - amount, 0, 100);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  /** Can this plant be harvested? */
  canHarvest() {
    return !this.isDead && !this.isHarvested &&
           (this.stage === 'flowering' || this.stage === 'fruiting');
  }

  /** Harvest the plant. Returns essence reward. */
  harvest() {
    this.isHarvested = true;
    this.isDead = true;

    // Reward based on rarity
    const rarityBonus = {
      common: 3,
      uncommon: 7,
      rare: 15,
      legendary: 50,
    };

    return rarityBonus[this.species.rarity] || 5;
  }

  /** Get the visual height based on growth. */
  get visualHeight() {
    return this.species.maxHeight * this.scale;
  }
}

export default Plant;

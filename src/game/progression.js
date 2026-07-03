/* ═══════════════════════════════════════════════════════
   Progression — Essence, achievements, biome unlocks
   ═══════════════════════════════════════════════════════ */

import state from '../core/state.js';
import events from '../core/events.js';
import { ACHIEVEMENTS, BIOMES } from '../core/constants.js';

export class Progression {
  constructor() {
    this._zenTimer = 0; // ms since last fist
  }

  /** Called after rain gesture. */
  onRain(world) {
    this._checkAchievement('rain_dancer', () => (state.get('totalRainCalls') || 0) >= 100);
  }

  /** Called after fist smash. */
  onSmash(world) {
    this._zenTimer = 0;
    this._checkAchievement('destroyer', () => (state.get('totalPlantsDestroyed') || 0) >= 30);
  }

  /** Called after scissors harvest. */
  onHarvest(world, plant) {
    this._checkAchievement('herbalist', () => (state.get('totalPlantsHarvested') || 0) >= 50);

    if (plant.species.rarity === 'legendary') {
      this._checkAchievement('legendary_find', () => true);
    }

    // First bloom
    if (plant.stage === 'flowering' || plant.stage === 'fruiting') {
      this._checkAchievement('first_bloom', () => true);
    }
  }

  /** Called after peace sign summon. */
  onSummon(world) {
    this._checkAchievement('creature_friend', () => (state.get('totalCreaturesSummoned') || 0) >= 20);

    // Butterfly garden: 5+ butterflies at once
    const butterflies = world.creatures.creatures.filter(c => c.type.id === 'butterfly');
    this._checkAchievement('butterfly_garden', () => butterflies.length >= 5);
  }

  /** Called after pointing lightning. */
  onLightning(world) {
    this._checkAchievement('storm_caller', () => (state.get('totalLightningStrikes') || 0) >= 10);
  }

  /** Called when a plant grows. */
  onPlantGrown(world, plant) {
    this._checkAchievement('green_thumb', () => (state.get('totalPlantsGrown') || 0) >= 20);

    // Ecosystem: 5+ different species alive
    const speciesSet = new Set(world.plants.map(p => p.species.id));
    this._checkAchievement('ecosystem', () => speciesSet.size >= 5);

    // Night garden
    if (plant.species.id === 'moonbloom') {
      this._checkAchievement('night_garden', () => true);
    }

    // Collector: 10 seed types discovered
    this._checkAchievement('collector', () => (state.get('discoveredSeeds')?.size || 0) >= 10);
  }

  /** Called when a combo is triggered. */
  onCombo(combo) {
    const discovered = state.get('discoveredCombos');
    discovered.add(combo.id);
    state.set('discoveredCombos', discovered);

    if (combo.id === 'rainbow_harvest') {
      this._checkAchievement('rainbow', () => true);
    }

    // Combo master: all combos discovered
    this._checkAchievement('combo_master', () => discovered.size >= 4);
  }

  /** Timed achievement checks (called every tick). */
  checkTimedAchievements(dt, world) {
    // Shadow Master: use all 5 gestures
    this._checkAchievement('shadow_master', () => (state.get('gesturesUsed')?.size || 0) >= 5);

    // Zen Garden: 10 minutes without fist
    this._zenTimer += dt;
    this._checkAchievement('zen_garden', () => this._zenTimer >= 600_000);

    // Patient Gardener: 30 minutes total
    this._checkAchievement('patient_gardener', () => (state.get('totalPlayTimeMs') || 0) >= 1_800_000);

    // Biome Explorer: all biomes unlocked
    this._checkAchievement('biome_explorer', () => (state.get('unlockedBiomes')?.size || 0) >= Object.keys(BIOMES).length);
  }

  /** Internal: check and unlock an achievement. */
  _checkAchievement(id, condition) {
    const unlocked = state.get('unlockedAchievements');
    if (unlocked.has(id)) return;

    if (condition()) {
      unlocked.add(id);
      state.set('unlockedAchievements', unlocked);

      const achDef = ACHIEVEMENTS[id];
      if (achDef) {
        events.emit('achievement:unlocked', achDef);
        console.log(`[Achievement] Unlocked: ${achDef.name}`);
      }
    }
  }
}

export default Progression;

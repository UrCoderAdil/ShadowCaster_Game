/* ═══════════════════════════════════════════════════════
   Game World — Ecosystem simulation, day/night, seasons
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import state from '../core/state.js';
import {
  SHAPE, DAY_DURATION_MS, SEASON_DURATION_MS, GAME_TICK_MS,
  SEASONS, DAY_PHASES, BIOMES, PLANT_SPECIES,
} from '../core/constants.js';
import { Plant } from './plant.js';
import { CreatureManager } from './creature.js';
import { Weather } from './weather.js';
import { Terrain } from './terrain.js';
import { Progression } from './progression.js';
import { ComboDetector } from './combos.js';
import { randomPick, randomRange, randomInt } from '../utils/math.js';

export class World {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;

    // Sub-systems
    this.terrain = new Terrain(canvasWidth, canvasHeight);
    this.weather = new Weather(this);
    this.creatures = new CreatureManager(this);
    this.progression = new Progression();
    this.comboDetector = new ComboDetector();

    // Entities
    this.plants = [];
    this.maxPlants = 25;

    // Time
    this.gameTime = 0;
    this.dayProgress = 0;
    this.seasonProgress = 0;
    this.dayPhase = 'day';
    this.seasonIndex = state.get('seasonIndex') || 0;
    this.moonPhase = 0;

    // Auto-save timer
    this._saveInterval = null;
    this._tickInterval = null;
    this._lastTickTime = 0;

    this._bindEvents();
  }

  _bindEvents() {
    events.on('shape:changed', ({ shape, confidence }) => {
      this._handleShape(shape, confidence);
    });

    events.on('biome:change', ({ biomeId }) => {
      this._changeBiome(biomeId);
    });
  }

  /** Start the simulation loop. */
  start() {
    this._lastTickTime = performance.now();

    this._tickInterval = setInterval(() => {
      const now = performance.now();
      const dt = now - this._lastTickTime;
      this._lastTickTime = now;
      this.tick(dt);
    }, GAME_TICK_MS);

    // Auto-save every 30s
    this._saveInterval = setInterval(() => state.save(), 30_000);

    // Spawn initial plants
    if (this.plants.length === 0) {
      this._spawnInitialPlants();
    }
  }

  /** Main simulation tick. */
  tick(dt) {
    if (state.get('isPaused')) return;

    // Update time
    this.gameTime += dt;
    state.update({
      gameTime: this.gameTime,
      totalPlayTimeMs: (state.get('totalPlayTimeMs') || 0) + dt,
    });

    // ─── Day/Night cycle ───
    this.dayProgress = (this.gameTime % DAY_DURATION_MS) / DAY_DURATION_MS;
    const phaseIndex = Math.floor(this.dayProgress * 4);
    this.dayPhase = DAY_PHASES[phaseIndex] || 'day';

    state.update({
      dayProgress: this.dayProgress,
      dayPhase: this.dayPhase,
    });

    // ─── Season cycle ───
    this.seasonProgress = (this.gameTime % SEASON_DURATION_MS) / SEASON_DURATION_MS;
    const newSeasonIndex = Math.floor(this.seasonProgress * 4);
    if (newSeasonIndex !== this.seasonIndex) {
      this.seasonIndex = newSeasonIndex;
      state.set('seasonIndex', this.seasonIndex);
      events.emit('season:change', { season: SEASONS[this.seasonIndex] });
    }

    // ─── Moon cycle (slower, ~8 day/night cycles = 1 moon cycle) ───
    this.moonPhase = (this.gameTime % (DAY_DURATION_MS * 8)) / (DAY_DURATION_MS * 8);
    state.set('moonPhase', this.moonPhase);

    // ─── Update sub-systems ───
    this.weather.update(dt);
    this.creatures.update(dt);

    // ─── Update plants ───
    const season = SEASONS[this.seasonIndex];
    for (let i = this.plants.length - 1; i >= 0; i--) {
      const plant = this.plants[i];
      plant.update(dt, this.weather.isRaining, this.dayPhase, season);

      // Remove dead plants
      if (plant.isDead) {
        this.plants.splice(i, 1);
      }
    }

    // ─── Check Zen Garden achievement (10 min no fist) ───
    this.progression.checkTimedAchievements(dt, this);

    // ─── Natural weather patterns ───
    if (!this.weather.isRaining && Math.random() < 0.0001) {
      this.weather.startNaturalRain();
    }
  }

  /** Handle a detected shadow shape. */
  _handleShape(shape, confidence) {
    if (shape === SHAPE.UNKNOWN) return;

    // Track gesture usage
    const used = state.get('gesturesUsed');
    used.add(shape);
    state.set('gesturesUsed', used);

    // Feed combo detector
    const combo = this.comboDetector.feed(shape);
    if (combo) {
      events.emit('combo:triggered', combo);
      this.progression.onCombo(combo);
    }

    switch (shape) {
      case SHAPE.OPEN_HAND:
        this._onRain();
        break;
      case SHAPE.FIST:
        this._onSmash();
        break;
      case SHAPE.SCISSORS:
        this._onHarvest();
        break;
      case SHAPE.PEACE_SIGN:
        this._onSummon();
        break;
      case SHAPE.POINTING:
        this._onLightning();
        break;
    }
  }

  _onRain() {
    this.weather.startRain();
    state.set('totalRainCalls', (state.get('totalRainCalls') || 0) + 1);
    events.emit('game:rain');

    // Possibly spawn new plant if there's room
    if (this.plants.length < this.maxPlants && Math.random() < 0.15) {
      this._spawnRandomPlant();
    }

    this.progression.onRain(this);
  }

  _onSmash() {
    // Damage nearby plants, scatter particles
    const centerX = this.width / 2;
    const smashRadius = 150;

    for (const plant of this.plants) {
      const dist = Math.abs(plant.x - centerX);
      if (dist < smashRadius) {
        plant.takeDamage(30);
        if (plant.isDead) {
          state.set('totalPlantsDestroyed', (state.get('totalPlantsDestroyed') || 0) + 1);
        }
      }
    }

    state.set('lastFistTime', performance.now());
    events.emit('game:smash', { x: centerX, y: this.terrain.getGroundY(centerX) });
    this.progression.onSmash(this);
  }

  _onHarvest() {
    // Find a mature/fruiting plant and harvest it
    const harvestable = this.plants.filter(p => p.canHarvest());
    if (harvestable.length > 0) {
      const plant = harvestable[0];
      const reward = plant.harvest();
      const currentEssence = state.get('essence') || 0;
      state.update({
        essence: currentEssence + reward,
        totalEssenceEarned: (state.get('totalEssenceEarned') || 0) + reward,
        totalPlantsHarvested: (state.get('totalPlantsHarvested') || 0) + 1,
      });
      events.emit('game:harvest', { x: plant.x, y: plant.y, reward, plant });
      this.progression.onHarvest(this, plant);
    } else {
      events.emit('game:harvest_miss');
    }
  }

  _onSummon() {
    this.creatures.summonCreature();
    state.set('totalCreaturesSummoned', (state.get('totalCreaturesSummoned') || 0) + 1);
    events.emit('game:summon');
    this.progression.onSummon(this);
  }

  _onLightning() {
    const x = randomRange(this.width * 0.2, this.width * 0.8);
    const y = this.terrain.getGroundY(x);
    this.weather.triggerLightning(x, y);
    state.set('totalLightningStrikes', (state.get('totalLightningStrikes') || 0) + 1);
    events.emit('game:lightning', { x, y });
    this.progression.onLightning(this);

    // Lightning + Rain = Storm Flower chance
    if (this.weather.isRaining && Math.random() < 0.1) {
      this._spawnSpecialPlant('storm_flower', x, y);
    }
  }

  _spawnInitialPlants() {
    const biome = state.get('currentBiome') || 'meadow';
    const species = Object.values(PLANT_SPECIES).filter(s => s.biome === biome);
    const count = randomInt(3, 5);
    for (let i = 0; i < count; i++) {
      const sp = randomPick(species.filter(s => s.rarity === 'common'));
      if (sp) {
        const x = randomRange(this.width * 0.1, this.width * 0.9);
        const y = this.terrain.getGroundY(x);
        const plant = new Plant(sp, x, y);
        // Start some at various growth stages
        plant.growthProgress = randomRange(0.2, 0.8);
        plant._updateStage();
        this.plants.push(plant);
      }
    }
  }

  _spawnRandomPlant() {
    const biome = state.get('currentBiome') || 'meadow';
    const species = Object.values(PLANT_SPECIES).filter(s => s.biome === biome);
    const sp = randomPick(species);
    if (!sp) return;

    const x = randomRange(this.width * 0.08, this.width * 0.92);
    const y = this.terrain.getGroundY(x);
    const plant = new Plant(sp, x, y);
    this.plants.push(plant);

    state.set('totalPlantsGrown', (state.get('totalPlantsGrown') || 0) + 1);

    // Discover new seed
    const discovered = state.get('discoveredSeeds');
    if (!discovered.has(sp.id)) {
      discovered.add(sp.id);
      state.set('discoveredSeeds', discovered);
      events.emit('seed:discovered', sp);
    }

    this.progression.onPlantGrown(this, plant);

    // Night + rain = Moonbloom chance
    if (this.dayPhase === 'night' && this.weather.isRaining && Math.random() < 0.08) {
      this._spawnSpecialPlant('moonbloom', x, y);
    }
  }

  _spawnSpecialPlant(speciesId, x, y) {
    const sp = PLANT_SPECIES[speciesId];
    if (!sp) return;
    const plant = new Plant(sp, x, y);
    this.plants.push(plant);
    state.set('totalPlantsGrown', (state.get('totalPlantsGrown') || 0) + 1);

    const discovered = state.get('discoveredSeeds');
    if (!discovered.has(sp.id)) {
      discovered.add(sp.id);
      state.set('discoveredSeeds', discovered);
      events.emit('seed:discovered', sp);
    }
    events.emit('special:plant', { species: sp, x, y });
    this.progression.onPlantGrown(this, plant);
  }

  _changeBiome(biomeId) {
    state.set('currentBiome', biomeId);
    // Clear current plants and creatures
    this.plants = [];
    this.creatures.clear();
    this._spawnInitialPlants();
    events.emit('biome:changed', { biomeId });
  }

  /** Resize the world dimensions. */
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.terrain.resize(w, h);
  }

  /** Stop simulation. */
  stop() {
    if (this._tickInterval) clearInterval(this._tickInterval);
    if (this._saveInterval) clearInterval(this._saveInterval);
  }

  /** Get current season name. */
  get season() {
    return SEASONS[this.seasonIndex];
  }
}

export default World;

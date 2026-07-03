/* ═══════════════════════════════════════════════════════
   Game State — Central state with localStorage persistence
   ═══════════════════════════════════════════════════════ */

import { BIOMES, ACHIEVEMENTS, SHAPE } from './constants.js';

const STORAGE_KEY = 'shadowcaster_save';
const STORAGE_VERSION = 1;

function createDefaultState() {
  return {
    version: STORAGE_VERSION,

    // Current session
    currentShape: SHAPE.UNKNOWN,
    shapeConfidence: 0,
    isPaused: false,
    isCalibrated: false,
    tutorialDone: false,

    // Time
    gameTime: 0,            // total ms elapsed in-game
    dayProgress: 0,          // 0..1 through day cycle
    dayPhase: 'day',         // dawn, day, dusk, night
    seasonIndex: 0,          // 0=spring, 1=summer, 2=autumn, 3=winter
    moonPhase: 0,            // 0..1 through moon cycle

    // World
    currentBiome: 'meadow',
    plants: [],
    creatures: [],
    waterPools: [],

    // Progression
    essence: 0,
    totalEssenceEarned: 0,
    totalPlantsGrown: 0,
    totalPlantsHarvested: 0,
    totalPlantsDestroyed: 0,
    totalCreaturesSummoned: 0,
    totalLightningStrikes: 0,
    totalRainCalls: 0,
    totalPlayTimeMs: 0,
    lastFistTime: 0,
    gesturesUsed: new Set(),

    // Unlocks
    unlockedBiomes: new Set(['meadow']),
    discoveredSeeds: new Set(['daisy', 'tulip']),
    unlockedAchievements: new Set(),
    discoveredCombos: new Set(),

    // CV calibration
    threshold: 80,
    backgroundFrame: null,   // not persisted

    // Settings
    volume: 0.7,
    particleDensity: 2,      // 1=low, 2=medium, 3=high
    showDebug: false,
  };
}

class GameState {
  constructor() {
    this._state = createDefaultState();
    this._listeners = new Set();
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    this._state[key] = value;
    this._notify();
  }

  /** Batch update multiple keys. */
  update(partial) {
    Object.assign(this._state, partial);
    this._notify();
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(this._state); } catch (e) { console.error('[State]', e); }
    }
  }

  /** Get entire state snapshot. */
  snapshot() {
    return { ...this._state };
  }

  /** Save persistent data to localStorage. */
  save() {
    try {
      const data = {
        version: STORAGE_VERSION,
        essence: this._state.essence,
        totalEssenceEarned: this._state.totalEssenceEarned,
        totalPlantsGrown: this._state.totalPlantsGrown,
        totalPlantsHarvested: this._state.totalPlantsHarvested,
        totalPlantsDestroyed: this._state.totalPlantsDestroyed,
        totalCreaturesSummoned: this._state.totalCreaturesSummoned,
        totalLightningStrikes: this._state.totalLightningStrikes,
        totalRainCalls: this._state.totalRainCalls,
        totalPlayTimeMs: this._state.totalPlayTimeMs,
        currentBiome: this._state.currentBiome,
        unlockedBiomes: [...this._state.unlockedBiomes],
        discoveredSeeds: [...this._state.discoveredSeeds],
        unlockedAchievements: [...this._state.unlockedAchievements],
        discoveredCombos: [...this._state.discoveredCombos],
        gesturesUsed: [...this._state.gesturesUsed],
        tutorialDone: this._state.tutorialDone,
        threshold: this._state.threshold,
        volume: this._state.volume,
        particleDensity: this._state.particleDensity,
        seasonIndex: this._state.seasonIndex,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[State] Failed to save:', e);
    }
  }

  /** Load from localStorage. Returns true if save existed. */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.version !== STORAGE_VERSION) {
        console.warn('[State] Save version mismatch, starting fresh');
        return false;
      }

      this._state.essence = data.essence ?? 0;
      this._state.totalEssenceEarned = data.totalEssenceEarned ?? 0;
      this._state.totalPlantsGrown = data.totalPlantsGrown ?? 0;
      this._state.totalPlantsHarvested = data.totalPlantsHarvested ?? 0;
      this._state.totalPlantsDestroyed = data.totalPlantsDestroyed ?? 0;
      this._state.totalCreaturesSummoned = data.totalCreaturesSummoned ?? 0;
      this._state.totalLightningStrikes = data.totalLightningStrikes ?? 0;
      this._state.totalRainCalls = data.totalRainCalls ?? 0;
      this._state.totalPlayTimeMs = data.totalPlayTimeMs ?? 0;
      this._state.currentBiome = data.currentBiome ?? 'meadow';
      this._state.unlockedBiomes = new Set(data.unlockedBiomes ?? ['meadow']);
      this._state.discoveredSeeds = new Set(data.discoveredSeeds ?? ['daisy', 'tulip']);
      this._state.unlockedAchievements = new Set(data.unlockedAchievements ?? []);
      this._state.discoveredCombos = new Set(data.discoveredCombos ?? []);
      this._state.gesturesUsed = new Set(data.gesturesUsed ?? []);
      this._state.tutorialDone = data.tutorialDone ?? false;
      this._state.threshold = data.threshold ?? 80;
      this._state.volume = data.volume ?? 0.7;
      this._state.particleDensity = data.particleDensity ?? 2;
      this._state.seasonIndex = data.seasonIndex ?? 0;
      this._state.isCalibrated = false; // always recalibrate on load

      this._notify();
      return true;
    } catch (e) {
      console.warn('[State] Failed to load:', e);
      return false;
    }
  }

  /** Check if a save exists. */
  hasSave() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /** Reset to defaults. */
  reset() {
    this._state = createDefaultState();
    this._notify();
  }
}

export const state = new GameState();
export default state;

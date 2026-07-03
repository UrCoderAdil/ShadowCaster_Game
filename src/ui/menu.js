/* ═══════════════════════════════════════════════════════
   Menu — Start screen, pause, biome selector, catalog,
   achievement gallery, settings panel
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import state from '../core/state.js';
import { BIOMES, PLANT_SPECIES, ACHIEVEMENTS } from '../core/constants.js';

export class Menu {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this._bindStartScreen();
    this._bindPauseMenu();
    this._bindSettings();
    this._bindBiomes();
    this._bindCatalog();
    this._bindAchievements();
    this._bindHUDControls();

    // Show continue button if save exists
    if (state.hasSave()) {
      const btn = document.getElementById('btn-continue');
      if (btn) btn.style.display = '';
    }
  }

  // ─── Screen Management ───
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  hideScreen(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  }

  // ─── Start Screen ───
  _bindStartScreen() {
    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.audio.init();
      events.emit('app:start', { isNew: true });
    });

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      this.audio.init();
      state.load();
      events.emit('app:start', { isNew: false });
    });
  }

  // ─── Pause Menu ───
  _bindPauseMenu() {
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      state.set('isPaused', false);
      this.hideScreen('pause-menu');
      events.emit('app:resume');
    });

    document.getElementById('btn-recalibrate')?.addEventListener('click', () => {
      this.hideScreen('pause-menu');
      events.emit('app:recalibrate');
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.hideScreen('pause-menu');
      this._populateSettings();
      this.showScreen('settings-panel');
    });

    document.getElementById('btn-quit')?.addEventListener('click', () => {
      state.save();
      state.set('isPaused', false);
      this.hideScreen('pause-menu');
      this.showScreen('start-screen');
      events.emit('app:quit');
    });
  }

  // ─── Settings ───
  _bindSettings() {
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this._saveSettings();
      this.hideScreen('settings-panel');
    });
  }

  _populateSettings() {
    const vol = document.getElementById('setting-volume');
    const particles = document.getElementById('setting-particles');
    const debug = document.getElementById('setting-debug');
    const threshold = document.getElementById('setting-threshold');

    if (vol) vol.value = (state.get('volume') || 0.7) * 100;
    if (particles) particles.value = state.get('particleDensity') || 2;
    if (debug) debug.checked = state.get('showDebug') || false;
    if (threshold) threshold.value = state.get('threshold') || 80;
  }

  _saveSettings() {
    const vol = document.getElementById('setting-volume');
    const particles = document.getElementById('setting-particles');
    const debug = document.getElementById('setting-debug');
    const threshold = document.getElementById('setting-threshold');

    if (vol) {
      const v = parseInt(vol.value) / 100;
      state.set('volume', v);
      this.audio.setVolume(v);
    }
    if (particles) state.set('particleDensity', parseInt(particles.value));
    if (debug) {
      state.set('showDebug', debug.checked);
      const debugCanvas = document.getElementById('debug-canvas');
      if (debugCanvas) debugCanvas.classList.toggle('debug-hidden', !debug.checked);
    }
    if (threshold) {
      state.set('threshold', parseInt(threshold.value));
      events.emit('cv:threshold_changed', parseInt(threshold.value));
    }
  }

  // ─── Biomes ───
  _bindBiomes() {
    document.getElementById('btn-close-biomes')?.addEventListener('click', () => {
      this.hideScreen('biome-panel');
    });
  }

  showBiomes() {
    const grid = document.getElementById('biome-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const unlocked = state.get('unlockedBiomes') || new Set(['meadow']);
    const essence = state.get('essence') || 0;
    const currentBiome = state.get('currentBiome') || 'meadow';

    for (const biome of Object.values(BIOMES)) {
      const isUnlocked = unlocked.has(biome.id);
      const isActive = currentBiome === biome.id;
      const canAfford = essence >= (biome.cost || 0);

      const card = document.createElement('div');
      card.className = `biome-card${isUnlocked ? '' : ' locked'}${isActive ? ' active' : ''}`;
      card.innerHTML = `
        <div class="biome-card-icon">${biome.icon}</div>
        <span class="biome-card-name">${biome.name}</span>
        <span class="biome-card-cost">${isActive ? '✓ Active' : isUnlocked ? 'Select' : `✨ ${biome.cost}`}</span>
      `;

      if (isActive) {
        card.style.borderColor = 'var(--accent-emerald)';
      }

      card.addEventListener('click', () => {
        if (isActive) return;
        if (isUnlocked) {
          events.emit('biome:change', { biomeId: biome.id });
          this.hideScreen('biome-panel');
        } else if (canAfford) {
          // Unlock biome
          state.set('essence', essence - biome.cost);
          unlocked.add(biome.id);
          state.set('unlockedBiomes', unlocked);
          events.emit('biome:change', { biomeId: biome.id });
          this.hideScreen('biome-panel');
        }
      });

      grid.appendChild(card);
    }

    this.showScreen('biome-panel');
  }

  // ─── Seed Catalog ───
  _bindCatalog() {
    document.getElementById('btn-close-catalog')?.addEventListener('click', () => {
      this.hideScreen('catalog-panel');
    });
  }

  showCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const discovered = state.get('discoveredSeeds') || new Set();

    for (const sp of Object.values(PLANT_SPECIES)) {
      const isDiscovered = discovered.has(sp.id);
      const card = document.createElement('div');
      card.className = 'catalog-card';
      card.innerHTML = `
        <div class="catalog-card-icon">${isDiscovered ? sp.icon : '❓'}</div>
        <span class="catalog-card-name">${isDiscovered ? sp.name : '???'}</span>
        <span class="catalog-card-detail">${isDiscovered ? sp.rarity : 'Undiscovered'}</span>
      `;
      if (!isDiscovered) card.style.opacity = '0.4';
      grid.appendChild(card);
    }

    this.showScreen('catalog-panel');
  }

  // ─── Achievements ───
  _bindAchievements() {
    document.getElementById('btn-close-achievements')?.addEventListener('click', () => {
      this.hideScreen('achievement-panel');
    });
  }

  showAchievements() {
    const grid = document.getElementById('achievement-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const unlocked = state.get('unlockedAchievements') || new Set();

    for (const ach of Object.values(ACHIEVEMENTS)) {
      const isUnlocked = unlocked.has(ach.id);
      const card = document.createElement('div');
      card.className = 'achievement-card';
      card.innerHTML = `
        <div class="achievement-card-icon">${isUnlocked ? ach.icon : '🔒'}</div>
        <span class="achievement-card-name">${ach.name}</span>
        <span class="achievement-card-desc">${isUnlocked ? ach.desc : '???'}</span>
      `;
      if (!isUnlocked) card.style.opacity = '0.35';
      grid.appendChild(card);
    }

    this.showScreen('achievement-panel');
  }

  // ─── HUD Control Buttons ───
  _bindHUDControls() {
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      state.set('isPaused', true);
      this.showScreen('pause-menu');
      events.emit('app:pause');
    });

    document.getElementById('btn-biomes')?.addEventListener('click', () => {
      this.showBiomes();
    });

    document.getElementById('btn-catalog')?.addEventListener('click', () => {
      this.showCatalog();
    });

    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      this.showAchievements();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this._populateSettings();
      this.showScreen('settings-panel');
    });
  }
}

export default Menu;

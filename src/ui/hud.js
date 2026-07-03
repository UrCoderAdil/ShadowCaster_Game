/* ═══════════════════════════════════════════════════════
   HUD — Gesture indicator, essence, time, achievements
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import state from '../core/state.js';
import { SHAPE_LABELS, SHAPE_ICONS, SEASONS, DAY_PHASES } from '../core/constants.js';

export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this._gestureIcon = document.getElementById('hud-gesture-icon');
    this._gestureLabel = document.getElementById('hud-gesture-label');
    this._confidenceFill = document.getElementById('hud-confidence-fill');
    this._essenceValue = document.getElementById('hud-essence-value');
    this._timeIcon = document.getElementById('hud-time-icon');
    this._timeLabel = document.getElementById('hud-time-label');
    this._seasonLabel = document.getElementById('hud-season-label');
    this._comboEl = document.getElementById('hud-combo');
    this._comboName = document.getElementById('hud-combo-name');
    this._achievementToast = document.getElementById('achievement-toast');
    this._achievementTitle = document.getElementById('achievement-title');
    this._achievementDesc = document.getElementById('achievement-desc');

    this._comboTimeout = null;
    this._achieveTimeout = null;

    this._bindEvents();
  }

  _bindEvents() {
    events.on('shape:changed', ({ shape, confidence }) => {
      this._updateGesture(shape, confidence);
    });

    events.on('combo:triggered', (combo) => {
      this._showCombo(combo.name);
    });

    events.on('achievement:unlocked', (ach) => {
      this._showAchievement(ach);
    });

    // Update essence with animation
    state.subscribe((s) => {
      this._updateEssence(s.essence);
      this._updateTime(s.dayPhase, s.seasonIndex);
    });
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  _updateGesture(shape, confidence) {
    if (this._gestureIcon) this._gestureIcon.textContent = SHAPE_ICONS[shape] || '—';
    if (this._gestureLabel) this._gestureLabel.textContent = SHAPE_LABELS[shape] || 'No Shape';
    if (this._confidenceFill) this._confidenceFill.style.width = `${Math.round(confidence * 100)}%`;
  }

  _updateEssence(value) {
    if (this._essenceValue) {
      this._essenceValue.textContent = Math.floor(value || 0);
    }
  }

  _updateTime(dayPhase, seasonIndex) {
    const icons = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
    const labels = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' };

    if (this._timeIcon) this._timeIcon.textContent = icons[dayPhase] || '☀️';
    if (this._timeLabel) this._timeLabel.textContent = labels[dayPhase] || 'Day';
    if (this._seasonLabel) {
      const season = SEASONS[seasonIndex] || 'spring';
      this._seasonLabel.textContent = season.charAt(0).toUpperCase() + season.slice(1);
    }
  }

  _showCombo(name) {
    if (!this._comboEl || !this._comboName) return;

    this._comboName.textContent = name;
    this._comboEl.classList.remove('hidden');
    this._comboEl.style.animation = 'none';
    void this._comboEl.offsetWidth; // reflow
    this._comboEl.style.animation = '';

    clearTimeout(this._comboTimeout);
    this._comboTimeout = setTimeout(() => {
      this._comboEl.classList.add('hidden');
    }, 2000);
  }

  _showAchievement(ach) {
    if (!this._achievementToast) return;

    if (this._achievementTitle) this._achievementTitle.textContent = `${ach.icon} ${ach.name}`;
    if (this._achievementDesc) this._achievementDesc.textContent = ach.desc;

    this._achievementToast.classList.remove('hidden');
    // Trigger animation
    requestAnimationFrame(() => {
      this._achievementToast.classList.add('show');
    });

    clearTimeout(this._achieveTimeout);
    this._achieveTimeout = setTimeout(() => {
      this._achievementToast.classList.remove('show');
      setTimeout(() => this._achievementToast.classList.add('hidden'), 600);
    }, 4000);
  }
}

export default HUD;

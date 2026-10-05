/* ═══════════════════════════════════════════════════════
   HUD — Gesture indicator, essence, time, achievements
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import state from '../core/state.js';
import { SHAPE_LABELS, SHAPE_ICONS, SEASONS, BIOMES } from '../core/constants.js';

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
    document.getElementById('btn-toggle-preview').onclick = () => {
      const hidden = document.getElementById('camera-monitor').classList.toggle('preview-hidden');
      document.getElementById('btn-toggle-preview').textContent = hidden ? '+' : '−';
      document.getElementById('btn-toggle-preview').setAttribute('aria-label', hidden ? 'Show camera preview' : 'Hide camera preview');
    };
    document.querySelectorAll('.spell').forEach(button => button.addEventListener('click', () => events.emit('spell:manual', {shape:button.dataset.shape})));
    document.addEventListener('keydown', event => {
      if (event.repeat || /INPUT|TEXTAREA/.test(event.target.tagName) || state.get('inputMode') !== 'explore' || this.el.classList.contains('hidden')) return;
      const button = document.querySelectorAll('.spell')[Number(event.key) - 1];
      if (button) { event.preventDefault(); button.click(); }
    });
  }

  _bindEvents() {
    events.on('shape:changed', ({ shape, confidence }) => {
      this._updateGesture(shape, confidence);
      document.querySelectorAll('.spell').forEach(button => button.classList.toggle('casting', button.dataset.shape === shape));
      clearTimeout(this._castTimeout); this._castTimeout = setTimeout(() => document.querySelectorAll('.spell').forEach(button => button.classList.remove('casting')), 550);
    });
    events.on('tracking:update', ({shape,confidence,stable,detected,cameraAvailable=true,fresh=true}) => {
      this._updateGesture(shape,confidence);
      document.getElementById('tracking-status').textContent = !cameraAvailable ? 'Camera disconnected · recalibrate' : !fresh ? 'Waiting for camera frames…' : !detected ? 'Keep one whole hand in view' : stable ? `Tracking locked · ${Math.round(confidence*100)}%` : 'Hold steady to cast…';
      document.getElementById('camera-monitor').classList.toggle('tracking-locked', detected && stable);
    });
    events.on('ui:message', text => this.message(text));
    events.on('game:harvest_miss', () => this.message('No blooms ready yet. Call rain and let your garden grow.'));
    events.on('seed:discovered', seed => this.message(`New discovery · ${seed.name}`));

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
      this._updateGoal(s);
    });
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  clearTransient() {
    clearTimeout(this._messageTimeout); clearTimeout(this._comboTimeout); clearTimeout(this._achieveTimeout);
    document.getElementById('status-message').classList.add('hidden'); this._comboEl.classList.add('hidden');
    this._achievementToast.classList.add('hidden'); this._achievementToast.classList.remove('show');
  }

  setMode(mode) {
    document.getElementById('input-mode-label').textContent = mode === 'fingers' ? 'FINGER TRACKING' : 'SHADOW TRACKING';
    document.getElementById('camera-monitor').classList.toggle('hidden', mode === 'explore');
    document.getElementById('harvest-pose').textContent = mode === 'shadow' ? 'Narrow V' : 'Index + middle';
    document.getElementById('summon-pose').textContent = mode === 'shadow' ? 'Wide V' : 'Index + pinky';
    document.getElementById('spell-instruction').textContent = mode === 'explore' ? 'EXPLORE MODE · click a spell or press 1–5 · Esc to pause' : 'Hold a pose briefly · lower your hand to cast again · Esc to pause';
    document.querySelectorAll('.spell').forEach(button => { button.disabled = mode !== 'explore'; button.title = mode === 'explore' ? `Cast ${button.querySelector('strong').textContent}` : `Make this gesture to cast ${button.querySelector('strong').textContent}`; });
    document.getElementById('btn-switch-mode').textContent = mode === 'fingers' ? 'Switch to shadow play' : 'Switch to finger gestures';
    this.el.classList.toggle('explore-mode', mode === 'explore');
    this._updateGesture('unknown', 0);
  }

  message(text) {
    const message = document.getElementById('status-message'); message.textContent = text; message.classList.remove('hidden');
    clearTimeout(this._messageTimeout); this._messageTimeout = setTimeout(() => message.classList.add('hidden'), 6000);
  }

  _updateGoal(s) {
    const biome = Object.values(BIOMES).find(b => b.id === s.currentBiome);
    const next = Object.values(BIOMES).find(b => !s.unlockedBiomes.has(b.id));
    document.getElementById('biome-name').textContent = biome?.name || 'Meadow';
    document.getElementById('goal-label').textContent = next ? `${next.name} · ${Math.max(0,next.cost-s.essence)} essence to go` : 'Every world discovered';
    document.getElementById('goal-fill').style.width = next ? `${Math.min(100,s.essence/next.cost*100)}%` : '100%';
  }

  _updateGesture(shape, confidence) {
    if (this._gestureIcon) this._gestureIcon.textContent = SHAPE_ICONS[shape] || '—';
    if (this._gestureLabel) this._gestureLabel.textContent = shape === 'unknown' ? 'Ready to cast' : SHAPE_LABELS[shape] || 'Ready to cast';
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

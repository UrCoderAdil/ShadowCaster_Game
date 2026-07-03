/* ═══════════════════════════════════════════════════════
   Combo Detector — Gesture sequence detection
   ═══════════════════════════════════════════════════════ */

import { COMBOS, SHAPE } from '../core/constants.js';

export class ComboDetector {
  constructor() {
    this._history = [];  // { shape, time }
    this._lastComboTime = 0;
    this._cooldown = 3000; // 3s cooldown between combos
  }

  /**
   * Feed a new stable shape.
   * @returns {Object|null} Combo definition if triggered, null otherwise
   */
  feed(shape) {
    if (shape === SHAPE.UNKNOWN) return null;

    const now = performance.now();

    // Don't trigger combos too often
    if (now - this._lastComboTime < this._cooldown) return null;

    // Add to history
    this._history.push({ shape, time: now });

    // Keep only recent entries (last 5 seconds)
    this._history = this._history.filter(h => now - h.time < 5000);

    // Check each combo definition
    for (const combo of Object.values(COMBOS)) {
      if (this._matchesCombo(combo, now)) {
        this._lastComboTime = now;
        this._history = [];
        return combo;
      }
    }

    return null;
  }

  _matchesCombo(combo, now) {
    const seq = combo.sequence;
    const window = combo.timeWindow;

    // Find the sequence in recent history within the time window
    const recent = this._history.filter(h => now - h.time < window);
    if (recent.length < seq.length) return false;

    // Check if the last N entries match the sequence
    const tail = recent.slice(-seq.length);
    for (let i = 0; i < seq.length; i++) {
      if (tail[i].shape !== seq[i]) return false;
    }

    return true;
  }

  reset() {
    this._history = [];
  }
}

export default ComboDetector;

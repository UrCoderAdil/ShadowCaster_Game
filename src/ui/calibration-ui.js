/* ═══════════════════════════════════════════════════════
   Calibration UI — Wrapper that connects calibration
   logic to the UI screens
   ═══════════════════════════════════════════════════════ */

// This module is a thin bridge. The actual calibration logic
// lives in src/cv/calibration.js. This just manages the screen
// show/hide and passes through to that class.

import events from '../core/events.js';

export class CalibrationUI {
  constructor() {
    this.screen = document.getElementById('calibration-screen');
  }

  show() {
    this.screen.classList.add('active');
  }

  hide() {
    this.screen.classList.remove('active');
  }
}

export default CalibrationUI;

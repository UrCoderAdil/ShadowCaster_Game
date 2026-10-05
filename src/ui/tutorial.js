/* ═══════════════════════════════════════════════════════
   Tutorial — Interactive first-time walkthrough
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import state from '../core/state.js';
import { SHAPE } from '../core/constants.js';

const TUTORIAL_STEPS = [
  {
    gesture: SHAPE.OPEN_HAND,
    icon: '✋',
    instruction: 'Make an open hand to call rain!',
  },
  {
    gesture: SHAPE.FIST,
    icon: '✊',
    instruction: 'Make a fist to scatter and smash!',
  },
  {
    gesture: SHAPE.SCISSORS,
    icon: '✌️',
    instruction: 'Make scissors to harvest plants!',
  },
];

export class Tutorial {
  constructor() {
    this.currentStep = 0;
    this.active = false;
    this._unsubShape = null;

    this.overlay = document.getElementById('tutorial-overlay');
    this.gestureIcon = document.getElementById('tutorial-gesture-icon');
    this.instruction = document.getElementById('tutorial-instruction');
    this.skipBtn = document.getElementById('btn-skip-tutorial');
    this.dots = document.querySelectorAll('.tutorial-progress-dot');
  }

  /** Start the tutorial. */
  start() {
    this.cancel();
    if (state.get('tutorialDone')) {
      this._finish();
      return;
    }

    this.active = true;
    this.currentStep = 0;
    this._showStep(0);

    // Show overlay
    this.overlay.classList.add('active');

    // Listen for shape detections
    this._unsubShape = events.on('shape:changed', ({ shape }) => {
      this._onShape(shape);
    });

    // Skip button
    this.skipBtn.onclick = () => this._finish();
  }

  _showStep(index) {
    const step = TUTORIAL_STEPS[index];
    if (!step) return;

    if (this.gestureIcon) this.gestureIcon.textContent = step.icon;
    if (this.instruction) this.instruction.textContent = step.instruction;

    // Update progress dots
    this.dots.forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i < index) dot.classList.add('done');
      if (i === index) dot.classList.add('active');
    });
  }

  _onShape(shape) {
    if (!this.active) return;

    const step = TUTORIAL_STEPS[this.currentStep];
    if (shape === step.gesture) {
      // Step completed!
      this.dots[this.currentStep]?.classList.add('done');
      this.currentStep++;

      if (this.currentStep >= TUTORIAL_STEPS.length) {
        // Tutorial complete
        this._finishTimer = setTimeout(() => this._finish(), 1000);
      } else {
        this._showStep(this.currentStep);
      }
    }
  }

  _finish() {
    this.active = false;
    this.overlay.classList.remove('active');
    state.set('tutorialDone', true);

    if (this._unsubShape) {
      this._unsubShape();
      this._unsubShape = null;
    }

    events.emit('tutorial:done');
  }

  cancel() { clearTimeout(this._finishTimer); this.active = false; this.overlay.classList.remove('active'); this._unsubShape?.(); this._unsubShape = null; }
}

export default Tutorial;

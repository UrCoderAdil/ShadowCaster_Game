/* ═══════════════════════════════════════════════════════
   Calibration — First-run wizard: background capture,
   threshold auto-detection, gesture verification
   ═══════════════════════════════════════════════════════ */

import { Capture } from './capture.js';
import { Processor } from './processor.js';
import { classifyShape, TemporalSmoother } from './classifier.js';
import { SHAPE, CV_DEFAULT_THRESHOLD } from '../core/constants.js';
import events from '../core/events.js';
import state from '../core/state.js';

export class Calibration {
  constructor(capture, processor) {
    this.capture = capture;
    this.processor = processor;
    this.smoother = new TemporalSmoother(3);
    this.step = 0;
    this._animFrame = null;
    this._previewCtx = null;
  }

  /** Start the calibration wizard. */
  start() {
    this.step = 0;
    this._showStep(0);
    this._startPreview();
    this._bindEvents();
  }

  _bindEvents() {
    const btnCaptureBg = document.getElementById('btn-cal-capture-bg');
    const btnCaptureShadow = document.getElementById('btn-cal-capture-shadow');
    const btnDone = document.getElementById('btn-cal-done');
    const btnSkip = document.getElementById('btn-cal-skip');

    btnCaptureBg.onclick = () => this._captureBackground();
    btnCaptureShadow.onclick = () => this._captureShadow();
    btnDone.onclick = () => this._finish();
    btnSkip.onclick = () => this._skip();
  }

  _showStep(stepIndex) {
    const steps = document.querySelectorAll('.cal-step');
    steps.forEach((el, i) => {
      el.classList.toggle('hidden', i !== stepIndex);
    });
    this.step = stepIndex;
  }

  _startPreview() {
    const previewCanvases = [
      document.getElementById('cal-preview'),
      document.getElementById('cal-preview-shadow'),
      document.getElementById('cal-preview-test'),
    ];

    const updatePreview = () => {
      if (!this.capture.ready) {
        this._animFrame = requestAnimationFrame(updatePreview);
        return;
      }

      const canvas = this.capture.getCanvas();
      if (canvas) {
        const targetCanvas = previewCanvases[this.step];
        if (targetCanvas) {
          const ctx = targetCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);

          // In step 2, also run classification
          if (this.step === 2) {
            this._runTestClassification(canvas);
          }
        }
      }

      this._animFrame = requestAnimationFrame(updatePreview);
    };

    this._animFrame = requestAnimationFrame(updatePreview);
  }

  _captureBackground() {
    const canvas = this.capture.getCanvas();
    if (!canvas) return;

    this.processor.captureBackground(canvas);
    this._showStep(1);
  }

  _captureShadow() {
    const canvas = this.capture.getCanvas();
    if (!canvas) return;

    // Auto-detect threshold
    const threshold = this.processor.autoDetectThreshold(canvas);
    this.processor.setThreshold(threshold);
    state.set('threshold', threshold);

    // Update threshold bar
    const fill = document.getElementById('cal-threshold-fill');
    if (fill) fill.style.width = `${Math.min(100, (threshold / 200) * 100)}%`;

    this._showStep(2);
  }

  _runTestClassification(canvas) {
    const features = this.processor.processFrame(canvas);
    const result = classifyShape(features);
    const smoothed = this.smoother.update(result.shape, result.confidence);

    // Update UI
    const label = document.getElementById('cal-shape-label');
    const fill = document.getElementById('cal-confidence-fill');
    const btnDone = document.getElementById('btn-cal-done');

    if (label) {
      const names = {
        [SHAPE.UNKNOWN]: 'Detecting...',
        [SHAPE.OPEN_HAND]: '✋ Open Hand detected!',
        [SHAPE.FIST]: '✊ Fist detected',
        [SHAPE.SCISSORS]: '✌️ Scissors detected',
        [SHAPE.PEACE_SIGN]: '🤞 Peace Sign detected',
        [SHAPE.POINTING]: '👆 Pointing detected',
      };
      label.textContent = names[smoothed.shape] || 'Detecting...';
    }

    if (fill) {
      fill.style.width = `${Math.round(smoothed.confidence * 100)}%`;
    }

    // Enable "Start Playing" when any shape is detected
    if (btnDone && smoothed.shape !== SHAPE.UNKNOWN && smoothed.stable) {
      btnDone.disabled = false;
    }
  }

  _finish() {
    this._stopPreview();
    state.set('isCalibrated', true);
    events.emit('calibration:done');
  }

  _skip() {
    this._stopPreview();
    // Use default threshold
    this.processor.setThreshold(state.get('threshold') || CV_DEFAULT_THRESHOLD);
    state.set('isCalibrated', true);
    events.emit('calibration:done');
  }

  _stopPreview() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  destroy() {
    this._stopPreview();
  }
}

export default Calibration;

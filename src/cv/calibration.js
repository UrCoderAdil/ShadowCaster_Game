import { TemporalSmoother } from './classifier.js';
import { drawPreview } from './preview.js';
import { SHAPE, SHAPE_LABELS } from '../core/constants.js';
import events from '../core/events.js';
import state from '../core/state.js';

export class Calibration {
  constructor(capture, processor, detect, mode) {
    Object.assign(this, { capture, processor, detect, mode });
    this.smoother = new TemporalSmoother(); this.frame = null; this.lastTime = 0;
  }
  start() {
    document.getElementById('calibration-title').textContent = this.mode === 'fingers' ? 'Meet your hands.' : 'Find your shadow.';
    document.getElementById('cal-test-instruction').textContent = this.mode === 'fingers'
      ? 'Hold one open hand in frame, palm facing the camera.' : 'Spread five fingers in your shadow. Keep the full silhouette in frame.';
    document.getElementById('btn-cal-done').disabled = true;
    document.getElementById('btn-cal-skip').textContent = this.mode === 'fingers' ? 'Enter garden anyway' : 'Use manual threshold';
    this._showStep(this.mode === 'fingers' ? 2 : 0);
    document.getElementById('btn-cal-capture-bg').onclick = () => {
      const canvas = this.capture.getCanvas(); if (!canvas) return;
      this.processor.captureBackground(canvas); this._showStep(1);
    };
    document.getElementById('btn-cal-capture-shadow').onclick = () => {
      const canvas = this.capture.getCanvas(); if (!canvas) return;
      const threshold = this.processor.autoDetectThreshold(canvas);
      this.processor.setThreshold(threshold); state.set('threshold', threshold); this._showStep(2);
    };
    document.getElementById('btn-cal-done').onclick = () => this._finish();
    document.getElementById('btn-cal-skip').onclick = () => this._finish();
    this._preview();
  }
  _showStep(step) {
    this.step = step;
    document.querySelectorAll('.cal-step').forEach((el, i) => el.classList.toggle('hidden', i !== step));
  }
  _preview = (now = performance.now()) => {
    if (now - this.lastTime >= 100 && this.capture.ready) {
      this.lastTime = now;
      const source = this.capture.getCanvas();
      if (source) {
        let result;
        try { result = this.step === 2 ? this.detect(now) : {}; }
        catch (error) { this.destroy(); events.emit('calibration:error', error); return; }
        const target = document.getElementById(['cal-preview','cal-preview-shadow','cal-preview-test'][this.step]);
        drawPreview(target, source, result, this.step === 2 && this.mode === 'shadow' ? this.processor.getBinaryMask() : null);
        if (this.step === 2) {
          const stable = this.smoother.update(result.shape, result.confidence, now);
          document.getElementById('cal-shape-label').textContent = stable.shape === SHAPE.UNKNOWN ? 'Keep your whole hand in frame · hold still' : `${SHAPE_LABELS[stable.shape]} recognized`;
          document.getElementById('cal-confidence-fill').style.width = `${stable.confidence * 100}%`;
          document.getElementById('btn-cal-done').disabled = !(stable.stable && stable.shape !== SHAPE.UNKNOWN);
        }
      }
    }
    this.frame = requestAnimationFrame(this._preview);
  };
  _finish() { this.destroy(); state.set('isCalibrated', true); events.emit('calibration:done'); }
  destroy() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; }
}

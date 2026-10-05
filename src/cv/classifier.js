import { SHAPE, CV_TEMPORAL_FRAMES } from '../core/constants.js';

/** Two-finger silhouettes use their valley angle to separate spells. */
export function classifyShape(f) {
  const unknown = { shape: SHAPE.UNKNOWN, confidence: 0 };
  if (!f || f.solidity < 0.35 || f.blobCount > 3) return unknown;
  const { fingerCount: gaps, solidity, aspectRatio, circularity } = f;
  if (gaps >= 3 && solidity < 0.88) return { shape: SHAPE.OPEN_HAND, confidence: 0.85 };
  if (gaps === 0 && solidity > 0.87 && circularity > 0.42 && aspectRatio > 0.65 && aspectRatio < 1.55)
    return { shape: SHAPE.FIST, confidence: 0.8 };
  if (gaps === 1 || gaps === 2) {
    const spread = Math.max(...(f.defectAngles || [0]));
    if (solidity < 0.86 && spread > 18)
      return { shape: spread > 55 ? SHAPE.PEACE_SIGN : SHAPE.SCISSORS, confidence: 0.7 };
  }
  if (gaps <= 1 && solidity > 0.45 && (aspectRatio < 0.6 || aspectRatio > 1.8))
    return { shape: SHAPE.POINTING, confidence: 0.7 };
  return unknown;
}

/** Confirmation dwell plus a release timeout prevents stale and flickering casts. */
export class TemporalSmoother {
  constructor(requiredFrames = CV_TEMPORAL_FRAMES) { this.requiredFrames = requiredFrames; this.reset(); }
  update(shape, confidence, now = performance.now()) {
    if (!Number.isFinite(confidence) || confidence < 0.6) shape = SHAPE.UNKNOWN;
    if (shape === SHAPE.UNKNOWN) {
      this._candidate = SHAPE.UNKNOWN; this._frames = 0;
      if (now - this._lastValid >= 240) {
        this._lockedShape = SHAPE.UNKNOWN;
        return { shape: SHAPE.UNKNOWN, confidence: 0, stable: true };
      }
      return { shape: this._lockedShape, confidence: 0, stable: false };
    }
    this._lastValid = now;
    if (shape !== this._candidate) { this._candidate = shape; this._frames = 0; this._since = now; }
    this._frames++;
    if (this._frames >= this.requiredFrames && now - this._since >= 160) {
      this._lockedShape = shape;
      return { shape, confidence, stable: true };
    }
    return { shape: this._lockedShape, confidence: confidence * 0.4, stable: false };
  }
  get currentShape() { return this._lockedShape; }
  reset() { this._lockedShape = SHAPE.UNKNOWN; this._candidate = SHAPE.UNKNOWN; this._frames = 0; this._since = 0; this._lastValid = -Infinity; }
}

/* ═══════════════════════════════════════════════════════
   Shape Classifier — Rule-based, no ML
   Pure function: features → shape_id + confidence
   ═══════════════════════════════════════════════════════ */

import { SHAPE, CV_TEMPORAL_FRAMES } from '../core/constants.js';

/**
 * Classify a shadow shape from geometric features.
 * Uses decision-tree logic on convexity defects, solidity, and aspect ratio.
 *
 * @param {Object} features - From Processor.processFrame()
 * @returns {{ shape: string, confidence: number }}
 */
export function classifyShape(features) {
  if (!features) {
    return { shape: SHAPE.UNKNOWN, confidence: 0 };
  }

  const { fingerCount, solidity, aspectRatio, circularity, area } = features;

  // Score each shape and pick the best match
  const scores = {};

  // ─── Open Hand (5 fingers spread) ───
  // High defect count (4-5), low-medium solidity, roughly square
  scores[SHAPE.OPEN_HAND] = 0;
  if (fingerCount >= 4) scores[SHAPE.OPEN_HAND] += 0.5;
  if (fingerCount >= 3) scores[SHAPE.OPEN_HAND] += 0.2;
  if (solidity >= 0.55 && solidity <= 0.80) scores[SHAPE.OPEN_HAND] += 0.2;
  if (aspectRatio >= 0.6 && aspectRatio <= 1.6) scores[SHAPE.OPEN_HAND] += 0.1;

  // ─── Fist (closed hand) ───
  // Very low defect count (0-1), high solidity, roughly square/circular
  scores[SHAPE.FIST] = 0;
  if (fingerCount <= 1) scores[SHAPE.FIST] += 0.4;
  if (fingerCount === 0) scores[SHAPE.FIST] += 0.2;
  if (solidity >= 0.85) scores[SHAPE.FIST] += 0.25;
  if (circularity >= 0.5) scores[SHAPE.FIST] += 0.1;
  if (aspectRatio >= 0.65 && aspectRatio <= 1.5) scores[SHAPE.FIST] += 0.05;

  // ─── Scissors / V-shape ───
  // 1-2 defects, medium solidity, can be elongated
  scores[SHAPE.SCISSORS] = 0;
  if (fingerCount >= 1 && fingerCount <= 2) scores[SHAPE.SCISSORS] += 0.35;
  if (solidity >= 0.55 && solidity <= 0.82) scores[SHAPE.SCISSORS] += 0.2;
  if (aspectRatio >= 0.5 && aspectRatio <= 1.4) scores[SHAPE.SCISSORS] += 0.1;
  // Scissors tend to have deeper defects (wider V)
  if (features.defectDepths.length > 0) {
    const maxDepth = Math.max(...features.defectDepths);
    if (maxDepth > 30) scores[SHAPE.SCISSORS] += 0.15;
  }

  // ─── Peace Sign ───
  // Similar to scissors (1-2 defects) but more square aspect ratio
  scores[SHAPE.PEACE_SIGN] = 0;
  if (fingerCount >= 1 && fingerCount <= 2) scores[SHAPE.PEACE_SIGN] += 0.3;
  if (solidity >= 0.55 && solidity <= 0.78) scores[SHAPE.PEACE_SIGN] += 0.15;
  if (aspectRatio >= 0.7 && aspectRatio <= 1.3) scores[SHAPE.PEACE_SIGN] += 0.2;
  // Peace sign is more vertically oriented
  if (aspectRatio < 0.9) scores[SHAPE.PEACE_SIGN] += 0.1;
  if (features.defectDepths.length === 1) {
    const depth = features.defectDepths[0];
    if (depth > 20 && depth < 60) scores[SHAPE.PEACE_SIGN] += 0.1;
  }

  // ─── Pointing (index finger) ───
  // 0-1 defects, medium solidity, very elongated
  scores[SHAPE.POINTING] = 0;
  if (fingerCount <= 1) scores[SHAPE.POINTING] += 0.25;
  if (solidity >= 0.5 && solidity <= 0.75) scores[SHAPE.POINTING] += 0.15;
  if (aspectRatio > 1.8 || aspectRatio < 0.55) scores[SHAPE.POINTING] += 0.35;
  if (aspectRatio > 2.2 || aspectRatio < 0.45) scores[SHAPE.POINTING] += 0.15;

  // Find the best scoring shape
  let bestShape = SHAPE.UNKNOWN;
  let bestScore = 0;
  let secondBest = 0;

  for (const [shape, score] of Object.entries(scores)) {
    if (score > bestScore) {
      secondBest = bestScore;
      bestScore = score;
      bestShape = shape;
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  // Confidence: how much better is the best vs second-best?
  // Also factor in absolute score
  const margin = bestScore - secondBest;
  const confidence = Math.min(1, bestScore * (0.5 + margin));

  // If confidence is too low, it's unknown
  if (confidence < 0.3 || bestScore < 0.35) {
    return { shape: SHAPE.UNKNOWN, confidence: confidence };
  }

  return { shape: bestShape, confidence: Math.min(1, confidence) };
}

/**
 * Temporal smoother — requires N consecutive frames to agree before locking in.
 */
export class TemporalSmoother {
  constructor(requiredFrames = CV_TEMPORAL_FRAMES) {
    this.requiredFrames = requiredFrames;
    this._history = [];
    this._lockedShape = SHAPE.UNKNOWN;
    this._lockedConfidence = 0;
  }

  /**
   * Feed a new classification result.
   * @returns {{ shape: string, confidence: number, stable: boolean }}
   */
  update(shape, confidence) {
    this._history.push({ shape, confidence });

    // Keep only the last N entries
    if (this._history.length > this.requiredFrames) {
      this._history.shift();
    }

    // Check if all recent frames agree
    if (this._history.length >= this.requiredFrames) {
      const allSame = this._history.every(h => h.shape === shape);
      if (allSame) {
        this._lockedShape = shape;
        this._lockedConfidence = confidence;
        return { shape, confidence, stable: true };
      }
    }

    // Not yet stable — return the locked shape
    return {
      shape: this._lockedShape,
      confidence: this._lockedConfidence,
      stable: false,
    };
  }

  /** Get current stable shape. */
  get currentShape() {
    return this._lockedShape;
  }

  /** Reset smoother state. */
  reset() {
    this._history = [];
    this._lockedShape = SHAPE.UNKNOWN;
    this._lockedConfidence = 0;
  }
}

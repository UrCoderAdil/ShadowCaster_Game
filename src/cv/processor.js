/* ═══════════════════════════════════════════════════════
   CV Processor — Threshold, contours, hull, defects
   Full classical CV pipeline using OpenCV.js
   ═══════════════════════════════════════════════════════ */

import { CV_FRAME_WIDTH, CV_FRAME_HEIGHT, CV_MIN_CONTOUR_AREA, CV_DEFAULT_THRESHOLD } from '../core/constants.js';

export class Processor {
  constructor() {
    this.threshold = CV_DEFAULT_THRESHOLD;
    this.backgroundFrame = null;  // For background subtraction
    this.useBackgroundSub = false;

    // Pre-allocate cv.Mat objects (reused each frame to avoid leaks)
    this._mats = null;
    this._ready = false;
  }

  /** Initialize OpenCV Mat objects. Call after OpenCV is loaded. */
  init() {
    const cv = window.cv;
    if (!cv) {
      console.error('[Processor] OpenCV not loaded');
      return;
    }

    this._mats = {
      src: new cv.Mat(CV_FRAME_HEIGHT, CV_FRAME_WIDTH, cv.CV_8UC4),
      gray: new cv.Mat(),
      blur: new cv.Mat(),
      binary: new cv.Mat(),
      bgGray: null,
      diff: new cv.Mat(),
      hierarchy: new cv.Mat(),
      hull: new cv.Mat(),
    };

    this._ready = true;
    console.log('[Processor] OpenCV initialized');
  }

  /** Set the threshold value. */
  setThreshold(value) {
    this.threshold = value;
  }

  /**
   * Capture background frame for background subtraction.
   * @param {HTMLCanvasElement} canvas
   */
  captureBackground(canvas) {
    const cv = window.cv;
    if (!cv || !this._ready) return;

    if (this._mats.bgGray) this._mats.bgGray.delete();

    const src = cv.imread(canvas);
    this._mats.bgGray = new cv.Mat();
    cv.cvtColor(src, this._mats.bgGray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(this._mats.bgGray, this._mats.bgGray, new cv.Size(5, 5), 0);
    src.delete();

    this.useBackgroundSub = true;
    console.log('[Processor] Background captured');
  }

  /**
   * Process a frame and extract shape features.
   * @param {HTMLCanvasElement} canvas — the cv-canvas with current frame drawn
   * @returns {Object|null} Features object or null if no valid contour
   */
  processFrame(canvas) {
    const cv = window.cv;
    if (!cv || !this._ready) return null;

    const m = this._mats;

    try {
      // Read frame into Mat
      const src = cv.imread(canvas);
      cv.cvtColor(src, m.gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(m.gray, m.blur, new cv.Size(5, 5), 0);
      src.delete();

      // ─── Binary mask ───
      if (this.useBackgroundSub && m.bgGray) {
        // Background subtraction mode: diff current - background
        cv.absdiff(m.blur, m.bgGray, m.diff);
        cv.threshold(m.diff, m.binary, this.threshold, 255, cv.THRESH_BINARY);
      } else {
        // Simple threshold: dark regions = shadow
        cv.threshold(m.blur, m.binary, this.threshold, 255, cv.THRESH_BINARY_INV);
      }

      // Clean up noise
      const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
      cv.morphologyEx(m.binary, m.binary, cv.MORPH_OPEN, kernel);
      cv.morphologyEx(m.binary, m.binary, cv.MORPH_CLOSE, kernel);
      kernel.delete();

      // ─── Find contours ───
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(m.binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // Find largest contour above minimum area
      let maxArea = 0;
      let maxIdx = -1;
      const allBlobs = [];

      for (let i = 0; i < contours.size(); i++) {
        const area = cv.contourArea(contours.get(i));
        if (area > CV_MIN_CONTOUR_AREA) {
          allBlobs.push({ index: i, area });
          if (area > maxArea) {
            maxArea = area;
            maxIdx = i;
          }
        }
      }

      if (maxIdx === -1) {
        // No valid contour — clean up and return null
        contours.delete();
        hierarchy.delete();
        return null;
      }

      // ─── Analyze the largest contour ───
      const contour = contours.get(maxIdx);
      const features = this._extractFeatures(cv, contour, maxArea);

      // Add multi-blob info
      features.blobCount = allBlobs.length;

      // Clean up
      contours.delete();
      hierarchy.delete();

      return features;
    } catch (err) {
      console.error('[Processor] Frame processing error:', err);
      return null;
    }
  }

  /**
   * Extract geometric features from a contour.
   */
  _extractFeatures(cv, contour, area) {
    // Convex hull (as indices for defects)
    const hullIndices = new cv.Mat();
    cv.convexHull(contour, hullIndices, false, false);

    // Convex hull area (as points for area calculation)
    const hullPoints = new cv.Mat();
    cv.convexHull(contour, hullPoints, false, true);
    const hullArea = cv.contourArea(hullPoints);

    // Solidity
    const solidity = hullArea > 0 ? area / hullArea : 0;

    // Bounding rectangle
    const rect = cv.boundingRect(contour);
    const aspectRatio = rect.width / (rect.height || 1);

    // Perimeter and circularity
    const perimeter = cv.arcLength(contour, true);
    const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;

    // Convexity defects — count "finger-like" protrusions
    let fingerCount = 0;
    const defectDepths = [];

    if (hullIndices.rows > 3) {
      try {
        const defects = new cv.Mat();
        cv.convexityDefects(contour, hullIndices, defects);

        for (let i = 0; i < defects.rows; i++) {
          const depth = defects.data32S[i * 4 + 3] / 256.0; // depth in pixels
          if (depth > 15) {
            // Significant defect = gap between fingers
            fingerCount++;
            defectDepths.push(depth);
          }
        }
        defects.delete();
      } catch {
        // convexityDefects can fail on degenerate contours — treat as 0 fingers
      }
    }

    hullIndices.delete();
    hullPoints.delete();

    return {
      area,
      solidity,
      aspectRatio,
      circularity,
      fingerCount,
      defectDepths,
      boundingRect: rect,
      blobCount: 1,
    };
  }

  /**
   * Get the current binary mask for debug display.
   * @returns {cv.Mat|null}
   */
  getBinaryMask() {
    return this._ready ? this._mats.binary : null;
  }

  /**
   * Auto-detect threshold from a shadow frame.
   * Compares background vs shadow frame to find optimal threshold.
   * @param {HTMLCanvasElement} canvas
   * @returns {number} Suggested threshold
   */
  autoDetectThreshold(canvas) {
    const cv = window.cv;
    if (!cv || !this._ready) return CV_DEFAULT_THRESHOLD;

    try {
      const src = cv.imread(canvas);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Use Otsu's method to find optimal threshold
      const binary = new cv.Mat();
      const threshold = cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

      src.delete();
      gray.delete();
      binary.delete();

      console.log(`[Processor] Auto-detected threshold: ${Math.round(threshold)}`);
      return Math.round(threshold);
    } catch (err) {
      console.error('[Processor] Auto-detect failed:', err);
      return CV_DEFAULT_THRESHOLD;
    }
  }

  /** Clean up all Mats. */
  destroy() {
    if (this._mats) {
      Object.values(this._mats).forEach(mat => {
        if (mat && mat.delete) {
          try { mat.delete(); } catch {}
        }
      });
      this._mats = null;
    }
    this._ready = false;
  }
}

export default Processor;

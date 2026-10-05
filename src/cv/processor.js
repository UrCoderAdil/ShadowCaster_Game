import { CV_DEFAULT_THRESHOLD, CV_MIN_CONTOUR_AREA } from '../core/constants.js';

export class Processor {
  constructor() { this.threshold = CV_DEFAULT_THRESHOLD; this._mats = null; this.useBackgroundSub = false; }
  init() {
    this.destroy();
    const cv = window.cv;
    this._mats = { gray: new cv.Mat(), blur: new cv.Mat(), diff: new cv.Mat(), binary: new cv.Mat(),
      bgGray: null, kernel: cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3)) };
  }
  setThreshold(value) { this.threshold = Math.max(8, Math.min(200, Number(value))); }
  _read(canvas) {
    const cv = window.cv, m = this._mats, src = cv.imread(canvas);
    try { cv.cvtColor(src, m.gray, cv.COLOR_RGBA2GRAY); cv.GaussianBlur(m.gray, m.blur, new cv.Size(5, 5), 0); }
    finally { src.delete(); }
    if (this.useBackgroundSub && m.bgGray) {
      cv.subtract(m.bgGray, m.blur, m.diff);
      return m.diff;
    }
    return m.blur;
  }
  captureBackground(canvas) {
    this._read(canvas);
    this._mats.bgGray?.delete(); this._mats.bgGray = this._mats.blur.clone(); this.useBackgroundSub = true;
  }
  autoDetectThreshold(canvas) {
    const cv = window.cv, input = this._read(canvas);
    const value = cv.threshold(input, this._mats.binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    return Math.max(8, Math.min(200, Math.round(value)));
  }
  processFrame(canvas) {
    if (!this._mats) return null;
    const cv = window.cv, m = this._mats;
    const contours = new cv.MatVector(), hierarchy = new cv.Mat();
    let best = null, maxArea = 0, blobs = 0;
    try {
      const input = this._read(canvas);
      cv.threshold(input, m.binary, this.threshold, 255, this.useBackgroundSub ? cv.THRESH_BINARY : cv.THRESH_BINARY_INV);
      cv.morphologyEx(m.binary, m.binary, cv.MORPH_OPEN, m.kernel);
      cv.morphologyEx(m.binary, m.binary, cv.MORPH_CLOSE, m.kernel);
      cv.findContours(m.binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        try {
          const area = cv.contourArea(contour), r = cv.boundingRect(contour);
          if (area < CV_MIN_CONTOUR_AREA || area > canvas.width * canvas.height * 0.65) continue;
          if (r.x < 2 || r.y < 2 || r.x + r.width > canvas.width - 2) continue;
          blobs++;
          if (area > maxArea) { best?.delete(); best = contour.clone(); maxArea = area; }
        } finally { contour.delete(); }
      }
      if (!best) return null;
      const trimmed = this._trimWrist(best, canvas);
      if (trimmed) { best.delete(); best = trimmed; maxArea = cv.contourArea(best); }
      return { ...this._features(best, maxArea), blobCount: blobs };
    } finally { best?.delete(); contours.delete(); hierarchy.delete(); }
  }
  _trimWrist(contour, canvas) {
    const cv = window.cv, r = cv.boundingRect(contour);
    if (r.y + r.height < canvas.height - 2) return null;
    const m = this._mats, widths = [];
    for (let y = r.y; y < r.y + r.height; y++) {
      let left = r.x + r.width, right = r.x;
      for (let x = r.x; x < r.x + r.width; x++) if (m.binary.data[y * canvas.width + x]) { left = Math.min(left, x); right = Math.max(right, x); }
      widths.push(Math.max(0, right - left));
    }
    const widest = Math.max(...widths.slice(0, Math.floor(r.height * 0.7)));
    let cut = -1;
    for (let row = Math.floor(r.height * 0.55); row < widths.length - 5; row++) {
      if (widths.slice(row, row + 5).every(width => width < widest * 0.65)) { cut = r.y + row; break; }
    }
    if (cut < 0) return null;
    const cropped = m.binary.clone(), contours = new cv.MatVector(), hierarchy = new cv.Mat();
    const bottom = cropped.rowRange(cut, cropped.rows);
    try {
      bottom.setTo(new cv.Scalar(0)); cv.findContours(cropped, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      let best = null, area = 0;
      for (let i = 0; i < contours.size(); i++) {
        const candidate = contours.get(i);
        try { const next = cv.contourArea(candidate); if (next > area) { best?.delete(); best = candidate.clone(); area = next; } }
        finally { candidate.delete(); }
      }
      return best;
    } finally { bottom.delete(); cropped.delete(); contours.delete(); hierarchy.delete(); }
  }
  _features(contour, area) {
    const cv = window.cv, indices = new cv.Mat(), hull = new cv.Mat(), defects = new cv.Mat();
    try {
      cv.convexHull(contour, indices, false, false); cv.convexHull(contour, hull, false, true);
      const rect = cv.boundingRect(contour), perimeter = cv.arcLength(contour, true);
      const defectDepths = [], defectAngles = [];
      if (indices.rows > 3) {
        try {
          cv.convexityDefects(contour, indices, defects);
          const point = i => ({ x: contour.data32S[i * 2], y: contour.data32S[i * 2 + 1] });
          const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
          for (let i = 0; i < defects.rows; i++) {
            const d = defects.data32S, start = point(d[i * 4]), end = point(d[i * 4 + 1]), far = point(d[i * 4 + 2]);
            const depth = d[i * 4 + 3] / 256, a = dist(start, far), b = dist(end, far), c = dist(start, end);
            const angle = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b || 1)))) * 180 / Math.PI;
            if (depth > Math.max(8, Math.sqrt(area) * 0.12) && angle < 95) { defectDepths.push(depth); defectAngles.push(angle); }
          }
        } catch { /* Degenerate contours have no usable valleys. */ }
      }
      return { area, solidity: area / (cv.contourArea(hull) || 1), aspectRatio: rect.width / rect.height,
        circularity: 4 * Math.PI * area / (perimeter * perimeter || 1), fingerCount: defectDepths.length,
        defectDepths, defectAngles, boundingRect: rect,
        aim: { x: 1 - (rect.x + rect.width / 2) / 320, y: rect.y / 240 } };
    } finally { indices.delete(); hull.delete(); defects.delete(); }
  }
  getBinaryMask() { return this._mats?.binary || null; }
  destroy() { if (this._mats) Object.values(this._mats).forEach(m => m?.delete()); this._mats = null; this.useBackgroundSub = false; }
}

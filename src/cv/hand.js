import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { SHAPE } from '../core/constants.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
function angle(a, b, c) {
  const ab = distance(a, b), bc = distance(b, c), ac = distance(a, c);
  return Math.acos(Math.max(-1, Math.min(1, (ab * ab + bc * bc - ac * ac) / (2 * ab * bc || 1)))) * 180 / Math.PI;
}

/** Joint geometry independent of handedness and in-plane hand rotation. */
export function classifyHand(points, score = 1, geometry = points) {
  const empty = { shape: SHAPE.UNKNOWN, confidence: 0, landmarks: points || [], aim: null };
  if (points?.length !== 21 || score < 0.65 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return empty;
  if (points.some(p => p.x < 0.015 || p.x > 0.985 || p.y < 0.015 || p.y > 0.985)) return empty;
  const palm = distance(points[0], points[9]);
  if (palm < 0.055 || palm > 0.55) return empty;
  const extended = [5, 9, 13, 17].map(base =>
    angle(geometry[base], geometry[base + 1], geometry[base + 3]) > 155 &&
    angle(geometry[base + 1], geometry[base + 2], geometry[base + 3]) > 150 &&
    distance(geometry[base + 3], geometry[0]) > distance(geometry[base + 1], geometry[0]) * 1.13);
  const folded = [5, 9, 13, 17].map(base =>
    distance(geometry[base + 3], geometry[0]) < distance(geometry[base + 1], geometry[0]) * 1.08);
  const [index, middle, ring, pinky] = extended;
  let shape = SHAPE.UNKNOWN;
  if (extended.every(Boolean)) shape = SHAPE.OPEN_HAND;
  else if (folded.every(Boolean)) shape = SHAPE.FIST;
  else if (index && middle && folded[2] && folded[3]) shape = SHAPE.SCISSORS;
  else if (index && pinky && folded[1] && folded[2]) shape = SHAPE.PEACE_SIGN;
  else if (index && folded[1] && folded[2] && folded[3]) shape = SHAPE.POINTING;
  return { shape, confidence: shape === SHAPE.UNKNOWN ? 0 : Math.min(0.98, score), landmarks: points,
    aim: { x: 1 - points[8].x, y: points[8].y }, extended: [index, middle, ring, pinky] };
}

export class HandTracker {
  constructor() { this.detector = null; this.lastVideoTime = -1; this.lastResult = null; }
  async init() {
    if (this.detector) return;
    const vision = await FilesetResolver.forVisionTasks('/vision');
    const options = { baseOptions: { modelAssetPath: '/vision/hand_landmarker.task', delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.65,
      minHandPresenceConfidence: 0.65, minTrackingConfidence: 0.6 };
    try { this.detector = await HandLandmarker.createFromOptions(vision, options); }
    catch { options.baseOptions.delegate = 'CPU'; this.detector = await HandLandmarker.createFromOptions(vision, options); }
  }
  process(video, now) {
    if (!this.detector || video.readyState < 2) return classifyHand(null);
    if (video.currentTime === this.lastVideoTime) return now - this.lastFrameAt > 300 ? classifyHand(null) : this.lastResult || classifyHand(null);
    this.lastVideoTime = video.currentTime;
    this.lastFrameAt = now;
    const result = this.detector.detectForVideo(video, now);
    this.lastResult = classifyHand(result.landmarks[0], result.handedness[0]?.[0]?.score || 0, result.worldLandmarks[0] || result.landmarks[0]);
    return this.lastResult;
  }
  reset() { this.lastVideoTime = -1; this.lastResult = null; }
  destroy() { this.detector?.close(); this.detector = null; this.reset(); }
}

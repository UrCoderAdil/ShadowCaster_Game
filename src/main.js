import events from './core/events.js';
import state from './core/state.js';
import { SHAPE } from './core/constants.js';
import { Capture } from './cv/capture.js';
import { Processor } from './cv/processor.js';
import { HandTracker } from './cv/hand.js';
import { classifyShape, TemporalSmoother } from './cv/classifier.js';
import { Calibration } from './cv/calibration.js';
import { drawPreview } from './cv/preview.js';
import { World } from './game/world.js';
import { Renderer } from './render/renderer.js';
import { AudioEngine } from './audio/engine.js';
import { HUD } from './ui/hud.js';
import { Menu } from './ui/menu.js';
import { Tutorial } from './ui/tutorial.js';

const capture = new Capture(), processor = new Processor(), hands = new HandTracker();
const smoother = new TemporalSmoother(), audio = new AudioEngine(), renderer = new Renderer();
const hud = new HUD(), menu = new Menu(audio), tutorial = new Tutorial();
let world = null, calibration = null, cvFrame = null, lastShape = SHAPE.UNKNOWN, mode = 'fingers', busy = false, requestId = 0;

function resetTracking() { smoother.reset(); hands.reset(); lastShape = SHAPE.UNKNOWN; state.update({ currentShape: SHAPE.UNKNOWN, shapeConfidence: 0, aim: null }); }
function waitForOpenCV() {
  if (window.cv?.Mat) return Promise.resolve();
  if (!document.getElementById('opencv-loader')) {
    const script = document.createElement('script'); script.id = 'opencv-loader'; script.src = '/opencv.js'; document.head.append(script);
  }
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const check = setInterval(() => {
      if (window.cv?.Mat) { clearInterval(check); resolve(); }
      else if (performance.now() - started > 25000) { clearInterval(check); reject(new Error('Shadow engine could not load. Reload and try again.')); }
    }, 100);
  });
}
function detect(now) {
  if (mode === 'fingers') return hands.process(capture.video, now);
  const canvas = capture.getCanvas(), features = canvas ? processor.processFrame(canvas) : null;
  return { ...classifyShape(features), ...features };
}
function stopCV() { if (cvFrame) cancelAnimationFrame(cvFrame); cvFrame = null; resetTracking(); }
function startCV() {
  stopCV(); let lastTime = 0, failures = 0, videoTime = -1, frameAt = 0;
  function tick(now) {
    if (!state.get('isPaused') && now - lastTime >= (mode === 'fingers' ? 66 : 100)) {
      lastTime = now;
      try {
        if (capture.video.currentTime !== videoTime) { videoTime = capture.video.currentTime; frameAt = now; }
        const cameraAvailable = capture.ready && capture.stream?.getVideoTracks()[0]?.readyState === 'live';
        const fresh = now - frameAt < 300;
        const raw = cameraAvailable && fresh ? detect(now) : { shape: SHAPE.UNKNOWN, confidence: 0 };
        const stable = smoother.update(raw.shape, raw.confidence, now);
        state.update({ currentShape: stable.shape, shapeConfidence: stable.confidence, aim: raw.aim || null });
        events.emit('tracking:update', { ...stable, detected: raw.shape !== SHAPE.UNKNOWN, mode, cameraAvailable, fresh });
        const preview = document.getElementById('tracking-preview');
        if (!document.getElementById('camera-monitor').classList.contains('preview-hidden') && capture.ready)
          drawPreview(preview, capture.getCanvas(), raw, mode === 'shadow' ? processor.getBinaryMask() : null);
        if (state.get('showDebug') && capture.ready) {
          const debug = document.getElementById('debug-canvas'); debug.width = 320; debug.height = 240;
          drawPreview(debug,capture.getCanvas(),raw,mode === 'shadow' ? processor.getBinaryMask() : null);
        }
        if (stable.stable && stable.shape !== lastShape) { lastShape = stable.shape; events.emit('shape:changed', stable); }
        failures = 0;
      } catch (error) {
        resetTracking();
        if (++failures === 3) { menu.pause(); hud.message('Tracking interrupted. Recalibrate or reconnect your camera.'); }
        console.warn('[Tracking]', error.message);
      }
    }
    cvFrame = requestAnimationFrame(tick);
  }
  cvFrame = requestAnimationFrame(tick);
}
function enterGarden() {
  menu.hideAllScreens(); calibration?.destroy(); calibration = null;
  state.set('isPaused', false);
  if (!world) { world = new World(renderer.width, renderer.height); renderer.setWorld(world); world.start(); }
  renderer.getParticleSystem().setDensity(state.get('particleDensity') ?? 2);
  hud.show(); hud.setMode(mode); audio.resume();
  document.getElementById('debug-canvas').classList.toggle('debug-hidden', !state.get('showDebug') || mode === 'explore');
  if (mode !== 'explore') { startCV(); if (!state.get('tutorialDone')) tutorial.start(); }
  else { stopCV(); hud.message('Explore freely · use the five spells below, or keys 1–5'); }
}
async function setup(nextMode, isNew = false) {
  if (busy) return;
  busy = true; const id = ++requestId;
  stopCV(); tutorial.cancel(); calibration?.destroy(); hud.hide();
  document.getElementById('debug-canvas').classList.add('debug-hidden');
  state.set('isPaused', true); mode = nextMode;
  menu.showScreen('loading-screen'); document.getElementById('loading-status').textContent = 'Waiting for camera permission…';
  try {
    if (nextMode !== 'explore') {
      if (!await capture.start(nextMode)) throw new Error(capture.error || 'Camera unavailable.');
      if (id !== requestId) { capture.stop(); return; }
      document.getElementById('loading-status').textContent = nextMode === 'fingers' ? 'Preparing hand tracking…' : 'Preparing the shadow engine…';
      if (nextMode === 'fingers') await hands.init();
      else { await waitForOpenCV(); processor.init(); processor.setThreshold(state.get('threshold')); }
    }
    if (id !== requestId) { capture.stop(); return; }
    if (isNew) {
      const settings = { volume: state.get('volume'), particleDensity: state.get('particleDensity'), reducedMotion: state.get('reducedMotion') };
      world?.destroy(); world = null; state.reset(); state.update(settings);
    }
    state.update({ inputMode: mode, isPaused: true }); resetTracking();
    if (mode === 'explore') { capture.stop(); enterGarden(); }
    else { menu.showScreen('calibration-screen'); calibration = new Calibration(capture, processor, detect, mode); calibration.start(); }
  } catch (error) {
    capture.stop(); menu.showScreen(world ? 'pause-menu' : 'start-screen');
    hud.message(error.message); document.getElementById('start-error').textContent = error.message;
    if (world) hud.show();
  } finally { busy = false; }
}
events.on('app:start', ({ isNew, inputMode }) => setup(inputMode || menu.selectedMode, isNew));
events.on('calibration:done', enterGarden);
events.on('calibration:error', error => {
  calibration?.destroy(); calibration = null; capture.stop();
  menu.showScreen(world ? 'pause-menu' : 'start-screen'); if (world) hud.show();
  hud.message(`Camera processing failed: ${error.message}. Try setup again.`);
  if (!world) state.set('isPaused', false);
});
events.on('app:recalibrate', () => setup(mode));
events.on('app:switchmode', ({ inputMode }) => setup(inputMode));
events.on('app:pause', () => { resetTracking(); audio.pause(); });
events.on('app:resume', () => {
  resetTracking(); audio.resume(); hud.setMode(mode);
  if (world && mode !== 'explore') {
    if (capture.ready) startCV();
    else hud.message('Camera disconnected. Open Pause → Recalibrate to reconnect.');
  }
  if (tutorial.active) tutorial.overlay.classList.add('active');
});
events.on('app:quit', () => {
  requestId++; calibration?.destroy(); calibration = null; stopCV(); tutorial.cancel();
  world?.destroy(); world = null; renderer.setWorld(null); renderer.clearEffects();
  capture.stop(); processor.destroy(); hands.destroy(); hud.hide(); hud.clearTransient(); audio.pause();
  document.getElementById('debug-canvas').classList.add('debug-hidden');
  state.set('isPaused', false); menu.refreshContinue();
});
events.on('cv:threshold_changed', value => processor.setThreshold(value));
events.on('settings:changed', () => renderer.getParticleSystem().setDensity(state.get('particleDensity')));
events.on('spell:manual', ({ shape }) => {
  if (!world || mode !== 'explore' || state.get('isPaused')) return;
  events.emit('shape:changed', { shape, confidence: 1 });
});
document.getElementById('btn-cancel-setup').onclick = () => {
  requestId++; capture.stop(); menu.showScreen(world ? 'pause-menu' : 'start-screen'); if (world) hud.show();
};
document.getElementById('btn-cancel-calibration').onclick = () => {
  calibration?.destroy(); calibration = null;
  if (world) { menu.showScreen('pause-menu'); hud.show(); }
  else { capture.stop(); menu.showScreen('start-screen'); state.set('isPaused', false); audio.pause(); }
};
document.addEventListener('visibilitychange', () => { if (document.hidden && world && !state.get('isPaused')) menu.pause(); });
window.addEventListener('beforeunload', () => { if (world) state.save(); capture.stop(); });
renderer.start();
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) state.set('reducedMotion', true);
state.subscribe(s => document.documentElement.classList.toggle('reduce-motion', s.reducedMotion));

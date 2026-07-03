/* ═══════════════════════════════════════════════════════
   ShadowCaster — Main Entry Point
   Initializes all systems and manages app lifecycle
   ═══════════════════════════════════════════════════════ */

import events from './core/events.js';
import state from './core/state.js';
import { CV_PROCESS_INTERVAL, SHAPE } from './core/constants.js';

import { Capture } from './cv/capture.js';
import { Processor } from './cv/processor.js';
import { classifyShape, TemporalSmoother } from './cv/classifier.js';
import { Calibration } from './cv/calibration.js';

import { World } from './game/world.js';

import { Renderer } from './render/renderer.js';

import { AudioEngine } from './audio/engine.js';

import { HUD } from './ui/hud.js';
import { CalibrationUI } from './ui/calibration-ui.js';
import { Menu } from './ui/menu.js';
import { Tutorial } from './ui/tutorial.js';

// ─── App State ───
let capture, processor, smoother, calibration;
let world, renderer;
let audioEngine;
let hud, calibrationUI, menu, tutorial;
let cvLoopId = null;
let lastShape = SHAPE.UNKNOWN;

// ─── Wait for OpenCV.js to load ───
function waitForOpenCV() {
  return new Promise((resolve) => {
    if (window.cv && window.cv.Mat) {
      resolve();
      return;
    }
    window.__opencvReady = () => {
      // OpenCV.js loaded, but need to wait for WASM init
      if (window.cv.onRuntimeInitialized) {
        // Already has the hook interface
        const originalInit = window.cv.onRuntimeInitialized;
        window.cv.onRuntimeInitialized = () => {
          if (originalInit) originalInit();
          resolve();
        };
      } else if (window.cv.Mat) {
        resolve();
      } else {
        // Poll until ready
        const check = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      }
    };

    // Also handle the case where cv sets onRuntimeInitialized itself
    const checkCv = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        clearInterval(checkCv);
        resolve();
      }
    }, 200);
  });
}

// ─── CV Detection Loop (runs at ~10fps) ───
function startCVLoop() {
  let lastCvTime = 0;

  const cvTick = () => {
    const now = performance.now();
    if (now - lastCvTime < CV_PROCESS_INTERVAL) {
      cvLoopId = requestAnimationFrame(cvTick);
      return;
    }
    lastCvTime = now;

    if (state.get('isPaused') || !capture.ready) {
      cvLoopId = requestAnimationFrame(cvTick);
      return;
    }

    // Grab frame
    const canvas = capture.getCanvas();
    if (!canvas) {
      cvLoopId = requestAnimationFrame(cvTick);
      return;
    }

    // Process
    const features = processor.processFrame(canvas);
    const raw = classifyShape(features);
    const smoothed = smoother.update(raw.shape, raw.confidence);

    // Update state
    state.update({
      currentShape: smoothed.shape,
      shapeConfidence: smoothed.confidence,
    });

    // Emit shape change event
    if (smoothed.shape !== lastShape && smoothed.stable) {
      lastShape = smoothed.shape;
      events.emit('shape:changed', {
        shape: smoothed.shape,
        confidence: smoothed.confidence,
      });
    }

    // Draw debug overlay if enabled
    if (state.get('showDebug')) {
      const debugCanvas = document.getElementById('debug-canvas');
      const mask = processor.getBinaryMask();
      if (mask && debugCanvas && window.cv) {
        try {
          window.cv.imshow(debugCanvas, mask);
        } catch {}
      }
    }

    cvLoopId = requestAnimationFrame(cvTick);
  };

  cvLoopId = requestAnimationFrame(cvTick);
}

function stopCVLoop() {
  if (cvLoopId) {
    cancelAnimationFrame(cvLoopId);
    cvLoopId = null;
  }
}

// ─── App Lifecycle ───

async function init() {
  console.log('[ShadowCaster] Initializing...');

  // Create systems (but don't start them yet)
  capture = new Capture();
  processor = new Processor();
  smoother = new TemporalSmoother();
  audioEngine = new AudioEngine();
  renderer = new Renderer();

  // UI
  hud = new HUD();
  calibrationUI = new CalibrationUI();
  menu = new Menu(audioEngine);
  tutorial = new Tutorial();

  // ─── App events ───
  events.on('app:start', async ({ isNew }) => {
    menu.hideAllScreens();

    // Start webcam
    const camOk = await capture.start();
    if (!camOk) {
      alert('Camera access is required to play ShadowCaster. Please allow camera permissions and reload.');
      menu.showScreen('start-screen');
      return;
    }

    // Wait for OpenCV
    try {
      await waitForOpenCV();
      processor.init();
      console.log('[ShadowCaster] OpenCV ready');
    } catch (e) {
      console.error('[ShadowCaster] OpenCV failed to load:', e);
      alert('Failed to load OpenCV.js. Please reload the page.');
      menu.showScreen('start-screen');
      return;
    }

    // Show calibration
    calibrationUI.show();
    calibration = new Calibration(capture, processor);
    calibration.start();
  });

  events.on('calibration:done', () => {
    calibrationUI.hide();

    // Create game world
    world = new World(renderer.width, renderer.height);
    renderer.setWorld(world);

    // Start everything
    world.start();
    renderer.start();
    startCVLoop();
    hud.show();

    // Start tutorial or go directly to game
    if (!state.get('tutorialDone')) {
      tutorial.start();
    }

    // Set particle density from settings
    renderer.getParticleSystem().setDensity(state.get('particleDensity') || 2);
  });

  events.on('app:recalibrate', () => {
    stopCVLoop();
    smoother.reset();
    calibrationUI.show();
    calibration = new Calibration(capture, processor);
    calibration.start();
  });

  events.on('app:quit', () => {
    stopCVLoop();
    if (world) world.stop();
    renderer.stop();
    hud.hide();
    capture.stop();
    smoother.reset();
    lastShape = SHAPE.UNKNOWN;
  });

  events.on('app:pause', () => {
    // Nothing extra needed — render loop checks isPaused
  });

  events.on('app:resume', () => {
    hud.show();
  });

  events.on('cv:threshold_changed', (threshold) => {
    processor.setThreshold(threshold);
  });

  events.on('tutorial:done', () => {
    console.log('[ShadowCaster] Tutorial complete!');
  });

  // ─── Auto-save on page unload ───
  window.addEventListener('beforeunload', () => {
    state.save();
  });

  console.log('[ShadowCaster] Ready — waiting for user to start');
}

// ─── Boot ───
init().catch(err => {
  console.error('[ShadowCaster] Fatal init error:', err);
});

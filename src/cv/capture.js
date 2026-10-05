/* ═══════════════════════════════════════════════════════
   Webcam Capture — getUserMedia → video → canvas frames
   Supports desktop (front cam) and mobile (back cam)
   ═══════════════════════════════════════════════════════ */

import { CV_FRAME_WIDTH, CV_FRAME_HEIGHT } from '../core/constants.js';

export class Capture {
  constructor() {
    this.video = document.getElementById('webcam-video');
    this.cvCanvas = document.getElementById('cv-canvas');
    this.cvCtx = this.cvCanvas.getContext('2d', { willReadFrequently: true });
    this.cvCanvas.width = CV_FRAME_WIDTH;
    this.cvCanvas.height = CV_FRAME_HEIGHT;
    this.stream = null;
    this.ready = false;
    this._isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Start webcam capture.
   * Desktop: front camera. Mobile: back camera.
   */
  async start(mode = 'fingers') {
    if (this.ready) return true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost. Start the game with npm run dev, or use a secure URL.');
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: this._isMobile && mode === 'shadow' ? 'environment' : 'user' },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Camera did not provide a video stream. Try another camera.')), 10000);
        this.video.onloadedmetadata = () => {
          this.video.play().then(() => { clearTimeout(timeout); resolve(); }).catch(reject);
        };
        this.video.onerror = error => { clearTimeout(timeout); reject(error); };
        this.video.srcObject = this.stream;
      });

      this.ready = true;
      console.log(`[Capture] Webcam started (${this._isMobile ? 'back' : 'front'} cam) — ${this.video.videoWidth}×${this.video.videoHeight}`);
      return true;
    } catch (err) {
      console.error('[Capture] Webcam failed:', err);
      this.error = err.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser, then try again.' :
        err.name === 'NotFoundError' ? 'No camera found. Connect a webcam or explore with the spell buttons.' : err.message;
      this.stop();
      return false;
    }
  }

  /**
   * Grab a single frame, downscaled to CV_FRAME_WIDTH × CV_FRAME_HEIGHT.
   * Returns the ImageData or null if not ready.
   */
  grabFrame() {
    if (!this.ready || this.video.readyState < 2) return null;

    this.cvCtx.drawImage(this.video, 0, 0, CV_FRAME_WIDTH, CV_FRAME_HEIGHT);
    return this.cvCtx.getImageData(0, 0, CV_FRAME_WIDTH, CV_FRAME_HEIGHT);
  }

  /**
   * Grab raw canvas for OpenCV Mat conversion.
   */
  getCanvas() {
    if (!this.ready || this.video.readyState < 2) return null;
    this.cvCtx.drawImage(this.video, 0, 0, CV_FRAME_WIDTH, CV_FRAME_HEIGHT);
    return this.cvCanvas;
  }

  /** Stop the webcam stream. */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.ready = false;
    this.video.srcObject = null;
  }

  /** Is mobile device? */
  get isMobile() {
    return this._isMobile;
  }
}

export default Capture;

/* ═══════════════════════════════════════════════════════
   Audio Engine — Web Audio API procedural sounds + music
   Zero file downloads — everything synthesized
   ═══════════════════════════════════════════════════════ */

import events from '../core/events.js';
import state from '../core/state.js';
import { randomRange, randomPick } from '../utils/math.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;         // AudioContext (created on user gesture)
    this.master = null;      // Master gain
    this.musicGain = null;   // Music channel
    this.sfxGain = null;     // SFX channel
    this.ambientGain = null; // Ambient channel

    this._started = false;
    this._musicOscs = [];
    this._rainSource = null;
    this._windSource = null;
    this._musicInterval = null;
  }

  /** Initialize audio (must be called from a user gesture). */
  init() {
    if (this._started) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = state.get('volume') || 0.7;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.master);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.2;
      this.ambientGain.connect(this.master);

      this._started = true;
      this._bindEvents();
      this._startAmbient();
      this._startMusic();

      console.log('[Audio] Initialized');
    } catch (e) {
      console.warn('[Audio] Failed to initialize:', e);
    }
  }

  _bindEvents() {
    events.on('game:rain', () => this._playRain());
    events.on('game:smash', () => this._playSmash());
    events.on('game:harvest', () => this._playHarvest());
    events.on('game:lightning', () => this._playLightning());
    events.on('game:summon', () => this._playSummon());
    events.on('combo:triggered', () => this._playCombo());
    events.on('achievement:unlocked', () => this._playAchievement());
  }

  /** Set master volume (0-1). */
  setVolume(v) {
    if (this.master) {
      this.master.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  // ─── Ambient ───

  _startAmbient() {
    // Soft wind noise
    this._windSource = this._createNoise(0.05);
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 300;
    this._windSource.connect(windFilter);
    windFilter.connect(this.ambientGain);
    this._windSource.start();
  }

  // ─── Music (generative ambient pads) ───

  _startMusic() {
    // Slowly shifting pad chords
    const chordProgressions = [
      [261.63, 329.63, 392.00],   // C major
      [293.66, 369.99, 440.00],   // D major
      [246.94, 311.13, 369.99],   // B minor-ish
      [220.00, 277.18, 329.63],   // A minor
    ];

    let chordIndex = 0;

    const playChord = () => {
      // Stop previous
      this._musicOscs.forEach(o => {
        try { o.stop(this.ctx.currentTime + 2); } catch {}
      });
      this._musicOscs = [];

      const chord = chordProgressions[chordIndex % chordProgressions.length];
      chordIndex++;

      for (const freq of chord) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * 0.5; // Lower octave

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 3);
        gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 8);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 12);

        // Add subtle detuning for warmth
        osc.detune.value = randomRange(-5, 5);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 12);
        this._musicOscs.push(osc);
      }
    };

    playChord();
    this._musicInterval = setInterval(playChord, 10000);
  }

  // ─── SFX ───

  _playRain() {
    if (!this._started) return;
    // Burst of filtered noise
    const noise = this._createNoise(0.15);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 3);
  }

  _playSmash() {
    if (!this._started) return;
    // Low-frequency thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);

    // Impact noise
    const noise = this._createNoise(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.2);
  }

  _playHarvest() {
    if (!this._started) return;
    // Pentatonic chime
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5 D5 E5 G5 A5
    const note = randomPick(notes);

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = note * (1 + i * 0.5);

      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15 - i * 0.04, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.9);
    }
  }

  _playLightning() {
    if (!this._started) return;
    // Sharp noise crack
    const noise = this._createNoise(0.5);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.4);

    // Rumble
    setTimeout(() => {
      if (!this._started) return;
      const rumble = this._createNoise(0.2);
      const rFilter = this.ctx.createBiquadFilter();
      rFilter.type = 'lowpass';
      rFilter.frequency.value = 100;

      const rGain = this.ctx.createGain();
      rGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      rGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);

      rumble.connect(rFilter);
      rFilter.connect(rGain);
      rGain.connect(this.sfxGain);
      rumble.start();
      rumble.stop(this.ctx.currentTime + 2.5);
    }, 300);
  }

  _playSummon() {
    if (!this._started) return;
    // Sparkle / bell tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.7);
  }

  _playCombo() {
    if (!this._started) return;
    // Rising arpeggio
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  _playAchievement() {
    if (!this._started) return;
    // Celebratory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  }

  // ─── Utility ───

  _createNoise(duration = 1) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  /** Destroy audio context. */
  destroy() {
    if (this._musicInterval) clearInterval(this._musicInterval);
    this._musicOscs.forEach(o => { try { o.stop(); } catch {} });
    if (this.ctx) {
      this.ctx.close().catch(() => {});
    }
    this._started = false;
  }
}

export default AudioEngine;

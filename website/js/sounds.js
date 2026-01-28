// Retro sound effects using Web Audio API

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
  }

  init() {
    // Create audio context on first user interaction
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Door bell - two-tone chime
  doorbell() {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;

    // First tone
    this.playTone(880, now, 0.15, 'sine');
    // Second tone (higher)
    this.playTone(1108, now + 0.15, 0.2, 'sine');
  }

  // Door close - lower thud
  doorClose() {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Low thump
    this.playTone(150, now, 0.1, 'sine', 0.5);
    // Slight click
    this.playTone(400, now, 0.05, 'square', 0.2);
  }

  // Generic notification blip
  blip() {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    this.playTone(660, now, 0.1, 'square', 0.3);
  }

  playTone(frequency, startTime, duration, type = 'sine', volumeMult = 1) {
    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Envelope
    const vol = this.volume * volumeMult;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.1);
  }
}

export const sounds = new SoundEffects();

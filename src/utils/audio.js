/**
 * Ambient luxury hospitality sound generator
 * Zero external audio files / 404s - 100% synthesized via Web Audio API
 */

class RestaurantAudioSystem {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      this.isPlaying = false;
      return false;
    } else {
      this.startAmbient();
      this.masterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 1.2);
      this.isPlaying = true;
      return true;
    }
  }

  startAmbient() {
    if (!this.ctx || !this.masterGain) return;

    // Warm pentatonic frequencies (Db major / luxurious warm hospitality chord)
    // Db3, F3, Ab3, C4, Eb4
    const notes = [138.59, 174.61, 207.65, 261.63, 311.13];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380 + idx * 40, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.15 + idx * 0.05, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      lfo.start();
    });
  }

  getStatus() {
    return this.isPlaying;
  }
}

export const restaurantAudio = new RestaurantAudioSystem();

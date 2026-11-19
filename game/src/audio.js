// SOLMAR — Streets of the Sun
// Sound: everything is synthesized with the Web Audio API — engine hum, shots,
// chimes and a light music loop. No audio files are loaded. The system stays
// silent until the player first interacts, and never starts in screenshot mode.

/** A tiny synth for the whole game. Call ensure() from a user gesture. */
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = null;
    this.muted = false;
    this.step = 0;
  }

  /** Create the context and start the engine hum and music, once. */
  ensure() {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      // Engine: a low sawtooth whose pitch follows the speed, set by updateEngine.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.startMusic();
    } catch (err) {
      this.ctx = null;
    }
  }

  /** The engine hum follows the player's speed (0 = idle, 1 = top speed). */
  updateEngine(speed01) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.02 + speed01 * 0.05, t, 0.1);
  }

  /** A short noise burst for a gunshot. */
  shot() {
    this.blip(0.09, 'square', 880, 0.12, 0.18);
    this.noise(0.08, 0.2);
  }

  /** A low thud when the player is hurt. */
  hurt() {
    this.blip(0.18, 'sine', 110, 0.25, 0.3);
  }

  /** A crash: noise plus a low thud, for a hard wall hit. */
  crash() {
    this.noise(0.16, 0.25);
    this.blip(0.2, 'sine', 90, 0.3, 0.25);
  }

  /** Two rising notes for a pickup or a crate. */
  pickup() {
    if (!this.ctx) return;
    this.tone(660, 0.09, 0.12);
    setTimeout(() => this.tone(990, 0.12, 0.12), 90);
  }

  /** A little fanfare for a finished mission. */
  mission() {
    if (!this.ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 0.14), i * 110));
  }

  /** A short tone at a frequency, with a quick decay. */
  tone(freq, dur, vol) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (err) {
      // Audio is decoration; never let it break the game.
    }
  }

  /** A blip that slides down in pitch. */
  blip(dur, type, freq, vol, slideTo) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slideTo), this.ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (err) {
      // Audio is decoration; never let it break the game.
    }
  }

  /** White noise for a burst (a shot, a crash). */
  noise(dur, vol) {
    if (!this.ctx) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(gain);
      gain.connect(this.master);
      src.start();
    } catch (err) {
      // Audio is decoration; never let it break the game.
    }
  }

  /** A slow bassline with a sparse melody, scheduled step by step. */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [110, 110, 131, 98, 110, 147, 131, 98];
    const lead = [330, 0, 392, 0, 440, 0, 392, 330];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const i = this.step % 8;
      this.tone(bass[i], 0.42, 0.10);
      if (lead[i]) this.tone(lead[i], 0.3, 0.05);
      this.step += 1;
    }, 460);
  }

  /** Mute or unmute everything. */
  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }
}

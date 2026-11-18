// Synthesised sound only: WebAudio oscillators and noise, no audio files.
// Music is a small golden-hour groove (bass + chords + hats) scheduled ahead.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let sirenOsc = null;
  let sirenGain = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  let musicOn = false;
  let step = 0;
  let nextNoteTime = 0;

  const CHORDS = [
    [110.0, 164.81, 220.0, 261.63], // Am
    [87.31, 130.81, 174.61, 220.0], // F
    [98.0, 146.83, 196.0, 246.94], // G
    [82.41, 123.47, 164.81, 196.0], // E
  ];
  const BASS = [55.0, 43.65, 49.0, 41.2];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  function scheduleMusic() {
    if (!ctx || muted) return;
    const ahead = 0.18;
    while (nextNoteTime < ctx.currentTime + ahead) {
      const bar = Math.floor(step / 8) % 4;
      const beat = step % 8;
      const t = nextNoteTime;
      // Bass on beats 0 and 4.
      if (beat === 0 || beat === 4) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = BASS[bar];
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.connect(gain); gain.connect(master);
        osc.start(t); osc.stop(t + 0.45);
      }
      // Chord stab on off-beats.
      if (beat === 2 || beat === 6) {
        for (const f of CHORDS[bar]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.045, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain); gain.connect(master);
          osc.start(t); osc.stop(t + 0.32);
        }
      }
      // Hat tick every beat.
      const hatLen = Math.floor(ctx.sampleRate * 0.03);
      const buffer = ctx.createBuffer(1, hatLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < hatLen; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / hatLen);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6000;
      const hg = ctx.createGain();
      hg.gain.value = beat % 2 === 0 ? 0.05 : 0.025;
      src.connect(hp); hp.connect(hg); hg.connect(master);
      src.start(t);
      step += 1;
      nextNoteTime += 0.24;
    }
  }

  return {
    unlock,
    get isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() { noiseBurst(0.09, 0.5, 3200); blip(220, 0.08, 'square', 0.18, 90); },
    enemyShot() { noiseBurst(0.07, 0.22, 2400); },
    hit() { blip(160, 0.12, 'sawtooth', 0.2, 60); },
    pickup() { blip(660, 0.09, 'sine', 0.25); blip(990, 0.14, 'sine', 0.25); },
    cash() { blip(880, 0.1, 'sine', 0.25); setTimeout(() => blip(1174, 0.16, 'sine', 0.25), 90); },
    crash() { noiseBurst(0.25, 0.5, 900); blip(90, 0.25, 'sawtooth', 0.25, 40); },
    click() { blip(440, 0.05, 'sine', 0.15); },
    mission() { blip(523, 0.12, 'sine', 0.25); setTimeout(() => blip(784, 0.2, 'sine', 0.25), 120); },
    startMusic() {
      if (musicOn || !ensure()) return;
      musicOn = true;
      nextNoteTime = ctx.currentTime + 0.1;
      step = 0;
      musicTimer = window.setInterval(scheduleMusic, 60);
    },
    stopMusic() {
      musicOn = false;
      if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; }
    },
    setSiren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.05;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.9;
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        lfo.start();
        sirenOsc._lfo = lfo;
      } else if (!on && sirenOsc) {
        try { sirenOsc._lfo.stop(); sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
      }
    },
    setEngine(speedRatio) {
      if (!ensure()) return;
      if (speedRatio > 0.02) {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth';
          engineGain.gain.value = 0.03;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 900;
          engineOsc.connect(filter);
          filter.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        engineOsc.frequency.value = 60 + speedRatio * 160;
        engineGain.gain.value = 0.02 + speedRatio * 0.05;
      } else if (engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
    },
  };
}

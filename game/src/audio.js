// Synthesised sound: every effect and the music loop are built with WebAudio
// oscillators and filtered noise, so the game ships no audio files at all.
// Audio starts only after a user gesture; in a staged screenshot it stays silent.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      ctx._master = master;
      startEngine();
      startMusic();
    } catch { ctx = null; }
    return ctx;
  }

  function startEngine() {
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter).connect(engineGain).connect(ctx._master);
    engineOsc.start();
  }

  function setEngine(speedRatio, driving) {
    if (!ctx || !engineOsc) return;
    const target = driving ? 0.05 + speedRatio * 0.11 : 0.0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    engineOsc.frequency.setTargetAtTime(52 + speedRatio * 130, ctx.currentTime, 0.08);
  }

  function setSiren(on) {
    if (!ctx) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.045;
      sirenOsc.connect(sirenGain).connect(ctx._master);
      sirenOsc.start();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain).connect(sirenOsc.frequency);
      lfo.start();
      sirenOsc._lfo = lfo;
    } else if (!on && sirenOsc) {
      try { sirenOsc._lfo.stop(); sirenOsc.stop(); } catch { /* already stopped */ }
      sirenOsc = null;
    }
  }

  function noiseBurst(duration, filterFreq, volume) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(ctx._master);
    src.start();
  }

  function tone(freq, duration, type, volume, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ctx._master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // A lazy bass-and-keys loop: A minor, 96 bpm, four bars that repeat.
  const BASS = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const bar = musicStep % 8;
      tone(BASS[bar], 0.55, 'triangle', 0.16);
      if (bar % 2 === 0) tone(BASS[bar] * 4, 0.18, 'sine', 0.05);
      if (bar === 0 || bar === 4) tone(220, 0.4, 'sine', 0.04);
      musicStep += 1;
    }, 312);
  }

  return {
    ensure,
    setEngine,
    setSiren,
    gunshot() { noiseBurst(0.12, 1800, 0.5); tone(160, 0.08, 'square', 0.2); },
    crash() { noiseBurst(0.25, 500, 0.5); },
    pickup() { tone(660, 0.1, 'sine', 0.25); tone(990, 0.14, 'sine', 0.25, 0.08); },
    jingle() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, i * 0.12)); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.14, i * 0.16)); },
    busted() { tone(440, 0.5, 'sawtooth', 0.2); tone(415, 0.7, 'sawtooth', 0.2, 0.4); },
    click() { tone(880, 0.05, 'sine', 0.15); },
    setMuted(value) {
      muted = value;
      if (ctx && ctx._master) ctx._master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
  };
}

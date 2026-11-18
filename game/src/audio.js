// audio.js — all sound is synthesized with WebAudio: no audio files, no
// network. Engine hum follows the car's speed, gunshots are noise bursts,
// sirens wail in two tones, and a small bass-and-hats loop plays as music.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let step = 0;
  let enabled = true;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  // A short filtered noise burst (gunshot, impact, explosion).
  function noiseBurst(duration, volume, freq) {
    if (!ensure() || !enabled) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  // One note of the music loop: a soft triangle blip.
  function blip(freq, duration, volume, type = 'triangle') {
    if (!ensure() || !enabled) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // A tiny sun-soaked loop: Am – F – C – G bass with a hat tick.
  const BASS = [110, 87.31, 130.81, 98];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = setInterval(() => {
      if (!enabled || document.hidden) return;
      const root = BASS[Math.floor(step / 4) % 4];
      blip(root, 0.5, 0.16, 'sine');
      if (step % 2 === 0) noiseBurst(0.03, 0.05, 6000);
      if (step % 8 === 6) blip(root * 2, 0.3, 0.06);
      step += 1;
    }, 240);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return {
    resume,
    startMusic,
    stopMusic,
    shot() { noiseBurst(0.12, 0.5, 2400); },
    enemyShot() { noiseBurst(0.1, 0.25, 1800); },
    explosion() { noiseBurst(0.6, 0.8, 700); },
    pickup() { blip(660, 0.15, 0.2); blip(990, 0.2, 0.15); },
    cash() { blip(880, 0.12, 0.2); blip(1174, 0.25, 0.2); },
    siren() { blip(700, 0.4, 0.05, 'sine'); blip(950, 0.4, 0.05, 'sine'); },
    engine(speed01) {
      if (!ensure()) return;
      engineOsc.frequency.value = 55 + speed01 * 130;
      engineGain.gain.value = enabled ? 0.02 + speed01 * 0.05 : 0;
    },
    setEnabled(v) {
      enabled = v;
      if (master) master.gain.value = v ? 0.35 : 0;
    },
    get enabled() { return enabled; },
  };
}

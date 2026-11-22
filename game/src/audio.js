// Original sounds, synthesized with WebAudio: no audio files, nothing fetched.
// A pickup arpeggio, an alert sting, a caught buzz, a getaway jingle, a jammer zap,
// a smoke poof and a UI click. Mute toggles everything.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function context() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, start, seconds, type = 'sine', volume = 0.12) {
    const ac = context();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ac.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + seconds);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + seconds + 0.02);
  }

  function noise(seconds, volume = 0.08) {
    const ac = context();
    if (!ac || muted) return;
    const length = Math.floor(ac.sampleRate * seconds);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ac.destination);
    src.start();
  }

  return {
    play(name) {
      if (muted) return;
      if (name === 'pickup') {
        tone(660, 0, 0.12);
        tone(880, 0.09, 0.12);
        tone(1320, 0.18, 0.2);
      } else if (name === 'alert') {
        tone(220, 0, 0.16, 'square', 0.07);
        tone(233, 0.14, 0.16, 'square', 0.07);
      } else if (name === 'caught') {
        tone(160, 0, 0.35, 'sawtooth', 0.12);
        tone(110, 0.1, 0.5, 'sawtooth', 0.12);
      } else if (name === 'win') {
        tone(523, 0, 0.14);
        tone(659, 0.12, 0.14);
        tone(784, 0.24, 0.16);
        tone(1046, 0.36, 0.3);
      } else if (name === 'jammer') {
        tone(1200, 0, 0.08, 'square', 0.06);
        tone(900, 0.07, 0.08, 'square', 0.06);
        tone(600, 0.14, 0.12, 'square', 0.06);
      } else if (name === 'smoke') {
        noise(0.35, 0.07);
      } else if (name === 'click') {
        tone(440, 0, 0.06, 'triangle', 0.08);
      }
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}

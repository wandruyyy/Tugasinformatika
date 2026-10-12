/* ============================================================
   LIBRARY RECOVERY — SOUND FX (WebAudio, tanpa file eksternal)
   ============================================================ */

const Sfx = (() => {
  let ctx = null;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'soundoff') ctx.resume();
    else if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.05, delay = 0, slide = 0) {
    const c = ac();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      const t0 = c.currentTime + delay;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* audio not available */ }
  }

  function noise(dur, vol = 0.04, delay = 0) {
    const c = ac();
    if (!c) return;
    try {
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = vol;
      src.buffer = buf;
      src.connect(g); g.connect(c.destination);
      src.start(c.currentTime + delay);
    } catch (e) { /* noop */ }
  }

  const api = {
    unlock() { ac(); },
    click() { tone(660, .07, 'square', .03); },
    key() { tone(1100 + Math.random() * 500, .045, 'square', .018); },
    hover() { tone(880, .05, 'sine', .012); },
    correct() { tone(523, .12, 'sine', .06); tone(659, .12, 'sine', .06, .1); tone(784, .2, 'sine', .07, .2); },
    wrong() { tone(220, .22, 'sawtooth', .05); tone(180, .3, 'sawtooth', .04, .12); },
    place() { tone(520, .08, 'triangle', .05); },
    boot() { tone(392, .18, 'sine', .05); tone(523, .18, 'sine', .05, .16); tone(659, .3, 'sine', .06, .32); },
    open() { tone(740, .09, 'sine', .04); tone(988, .12, 'sine', .04, .07); },
    glitch() { noise(.25, .05); tone(90, .22, 'sawtooth', .04); tone(1400, .06, 'square', .02, .1); },
    scan() { tone(1200, .05, 'sine', .02); },
    scanTick() { tone(1300, .04, 'sine', .014); },
    restore() {
      tone(392, .2, 'sine', .06); tone(494, .2, 'sine', .06, .18);
      tone(587, .2, 'sine', .06, .36); tone(784, .45, 'sine', .08, .54);
    },
    fanfare() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => tone(n, .28, 'triangle', .07, i * .13));
      tone(1047, .6, 'sine', .06, .62);
      noise(.4, .02, .1);
    },
  };
  return api;
})();

window.Sfx = Sfx;

// =====================================================================
// AUDIO: every sound is synthesized with the Web Audio API.
//
// Why synthesized: no licensing risk, nothing to download, and the sound can
// react continuously to the game (tension, burning, Foresight) instead of
// playing fixed clips. The design doc's audio rules drive this file:
//   * silence as a weapon: the base ambience is very quiet
//   * every detection state has its own unique sound
//   * a clock tick under time moments, which stops at Stillpoints
//   * adaptive layers that rise with danger
// =====================================================================

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.85;
    this.params = { tension: 0, burn: 0, low: 0, foresight: false, hum: 0, wind: 0.5 };
    this.nextBeat = 0;
    this.nextTick = 0;
    this.nextNote = 0;
    this.nextCrackle = 0;
    this.ambienceKind = null;
    this.layers = null;
  }

  get ready() { return !!this.ctx; }

  // Browsers only allow audio after a user gesture. The title screen calls this.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 18000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master.connect(this.lowpass).connect(comp).connect(ctx.destination);

    // A shared reverb so everything sits in the same dark space.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.4);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.55;
    this.reverb.connect(this.reverbGain).connect(this.master);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.buildContinuous();
    if (this.pendingAmbience) this.setAmbience(this.pendingAmbience);
  }

  impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  // ---------------- building blocks ----------------
  out(pan = 0, wet = 0.25) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p);
    p.connect(this.master);
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      p.connect(w).connect(this.reverb);
    }
    return g;
  }

  noise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.loopStart = Math.random();
    return src;
  }

  env(gain, t, attack, peak, decay) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone(type, freq, t, attack, peak, decay, dest, glideTo = null) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + decay);
    const g = this.ctx.createGain();
    this.env(g, t, attack, peak, decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  burst(t, { type = 'bandpass', freq = 1000, q = 1, attack = 0.002, peak = 0.3, decay = 0.08, dest, sweepTo = null }) {
    const src = this.noise();
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
    const g = this.ctx.createGain();
    this.env(g, t, attack, peak, decay);
    src.connect(f).connect(g).connect(dest);
    src.start(t);
    src.stop(t + attack + decay + 0.05);
  }

  // ---------------- continuous layers ----------------
  buildContinuous() {
    const ctx = this.ctx;
    const L = {};
    // Burning sizzle
    L.burnSrc = this.noise();
    L.burnFilter = ctx.createBiquadFilter(); L.burnFilter.type = 'highpass'; L.burnFilter.frequency.value = 2600;
    L.burnGain = ctx.createGain(); L.burnGain.gain.value = 0;
    L.burnSrc.connect(L.burnFilter).connect(L.burnGain).connect(this.master);
    L.burnSrc.start();
    // Alert strings: two close saws grinding against each other
    L.strGain = ctx.createGain(); L.strGain.gain.value = 0;
    const strFilter = ctx.createBiquadFilter(); strFilter.type = 'bandpass'; strFilter.frequency.value = 900; strFilter.Q.value = 2;
    for (const f of [233.1, 246.9, 349.2]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const trem = ctx.createOscillator(); trem.frequency.value = 7 + Math.random() * 2;
      const tg = ctx.createGain(); tg.gain.value = 0.3;
      const og = ctx.createGain(); og.gain.value = 0.5;
      trem.connect(tg).connect(og.gain);
      o.connect(og).connect(strFilter);
      o.start(); trem.start();
    }
    strFilter.connect(L.strGain);
    L.strGain.connect(this.master);
    const sw = ctx.createGain(); sw.gain.value = 0.4; L.strGain.connect(sw).connect(this.reverb);
    // Stillpoint hum: two sines that beat slowly, the only calm sound in the game
    L.humGain = ctx.createGain(); L.humGain.gain.value = 0;
    for (const f of [196, 294.3, 392.6]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = f > 300 ? 0.35 : 0.6;
      o.connect(og).connect(L.humGain); o.start();
    }
    L.humGain.connect(this.master);
    const hw = ctx.createGain(); hw.gain.value = 0.6; L.humGain.connect(hw).connect(this.reverb);
    // Foresight shimmer
    L.foreGain = ctx.createGain(); L.foreGain.gain.value = 0;
    for (const f of [880, 1318.5]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.7;
      const lg = ctx.createGain(); lg.gain.value = 0.4;
      const og = ctx.createGain(); og.gain.value = 0.5;
      lfo.connect(lg).connect(og.gain);
      o.connect(og).connect(L.foreGain); o.start(); lfo.start();
    }
    L.foreGain.connect(this.reverb);
    this.layers = L;
  }

  setAmbience(kind) {
    if (!this.ctx) { this.pendingAmbience = kind; return; }
    if (this.ambienceKind === kind) return;
    this.ambienceKind = kind;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.amb) {
      const old = this.amb;
      old.gain.gain.setTargetAtTime(0, t, 0.8);
      setTimeout(() => old.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }), 4000);
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, t, 1.5);
    gain.connect(this.master);
    const nodes = [];
    const drone = (freqs, type, level, cutoff) => {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
      const g = ctx.createGain(); g.gain.value = level;
      for (const fr of freqs) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = (Math.random() - 0.5) * 12;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.08;
        const lg = ctx.createGain(); lg.gain.value = level * 0.5;
        lfo.connect(lg).connect(g.gain);
        o.connect(f); o.start(); lfo.start();
        nodes.push(o, lfo);
      }
      f.connect(g).connect(gain);
      const w = ctx.createGain(); w.gain.value = 0.5; g.connect(w).connect(this.reverb);
    };
    const wind = (level, center) => {
      const src = this.noise();
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = center; f.Q.value = 0.8;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lg = ctx.createGain(); lg.gain.value = center * 0.5;
      lfo.connect(lg).connect(f.frequency);
      const g = ctx.createGain(); g.gain.value = level;
      src.connect(f).connect(g).connect(gain);
      src.start(); lfo.start();
      nodes.push(src, lfo);
      this.windGain = g;
    };
    if (kind === 'hall') {
      drone([73.4, 110, 146.8], 'triangle', 0.05, 500);
      wind(0.015, 300);
    } else if (kind === 'night') {
      drone([65.4, 98, 155.6], 'sine', 0.06, 420);
      wind(0.05, 380);
    } else if (kind === 'dawn') {
      drone([65.4, 98, 130.8, 196], 'triangle', 0.05, 900);
      wind(0.04, 600);
    } else if (kind === 'title') {
      drone([55, 82.4, 110], 'sine', 0.06, 380);
      wind(0.02, 260);
    }
    this.amb = { gain, nodes };
  }

  // Called every frame by the game with the current danger picture.
  update(dt, params) {
    if (!this.ctx) return;
    Object.assign(this.params, params);
    const p = this.params;
    const t = this.ctx.currentTime;
    const L = this.layers;
    L.burnGain.gain.setTargetAtTime(Math.min(0.22, p.burn * 0.22), t, 0.05);
    L.strGain.gain.setTargetAtTime(p.tension >= 3 ? 0.05 : p.tension >= 2 ? 0.012 : 0, t, 0.25);
    L.humGain.gain.setTargetAtTime(p.hum * 0.05, t, 0.2);
    L.foreGain.gain.setTargetAtTime(p.foresight ? 0.05 : 0, t, 0.15);
    const cutoff = p.foresight ? 700 : p.low > 0 ? 18000 - p.low * 16000 : 18000;
    this.lowpass.frequency.setTargetAtTime(Math.max(600, cutoff), t, 0.12);

    // Heartbeat: faster with danger or when Substance is low.
    const beatLevel = Math.max(p.tension, p.low > 0.5 ? 2 : p.low > 0.2 ? 1 : 0);
    if (beatLevel > 0 && t >= this.nextBeat) {
      const interval = beatLevel >= 3 ? 0.42 : beatLevel === 2 ? 0.6 : 0.9;
      this.heartbeat(t + 0.02, 0.25 + beatLevel * 0.08);
      this.nextBeat = t + interval;
    }
    // Clock tick while Foresight is open (and during the dawn chase).
    if ((p.foresight || p.clock) && t >= this.nextTick) {
      this.tick(t + 0.01, p.foresight ? 0.12 : 0.06);
      this.nextTick = t + (p.foresight ? 0.5 : p.clockRate ?? 0.5);
    }
    // Burning crackle
    if (p.burn > 0.05 && t >= this.nextCrackle) {
      this.burst(t, { type: 'bandpass', freq: 1800 + Math.random() * 2500, q: 3, peak: 0.08 + p.burn * 0.12, decay: 0.03, dest: this.out((Math.random() - 0.5) * 0.4, 0) });
      this.nextCrackle = t + 0.03 + Math.random() * 0.12;
    }
    // Sparse music: a soft note every few seconds. Silence is part of the score.
    if (this.ambienceKind && this.ambienceKind !== 'title' && t >= this.nextNote) {
      const scale = this.ambienceKind === 'hall' ? [146.8, 174.6, 220, 261.6, 293.7] : [130.8, 155.6, 174.6, 196, 233.1, 261.6];
      const f = scale[Math.floor(Math.random() * scale.length)];
      this.tone('triangle', f, t, 0.8, 0.035, 3.5, this.out((Math.random() - 0.5) * 0.6, 0.9));
      this.nextNote = t + 4 + Math.random() * 6;
    }
  }

  heartbeat(t, level) {
    const d = this.out(0, 0.05);
    this.tone('sine', 58, t, 0.005, level, 0.14, d, 40);
    this.tone('sine', 52, t + 0.17, 0.005, level * 0.7, 0.16, d, 38);
  }

  tick(t, level) {
    this.burst(t, { type: 'bandpass', freq: 3200, q: 8, peak: level, decay: 0.025, dest: this.out(0.15, 0.3) });
  }

  // ---------------- one-shot sounds ----------------
  play(name, { pan = 0, vol = 1 } = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const v = vol;
    switch (name) {
      case 'step':
        this.burst(t, { freq: 500 + Math.random() * 300, q: 1.2, peak: 0.05 * v, decay: 0.05, dest: this.out(pan, 0.05) });
        break;
      case 'land':
        this.burst(t, { type: 'lowpass', freq: 400, peak: 0.12 * v, decay: 0.09, dest: this.out(pan, 0.1) });
        break;
      case 'landHard':
        this.burst(t, { type: 'lowpass', freq: 300, peak: 0.3 * v, decay: 0.2, dest: this.out(pan, 0.2) });
        this.tone('sine', 70, t, 0.003, 0.25 * v, 0.2, this.out(pan, 0.1), 45);
        break;
      case 'jump':
        this.burst(t, { type: 'bandpass', freq: 900, q: 0.8, peak: 0.04 * v, decay: 0.08, dest: this.out(pan, 0.05), sweepTo: 1800 });
        break;
      case 'dash':
        this.burst(t, { type: 'bandpass', freq: 600, q: 0.7, attack: 0.02, peak: 0.16 * v, decay: 0.18, dest: this.out(pan, 0.3), sweepTo: 2400 });
        break;
      case 'merge':
        this.burst(t, { type: 'lowpass', freq: 900, attack: 0.03, peak: 0.06 * v, decay: 0.25, dest: this.out(pan, 0.3), sweepTo: 200 });
        break;
      case 'whiff':
        this.burst(t, { type: 'bandpass', freq: 1400, q: 1, attack: 0.01, peak: 0.18 * v, decay: 0.12, dest: this.out(pan, 0.2), sweepTo: 500 });
        break;
      case 'takedown':
        this.burst(t, { type: 'lowpass', freq: 500, peak: 0.35 * v, decay: 0.25, dest: this.out(pan, 0.3) });
        this.tone('sine', 90, t, 0.003, 0.25 * v, 0.3, this.out(pan, 0.2), 50);
        this.burst(t + 0.15, { type: 'bandpass', freq: 700, q: 0.6, attack: 0.1, peak: 0.07 * v, decay: 0.6, dest: this.out(pan, 0.5), sweepTo: 250 });
        break;
      case 'suspicious': {
        // a low two-note string question
        const d = this.out(pan, 0.6);
        this.tone('sawtooth', 196, t, 0.08, 0.04 * v, 0.6, d);
        this.tone('sawtooth', 207.7, t + 0.12, 0.08, 0.04 * v, 0.7, d);
        break;
      }
      case 'alert': {
        const d = this.out(pan, 0.5);
        this.burst(t, { type: 'highpass', freq: 1500, peak: 0.25 * v, decay: 0.3, dest: d });
        this.tone('sawtooth', 311, t, 0.01, 0.12 * v, 0.6, d, 155);
        this.tone('square', 155.6, t, 0.01, 0.06 * v, 0.5, d, 78);
        break;
      }
      case 'lost':
        this.burst(t, { type: 'bandpass', freq: 600, q: 0.5, attack: 0.2, peak: 0.08 * v, decay: 0.8, dest: this.out(pan, 0.5), sweepTo: 200 });
        break;
      case 'stillpoint': {
        const d = this.out(0, 0.8);
        [392, 493.9, 587.3, 784].forEach((f, i) => this.tone('sine', f, t + i * 0.09, 0.01, 0.06, 2.2, d));
        break;
      }
      case 'sand':
        this.tone('sine', 1046.5, t, 0.005, 0.07, 0.4, this.out(pan, 0.6));
        this.tone('sine', 1568, t + 0.06, 0.005, 0.05, 0.5, this.out(pan, 0.6));
        break;
      case 'shard': {
        const d = this.out(0, 0.8);
        [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => this.tone('triangle', f, t + i * 0.07, 0.01, 0.05, 1.8, d));
        break;
      }
      case 'foresightIn': {
        const d = this.out(0, 0.7);
        this.burst(t, { type: 'bandpass', freq: 300, q: 1, attack: 0.25, peak: 0.12, decay: 0.15, dest: d, sweepTo: 3000 });
        this.tone('sine', 220, t, 0.3, 0.08, 0.5, d, 880);
        break;
      }
      case 'foresightOut':
        this.burst(t, { type: 'bandpass', freq: 2500, q: 1, attack: 0.01, peak: 0.09, decay: 0.3, dest: this.out(0, 0.5), sweepTo: 300 });
        break;
      case 'thread': {
        // Karplus-Strong style pluck, then a low boom
        const d = this.out(0, 0.6);
        this.tone('triangle', 659.3, t, 0.002, 0.14, 0.35, d, 640);
        this.tone('sine', 55, t + 0.25, 0.01, 0.35, 1.4, d, 35);
        this.burst(t + 0.25, { type: 'lowpass', freq: 200, peak: 0.25, decay: 1.0, dest: d });
        break;
      }
      case 'burnTick': {
        // a hiss of steam and a dull thud: each second in the light
        const d = this.out(pan, 0.25);
        this.burst(t, { type: 'highpass', freq: 3200, attack: 0.004, peak: 0.28 * v, decay: 0.32, dest: d, sweepTo: 1400 });
        this.burst(t, { type: 'bandpass', freq: 900, q: 1.2, attack: 0.002, peak: 0.16 * v, decay: 0.12, dest: d });
        this.tone('sine', 82, t, 0.003, 0.32 * v, 0.22, d, 46);
        break;
      }
      case 'death': {
        const d = this.out(pan, 0.6);
        this.burst(t, { type: 'bandpass', freq: 3000, q: 0.7, attack: 0.05, peak: 0.25, decay: 0.9, dest: d, sweepTo: 300 });
        this.tone('sine', 110, t, 0.02, 0.2, 1.2, d, 40);
        break;
      }
      case 'bell': {
        const d = this.out(pan, 1.0);
        const base = 146.8;
        [1, 2.0, 2.4, 3.0, 4.2, 5.4].forEach((m, i) => this.tone('sine', base * m, t, 0.004, 0.22 / (i + 1), 6 - i * 0.7, d));
        break;
      }
      case 'roar': {
        const d = this.out(pan, 0.9);
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(52, t);
        o.frequency.linearRampToValueAtTime(40, t + 2.4);
        const vib = ctx.createOscillator(); vib.frequency.value = 9; const vg = ctx.createGain(); vg.gain.value = 6;
        vib.connect(vg).connect(o.frequency);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
        const g = ctx.createGain(); this.env(g, t, 0.4, 0.4 * v, 2.2);
        o.connect(f).connect(g).connect(d); o.start(t); vib.start(t); o.stop(t + 2.8); vib.stop(t + 2.8);
        this.burst(t, { type: 'lowpass', freq: 600, attack: 0.3, peak: 0.25 * v, decay: 2.0, dest: d });
        break;
      }
      case 'wickStep':
        this.tone('sine', 48, t, 0.004, 0.35 * v, 0.35, this.out(pan, 0.3), 32);
        this.burst(t, { type: 'lowpass', freq: 250, peak: 0.2 * v, decay: 0.3, dest: this.out(pan, 0.3) });
        break;
      case 'ui':
        this.tone('sine', 660, t, 0.002, 0.04, 0.08, this.out(0, 0.2));
        break;
      case 'uiSelect':
        this.tone('triangle', 440, t, 0.004, 0.06, 0.3, this.out(0, 0.5));
        this.tone('triangle', 660, t + 0.06, 0.004, 0.05, 0.4, this.out(0, 0.5));
        break;
      case 'roll':
        for (let i = 0; i < 6; i++) this.tick(t + i * 0.12, 0.1);
        break;
      case 'voiceEntity': {
        const d = this.out(0, 0.9);
        this.tone('sine', 261.6, t, 0.3, 0.025, 1.4, d);
        this.tone('sine', 392, t + 0.05, 0.3, 0.018, 1.4, d);
        break;
      }
      case 'voiceWhisper':
        this.burst(t, { type: 'bandpass', freq: 1300, q: 2, attack: 0.15, peak: 0.07, decay: 0.8, dest: this.out(pan, 0.7), sweepTo: 700 });
        break;
      case 'voiceNpc':
        for (let i = 0; i < 4; i++) this.burst(t + i * 0.08, { type: 'bandpass', freq: 700 + Math.random() * 400, q: 4, peak: 0.03, decay: 0.05, dest: this.out(pan, 0.2) });
        break;
      case 'taken': {
        const d = this.out(pan, 0.6);
        this.tone('sawtooth', 220, t, 0.01, 0.1, 0.8, d, 110);
        this.burst(t, { type: 'highpass', freq: 1200, peak: 0.2, decay: 0.4, dest: d });
        break;
      }
      case 'win': {
        const d = this.out(0, 0.9);
        [261.6, 329.6, 392, 523.3].forEach((f, i) => this.tone('sine', f, t + i * 0.18, 0.05, 0.07, 3, d));
        break;
      }
      case 'interact':
        this.burst(t, { type: 'bandpass', freq: 900, q: 2, peak: 0.08, decay: 0.12, dest: this.out(pan, 0.3) });
        break;
      default:
        break;
    }
  }

  // Volume and pan for a sound at worldX heard from the camera.
  spatial(worldX, camCenterX, range = 900) {
    const dx = worldX - camCenterX;
    return { pan: Math.max(-1, Math.min(1, dx / 640)), vol: Math.max(0, 1 - Math.abs(dx) / range) };
  }
}

export const AUDIO = new AudioEngine();

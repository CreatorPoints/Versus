/**
 * VERSUS - Audio Engine with Custom SFX & Looping Ambience
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('versus_muted') === 'true';
    this.masterGain = null;
    this.buffers = new Map();
    this.currentCrowd = null;

    this.sfxFiles = {
      'crowd': '/sfx/football-ambience.mp3',
      'kick': '/sfx/ball-kick.mp3',
      'bounce': '/sfx/ball-bounce.mp3',
      'cheer': '/sfx/cheer.mp3',
      'win': '/sfx/win.mp3'
    };

    this.preloaded = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.35;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.preloaded && this.ctx) {
      this.preloadSamples();
    }
  }

  async preloadSamples() {
    this.preloaded = true;
    for (const key of Object.keys(this.sfxFiles)) {
      this.loadAudioBuffer(key).catch(() => {});
    }
  }

  async loadAudioBuffer(key) {
    const url = this.sfxFiles[key];
    if (!url) return null;
    if (this.buffers.has(key)) return this.buffers.get(key);

    this.init();
    if (!this.ctx) return null;

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
      this.buffers.set(key, audioBuf);
      return audioBuf;
    } catch (e) {
      console.warn(`SFX buffer load fallback for [${key}]:`, e.message);
      return null;
    }
  }

  async playSample(key, { volume = 1, maxDuration = null, fadeOut = false, loop = false, loopStart = 0, loopEnd = 0 } = {}) {
    if (this.muted) return null;
    this.init();
    if (!this.ctx) return null;

    let buf = this.buffers.get(key);
    if (!buf) {
      buf = await this.loadAudioBuffer(key);
    }
    if (!buf) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    if (loop) {
      source.loop = true;
      if (loopEnd > loopStart) {
        source.loopStart = loopStart;
        source.loopEnd = loopEnd;
      }
    }

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.masterGain);

    const now = this.ctx.currentTime;
    source.start(now);

    if (maxDuration && !loop) {
      if (fadeOut) {
        const fadeStart = Math.max(0, maxDuration - 0.8);
        gain.gain.setValueAtTime(volume, now + fadeStart);
        gain.gain.linearRampToValueAtTime(0.001, now + maxDuration);
      }
      source.stop(now + maxDuration);
    }

    return { source, gain };
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('versus_muted', this.muted);
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
    }
    if (this.muted) {
      this.stopFootballCrowd();
    }
    return this.muted;
  }

  vibrate(pattern = 30) {
    if (navigator.vibrate && !this.muted) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore
      }
    }
  }

  // --- Specific SFX ---

  /**
   * Play Football Crowd / Ambience with seamless looping
   */
  async playFootballCrowd() {
    if (this.muted) return;
    if (this.currentCrowd) return; // Already looping

    const result = await this.playSample('crowd', {
      volume: 0.65,
      loop: true,
      loopStart: 0,
      loopEnd: 6.0 // Seamlessly loops first 6 seconds
    });

    if (result) {
      this.currentCrowd = result;
    }
  }

  stopFootballCrowd() {
    if (this.currentCrowd) {
      try {
        if (this.currentCrowd.gain && this.ctx) {
          const now = this.ctx.currentTime;
          this.currentCrowd.gain.gain.setValueAtTime(this.currentCrowd.gain.gain.value, now);
          this.currentCrowd.gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
          const oldCrowd = this.currentCrowd;
          setTimeout(() => {
            try { oldCrowd.source.stop(); } catch (e) {}
          }, 450);
        } else {
          this.currentCrowd.source.stop();
        }
      } catch (e) {
        // ignore
      }
      this.currentCrowd = null;
    }
  }

  playBallKick() {
    this.playSample('kick', { volume: 0.9 }).then((src) => {
      if (!src) {
        this.playShoot('laser');
      }
    });
    this.vibrate(25);
  }

  playBallBounce(high = false) {
    this.playSample('bounce', { volume: 0.85 }).then((src) => {
      if (!src) {
        this.playBounce(high);
      }
    });
  }

  playCheer() {
    this.playSample('cheer', { volume: 0.9 }).then((src) => {
      if (!src) {
        this.playGoal();
      }
    });
    this.vibrate([60, 40, 100]);
  }

  playVictory() {
    if (this.muted) return;
    this.stopFootballCrowd();
    this.playSample('win', { volume: 0.95 }).then((src) => {
      if (!src) {
        this.playProceduralVictory();
      }
    });
    this.vibrate([100, 50, 100, 50, 200]);
  }

  // --- Procedural Fallbacks ---

  playShoot(type = 'laser') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type === 'tank' ? 'sawtooth' : 'triangle';
    const startFreq = type === 'tank' ? 280 : 880;
    const endFreq = type === 'tank' ? 45 : 120;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.18);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
    this.vibrate(20);
  }

  playBounce(high = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = high ? 650 : 380;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
    this.vibrate(35);
  }

  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.38);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.38);
    this.vibrate([40, 30, 60]);
  }

  playGoal() {
    if (this.muted) return;
    this.playCheer();
  }

  playCountdown(pitch = 440) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
    this.vibrate(20);
  }

  playGo() {
    this.playCountdown(880);
    setTimeout(() => this.playCountdown(1100), 70);
  }

  playDrawSignal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
    this.vibrate([80, 40, 80]);
  }

  playBang() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.25);
    this.vibrate(60);
  }

  playClash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
    this.vibrate(40);
  }

  playParry() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.2);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
    this.vibrate([30, 20, 60]);
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.03);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  playProceduralVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === 3 ? 0.8 : 0.25));

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + (i === 3 ? 0.8 : 0.25));
    });
  }
}

export const sound = new SoundEngine();

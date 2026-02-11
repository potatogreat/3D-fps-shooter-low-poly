// Procedural sound effects using Web Audio API
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  private ensure() {
    if (!this.ctx) this.init();
  }

  playShoot(type: 'pistol' | 'shotgun' | 'rifle' | 'sniper') {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    switch (type) {
      case 'pistol': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noise = this.createNoise(0.08);
        const noiseGain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(this.masterGain);
        noise.connect(noiseGain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'shotgun': {
        const noise = this.createNoise(0.25);
        const noiseGain = this.ctx.createGain();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        noise.connect(noiseGain).connect(this.masterGain);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'rifle': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noise = this.createNoise(0.06);
        const noiseGain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain).connect(this.masterGain);
        noise.connect(noiseGain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'sniper': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noise = this.createNoise(0.4);
        const noiseGain = this.ctx.createGain();
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2000, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gain2.gain.setValueAtTime(0.3, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(this.masterGain);
        noise.connect(noiseGain).connect(this.masterGain);
        osc2.connect(gain2).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
        osc2.start(now);
        osc2.stop(now + 0.2);
        break;
      }
    }
  }

  playHit() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playKill() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  playReload() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Click sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(600, now + 0.1);
    osc.frequency.setValueAtTime(400, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.setValueAtTime(0.001, now + 0.05);
    gain.gain.setValueAtTime(0.3, now + 0.1);
    gain.gain.setValueAtTime(0.001, now + 0.15);
    gain.gain.setValueAtTime(0.4, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playEmpty() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playFootstep() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const noise = this.createNoise(0.1);
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400 + Math.random() * 200;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(filter).connect(gain).connect(this.masterGain);
  }

  playDamage() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playPickup() {
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [400, 600, 800, 1000].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.1);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.12);
    });
  }

  private createNoise(duration: number): AudioBufferSourceNode {
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.start();
    return source;
  }
}

export const audioManager = new AudioManager();

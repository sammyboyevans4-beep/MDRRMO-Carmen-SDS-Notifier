// Web Audio API Continuous Emergency Siren & Audio Manager for MDRRMO Carmen
class SirenManager {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private isSirenActive: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Start continuous, high-priority emergency wailing siren
  public startEmergencySiren() {
    if (this.isSirenActive) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Primary audio oscillator (Wailing siren between 650Hz and 980Hz)
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, now);

      // Low frequency oscillator (LFO) to modulate pitch up and down continuously
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.75, now); // ~1.3s cycle
      lfoGain.gain.setValueAtTime(220, now); // Swing +/- 220Hz

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Set volume
      gainNode.gain.setValueAtTime(0.28, now);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);

      this.osc = osc;
      this.gainNode = gainNode;
      this.lfo = lfo;
      this.lfoGain = lfoGain;
      this.isSirenActive = true;
    } catch (err) {
      console.warn('AudioContext autoplay policy or error:', err);
    }
  }

  // Stop the emergency siren immediately
  public stopEmergencySiren() {
    if (!this.isSirenActive) return;

    try {
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        if (this.osc) {
          try {
            this.osc.stop();
            this.osc.disconnect();
          } catch {}
          this.osc = null;
        }
        if (this.lfo) {
          try {
            this.lfo.stop();
            this.lfo.disconnect();
          } catch {}
          this.lfo = null;
        }
        this.isSirenActive = false;
      }, 120);
    } catch {
      this.isSirenActive = false;
    }
  }

  public getIsSirenActive(): boolean {
    return this.isSirenActive;
  }

  // Short alert chime for acknowledgements or UI actions
  public playAcknowledgeTone() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }
}

export const sirenManager = new SirenManager();

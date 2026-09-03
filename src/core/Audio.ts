export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private isMuted = false;
  private masterVolume = 0.8;
  private musicVolume = 0.6;
  private sfxVolume = 0.85;

  // Peaceful Ambient Music State
  private isMusicPlaying = false;
  private ambientTimer: number | null = null;
  private chordIndex = 0;
  private currentAltitude = 0;

  // Fall Wind whoosh (ONLY played during actual high-speed fall)
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;

  constructor() {}

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.setupFallWindAudio();
      this.startSereneAmbientMusic();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked', e);
    }
  }

  public resumeContext(): void {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(val: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public updateAltitude(altitude: number, velocityY: number): void {
    this.currentAltitude = Math.max(0, altitude);
    if (!this.ctx) return;

    // Wind whoosh ONLY triggers during steep high-speed falls (velocityY < -16 m/s)
    if (this.windGain && this.windFilter) {
      if (velocityY < -16.0) {
        const fallSpeed = Math.min(1.0, (-velocityY - 16.0) / 25.0);
        this.windGain.gain.setTargetAtTime(fallSpeed * 0.45 * this.sfxVolume, this.ctx.currentTime, 0.15);
        this.windFilter.frequency.setTargetAtTime(400 + fallSpeed * 1200, this.ctx.currentTime, 0.15);
      } else {
        // Completely silent otherwise (zero annoying noise on ground or during jumps!)
        this.windGain.gain.setTargetAtTime(0.00001, this.ctx.currentTime, 0.15);
      }
    }
  }

  // --- Serene Ambient Chords (Gentle, Peaceful, Meditative) ---

  private startSereneAmbientMusic(): void {
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;

    // Peaceful, spacious sci-fi chords: Dm9, Gmaj7, Fmaj7, Cmaj9
    const progressions = [
      [146.83, 220.00, 261.63, 329.63, 440.00], // D3, A3, C4, E4, A4 (Dm9)
      [196.00, 246.94, 293.66, 369.99, 493.88], // G3, B3, D4, F#4, B4 (Gmaj7)
      [174.61, 220.00, 261.63, 329.63, 392.00], // F3, A3, C4, E4, G4 (Fmaj7)
      [130.81, 196.00, 246.94, 329.63, 392.00], // C3, G3, B3, E4, G4 (Cmaj9)
    ];

    const playNextChord = () => {
      if (!this.ctx || !this.musicGain) return;

      const chord = progressions[this.chordIndex % progressions.length];
      this.chordIndex++;

      const now = this.ctx.currentTime;
      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Soft sine wave for glass/rhodes purity
        osc.type = 'sine';
        // Gentle altitude octave modulation
        const octShift = this.currentAltitude > 600 ? 2 : 1;
        osc.frequency.setValueAtTime(freq * octShift, now + idx * 0.08);

        const noteStart = now + idx * 0.08;
        const duration = 5.5;

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.06 / chord.length, noteStart + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(noteStart);
        osc.stop(noteStart + duration + 0.1);
      });

      // Schedule next chord every 6.5 seconds
      this.ambientTimer = window.setTimeout(playNextChord, 6500);
    };

    playNextChord();
  }

  // --- Sound Effects (Crisp, Robotic, Satisfying) ---

  public playFootstep(isSprinting: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Robotic magnetic boot step: crisp metallic click + solid damp impulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isSprinting ? 160 : 130;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

    gain.gain.setValueAtTime(isSprinting ? 0.15 : 0.10, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playJump(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Robotic hydraulic actuator impulse + air burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.10);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLanding(fallDistance: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const intensity = Math.min(1, Math.max(0.15, fallDistance / 12));

    // Solid metallic chassis impact
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);

    oscGain.gain.setValueAtTime(0.35 * intensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playLaunchPad(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Pneumatic mag-lev boost pulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.22);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playCheckpoint(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Crystal telemetry beacon ping: E5 -> G#5 -> B5 -> E6
    const freqs = [659.25, 830.61, 987.77, 1318.51];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      const noteTime = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.20, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.95);
    });
  }

  public playFallScream(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Descending optical telemetry alert tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.5);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playVictoryFanfare(): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    // Celestial ascent arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      const t = now + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(gain);
      gain.connect(this.musicGain!);

      osc.start(t);
      osc.stop(t + 1.9);
    });
  }

  private setupFallWindAudio(): void {
    if (!this.ctx || !this.sfxGain) return;

    // Buffer for fall wind whoosh (idle at 0.00001 gain, only audible during high-speed fall)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.00001, this.ctx.currentTime); // Silent on ground

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);

    this.windSource.start();
  }
}

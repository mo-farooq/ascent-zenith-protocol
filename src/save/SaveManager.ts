export interface GameSettings {
  mouseSensitivity: number;
  fov: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  invertY: boolean;
}

export interface GameProgress {
  highestAltitude: number;
  bestTime: number | null; // seconds
  totalFalls: number;
  lastCheckpointId: string;
}

const DEFAULT_SETTINGS: GameSettings = {
  mouseSensitivity: 1.2,
  fov: 75,
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  invertY: false
};

const DEFAULT_PROGRESS: GameProgress = {
  highestAltitude: 0,
  bestTime: null,
  totalFalls: 0,
  lastCheckpointId: 'checkpoint_0'
};

const STORAGE_KEYS = {
  SETTINGS: 'ascent_zenith_settings_v1',
  PROGRESS: 'ascent_zenith_progress_v1'
};

export class SaveManager {
  private settings: GameSettings;
  private progress: GameProgress;

  constructor() {
    this.settings = this.loadSettings();
    this.progress = this.loadProgress();
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage', e);
    }
  }

  public getProgress(): GameProgress {
    return { ...this.progress };
  }

  public updatePeakAltitude(altitude: number): boolean {
    if (altitude > this.progress.highestAltitude) {
      this.progress.highestAltitude = Math.round(altitude * 10) / 10;
      this.persistProgress();
      return true;
    }
    return false;
  }

  public recordFall(): void {
    this.progress.totalFalls++;
    this.persistProgress();
  }

  public recordVictory(timeSeconds: number): boolean {
    let isNewBest = false;
    if (this.progress.bestTime === null || timeSeconds < this.progress.bestTime) {
      this.progress.bestTime = Math.round(timeSeconds * 100) / 100;
      isNewBest = true;
    }
    this.persistProgress();
    return isNewBest;
  }

  public setCheckpoint(id: string): void {
    this.progress.lastCheckpointId = id;
    this.persistProgress();
  }

  public resetProgress(): void {
    this.progress = { ...DEFAULT_PROGRESS };
    this.persistProgress();
  }

  private loadSettings(): GameSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private loadProgress(): GameProgress {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (data) {
        return { ...DEFAULT_PROGRESS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to parse progress from localStorage', e);
    }
    return { ...DEFAULT_PROGRESS };
  }

  private persistProgress(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Failed to persist progress to localStorage', e);
    }
  }
}

import { SaveManager, GameSettings } from '../save/SaveManager';
import { AudioManager } from '../core/Audio';

export interface UIEventCallbacks {
  onStartGame: () => void;
  onResumeGame: () => void;
  onRestartCheckpoint: () => void;
  onQuitToMenu: () => void;
  onSettingsChanged: (settings: GameSettings) => void;
  onRestartGame: () => void;
}

export class UIManager {
  // HUD elements
  private hudAltitude!: HTMLElement;
  private hudAltitudeBar!: HTMLElement;
  private hudPeak!: HTMLElement;
  private hudTimer!: HTMLElement;
  private hudFalls!: HTMLElement;
  private hudCheckpoint!: HTMLElement;
  private hudCells!: HTMLElement;
  private hudDashStatus!: HTMLElement;
  private hudDashBar!: HTMLElement;
  private zoneTag!: HTMLElement;
  private hudZoneBanner!: HTMLElement;
  private hudCheckpointToast!: HTMLElement;
  private hudCellToast!: HTMLElement;
  private fallOverlay!: HTMLElement;
  private fallHeightReport!: HTMLElement;

  // Modals
  private menuMain!: HTMLElement;
  private menuPause!: HTMLElement;
  private modalSettings!: HTMLElement;
  private modalHowTo!: HTMLElement;
  private modalVictory!: HTMLElement;

  // Settings inputs
  private inputSensitivity!: HTMLInputElement;
  private valSensitivity!: HTMLElement;
  private inputFov!: HTMLInputElement;
  private valFov!: HTMLElement;
  private inputVolMaster!: HTMLInputElement;
  private valVolMaster!: HTMLElement;
  private inputVolMusic!: HTMLInputElement;
  private valVolMusic!: HTMLElement;
  private inputVolSfx!: HTMLInputElement;
  private valVolSfx!: HTMLElement;
  private inputInvertY!: HTMLInputElement;

  // Victory elements
  private victoryRank!: HTMLElement;
  private victoryTime!: HTMLElement;
  private victoryFalls!: HTMLElement;
  private victoryHeight!: HTMLElement;
  private victoryGradeText!: HTMLElement;

  private currentZoneIndex = -1;
  private zoneBannerTimeout?: number;
  private checkpointToastTimeout?: number;

  constructor(
    private saveManager: SaveManager,
    private audio: AudioManager,
    private callbacks: UIEventCallbacks
  ) {
    this.bindDOMElements();
    this.setupListeners();
    this.syncSettingsToUI(this.saveManager.getSettings());
  }

  private bindDOMElements(): void {
    this.hudAltitude = document.getElementById('hud-altitude')!;
    this.hudAltitudeBar = document.getElementById('hud-altitude-bar')!;
    this.hudPeak = document.getElementById('hud-peak')!;
    this.hudTimer = document.getElementById('hud-timer')!;
    this.hudFalls = document.getElementById('hud-falls')!;
    this.hudCheckpoint = document.getElementById('hud-checkpoint')!;
    this.hudCells = document.getElementById('hud-cells')!;
    this.hudDashStatus = document.getElementById('hud-dash-status')!;
    this.hudDashBar = document.getElementById('hud-dash-bar')!;
    this.zoneTag = document.getElementById('zone-tag')!;
    this.hudZoneBanner = document.getElementById('hud-zone-banner')!;
    this.hudCheckpointToast = document.getElementById('hud-checkpoint-toast')!;
    this.hudCellToast = document.getElementById('hud-cell-toast')!;
    this.fallOverlay = document.getElementById('fall-overlay')!;
    this.fallHeightReport = document.getElementById('fall-height-report')!;

    this.menuMain = document.getElementById('menu-main')!;
    this.menuPause = document.getElementById('menu-pause')!;
    this.modalSettings = document.getElementById('modal-settings')!;
    this.modalHowTo = document.getElementById('modal-howto')!;
    this.modalVictory = document.getElementById('modal-victory')!;

    this.inputSensitivity = document.getElementById('setting-sensitivity') as HTMLInputElement;
    this.valSensitivity = document.getElementById('val-sensitivity')!;
    this.inputFov = document.getElementById('setting-fov') as HTMLInputElement;
    this.valFov = document.getElementById('val-fov')!;
    this.inputVolMaster = document.getElementById('setting-volume-master') as HTMLInputElement;
    this.valVolMaster = document.getElementById('val-volume-master')!;
    this.inputVolMusic = document.getElementById('setting-volume-music') as HTMLInputElement;
    this.valVolMusic = document.getElementById('val-volume-music')!;
    this.inputVolSfx = document.getElementById('setting-volume-sfx') as HTMLInputElement;
    this.valVolSfx = document.getElementById('val-volume-sfx')!;
    this.inputInvertY = document.getElementById('setting-invert-y') as HTMLInputElement;

    this.victoryRank = document.getElementById('victory-rank')!;
    this.victoryTime = document.getElementById('victory-time')!;
    this.victoryFalls = document.getElementById('victory-falls')!;
    this.victoryHeight = document.getElementById('victory-height')!;
    this.victoryGradeText = document.getElementById('victory-grade-text')!;
  }

  private setupListeners(): void {
    // Main Menu
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.callbacks.onStartGame();
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.showModal(this.modalSettings);
    });

    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      this.showModal(this.modalHowTo);
    });

    // Pause Menu
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.callbacks.onResumeGame();
    });

    document.getElementById('btn-restart-checkpoint')?.addEventListener('click', () => {
      this.callbacks.onRestartCheckpoint();
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.showModal(this.modalSettings);
    });

    document.getElementById('btn-quit-main')?.addEventListener('click', () => {
      this.callbacks.onQuitToMenu();
    });

    // Settings Modal
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.hideModal(this.modalSettings);
    });

    // How to Play Modal
    document.getElementById('btn-close-howto')?.addEventListener('click', () => {
      this.hideModal(this.modalHowTo);
    });

    // Victory Screen
    document.getElementById('btn-victory-restart')?.addEventListener('click', () => {
      this.callbacks.onRestartGame();
    });

    document.getElementById('btn-victory-freeroam')?.addEventListener('click', () => {
      this.hideModal(this.modalVictory);
    });

    // Settings input events
    this.inputSensitivity.addEventListener('input', () => {
      this.valSensitivity.textContent = this.inputSensitivity.value;
      this.applySettingsChanges();
    });

    this.inputFov.addEventListener('input', () => {
      this.valFov.textContent = `${this.inputFov.value}°`;
      this.applySettingsChanges();
    });

    this.inputVolMaster.addEventListener('input', () => {
      const pct = Math.round(parseFloat(this.inputVolMaster.value) * 100);
      this.valVolMaster.textContent = `${pct}%`;
      this.applySettingsChanges();
    });

    this.inputVolMusic.addEventListener('input', () => {
      const pct = Math.round(parseFloat(this.inputVolMusic.value) * 100);
      this.valVolMusic.textContent = `${pct}%`;
      this.applySettingsChanges();
    });

    this.inputVolSfx.addEventListener('input', () => {
      const pct = Math.round(parseFloat(this.inputVolSfx.value) * 100);
      this.valVolSfx.textContent = `${pct}%`;
      this.applySettingsChanges();
    });

    this.inputInvertY.addEventListener('change', () => {
      this.applySettingsChanges();
    });
  }

  private applySettingsChanges(): void {
    const newSettings: GameSettings = {
      mouseSensitivity: parseFloat(this.inputSensitivity.value),
      fov: parseInt(this.inputFov.value, 10),
      masterVolume: parseFloat(this.inputVolMaster.value),
      musicVolume: parseFloat(this.inputVolMusic.value),
      sfxVolume: parseFloat(this.inputVolSfx.value),
      invertY: this.inputInvertY.checked
    };

    this.saveManager.saveSettings(newSettings);
    this.audio.setMasterVolume(newSettings.masterVolume);
    this.audio.setMusicVolume(newSettings.musicVolume);
    this.audio.setSfxVolume(newSettings.sfxVolume);
    this.callbacks.onSettingsChanged(newSettings);
  }

  private syncSettingsToUI(settings: GameSettings): void {
    this.inputSensitivity.value = settings.mouseSensitivity.toString();
    this.valSensitivity.textContent = settings.mouseSensitivity.toString();

    this.inputFov.value = settings.fov.toString();
    this.valFov.textContent = `${settings.fov}°`;

    this.inputVolMaster.value = settings.masterVolume.toString();
    this.valVolMaster.textContent = `${Math.round(settings.masterVolume * 100)}%`;

    this.inputVolMusic.value = settings.musicVolume.toString();
    this.valVolMusic.textContent = `${Math.round(settings.musicVolume * 100)}%`;

    this.inputVolSfx.value = settings.sfxVolume.toString();
    this.valVolSfx.textContent = `${Math.round(settings.sfxVolume * 100)}%`;

    this.inputInvertY.checked = settings.invertY;
  }

  public updateHUD(
    altitude: number,
    peak: number,
    timerSeconds: number,
    falls: number,
    checkpointName: string,
    dashCooldown = 0,
    maxDashCooldown = 2.4,
    cellsCollected = 0,
    cellsTotal = 20
  ): void {
    this.hudAltitude.textContent = altitude.toFixed(1);
    const pct = Math.min(100, Math.max(0, (altitude / 1000) * 100));
    this.hudAltitudeBar.style.width = `${pct}%`;
    this.hudPeak.textContent = `${peak.toFixed(1)}m`;

    // Timer format: MM:SS.m
    const mins = Math.floor(timerSeconds / 60);
    const secs = Math.floor(timerSeconds % 60);
    const tenths = Math.floor((timerSeconds % 1) * 10);
    this.hudTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;

    this.hudFalls.textContent = falls.toString();
    this.hudCheckpoint.textContent = checkpointName;

    // Energy cells counter
    if (this.hudCells) {
      this.hudCells.textContent = `${cellsCollected} / ${cellsTotal}`;
    }

    // Thruster Dash meter
    if (this.hudDashStatus && this.hudDashBar) {
      if (dashCooldown <= 0.05) {
        this.hudDashStatus.textContent = 'READY';
        this.hudDashStatus.style.color = 'var(--accent-cyan)';
        this.hudDashBar.style.width = '100%';
        this.hudDashBar.style.background = 'var(--accent-cyan)';
      } else {
        const remaining = (1 - dashCooldown / maxDashCooldown) * 100;
        this.hudDashStatus.textContent = `${dashCooldown.toFixed(1)}s`;
        this.hudDashStatus.style.color = 'var(--accent-gold)';
        this.hudDashBar.style.width = `${Math.min(100, Math.max(0, remaining))}%`;
        this.hudDashBar.style.background = 'var(--accent-gold)';
      }
    }

    // Check zone change
    this.checkZoneBanner(altitude);
  }

  public showEnergyCellToast(count: number, total: number): void {
    if (!this.hudCellToast) return;
    this.hudCellToast.textContent = `⚡ ENERGY CELL RESTORED [ ${count} / ${total} ]`;
    this.hudCellToast.style.display = 'block';
    this.hudCellToast.classList.add('active');

    window.setTimeout(() => {
      this.hudCellToast.classList.remove('active');
      window.setTimeout(() => {
        this.hudCellToast.style.display = 'none';
      }, 400);
    }, 2500);
  }

  private checkZoneBanner(altitude: number): void {
    const zones = [
      { maxAlt: 60, name: 'ZONE 1: THE YARD' },
      { maxAlt: 180, name: 'ZONE 2: GIRDERS & PIPELINES' },
      { maxAlt: 360, name: 'ZONE 3: SUSPENDED CARGO BAY' },
      { maxAlt: 600, name: 'ZONE 4: CLOCKWORK FOUNDRY' },
      { maxAlt: 850, name: 'ZONE 5: VERTIGO MONOLITHS' },
      { maxAlt: 9999, name: 'ZONE 6: THE APEX ZENITH' }
    ];

    let zoneIdx = 0;
    for (let i = 0; i < zones.length; i++) {
      if (altitude <= zones[i].maxAlt) {
        zoneIdx = i;
        break;
      }
    }

    if (zoneIdx !== this.currentZoneIndex) {
      this.currentZoneIndex = zoneIdx;
      const zoneName = zones[zoneIdx].name;
      this.zoneTag.textContent = zoneName.replace(/ZONE \d: /, '');
      this.showZoneBanner(zoneName);
    }
  }

  private showZoneBanner(name: string): void {
    if (this.zoneBannerTimeout) clearTimeout(this.zoneBannerTimeout);
    this.hudZoneBanner.textContent = name;
    this.hudZoneBanner.classList.add('active');

    this.zoneBannerTimeout = window.setTimeout(() => {
      this.hudZoneBanner.classList.remove('active');
    }, 3500);
  }

  public showCheckpointToast(name: string): void {
    if (this.checkpointToastTimeout) clearTimeout(this.checkpointToastTimeout);
    this.hudCheckpointToast.textContent = `CHECKPOINT: ${name}`;
    this.hudCheckpointToast.classList.add('active');

    this.checkpointToastTimeout = window.setTimeout(() => {
      this.hudCheckpointToast.classList.remove('active');
    }, 2800);
  }

  public showFallOverlay(fallDist: number): void {
    this.fallHeightReport.textContent = `Fell ${fallDist.toFixed(1)} meters`;
    this.fallOverlay.classList.add('active');
  }

  public hideFallOverlay(): void {
    this.fallOverlay.classList.remove('active');
  }

  public showMainMenu(): void {
    this.showModal(this.menuMain);
    this.hideModal(this.menuPause);
  }

  public hideMainMenu(): void {
    this.hideModal(this.menuMain);
  }

  public showPauseMenu(): void {
    this.showModal(this.menuPause);
  }

  public hidePauseMenu(): void {
    this.hideModal(this.menuPause);
  }

  public showVictoryScreen(timeSeconds: number, falls: number, peakAltitude: number): void {
    const mins = Math.floor(timeSeconds / 60);
    const secs = Math.floor(timeSeconds % 60);
    const tenths = Math.floor((timeSeconds % 1) * 10);
    this.victoryTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
    this.victoryFalls.textContent = falls.toString();
    this.victoryHeight.textContent = `${peakAltitude.toFixed(1)}m`;

    // Rank evaluation
    let rank = 'C';
    let gradeText = 'Tenacious Climber';
    if (falls === 0) {
      rank = 'S';
      gradeText = 'Flawless Ascendant';
    } else if (falls <= 3 && timeSeconds < 600) {
      rank = 'A';
      gradeText = 'Master Climber';
    } else if (falls <= 8) {
      rank = 'B';
      gradeText = 'Skilled Navigator';
    }

    this.victoryRank.textContent = rank;
    this.victoryGradeText.textContent = gradeText;

    this.showModal(this.modalVictory);
  }

  private showModal(modal: HTMLElement): void {
    modal.classList.add('active');
  }

  private hideModal(modal: HTMLElement): void {
    modal.classList.remove('active');
  }
}

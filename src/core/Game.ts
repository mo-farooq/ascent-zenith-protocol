import * as THREE from 'three';
import { Input, InputState } from './Input';
import { AudioManager } from './Audio';
import { SaveManager } from '../save/SaveManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Player, PlayerStats } from '../entities/Player';
import { CameraController } from '../entities/CameraController';
import { SkyAtmosphere } from '../environment/SkyAtmosphere';
import { ParticleSystem } from '../environment/ParticleSystem';
import { LevelBuilder } from '../level/LevelBuilder';
import { AltitudeMarkers } from '../level/AltitudeMarkers';
import { UIManager } from '../ui/UIManager';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  VICTORY = 'VICTORY'
}

export class Game {
  public state: GameState = GameState.MENU;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;

  private input: Input;
  private audio: AudioManager;
  private saveManager: SaveManager;
  private physics: PhysicsWorld;
  private cameraController: CameraController;
  private skyAtmosphere: SkyAtmosphere;
  private particles: ParticleSystem;
  private levelBuilder: LevelBuilder;
  private altitudeMarkers: AltitudeMarkers;
  private uiManager: UIManager;
  private player: Player;

  private clock = new THREE.Clock();
  private climbTimer = 0;
  private activeCheckpointName = 'BASE GROUND';
  private hasReachedSummit = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 2. Scene
    this.scene = new THREE.Scene();

    // 3. Core subsystems
    this.saveManager = new SaveManager();
    this.audio = new AudioManager();
    this.input = new Input();
    this.input.attachToCanvas(this.canvas);
    this.physics = new PhysicsWorld();

    // 4. Camera
    this.cameraController = new CameraController(
      this.physics,
      window.innerWidth / window.innerHeight
    );

    // 5. Environment & Particles
    this.skyAtmosphere = new SkyAtmosphere(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // 6. Post-Processing Pipeline (Bloom, Filmic Tone Mapping, Depth Glow)
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.cameraController.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.48, // bloom strength (modern tasteful glow)
      0.35, // radius
      0.82  // threshold
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // 7. Level Construction
    this.levelBuilder = new LevelBuilder(this.scene, this.physics, this.audio);
    this.levelBuilder.buildLevel();
    this.altitudeMarkers = new AltitudeMarkers(this.scene);

    // 8. Player Character
    this.player = new Player(this.physics, this.audio);
    this.scene.add(this.player.model.group);

    // 9. Restore Saved Checkpoint or start at Checkpoint 0
    const savedProgress = this.saveManager.getProgress();
    const targetCpId = savedProgress.lastCheckpointId || 'checkpoint_0';
    const initialCp = this.levelBuilder.checkpoints.find(c => c.id === targetCpId) || this.levelBuilder.checkpoints[0];
    if (initialCp) {
      this.activeCheckpointName = initialCp.name;
      this.player.setCheckpoint(initialCp.position);
      this.player.respawn();
      initialCp.isActivated = true;
    }
    this.cameraController.snapToTarget(this.player.position);

    // 10. Apply saved settings
    const savedSettings = this.saveManager.getSettings();
    this.cameraController.sensitivity = savedSettings.mouseSensitivity;
    this.cameraController.baseFov = savedSettings.fov;
    this.cameraController.invertY = savedSettings.invertY;
    this.audio.setMasterVolume(savedSettings.masterVolume);
    this.audio.setMusicVolume(savedSettings.musicVolume);
    this.audio.setSfxVolume(savedSettings.sfxVolume);

    // 11. UI Manager
    this.uiManager = new UIManager(this.saveManager, this.audio, {
      onStartGame: () => this.startGame(),
      onResumeGame: () => this.resumeGame(),
      onRestartCheckpoint: () => this.restartAtCheckpoint(),
      onQuitToMenu: () => this.quitToMenu(),
      onSettingsChanged: (newSettings) => {
        this.cameraController.sensitivity = newSettings.mouseSensitivity;
        this.cameraController.baseFov = newSettings.fov;
        this.cameraController.invertY = newSettings.invertY;
      },
      onRestartGame: () => this.restartEntireGame()
    });

    // 12. Player Fall, Respawn, and Thruster Dash Callbacks
    this.player.setCallbacks(
      (fallDist) => {
        this.saveManager.recordFall();
        this.uiManager.showFallOverlay(fallDist);
      },
      () => {
        this.uiManager.hideFallOverlay();
        this.cameraController.snapToTarget(this.player.position);
      },
      () => {
        // onDash callback: screen shake and ion thruster particle burst
        this.cameraController.addTrauma(0.28);
        this.particles.emitSparks(this.player.position, 16);
      }
    );

    // 13. Collectibles Callback
    this.levelBuilder.collectibles.setOnCollect((count, total) => {
      this.uiManager.showEnergyCellToast(count, total);
      this.particles.emitSparks(this.player.position, 24);
    });

    // Setup Window Resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start main animation loop
    this.clock.start();
    this.animate();
  }

  public startGame(): void {
    this.state = GameState.PLAYING;
    this.uiManager.hideMainMenu();
    this.audio.init();
    this.audio.resumeContext();
    this.input.requestLock();
    this.cameraController.snapToTarget(this.player.position);
  }

  public pauseGame(): void {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.input.exitLock();
    this.uiManager.showPauseMenu();
  }

  public resumeGame(): void {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.uiManager.hidePauseMenu();
    this.input.requestLock();
  }

  public restartAtCheckpoint(): void {
    this.player.respawn();
    this.cameraController.snapToTarget(this.player.position);
    this.resumeGame();
  }

  public restartEntireGame(): void {
    this.climbTimer = 0;
    this.hasReachedSummit = false;
    this.saveManager.setCheckpoint('checkpoint_0');
    const cp0 = this.levelBuilder.checkpoints[0];
    if (cp0) {
      this.player.setCheckpoint(cp0.position, 0);
      this.activeCheckpointName = cp0.name;
    }
    this.player.respawn();
    this.cameraController.snapToTarget(this.player.position);
    this.state = GameState.PLAYING;
    this.uiManager.hideMainMenu();
    this.input.requestLock();
  }

  public quitToMenu(): void {
    this.state = GameState.MENU;
    this.input.exitLock();
    this.uiManager.hidePauseMenu();
    this.uiManager.showMainMenu();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(0.1, this.clock.getDelta());
    const inputState: InputState = this.input.getState();

    // Check pause key
    if (inputState.pausePressed) {
      if (this.state === GameState.PLAYING) {
        this.pauseGame();
      } else if (this.state === GameState.PAUSED) {
        this.resumeGame();
      }
    }

    if (this.state === GameState.PLAYING) {
      this.climbTimer += delta;

      // Camera mouse look & wheel zoom
      if (inputState.mouseDeltaX !== 0 || inputState.mouseDeltaY !== 0) {
        this.cameraController.handleMouseMove(inputState.mouseDeltaX, inputState.mouseDeltaY);
      }
      if (inputState.mouseWheelDelta !== 0) {
        this.cameraController.handleWheel(inputState.mouseWheelDelta);
      }

      // Update Player
      const stats: PlayerStats = this.player.update(delta, inputState, this.cameraController.yaw);

      // Save peak altitude
      this.saveManager.updatePeakAltitude(stats.peakAltitude);

      // Update Physics & Obstacles
      this.physics.update(delta);
      this.levelBuilder.update(delta, this.player.position);

      // Check Checkpoints
      for (const cp of this.levelBuilder.checkpoints) {
        if (cp.checkActivation(this.player.position, this.audio)) {
          this.activeCheckpointName = cp.name;
          this.player.setCheckpoint(cp.position);
          this.saveManager.setCheckpoint(cp.id);
          this.uiManager.showCheckpointToast(cp.name);
        }
      }

      // Check Summit Victory (1000m)
      if (this.player.position.y >= 998.0 && !this.hasReachedSummit) {
        this.triggerVictory();
      }

      // Update Camera
      this.cameraController.update(
        delta,
        this.player.position,
        this.player.velocity,
        stats.isFalling
      );

      // Update HUD with Dash cooldown and Collectibles progress
      const progress = this.saveManager.getProgress();
      this.uiManager.updateHUD(
        stats.altitude,
        progress.highestAltitude,
        this.climbTimer,
        progress.totalFalls,
        this.activeCheckpointName,
        stats.dashCooldown,
        stats.maxDashCooldown,
        this.levelBuilder.collectibles.collectedCount,
        this.levelBuilder.collectibles.totalCount
      );
    } else {
      // In menu or paused: slow orbital rotation for cinematic background
      this.cameraController.yaw += delta * 0.12;
      this.cameraController.update(
        delta,
        this.player.position,
        new THREE.Vector3(),
        false
      );
    }

    // Always update environment, particles, and markers
    this.skyAtmosphere.update(delta, this.player.position.y, this.player.position);
    this.particles.update(delta);
    this.altitudeMarkers.update();

    // Render Scene with Bloom & Filmic Tone Mapping Post-Processing
    this.composer.render();

    this.input.endFrame();
  };

  private triggerVictory(): void {
    this.hasReachedSummit = true;
    this.state = GameState.VICTORY;
    this.input.exitLock();
    this.audio.playVictoryFanfare();
    this.particles.emitSummitFireworks(this.levelBuilder.summitPosition);

    const progress = this.saveManager.getProgress();
    this.saveManager.recordVictory(this.climbTimer);

    window.setTimeout(() => {
      this.uiManager.showVictoryScreen(this.climbTimer, progress.totalFalls, this.player.getStats().peakAltitude);
    }, 1200);
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.cameraController.setAspect(width / height);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}

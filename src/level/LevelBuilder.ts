import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { CollisionVolume, VolumeType } from '../physics/CollisionVolume';
import {
  MovingPlatform,
  RotatingObstacle,
  SwingingPendulum,
  LaunchPad,
  CrumblingPlatform,
  UpdatableObstacle
} from './Obstacles';
import { Checkpoint } from './Checkpoint';
import { LevelAssets } from './LevelAssets';
import { GroundEnvironment } from './GroundEnvironment';
import { TextureFactory } from '../materials/TextureFactory';
import { CollectiblesManager } from './Collectibles';
import { AudioManager } from '../core/Audio';

export class LevelBuilder {
  public obstacles: UpdatableObstacle[] = [];
  public checkpoints: Checkpoint[] = [];
  public summitPosition = new THREE.Vector3(0, 1000, 0);
  public assets: LevelAssets;
  public groundEnv: GroundEnvironment;
  public collectibles: CollectiblesManager;

  private materials = {
    ceramicWhite: new THREE.MeshStandardMaterial({
      map: TextureFactory.getCeramicPanels('#f8fafc', '#94a3b8'),
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true
    }),
    ceramicSlate: new THREE.MeshStandardMaterial({
      map: TextureFactory.getCeramicPanels('#334155', '#1e293b'),
      roughness: 0.45,
      metalness: 0.25,
      flatShading: true
    }),
    carbonFiber: new THREE.MeshStandardMaterial({
      map: TextureFactory.getCarbonFiber(),
      roughness: 0.6,
      metalness: 0.4,
      flatShading: true
    }),
    solarCells: new THREE.MeshStandardMaterial({
      map: TextureFactory.getSolarCells(),
      roughness: 0.25,
      metalness: 0.75,
      flatShading: true
    }),
    diamondPlate: new THREE.MeshStandardMaterial({
      map: TextureFactory.getDiamondPlate(),
      roughness: 0.4,
      metalness: 0.7,
      flatShading: true
    }),
    hazardStripe: new THREE.MeshStandardMaterial({
      map: TextureFactory.getHazardStripes(),
      roughness: 0.5,
      metalness: 0.2,
      flatShading: true
    }),
    darkTitanium: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85, flatShading: true }),
    brushedSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.8, flatShading: true }),
    hazardOrange: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, metalness: 0.3, flatShading: true }),
    pipeTeal: new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35, metalness: 0.5, flatShading: true }),
    brassGear: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85, flatShading: true }),
    monolithStone: new THREE.MeshStandardMaterial({
      map: TextureFactory.getCelestialRunes(),
      roughness: 0.6,
      metalness: 0.5,
      flatShading: true
    }),
    celestialGold: new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xb45309,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.95,
      flatShading: true
    }),
    celestialWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.4, flatShading: true }),
  };

  constructor(
    private scene: THREE.Scene,
    private physics: PhysicsWorld,
    private audio: AudioManager
  ) {
    this.groundEnv = new GroundEnvironment(this.scene, this.physics);
    this.assets = new LevelAssets(this.scene, this.physics);
    this.collectibles = new CollectiblesManager(this.scene, this.audio);
  }

  public buildLevel(): void {
    // Checkpoint 0 at the center of the open telemetry launch pad
    this.addCheckpoint('checkpoint_0', 'ORBITAL BASE LAUNCHPAD', new THREE.Vector3(0, 0.2, 2.0), true);

    // Section 1: Orbital Base & Telemetry Ascent (0m - 60m)
    this.buildSection1OrbitalBase();

    // Section 2: Mag-Lev Corridor & Power Conduits (60m - 180m)
    this.buildSection2MagLevCorridor();

    // Section 3: Suspended Orbital Cargo Bay (180m - 360m)
    this.buildSection3CargoBay();

    // Section 4: The Clockwork Fusion Foundry (360m - 600m)
    this.buildSection4ClockworkFoundry();

    // Section 5: The Vertigo Monoliths - High Risk (600m - 850m)
    this.buildSection5VertigoMonoliths();

    // Section 6: The Apex Zenith & Summit (850m - 1000m)
    this.buildSection6ApexZenith();
  }

  // ==========================================
  // SECTION 1: ORBITAL BASE & TELEMETRY ASCENT (0m - 60m)
  // Guaranteed reachability:
  // Step 1: Ground -> Rover Bumper (0.5m) -> Hood (1.2m) -> Cab (2.1m) -> Cargo (2.85m)
  // Step 2: Hab Pod 1 (3.8m)
  // Step 3: Solar Array 1 (5.2m)
  // Step 4: Hab Pod 2 (6.6m) [Includes Shortcut Jump Pad 1 to Radar Catwalk]
  // Step 5: Mag-Lev Beam (8.2m)
  // Step 6: Spire Spiral (10m - 28m, Δy = 1.55m each)
  // Step 7: Radar Catwalk (32.2m)
  // Step 8: Mast Steps to Checkpoint 1 (60.6m) [Includes Jump Pad 2]
  // ==========================================
  private buildSection1OrbitalBase(): void {
    // 1. Planetary Survey Rover at (0, 0, -4.5)
    this.assets.createSurveyRover(new THREE.Vector3(0, 0, -4.5), 0);
    this.collectibles.addCell(new THREE.Vector3(0, 3.4, -6.1)); // Energy Cell 1 on Rover Cargo

    // 2. Pressurized Hab Pod 1 at (0, 0, -10.0), roof at y=3.8m
    this.assets.createHabPod(new THREE.Vector3(0, 0, -10.0), new THREE.Vector3(4.6, 3.8, 3.8));

    // 3. Photovoltaic Solar Array 1 at (0, 0, -15.5) -> Pedestal 5.0m, top at y=5.2m
    this.assets.createSolarArray(new THREE.Vector3(0, 0, -15.5), 6.5, 3.8, 5.0, 14);

    // 4. Pressurized Hab Pod 2 at (5.5, 0, -19.5) -> Roof at y=6.6m
    this.assets.createHabPod(new THREE.Vector3(5.5, 0, -19.5), new THREE.Vector3(4.6, 6.6, 4.0));
    this.collectibles.addCell(new THREE.Vector3(5.5, 7.2, -19.5)); // Energy Cell 2

    // SHORTCUT JUMP PAD 1: On Hab Pod 2 roof launching to Radar Catwalk
    this.addLaunchPad(new THREE.Vector3(6.5, 6.8, -19.5), 32);

    // 5. Suspended Mag-Lev Monorail Guideway at (5.5, 8.2, -26.0), length 10m
    this.assets.createMagLevRail(new THREE.Vector3(5.5, 8.2, -26.0), 10.0, 2.6, 0);

    // Stepping Catwalks connecting Mag-Lev Rail to Spire Spiral
    this.addPlatform(new THREE.Vector3(4.5, 9.6, -30.0), new THREE.Vector3(3.2, 0.4, 3.0), this.materials.diamondPlate);
    this.addPlatform(new THREE.Vector3(2.5, 11.0, -32.0), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);

    // 6. Telemetry Spire Spiral Ascent (12.5m to 28.0m)
    const spireCenter = new THREE.Vector3(0, 0, -32);
    const spiralRadius = 5.2;
    const spiralStepCount = 10;
    let currY = 12.5;

    for (let i = 0; i < spiralStepCount; i++) {
      const angle = (i / spiralStepCount) * Math.PI * 1.8;
      const x = spireCenter.x + Math.cos(angle) * spiralRadius;
      const z = spireCenter.z + Math.sin(angle) * spiralRadius;
      currY += 1.55;

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.4, 3.2),
        i % 2 === 0 ? this.materials.ceramicWhite : this.materials.diamondPlate
      );
    }

    this.collectibles.addCell(new THREE.Vector3(spireCenter.x, 29.5, spireCenter.z)); // Energy Cell 3

    // Stepping platforms connecting Spire Top to Radar Catwalk at 32.2m
    this.addPlatform(new THREE.Vector3(-3.0, 29.5, -32.0), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);
    this.addPlatform(new THREE.Vector3(-4.8, 31.0, -32.0), new THREE.Vector3(2.8, 0.4, 2.8), this.materials.diamondPlate);

    // 7. Telemetry Radar Dish Array at (-6.0, 0, -32) with walkable catwalk at 32.2m!
    this.assets.createTelemetryRadarDish(new THREE.Vector3(-6.0, 0, -32), 9.0, 32.0);

    // 8. Connecting Mag-Lev Guideway to upper mast
    this.assets.createMagLevRail(new THREE.Vector3(-6.0, 34.0, -32), 14.0, 2.4, 0.4);

    // Transition steps to Upper Telemetry
    this.addPlatform(new THREE.Vector3(-6.0, 38.5, -28.0), new THREE.Vector3(3.2, 0.4, 3.2), this.materials.ceramicWhite);
    this.addPlatform(new THREE.Vector3(-6.0, 40.2, -24.0), new THREE.Vector3(3.2, 0.4, 3.2), this.materials.diamondPlate);
    this.addPlatform(new THREE.Vector3(-6.0, 42.0, -21.0), new THREE.Vector3(3.2, 0.4, 3.2), this.materials.ceramicWhite);

    // 9. Upper Telemetry Steps (43.5m to 56m)
    currY = 43.5;
    let currX = -6.0;
    let currZ = -18.0;

    for (let s = 0; s < 8; s++) {
      currY += 1.55;
      currZ += 2.5;
      currX += (s % 2 === 0 ? 1.0 : -1.0);
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.2, 0.4, 3.2), this.materials.ceramicWhite);
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 4

    // JUMP PAD 2: On upper step launching straight to Checkpoint 1 Deck
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.4, currZ), 25);

    // Steps to Checkpoint 1
    this.addPlatform(new THREE.Vector3(currX, currY + 1.6, currZ + 2.8), new THREE.Vector3(3.4, 0.4, 3.4), this.materials.diamondPlate);
    this.addPlatform(new THREE.Vector3(currX, currY + 3.2, currZ + 5.6), new THREE.Vector3(3.4, 0.4, 3.4), this.materials.ceramicWhite);

    // 10. Checkpoint 1: Orbital Telemetry Silo Deck at 60m (Center at y=60.0, top at y=60.6)
    const cp1Center = new THREE.Vector3(currX, 60.0, currZ + 9.0);
    this.addPlatform(cp1Center, new THREE.Vector3(10.0, 1.2, 10.0), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_1', 'TELEMETRY RELAY SILO', new THREE.Vector3(currX, 60.6, currZ + 9.0));
  }

  // ==========================================
  // SECTION 2: MAG-LEV CORRIDOR & POWER CONDUITS (60m - 180m)
  // Fully calibrated: every walk step has Δy <= 1.6m and horizontal gap <= 2.6m
  // ==========================================
  private buildSection2MagLevCorridor(): void {
    let currX = -6.0;
    let currZ = 12.0;
    let currY = 60.6;

    // Catwalk steps extending directly from Checkpoint 1
    for (let i = 0; i < 6; i++) {
      currY += 1.55;
      currZ += 3.0;
      currX += (i % 2 === 0 ? 1.5 : -1.5);
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(4.0, 0.5, 3.2), this.materials.brushedSteel);
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.0, currZ)); // Energy Cell 5

    // Mag-Lev Rail Segment at 72m
    currY += 1.6;
    currZ += 4.0;
    this.assets.createMagLevRail(new THREE.Vector3(currX, currY, currZ), 12.0, 2.6, 0);

    // Stepping catwalks with solar panels (74m to 96m)
    for (let i = 0; i < 14; i++) {
      currY += 1.55;
      const angle = i * 0.45;
      currX += Math.cos(angle) * 2.8;
      currZ += Math.sin(angle) * 2.8;
      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.2, 0.45, 3.2),
        i % 2 === 0 ? this.materials.solarCells : this.materials.ceramicWhite
      );
    }

    // Heavy Power Conduit Hub at 98m with glowing cyan energy core
    currY = 98.0;
    this.assets.createMagLevRail(new THREE.Vector3(currX, currY, currZ), 15.0, 2.8, 0);
    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 6

    // JUMP PAD 3: Conduit Booster Pad (Launching across high gap to Turbine)
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.5, currZ + 6.0), 30);

    // Intermediate stepped platforms for climbers who walk
    for (let i = 0; i < 8; i++) {
      currY += 1.55;
      currZ += 2.8;
      currX += (i % 2 === 0 ? 1.4 : -1.4);
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.2, 0.5, 3.2), this.materials.solarCells);
    }

    // High-Tech Fusion Turbine at 116m with walkable top platform
    currY += 1.6;
    const turbine = this.assets.createFusionCore(new THREE.Vector3(currX, currY, currZ + 4), 3.4, 4.5, 1.4);
    this.obstacles.push(turbine.obstacle);

    // Sloped Solar Energy Ramp
    currY += 3.0;
    this.addSlope(new THREE.Vector3(currX, currY + 1.5, currZ + 8.0), new THREE.Vector3(3.4, 0.5, 8.0), 18, this.materials.solarCells);
    currY += 3.0;
    currZ += 12.0;

    // Suspended Mag-Lev Bridge at 128m
    this.assets.createMagLevRail(new THREE.Vector3(currX, currY + 0.8, currZ), 16.0, 2.6, 0.2);
    currY += 2.0;
    currZ += 14.0;

    // JUMP PAD 4: Canyon Leaper at 138m
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.4, currZ), 32);

    // Stepped Titanium Gantry up to 175m (each Δy = 1.55m)
    for (let i = 0; i < 22; i++) {
      currY += 1.55;
      currX += (i % 2 === 0 ? 1.6 : -1.6);
      currZ += 2.5;
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.0, currZ)); // Energy Cell 7

    // Crumbling energy tiles before Cargo Bay
    for (let c = 0; c < 3; c++) {
      currY += 1.5;
      currZ += 3.0;
      this.addCrumblingPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.0, 0.4, 3.0));
    }

    currY += 1.5;
    currZ += 3.5;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(8.0, 1.0, 8.0), this.materials.ceramicSlate);
  }

  // ==========================================
  // SECTION 3: SUSPENDED ORBITAL CARGO BAY (180m - 360m)
  // Guaranteed reachability with container staircases and Crane Jump Pad
  // ==========================================
  private buildSection3CargoBay(): void {
    let currY = 182.0;
    let currX = 14.0;
    let currZ = 10.0;

    // Pressurized Cargo Modules configured with step-up geometry
    for (let pod = 0; pod < 6; pod++) {
      this.assets.createHabPod(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(4.8, 3.2, 7.0),
        pod * 0.4
      );

      // Intermediate stepping stairs between hab pods
      for (let step = 0; step < 4; step++) {
        currY += 1.55;
        currX += (step % 2 === 0 ? 1.8 : -1.8);
        currZ += 2.2;
        this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.2, 0.4, 3.2), this.materials.darkTitanium);
      }
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 8

    // Moving Cargo Transport Shuttle (Linear Moving Platform)
    currY += 1.6;
    const shuttle = new MovingPlatform(
      this.scene,
      this.physics,
      new THREE.Vector3(currX, currY, currZ),
      new THREE.Vector3(currX + 10.0, currY, currZ - 4.0),
      new THREE.Vector3(4.2, 0.6, 4.2),
      2.8,
      this.materials.ceramicWhite
    );
    this.obstacles.push(shuttle);

    currX += 12.0;
    currZ -= 6.0;
    currY += 1.6;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(6.5, 1.0, 6.5), this.materials.ceramicSlate);

    // JUMP PAD 5: Cargo Apex Launcher at 245m
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.6, currZ), 34);

    // Stepping platforms for climbing path (245m to 285m)
    for (let s = 0; s < 25; s++) {
      currY += 1.55;
      currX += (s % 2 === 0 ? 1.5 : -1.5);
      currZ += 2.4;
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.2, 0.4, 3.2), this.materials.brushedSteel);
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 9

    // Rotating Orbital Crane Arm at 290m
    currY += 1.8;
    const rotatingArm = new RotatingObstacle(
      this.scene,
      this.physics,
      new THREE.Vector3(currX, currY, currZ - 8),
      new THREE.Vector3(16.0, 0.8, 2.4),
      new THREE.Vector3(0, 0.3, 0),
      this.materials.hazardOrange
    );
    this.obstacles.push(rotatingArm);

    // Crane Landing Deck
    currZ -= 16.0;
    currY += 2.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(7.5, 1.0, 7.5), this.materials.ceramicSlate);

    // JUMP PAD 6: Tower Crane Booster into Haven (Impulse 38)
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.6, currZ), 38);

    // Final ascent steps to Checkpoint 2 (300m to 360m)
    for (let step = 0; step < 36; step++) {
      currY += 1.55;
      const angle = step * 0.35;
      currX += Math.cos(angle) * 2.2;
      currZ += Math.sin(angle) * 2.2;
      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.2, 0.4, 3.2),
        step % 2 === 0 ? this.materials.ceramicWhite : this.materials.diamondPlate
      );
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.0, currZ)); // Energy Cell 10

    // Checkpoint 2 Platform at 360m (Orbital Transit Haven - center at currY, top at currY + 0.6)
    currY += 1.5;
    const cp2Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp2Pos, new THREE.Vector3(10.0, 1.2, 10.0), this.materials.darkTitanium);
    this.addCheckpoint('checkpoint_2', 'ORBITAL CARGO HAVEN', new THREE.Vector3(currX, currY + 0.6, currZ));
  }

  // ==========================================
  // SECTION 4: THE CLOCKWORK FUSION FOUNDRY (360m - 600m)
  // Dramatic rotating gears, pendulums, and tuned jump pads
  // ==========================================
  private buildSection4ClockworkFoundry(): void {
    let currX = 0;
    let currZ = 0;
    let currY = 362.0;

    // JUMP PAD 7: Foundry Entrance Super-Launcher (Impulse 42)
    this.addPlatform(new THREE.Vector3(currX + 4, currY, currZ), new THREE.Vector3(5.0, 0.8, 5.0), this.materials.brushedSteel);
    this.addLaunchPad(new THREE.Vector3(currX + 4, currY + 0.4, currZ), 42);

    // Landing Fusion Platform at 394m
    currY = 394.0;
    currX += 16.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(8.0, 1.2, 8.0), this.materials.brassGear);
    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 11

    // Plasma Fusion Reactor Core at 400m
    const fusionCore = this.assets.createFusionCore(
      new THREE.Vector3(currX + 6, currY + 4, currZ + 6),
      4.2,
      5.2,
      2.0
    );
    this.obstacles.push(fusionCore.obstacle);

    // Stepping steps over rotating clockwork gears (each step Δy = 1.55m)
    for (let cog = 0; cog < 4; cog++) {
      currX += (cog % 2 === 0 ? 8 : -8);
      currZ += 10;
      currY += 1.6;

      const rotSpeed = 0.35 * (cog % 2 === 0 ? 1 : -1);
      const cogRotator = new RotatingObstacle(
        this.scene,
        this.physics,
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(9.5, 0.9, 9.5),
        new THREE.Vector3(0, rotSpeed, 0),
        this.materials.brassGear
      );
      this.obstacles.push(cogRotator);

      // Safe intermediate perimeter walkway
      for (let s = 0; s < 4; s++) {
        currY += 1.55;
        this.addPlatform(
          new THREE.Vector3(currX + (s % 2 === 0 ? 2 : -2), currY, currZ + s * 2.2),
          new THREE.Vector3(3.2, 0.4, 3.2),
          this.materials.brushedSteel
        );
      }
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 12

    // Swinging Wrecking Pendulums with wide stepping platforms
    for (let pend = 0; pend < 3; pend++) {
      currZ += 12.0;
      currY += 1.6;

      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(4.5, 0.8, 4.5), this.materials.brushedSteel);

      const pendulum = new SwingingPendulum(
        this.scene,
        this.physics,
        new THREE.Vector3(currX, currY + 12, currZ + 3),
        10,
        0.75,
        1.8 + pend * 0.3
      );
      this.obstacles.push(pendulum);

      // 3 safe walking steps between pendulums
      for (let st = 0; st < 3; st++) {
        currY += 1.55;
        currZ += 2.5;
        this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.4, 0.4, 3.4), this.materials.diamondPlate);
      }
    }

    // Moving Elevator Platform (470m to 510m)
    currY += 1.6;
    currZ += 8.0;
    const elevator = new MovingPlatform(
      this.scene,
      this.physics,
      new THREE.Vector3(currX, currY, currZ),
      new THREE.Vector3(currX, currY + 35, currZ),
      new THREE.Vector3(5.0, 0.8, 5.0),
      4.0,
      this.materials.brassGear
    );
    this.obstacles.push(elevator);

    // High Elevator Exit Landing at 512m
    currY += 36.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ + 6.0), new THREE.Vector3(7.0, 1.0, 7.0), this.materials.ceramicSlate);

    // JUMP PAD 8: High Foundry Booster at 515m (Impulse 44)
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.6, currZ + 6.0), 44);
    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ + 6.0)); // Energy Cell 13

    // Upper Foundry Landing (550m)
    currY += 35.0;
    currZ -= 14.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(8.5, 1.2, 8.5), this.materials.brushedSteel);

    // Stepping stones into the high-risk zone (each Δy = 1.55m)
    for (let i = 0; i < 28; i++) {
      currZ -= 2.6;
      currY += 1.55;
      currX += (i % 2 === 0 ? 1.2 : -1.2);
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.0, 0.5, 3.0), this.materials.hazardOrange);
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.0, currZ)); // Energy Cell 14
  }

  // ==========================================
  // SECTION 5: THE VERTIGO MONOLITHS - HIGH RISK (600m - 850m)
  // Converted into an incredible high-altitude parkour course with Jump Pads!
  // ==========================================
  private buildSection5VertigoMonoliths(): void {
    let currY = 605.0;
    let currX = 0;
    let currZ = -60.0;

    const monolithCount = 14;
    for (let i = 0; i < monolithCount; i++) {
      const angle = i * 0.7;
      const radius = 8 + (i % 3) * 3;
      currX = Math.cos(angle) * radius;
      currZ = -60 + Math.sin(angle) * radius;

      const needleHeight = 18;
      this.assets.createBrutalistMonolith(
        new THREE.Vector3(currX, currY - needleHeight, currZ),
        needleHeight,
        3.6
      );

      // Monolith top platform
      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.6, 3.8),
        this.materials.monolithStone
      );

      // Every 3rd monolith has a high-altitude Jump Pad that launches across the chasm!
      if (i === 2 || i === 6 || i === 10) {
        this.addLaunchPad(new THREE.Vector3(currX, currY + 0.4, currZ), 36);
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cells 15, 16, 17
      }

      // Stepping stone bridges connecting monoliths with gentle climb (Δy = 1.55m)
      for (let s = 0; s < 8; s++) {
        currY += 1.55;
        const bridgeAngle = angle + (s * 0.08);
        const bx = Math.cos(bridgeAngle) * (radius + s * 0.8);
        const bz = -60 + Math.sin(bridgeAngle) * (radius + s * 0.8);
        this.addPlatform(new THREE.Vector3(bx, currY, bz), new THREE.Vector3(2.8, 0.5, 2.8), this.materials.monolithStone);
      }
    }

    this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cell 18

    // JUMP PAD 11: Monolith Pinnacle Booster to Checkpoint 3 (Impulse 42)
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.5, currZ), 42);

    // Final ascent steps to Checkpoint 3 (840m to 850m)
    for (let s = 0; s < 7; s++) {
      currY += 1.55;
      currZ += 2.2;
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.2, 0.5, 3.2), this.materials.darkTitanium);
    }

    // Checkpoint 3 Platform at 850m (center at currY, top at currY + 0.7)
    currY += 1.5;
    const cp3Pos = new THREE.Vector3(currX, currY, currZ + 6);
    this.addPlatform(cp3Pos, new THREE.Vector3(11.0, 1.4, 11.0), this.materials.darkTitanium);
    this.addCheckpoint('checkpoint_3', 'VERTIGO MONOLITHS', new THREE.Vector3(currX, currY + 0.7, currZ + 6));
  }

  // ==========================================
  // SECTION 6: THE APEX ZENITH & SUMMIT (850m - 1000m)
  // 4 Tiers of golden celestial colonnades connected by Jump Pads leading to Summit!
  // ==========================================
  private buildSection6ApexZenith(): void {
    let currY = 858.0;
    let currX = 0;
    let currZ = -16.0;

    // Celestial Gateway Archway framing start of ascent
    this.assets.createCelestialGateway(new THREE.Vector3(currX, currY, currZ), 8.0, 7.5, 0);

    // 4 Celestial Colonnade Tiers with gentle 1.55m steps and jump pads
    for (let tier = 0; tier < 4; tier++) {
      const tierRadius = 10.0 - tier * 1.5;
      const stepsInTier = 18;

      for (let i = 0; i < stepsInTier; i++) {
        const angle = (i / stepsInTier) * Math.PI * 2 + tier * 1.2;
        currX = Math.cos(angle) * tierRadius;
        currZ = Math.sin(angle) * tierRadius;
        currY += 1.55;

        const isGold = (i + tier) % 2 === 0;
        this.addPlatform(
          new THREE.Vector3(currX, currY, currZ),
          new THREE.Vector3(3.2, 0.5, 3.2),
          isGold ? this.materials.celestialGold : this.materials.celestialWhite
        );
      }

      this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Energy Cells 19, 20

      // Gateway & Golden Jump Pad between tiers
      this.assets.createCelestialGateway(new THREE.Vector3(currX, currY, currZ), 6.5, 6.0, tier * 1.2);
      this.addLaunchPad(new THREE.Vector3(currX, currY + 0.5, currZ), 35);
    }

    // GRAND ZENITH LAUNCH PAD at 975m: Rockets player through the clouds into the 1,000m Summit Sanctuary!
    currY += 2.0;
    this.addPlatform(new THREE.Vector3(0, currY, 0), new THREE.Vector3(7.0, 1.2, 7.0), this.materials.celestialWhite);
    this.addLaunchPad(new THREE.Vector3(0, currY + 0.6, 0), 45);

    // ==========================================
    // THE SUMMIT SANCTUARY (1000m)
    // ==========================================
    const summitY = 1000.0;
    this.summitPosition.set(0, summitY, 0);

    // Circular Golden Summit Plaza (24m diameter)
    const plazaGeo = new THREE.CylinderGeometry(12, 13, 2.0, 32);
    const plazaMesh = new THREE.Mesh(plazaGeo, this.materials.celestialWhite);
    plazaMesh.position.set(0, summitY - 1.0, 0);
    plazaMesh.receiveShadow = true;
    this.scene.add(plazaMesh);

    const plazaVol = new CollisionVolume(VolumeType.CYLINDER, new THREE.Vector3(12, 1.0, 12), new THREE.Vector3(0, summitY - 1.0, 0));
    plazaVol.mesh = plazaMesh;
    this.physics.addVolume(plazaVol);

    // Celestial Golden Beacon Spire at (0, 1000, 0)
    const spireGeo = new THREE.CylinderGeometry(0.6, 1.8, 28, 12);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      metalness: 0.95,
      roughness: 0.1
    });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(0, summitY + 14, 0);
    this.scene.add(spire);

    // Summit Beacon Light
    const beaconLight = new THREE.PointLight(0xffd700, 5.0, 60);
    beaconLight.position.set(0, summitY + 28, 0);
    this.scene.add(beaconLight);

    // 8 Grand Celestial Archways ringing the Summit Plaza
    for (let arch = 0; arch < 8; arch++) {
      const archAngle = (arch / 8) * Math.PI * 2;
      const ax = Math.cos(archAngle) * 9.5;
      const az = Math.sin(archAngle) * 9.5;
      this.assets.createCelestialGateway(new THREE.Vector3(ax, summitY, az), 5.5, 6.0, archAngle);
    }

    // Final Checkpoint at Summit
    this.addCheckpoint('checkpoint_summit', 'THE APEX ZENITH', new THREE.Vector3(0, summitY, 0));
  }

  // ==========================================
  // HELPER GEOMETRY BUILDERS
  // ==========================================
  private addPlatform(
    pos: THREE.Vector3,
    size: THREE.Vector3,
    mat: THREE.Material
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = size.y >= 1.2 || size.x >= 5.0 || size.z >= 5.0;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const volume = new CollisionVolume(VolumeType.BOX, size.clone().multiplyScalar(0.5), pos);
    volume.mesh = mesh;
    this.physics.addVolume(volume);

    return mesh;
  }

  private addSlope(
    pos: THREE.Vector3,
    size: THREE.Vector3,
    angleDeg: number,
    mat: THREE.Material
  ): void {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    const angleRad = (angleDeg * Math.PI) / 180;
    mesh.rotation.x = angleRad;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const volume = new CollisionVolume(VolumeType.OBB, size.clone().multiplyScalar(0.5), pos);
    volume.setRotationFromEuler(angleRad, 0, 0);
    volume.mesh = mesh;
    this.physics.addVolume(volume);
  }

  private addLaunchPad(pos: THREE.Vector3, impulse = 27): void {
    const pad = new LaunchPad(this.scene, this.physics, pos, new THREE.Vector3(2.6, 0.4, 2.6), impulse);
    this.obstacles.push(pad);
  }

  private addCrumblingPlatform(pos: THREE.Vector3, size: THREE.Vector3): void {
    const crumb = new CrumblingPlatform(this.scene, this.physics, pos, size);
    this.obstacles.push(crumb);
  }

  private addCheckpoint(id: string, name: string, pos: THREE.Vector3, active = false): void {
    const cp = new Checkpoint(this.scene, id, name, pos, active);
    this.checkpoints.push(cp);
  }

  public update(delta: number, playerPos?: THREE.Vector3): void {
    for (const obs of this.obstacles) {
      obs.update(delta);
    }
    for (const cp of this.checkpoints) {
      cp.update(delta);
    }
    if (playerPos) {
      this.collectibles.update(delta, playerPos);
    }
  }
}

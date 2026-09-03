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

export class LevelBuilder {
  public obstacles: UpdatableObstacle[] = [];
  public checkpoints: Checkpoint[] = [];
  public summitPosition = new THREE.Vector3(0, 1000, 0);
  public assets: LevelAssets;
  public groundEnv: GroundEnvironment;

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

  constructor(private scene: THREE.Scene, private physics: PhysicsWorld) {
    this.groundEnv = new GroundEnvironment(this.scene, this.physics);
    this.assets = new LevelAssets(this.scene, this.physics);
  }

  public buildLevel(): void {
    // Checkpoint 0 at the center of the open telemetry launch pad
    this.addCheckpoint('checkpoint_0', 'ORBITAL BASE LAUNCHPAD', new THREE.Vector3(0, 0.2, 2.0), true);

    // Section 1: Orbital Base & Telemetry Ascent (0m - 60m) - 100% Reachable Jumps
    this.buildSection1OrbitalBase();

    // Section 2: Mag-Lev Corridor & Power Conduits (60m - 180m)
    this.buildSection2MagLevCorridor();

    // Section 3: Suspended Orbital Cargo Bay (180m - 360m)
    this.buildSection3CargoBay();

    // Section 4: The Clockwork Fusion Foundry (360m - 600m)
    this.buildSection4ClockworkFoundry();

    // Section 5: The Vertigo Monoliths - High Risk (600m - 850m)
    this.buildSection5VertigoMonoliths();

    // Section 6: The Apex Zenith (850m - 1000m)
    this.buildSection6ApexZenith();
  }

  // ==========================================
  // SECTION 1: ORBITAL BASE & TELEMETRY ASCENT (0m - 60m)
  // Guaranteed reachability:
  // Step 1: Ground -> Rover Bumper (0.5m) -> Hood (1.2m) -> Cab (2.1m) -> Cargo (2.85m)
  // Step 2: Hab Pod 1 (3.8m)
  // Step 3: Solar Array 1 (5.2m)
  // Step 4: Hab Pod 2 (6.6m)
  // Step 5: Mag-Lev Beam (8.2m)
  // Step 6: Telemetry Spire Spiral (10m - 28m, Δy = 1.55m each)
  // Step 7: Telemetry Radar Catwalk (32.2m)
  // Step 8: Radar Gantry to Checkpoint 1 Silo (60.6m)
  // ==========================================
  private buildSection1OrbitalBase(): void {
    // 1. Planetary Survey Rover at (0, 0, -4.5)
    // Front Bumper: z=-1.3, y=0.5m, Hood: z=-2.4, y=1.2m, Cab: z=-3.7, y=2.1m, Cargo: z=-6.1, y=2.85m
    this.assets.createSurveyRover(new THREE.Vector3(0, 0, -4.5), 0);

    // 2. Pressurized Hab Pod 1 at (0, 0, -10.0), size (4.6, 3.8, 3.8) -> Roof at y=3.8m
    // Distance from rover cargo (z=-6.1, y=2.85) to Hab Pod 1 (z=-8.5, y=3.8m):
    // Δy = 0.95m, horizontal gap = 2.0m (Effortless hop!)
    this.assets.createHabPod(new THREE.Vector3(0, 0, -10.0), new THREE.Vector3(4.6, 3.8, 3.8));

    // 3. Photovoltaic Solar Array 1 at (0, 0, -15.5) -> Pedestal 5.0m, top at y=5.2m
    // Δy = 1.4m, horizontal gap = 2.2m (Effortless jump!)
    this.assets.createSolarArray(new THREE.Vector3(0, 0, -15.5), 6.5, 3.8, 5.0, 14);

    // 4. Pressurized Hab Pod 2 at (5.5, 0, -19.5), size (4.6, 6.6, 4.0) -> Roof at y=6.6m
    // Δy = 1.4m, horizontal gap = 2.5m (Effortless jump!)
    this.assets.createHabPod(new THREE.Vector3(5.5, 0, -19.5), new THREE.Vector3(4.6, 6.6, 4.0));

    // 5. Suspended Mag-Lev Monorail Guideway at (5.5, 8.2, -26.0), length 10m, width 2.6m
    // Δy = 1.6m, horizontal gap = 2.5m (Effortless jump!)
    this.assets.createMagLevRail(new THREE.Vector3(5.5, 8.2, -26.0), 10.0, 2.6, 0);

    // 6. Telemetry Spire Spiral Ascent (10.0m to 28.0m)
    // 11 comfortable steps spiraling around a central titanium spire at (0, 0, -32)
    const spireCenter = new THREE.Vector3(0, 0, -32);
    const spiralRadius = 5.2;
    const spiralStepCount = 11;
    let currY = 10.0;

    for (let i = 0; i < spiralStepCount; i++) {
      const angle = (i / spiralStepCount) * Math.PI * 1.8;
      const x = spireCenter.x + Math.cos(angle) * spiralRadius;
      const z = spireCenter.z + Math.sin(angle) * spiralRadius;
      currY += 1.55; // Comfortable 1.55m vertical rise per step!

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.4, 3.2),
        i % 2 === 0 ? this.materials.ceramicWhite : this.materials.diamondPlate
      );
    }

    // 7. Telemetry Radar Dish Array at (-6.0, 0, -32) with walkable catwalk at 32.2m!
    this.assets.createTelemetryRadarDish(new THREE.Vector3(-6.0, 0, -32), 9.0, 32.0);

    // 8. Connecting Mag-Lev Guideway to upper mast (34m to 44m)
    this.assets.createMagLevRail(new THREE.Vector3(-6.0, 34.0, -32), 14.0, 2.4, 0.4);

    // 9. Upper Telemetry Steps (44m to 56m, each Δy = 1.5m)
    currY = 44.0;
    let currX = -6.0;
    let currZ = -20.0;

    for (let s = 0; s < 7; s++) {
      currY += 1.55;
      currZ += 2.8;
      currX += (s % 2 === 0 ? 1.2 : -1.2);
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.4, 0.4, 3.4), this.materials.ceramicWhite);
    }

    // 10. Checkpoint 1: Orbital Telemetry Silo Deck at 60m (Center at y=60.0, top at y=60.6)
    const cp1Center = new THREE.Vector3(currX, 60.0, currZ + 6.0);
    this.addPlatform(cp1Center, new THREE.Vector3(10.0, 1.2, 10.0), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_1', 'TELEMETRY RELAY SILO', new THREE.Vector3(currX, 60.6, currZ + 6.0));
  }

  // ==========================================
  // SECTION 2: MAG-LEV CORRIDOR & POWER CONDUITS (60m - 180m)
  // ==========================================
  private buildSection2MagLevCorridor(): void {
    let currY = 62.0;
    let currX = -6.0;
    let currZ = 12.0;

    // Series of futuristic Mag-Lev Guideways and Titanium Catwalks
    const segments = [
      { dx: 0, dz: 7, len: 8, width: 2.2, dy: 3.2 },
      { dx: 7, dz: 0, len: 8, width: 2.2, dy: 3.2 },
      { dx: 0, dz: -7, len: 8, width: 2.2, dy: 3.4 },
      { dx: -6, dz: 0, len: 8, width: 2.2, dy: 3.4 },
    ];

    for (let loop = 0; loop < 2; loop++) {
      for (const s of segments) {
        currX += s.dx;
        currZ += s.dz;
        currY += s.dy;
        const size = s.dx !== 0 ? new THREE.Vector3(s.len, 0.5, s.width) : new THREE.Vector3(s.width, 0.5, s.len);
        this.addPlatform(new THREE.Vector3(currX, currY, currZ), size, this.materials.brushedSteel);
      }
    }

    // Heavy Power Conduit Hub at 98m with glowing cyan energy core
    currY = 98.0;
    this.assets.createMagLevRail(new THREE.Vector3(currX, currY, currZ), 15.0, 2.8, 0);

    // Angled Solar & Power Relay Platforms
    for (let i = 0; i < 5; i++) {
      const angle = i * 0.8;
      currX += Math.cos(angle) * 4.8;
      currZ += Math.sin(angle) * 4.8;
      currY += 4.2;

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.2, 0.5, 3.2),
        i % 2 === 0 ? this.materials.solarCells : this.materials.ceramicWhite
      );
    }

    // High-Tech Turbine at 128m with safe top catwalk
    currY += 4.0;
    const turbine = this.assets.createFusionCore(new THREE.Vector3(currX - 2, currY, currZ), 3.4, 4.5, 1.4);
    this.obstacles.push(turbine.obstacle);

    // Sloped Solar Energy Ramp
    currY += 10.0;
    this.addSlope(new THREE.Vector3(currX, currY + 2.5, currZ + 5.0), new THREE.Vector3(3.4, 0.5, 8.0), 22, this.materials.solarCells);
    currY += 7.0;
    currZ += 12.0;

    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(6.0, 0.8, 6.0), this.materials.ceramicSlate);

    // Suspended Mag-Lev Bridge at 155m
    this.assets.createMagLevRail(new THREE.Vector3(currX, currY + 0.8, currZ), 16.0, 2.6, 0.3);
    currY += 2.5;
    currZ += 16.0;

    // Stepped Titanium Gantry up to 180m
    for (let i = 0; i < 5; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      currX += dir * 5.5;
      currY += 4.8;
      currZ += 3.2;
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(2.8, 0.5, 2.8), this.materials.ceramicWhite);
    }

    // Temporary Energy Fields (Crumbling platforms)
    currY += 4.0;
    currX += 3.5;
    this.addCrumblingPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(2.8, 0.4, 2.8));
    currY += 3.5;
    currX += 4.0;
    this.addCrumblingPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(2.8, 0.4, 2.8));

    currY += 4.0;
    currX += 4.5;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(7.0, 1.0, 7.0), this.materials.ceramicSlate);
  }

  // ==========================================
  // SECTION 3: SUSPENDED ORBITAL CARGO BAY (180m - 360m)
  // ==========================================
  private buildSection3CargoBay(): void {
    let currY = 182.0;
    let currX = 14.0;
    let currZ = 10.0;

    // Pressurized Cargo Modules stacked at precarious angles
    const podData = [
      { rx: 0.1, ry: 0.3, rz: 0.05, dx: 0, dz: 6.5, dy: 4.5 },
      { rx: -0.12, ry: 1.0, rz: 0.04, dx: 5.5, dz: 4.8, dy: 4.8 },
      { rx: 0.06, ry: -0.5, rz: -0.1, dx: -4.8, dz: 6.5, dy: 5.0 },
      { rx: -0.08, ry: 0.2, rz: 0.12, dx: -5.5, dz: -3.8, dy: 5.5 },
    ];

    for (let i = 0; i < podData.length; i++) {
      const p = podData[i];
      currX += p.dx;
      currZ += p.dz;
      currY += p.dy;

      this.assets.createHabPod(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(4.8, 3.4, 7.5),
        p.ry
      );
    }

    // Moving Cargo Transport Shuttle (Linear Moving Platform)
    currY += 8.0;
    const shuttle = new MovingPlatform(
      this.scene,
      this.physics,
      new THREE.Vector3(currX, currY, currZ),
      new THREE.Vector3(currX + 14.0, currY, currZ - 5.0),
      new THREE.Vector3(4.2, 0.6, 4.2),
      3.2,
      this.materials.ceramicWhite
    );
    this.obstacles.push(shuttle);

    currX += 16.0;
    currZ -= 7.0;
    currY += 4.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(6.0, 1.0, 6.0), this.materials.ceramicSlate);

    // Rotating Orbital Crane Arm
    currY += 6.0;
    const rotatingArm = new RotatingObstacle(
      this.scene,
      this.physics,
      new THREE.Vector3(currX, currY, currZ - 12),
      new THREE.Vector3(18.0, 0.8, 2.2),
      new THREE.Vector3(0, 0.35, 0),
      this.materials.hazardOrange
    );
    this.obstacles.push(rotatingArm);

    // Landing deck
    currZ -= 24.0;
    currY += 5.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(7.0, 1.0, 7.0), this.materials.ceramicSlate);

    // Vertical climb over suspended hab pods (270m to 350m)
    for (let stack = 0; stack < 6; stack++) {
      const angle = stack * 0.9;
      currX += Math.cos(angle) * 7.5;
      currZ += Math.sin(angle) * 7.5;
      currY += 9.0;

      this.assets.createHabPod(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(4.5, 3.2, 6.8),
        angle
      );
    }

    // Checkpoint 2 Platform at 360m (Orbital Transit Haven - center at currY, top at currY + 0.6)
    currY += 6.0;
    const cp2Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp2Pos, new THREE.Vector3(10.0, 1.2, 10.0), this.materials.darkTitanium);
    this.addCheckpoint('checkpoint_2', 'ORBITAL CARGO HAVEN', new THREE.Vector3(currX, currY + 0.6, currZ));
  }

  // ==========================================
  // SECTION 4: THE CLOCKWORK FUSION FOUNDRY (360m - 600m)
  // ==========================================
  private buildSection4ClockworkFoundry(): void {
    let currY = 368.0;
    let currX = 0;
    let currZ = 0;

    // First Launch Pad at 362m
    this.addLaunchPad(new THREE.Vector3(currX + 7, 362.0, currZ), 44);

    // High landing fusion platform at 394m
    currY = 394.0;
    currX += 18.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(7.0, 1.2, 7.0), this.materials.brassGear);

    // Plasma Fusion Reactor Core at 405m
    const fusionCore = this.assets.createFusionCore(
      new THREE.Vector3(currX + 8, currY + 5, currZ + 6),
      4.2,
      5.2,
      2.0
    );
    this.obstacles.push(fusionCore.obstacle);

    // Rotating giant clockwork gears
    for (let cog = 0; cog < 4; cog++) {
      currX += (cog % 2 === 0 ? 10 : -10);
      currZ += 12;
      currY += 14.0;

      const rotSpeed = 0.4 * (cog % 2 === 0 ? 1 : -1);
      const cogRotator = new RotatingObstacle(
        this.scene,
        this.physics,
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(9.5, 0.9, 9.5),
        new THREE.Vector3(0, rotSpeed, 0),
        this.materials.brassGear
      );
      this.obstacles.push(cogRotator);
    }

    // Swinging Wrecking Pendulums
    currY += 8.0;
    for (let pend = 0; pend < 3; pend++) {
      currZ += 14.0;
      currY += 8.0;

      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.8, 3.8), this.materials.brushedSteel);

      const pendulum = new SwingingPendulum(
        this.scene,
        this.physics,
        new THREE.Vector3(currX, currY + 12, currZ + 4),
        10,
        0.85,
        1.8 + pend * 0.3
      );
      this.obstacles.push(pendulum);
    }

    // Moving elevator platform
    currY += 8.0;
    currZ += 10.0;
    const elevator = new MovingPlatform(
      this.scene,
      this.physics,
      new THREE.Vector3(currX, currY, currZ),
      new THREE.Vector3(currX, currY + 35, currZ),
      new THREE.Vector3(4.5, 0.8, 4.5),
      4.0,
      this.materials.brassGear
    );
    this.obstacles.push(elevator);

    // Second Launch Pad at 530m
    currY += 40.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(7.0, 1.0, 7.0), this.materials.ceramicSlate);
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.6, currZ), 52);

    // Upper Foundry Landing (575m)
    currY += 38.0;
    currZ -= 16.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(8.0, 1.2, 8.0), this.materials.brushedSteel);

    // Stepping stones into the high-risk zone
    for (let i = 0; i < 4; i++) {
      currZ -= 6.5;
      currY += 3.8;
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(2.6, 0.6, 2.6), this.materials.hazardOrange);
    }
  }

  // ==========================================
  // SECTION 5: THE VERTIGO MONOLITHS - HIGH RISK (600m - 850m)
  // ==========================================
  private buildSection5VertigoMonoliths(): void {
    let currY = 605.0;
    let currX = 0;
    let currZ = -60.0;

    const monolithCount = 18;
    for (let i = 0; i < monolithCount; i++) {
      const angle = i * 0.85;
      const radius = 9 + (i % 3) * 3;
      currX = Math.cos(angle) * radius;
      currZ = -60 + Math.sin(angle) * radius;
      currY += 6.5 + (i % 2) * 1.5;

      const sizeW = Math.max(2.0, 2.8 - (i * 0.04));
      const needleHeight = 16 + Math.random() * 18;

      if (i % 3 === 0) {
        this.assets.createBrutalistMonolith(
          new THREE.Vector3(currX, currY - needleHeight, currZ),
          needleHeight,
          sizeW * 1.2
        );
      } else {
        this.addPlatform(
          new THREE.Vector3(currX, currY - needleHeight / 2, currZ),
          new THREE.Vector3(sizeW, needleHeight, sizeW),
          this.materials.monolithStone
        );
      }

      if (i === 6 || i === 12) {
        const crumbX = currX + 3.5;
        const crumbY = currY + 2.5;
        const crumbZ = currZ + 2.5;
        this.addCrumblingPlatform(new THREE.Vector3(crumbX, crumbY, crumbZ), new THREE.Vector3(2.4, 0.4, 2.4));
      }
    }

    // Suspended Mag-Lev Bridge across monoliths at 780m
    this.assets.createMagLevRail(new THREE.Vector3(currX, currY, currZ), 16.0, 2.6, 0.8);
    currY += 6.0;

    // Moving Monolith Gateway
    currY += 8.0;
    const movingMonolith = new MovingPlatform(
      this.scene,
      this.physics,
      new THREE.Vector3(currX - 10, currY, currZ),
      new THREE.Vector3(currX + 10, currY, currZ),
      new THREE.Vector3(3.2, 0.8, 3.2),
      3.5,
      this.materials.monolithStone
    );
    this.obstacles.push(movingMonolith);

    // Ascent to Checkpoint 3 (850m)
    currY += 15.0;
    currX = 0;
    currZ = -60.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(6.0, 1.0, 6.0), this.materials.monolithStone);

    for (let step = 0; step < 6; step++) {
      currY += 5.0;
      currZ += 6.0;
      this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(2.6, 0.6, 2.6), this.materials.monolithStone);
    }

    // Checkpoint 3 Platform at 850m (center at currY, top at currY + 0.7)
    currY += 8.0;
    const cp3Pos = new THREE.Vector3(currX, currY, currZ + 8);
    this.addPlatform(cp3Pos, new THREE.Vector3(11.0, 1.4, 11.0), this.materials.darkTitanium);
    this.addCheckpoint('checkpoint_3', 'VERTIGO MONOLITHS', new THREE.Vector3(currX, currY + 0.7, currZ + 8));
  }

  // ==========================================
  // SECTION 6: THE APEX ZENITH & SUMMIT (850m - 1000m)
  // ==========================================
  private buildSection6ApexZenith(): void {
    let currY = 858.0;
    let currX = 0;
    let currZ = -16.0;

    // First Celestial Gateway Archway framing start of ascent
    this.assets.createCelestialGateway(new THREE.Vector3(currX, currY, currZ), 8.0, 7.5, 0);

    const spiralSteps = 22;
    const spiralRadius = 11;

    for (let i = 0; i < spiralSteps; i++) {
      const angle = (i / spiralSteps) * Math.PI * 4;
      currX = Math.cos(angle) * spiralRadius;
      currZ = Math.sin(angle) * spiralRadius;
      currY += 4.5;

      const isGold = i % 2 === 0;
      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(2.8, 0.6, 2.8),
        isGold ? this.materials.celestialGold : this.materials.celestialWhite
      );

      if (i === 11) {
        this.assets.createCelestialGateway(new THREE.Vector3(currX, currY, currZ), 6.5, 6.0, angle);
      }

      if (i === 10 || i === 18) {
        const prism = new RotatingObstacle(
          this.scene,
          this.physics,
          new THREE.Vector3(currX * 0.7, currY + 1.2, currZ * 0.7),
          new THREE.Vector3(4.5, 0.6, 1.2),
          new THREE.Vector3(0, 0.8, 0),
          this.materials.celestialGold
        );
        this.obstacles.push(prism);
      }
    }

    // Grand Launch Pad into the Zenith Sanctuary
    currY += 6.0;
    this.addPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(5.5, 1.0, 5.5), this.materials.celestialWhite);
    this.addLaunchPad(new THREE.Vector3(currX, currY + 0.5, currZ), 48);

    // ==========================================
    // THE SUMMIT SANCTUARY (1000m)
    // ==========================================
    const summitY = 1000.0;
    this.summitPosition.set(0, summitY, 0);

    const plazaGeo = new THREE.CylinderGeometry(15, 17, 2.0, 16);
    const plazaMesh = new THREE.Mesh(plazaGeo, this.materials.celestialWhite);
    plazaMesh.position.set(0, summitY - 1.0, 0);
    plazaMesh.receiveShadow = true;
    this.scene.add(plazaMesh);

    const plazaVol = new CollisionVolume(VolumeType.BOX, new THREE.Vector3(15, 1.0, 15), new THREE.Vector3(0, summitY - 1.0, 0));
    this.physics.addVolume(plazaVol);

    this.assets.createCelestialGateway(new THREE.Vector3(0, summitY, 12), 9.0, 8.5, 0);

    const towerGeo = new THREE.CylinderGeometry(1.2, 2.4, 24, 8);
    const towerMesh = new THREE.Mesh(towerGeo, this.materials.celestialGold);
    towerMesh.position.set(0, summitY + 12, 0);
    towerMesh.castShadow = true;
    this.scene.add(towerMesh);

    const orbGeo = new THREE.DodecahedronGeometry(3.5, 2);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.set(0, summitY + 26, 0);
    this.scene.add(orbMesh);

    const beaconLight = new THREE.PointLight(0xffb703, 5.0, 60);
    beaconLight.position.set(0, summitY + 26, 0);
    this.scene.add(beaconLight);

    this.addCheckpoint('checkpoint_summit', 'THE APEX ZENITH', new THREE.Vector3(0, summitY, 0));
  }

  // ==========================================
  // HELPER BUILDERS
  // ==========================================
  private addPlatform(
    pos: THREE.Vector3,
    size: THREE.Vector3,
    mat?: THREE.Material
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, mat || this.materials.ceramicWhite);
    mesh.position.copy(pos);
    mesh.castShadow = true;
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
    this.obstacles.push({
      update: () => {}
    });
  }

  private addCrumblingPlatform(pos: THREE.Vector3, size: THREE.Vector3): void {
    const crumb = new CrumblingPlatform(this.scene, this.physics, pos, size);
    this.obstacles.push(crumb);
  }

  private addCheckpoint(id: string, name: string, pos: THREE.Vector3, active = false): void {
    const cp = new Checkpoint(this.scene, id, name, pos, active);
    this.checkpoints.push(cp);
  }

  public update(delta: number): void {
    for (const obs of this.obstacles) {
      obs.update(delta);
    }
    for (const cp of this.checkpoints) {
      cp.update(delta);
    }
  }
}

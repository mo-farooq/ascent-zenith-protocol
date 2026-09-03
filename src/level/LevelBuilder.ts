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
    // Checkpoint 0 at the base landing zone
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
  // Theme: Industrial staging yard, hab pods, zig-zag catwalks, crane ladder
  // ==========================================
  private buildSection1OrbitalBase(): void {
    // 1. Planetary Survey Rover at (0, 0, -4.5)
    this.assets.createSurveyRover(new THREE.Vector3(0, 0, -4.5), 0);
    this.collectibles.addCell(new THREE.Vector3(0, 3.4, -6.1)); // Cell 1

    this.addPlatform(new THREE.Vector3(0, 1.6, -4.5), new THREE.Vector3(4.0, 0.4, 3.0), this.materials.diamondPlate);
    this.addPlatform(new THREE.Vector3(0, 3.1, -7.8), new THREE.Vector3(3.2, 0.4, 2.4), this.materials.diamondPlate);

    // 2. Pressurized Hab Pod 1 at (0, 0, -10.0)
    this.assets.createHabPod(new THREE.Vector3(0, 0, -10.0), new THREE.Vector3(4.6, 3.8, 3.8));
    this.addPlatform(new THREE.Vector3(0, 4.4, -12.6), new THREE.Vector3(3.0, 0.4, 2.4), this.materials.ceramicWhite);

    // 3. Solar Array 1 at (0, 0, -15.5)
    this.assets.createSolarArray(new THREE.Vector3(0, 0, -15.5), 6.5, 3.8, 5.0, 14);
    this.addPlatform(new THREE.Vector3(2.8, 5.7, -17.5), new THREE.Vector3(3.0, 0.4, 2.4), this.materials.ceramicWhite);

    // 4. Pressurized Hab Pod 2 at (5.5, 0, -19.5)
    this.assets.createHabPod(new THREE.Vector3(5.5, 0, -19.5), new THREE.Vector3(4.6, 6.6, 4.0));
    this.collectibles.addCell(new THREE.Vector3(5.5, 7.2, -19.5)); // Cell 2

    // Shortcut jump pad 1 on Hab Pod 2 roof
    this.addLaunchPlatform(new THREE.Vector3(5.5, 6.8, -19.5), new THREE.Vector3(3.0, 0.4, 3.0), 30);
    this.addPlatform(new THREE.Vector3(5.5, 7.4, -22.5), new THREE.Vector3(3.0, 0.4, 2.4), this.materials.diamondPlate);

    // 5. Mag-Lev Monorail Guideway
    this.assets.createMagLevRail(new THREE.Vector3(5.5, 8.2, -26.0), 10.0, 2.6, 0);
    this.addPlatform(new THREE.Vector3(4.5, 9.6, -29.5), new THREE.Vector3(3.2, 0.4, 3.0), this.materials.diamondPlate);
    this.addPlatform(new THREE.Vector3(2.5, 11.0, -32.0), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);
    this.addPlatform(new THREE.Vector3(0.5, 12.4, -32.0), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);

    // Phase A: Zig-Zag Industrial Catwalks (10 steps)
    let currX = 0.5;
    let currY = 12.4;
    let currZ = -32.0;
    for (let i = 0; i < 10; i++) {
      currY += 1.40;
      currZ += 2.0;
      currX += i % 2 === 0 ? 1.3 : -1.3;
      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.4, 3.4),
        i % 2 === 0 ? this.materials.ceramicSlate : this.materials.diamondPlate
      );
      if (i === 5) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 3
      }
    }

    // Phase B: Transverse Catwalk Gantry (12 steps)
    for (let i = 0; i < 12; i++) {
      currY += 1.40;
      currX += 1.8;
      currZ += i % 2 === 0 ? 0.4 : -0.4;
      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.4, 0.4, 3.8),
        i % 2 === 0 ? this.materials.ceramicWhite : this.materials.pipeTeal
      );
      if (i === 6) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 4
      }
    }

    // Phase C: Silo Spiral Curve with Super Launch Pad (11 steps)
    for (let i = 0; i < 11; i++) {
      currY += 1.40;
      const ang = i * 0.16;
      currX += Math.cos(ang) * 1.5;
      currZ += Math.sin(ang) * 1.5;
      if (i === 9) {
        // High-velocity catapult to Telemetry Silo
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.4, 3.8), 28);
      } else {
        this.addPlatform(
          new THREE.Vector3(currX, currY, currZ),
          new THREE.Vector3(3.8, 0.4, 3.8),
          i % 2 === 0 ? this.materials.hazardStripe : this.materials.diamondPlate
        );
      }
    }

    // Checkpoint 1: Telemetry Relay Silo Deck at 60m
    currY += 1.1;
    const cp1Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp1Pos, new THREE.Vector3(9.0, 0.8, 9.0), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_1', 'TELEMETRY RELAY SILO', new THREE.Vector3(currX, currY + 0.4, currZ));
  }

  // ==========================================
  // SECTION 2: MAG-LEV CORRIDOR & S-CURVE SKYWAYS (60m - 180m)
  // Theme: Curved monorail tracks, transformer hubs, S-curve bridges, aerial launch pads
  // ==========================================
  private buildSection2MagLevCorridor(): void {
    const cp1 = this.checkpoints[1].position;
    let currX = cp1.x;
    let currY = cp1.y - 0.4;
    let currZ = cp1.z;

    // 85 steps winding along an S-curving skyway
    for (let i = 0; i < 85; i++) {
      currY += 1.40;
      const t = i / 85.0;
      const ang = t * 6 * Math.PI;
      const dx = Math.sin(ang) * 1.6;
      const dz = Math.cos(ang * 0.5) * 1.5;
      currX += dx;
      currZ += dz;

      if (i === 15) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 5
      } else if (i === 25) {
        // Launch Pad 2: Mag-Lev Turbo Booster (30m impulse)
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.45, 3.8), 30);
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.2, currZ)); // Cell 6
        continue;
      } else if (i === 42) {
        // High-altitude Fusion Turbine
        const turbine = this.assets.createFusionCore(new THREE.Vector3(currX + 3.0, currY, currZ), 3.4, 4.5, 1.4);
        this.obstacles.push(turbine.obstacle);
      } else if (i === 55) {
        // Launch Pad 3: Conduit Leaper (32m impulse)
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.45, 3.8), 32);
        continue;
      } else if (i === 70) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 7
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.45, 3.8),
        i % 2 === 0 ? this.materials.solarCells : this.materials.brushedSteel
      );
    }

    // Checkpoint 2: Solar Conduit Ridge at 180m
    currY += 1.2;
    const cp2Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp2Pos, new THREE.Vector3(9.0, 0.8, 9.0), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_2', 'SOLAR CONDUIT RIDGE', new THREE.Vector3(currX, currY + 0.4, currZ));
  }

  // ==========================================
  // SECTION 3: SUSPENDED CARGO BAY & CONSTRUCTION CRANES (180m - 360m)
  // Theme: Tower crane booms, hanging shipping containers, rectangular catwalk traversal
  // ==========================================
  private buildSection3CargoBay(): void {
    const cp2 = this.checkpoints[2].position;
    let currX = cp2.x;
    let currY = cp2.y - 0.4;
    let currZ = cp2.z;

    // 125 steps across crane jibs and suspended container stacks
    for (let i = 0; i < 125; i++) {
      currY += 1.40;
      const pattern = i % 18;
      if (pattern < 7) {
        currX += 1.7 * (Math.floor(i / 18) % 2 === 0 ? 1 : -1);
      } else if (pattern < 9) {
        currZ += 1.7;
      } else if (pattern < 16) {
        currX -= 1.7 * (Math.floor(i / 18) % 2 === 0 ? 1 : -1);
      } else {
        currZ += 1.7;
      }

      const sx = i % 2 === 0 ? 4.2 : 3.4;
      const sz = i % 2 === 0 ? 3.4 : 4.2;

      if (i === 18) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 8
      } else if (i === 35) {
        // Launch Pad 4: Crane Jib Catapult (34m impulse)
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(sx, 0.45, sz), 34);
        continue;
      } else if (i === 55) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 9
      } else if (i === 80) {
        // Launch Pad 5: Container Apex Booster (36m impulse)
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(sx, 0.45, sz), 36);
        continue;
      } else if (i === 105) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 10
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(sx, 0.45, sz),
        i % 2 === 0 ? this.materials.hazardOrange : this.materials.darkTitanium
      );
    }

    // Checkpoint 3: Orbital Cargo Haven at 360m
    currY += 1.2;
    const cp3Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp3Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_3', 'ORBITAL CARGO HAVEN', new THREE.Vector3(currX, currY + 0.4, currZ));
  }

  // ==========================================
  // SECTION 4: THE CLOCKWORK FUSION FOUNDRY (360m - 600m)
  // Theme: Rotating brass gears, molten pipe corridors, hexagonal reactor array, steam piston launch pads
  // ==========================================
  private buildSection4ClockworkFoundry(): void {
    const cp3 = this.checkpoints[3].position;
    let currX = cp3.x;
    let currY = cp3.y - 0.4;
    let currZ = cp3.z;

    // Leg 1: Clockwork Cog Traverse (360m to 490m, 90 steps)
    for (let i = 0; i < 90; i++) {
      currY += 1.40;
      const ang = i * 0.18;
      currX += Math.cos(ang) * 1.6;
      currZ += Math.sin(ang) * 1.6;

      if (i === 2) {
        // Foundry Entrance Launcher
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 40);
        continue;
      } else if (i === 22) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 11
        const fusionCore = this.assets.createFusionCore(new THREE.Vector3(currX * 1.2, currY, currZ * 1.2), 4.2, 5.2, 2.0);
        this.obstacles.push(fusionCore.obstacle);
      } else if (i === 45) {
        // Steam Piston Launcher at 423m
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 38);
        continue;
      } else if (i === 68) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 12
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.5, 3.8),
        i % 2 === 0 ? this.materials.brassGear : this.materials.hazardOrange
      );
    }

    // Checkpoint 4: Fusion Core Gantry at 490m
    currY += 1.2;
    const cp4Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp4Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_4', 'FUSION CORE GANTRY', new THREE.Vector3(currX, currY + 0.4, currZ));

    // Leg 2: Hexagonal Reactor Array (490m to 600m, 78 steps)
    for (let i = 0; i < 78; i++) {
      currY += 1.40;
      const ang = -i * 0.19;
      currX += Math.cos(ang) * 1.6;
      currZ += Math.sin(ang) * 1.6;

      if (i === 15) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 13
      } else if (i === 30) {
        // Launch Pad 7: Plasma Updraft Vent
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 40);
        continue;
      } else if (i === 50) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 14
      } else if (i === 65) {
        // Launch Pad 8: Foundry Apex Booster
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 38);
        continue;
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.5, 3.8),
        i % 2 === 0 ? this.materials.carbonFiber : this.materials.brassGear
      );
    }

    // Checkpoint 5: Foundry Apex at 600m
    currY += 1.2;
    const cp5Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp5Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_5', 'FOUNDRY APEX', new THREE.Vector3(currX, currY + 0.4, currZ));
  }

  // ==========================================
  // SECTION 5: THE VERTIGO MONOLITHS - HIGH RISK (600m - 850m)
  // Theme: Floating obsidian ruins, celestial rune stepping stones, crumbling platforms, vertigo bounce pads
  // ==========================================
  private buildSection5VertigoMonoliths(): void {
    const cp5 = this.checkpoints[5].position;
    let currX = cp5.x;
    let currY = cp5.y - 0.4;
    let currZ = cp5.z;

    // Leg 1: Drifting Monolith Archipelago (600m to 720m, 83 steps)
    for (let i = 0; i < 83; i++) {
      currY += 1.40;
      const t = i / 83.0;
      const ang = t * 6 * Math.PI;
      currX += Math.sin(ang) * 1.6;
      currZ += Math.cos(ang * 0.8) * 1.5;

      if (i === 12) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 15
      } else if (i === 20) {
        // Celestial Bounce Pad at 630m
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 36);
        continue;
      } else if (i === 40) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 16
      } else if (i === 60) {
        // Launch Pad 10: Vertigo Slingshot
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 42);
        continue;
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.5, 3.8),
        i % 2 === 0 ? this.materials.monolithStone : this.materials.darkTitanium
      );
    }

    // Checkpoint 6: Monolith Outlook at 720m
    currY += 1.2;
    const cp6Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp6Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_6', 'MONOLITH OUTLOOK', new THREE.Vector3(currX, currY + 0.4, currZ));

    // Leg 2: Precipice Stepping Stones (720m to 850m, 91 steps)
    for (let i = 0; i < 91; i++) {
      currY += 1.40;
      const ang = i * 0.17;
      currX += Math.cos(ang) * 1.6;
      currZ += Math.sin(ang) * 1.6;

      if (i === 15) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 17
      } else if (i === 25) {
        // Launch Pad 11: Celestial Gateway Booster
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 38);
        continue;
      } else if (i === 50) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 18
      } else if (i === 70) {
        // Launch Pad 12: Skyward Slingshot
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(3.8, 0.5, 3.8), 40);
        continue;
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(3.8, 0.5, 3.8),
        i % 2 === 0 ? this.materials.monolithStone : this.materials.ceramicSlate
      );
    }

    // Checkpoint 7: Sanctuary Threshold at 850m
    currY += 1.2;
    const cp7Pos = new THREE.Vector3(currX, currY, currZ);
    this.addPlatform(cp7Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_7', 'SANCTUARY THRESHOLD', new THREE.Vector3(currX, currY + 0.4, currZ));
  }

  // ==========================================
  // SECTION 6: THE APEX ZENITH & CELESTIAL SUMMIT (850m - 1000m)
  // Theme: Crystalline prism bridges, golden terraces, floating ring portals, grand 1,000m Summit Sanctuary
  // ==========================================
  private buildSection6ApexZenith(): void {
    const cp7 = this.checkpoints[7].position;
    const startX = cp7.x;
    const startZ = cp7.z;
    let currX = startX;
    let currY = cp7.y - 0.4;
    let currZ = startZ;

    const numSteps = 104;
    for (let i = 0; i < numSteps; i++) {
      currY += 1.40;
      const t = (i + 1) / (numSteps + 1);
      const ang = i * 0.22;
      const fade = 1.0 - t;

      currX = (1.0 - t) * startX + Math.cos(ang) * (fade * 6.0 + 3.0);
      currZ = (1.0 - t) * startZ + Math.sin(ang) * (fade * 6.0 + 3.0);

      if (i === 18) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 19
      } else if (i === 35) {
        // Launch Pad 13: Celestial Ascent Ring
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(4.0, 0.5, 4.0), 38);
        continue;
      } else if (i === 55) {
        this.collectibles.addCell(new THREE.Vector3(currX, currY + 1.1, currZ)); // Cell 20 (Final Cell!)
      } else if (i === 75) {
        // Launch Pad 14: Zenith Super Charger
        this.addLaunchPlatform(new THREE.Vector3(currX, currY, currZ), new THREE.Vector3(4.0, 0.5, 4.0), 42);
        continue;
      }

      this.addPlatform(
        new THREE.Vector3(currX, currY, currZ),
        new THREE.Vector3(4.0, 0.5, 4.0),
        i % 2 === 0 ? this.materials.celestialGold : this.materials.celestialWhite
      );
    }

    // Final ceremonial approach catapult to 1,000m Summit Sanctuary
    currY += 1.2;
    this.addLaunchPlatform(new THREE.Vector3(0, currY, 4.5), new THREE.Vector3(4.5, 0.5, 4.5), 22);

    // 1,000m Summit Sanctuary Plaza
    this.addPlatform(new THREE.Vector3(0, 999.0, 0), new THREE.Vector3(16.0, 2.0, 16.0), this.materials.celestialGold);
    this.assets.createCelestialGateway(new THREE.Vector3(0, 1000.0, 0), 8.0, 10.0, 0);
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

  private addLaunchPlatform(
    pos: THREE.Vector3,
    size: THREE.Vector3,
    impulse = 28,
    mat: THREE.Material = this.materials.hazardStripe
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = size.y >= 1.2 || size.x >= 5.0 || size.z >= 5.0;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const volume = new CollisionVolume(VolumeType.LAUNCH_PAD, size.clone().multiplyScalar(0.5), pos);
    volume.launchImpulse = impulse;
    volume.mesh = mesh;
    this.physics.addVolume(volume);

    this.addLaunchPad(new THREE.Vector3(pos.x, pos.y + size.y / 2 + 0.2, pos.z), impulse);
    return mesh;
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

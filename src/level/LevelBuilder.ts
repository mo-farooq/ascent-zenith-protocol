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
  // ==========================================
  private buildSection1OrbitalBase(): void {
    // 1. Planetary Survey Rover at (0, 0, -4.5)
    this.assets.createSurveyRover(new THREE.Vector3(0, 0, -4.5), 0);
    this.collectibles.addCell(new THREE.Vector3(0, 3.4, -6.1)); // Energy Cell 1 on Rover Cargo

    // Stepping platform connecting Rover to Hab Pod 1
    this.addPlatform(new THREE.Vector3(0, 3.1, -7.8), new THREE.Vector3(3.2, 0.4, 2.4), this.materials.diamondPlate);

    // 2. Pressurized Hab Pod 1 at (0, 0, -10.0), roof at y=3.8m
    this.assets.createHabPod(new THREE.Vector3(0, 0, -10.0), new THREE.Vector3(4.6, 3.8, 3.8));

    // Stepping platform connecting Hab Pod 1 to Solar Array 1
    this.addPlatform(new THREE.Vector3(0, 4.4, -12.6), new THREE.Vector3(3.0, 0.4, 2.4), this.materials.ceramicWhite);

    // 3. Photovoltaic Solar Array 1 at (0, 0, -15.5) -> top at y=5.2m
    this.assets.createSolarArray(new THREE.Vector3(0, 0, -15.5), 6.5, 3.8, 5.0, 14);

    // Stepping platform connecting Solar Array 1 to Hab Pod 2
    this.addPlatform(new THREE.Vector3(2.8, 5.7, -17.5), new THREE.Vector3(3.0, 0.4, 2.4), this.materials.ceramicWhite);

    // 4. Pressurized Hab Pod 2 at (5.5, 0, -19.5) -> Roof at y=6.6m
    this.assets.createHabPod(new THREE.Vector3(5.5, 0, -19.5), new THREE.Vector3(4.6, 6.6, 4.0));
    this.collectibles.addCell(new THREE.Vector3(5.5, 7.2, -19.5)); // Energy Cell 2

    // SHORTCUT JUMP PAD 1: On Hab Pod 2 roof
    this.addLaunchPlatform(new THREE.Vector3(6.5, 6.8, -19.5), new THREE.Vector3(3.0, 0.4, 3.0), 32);

    // Stepping platform connecting Hab Pod 2 to Mag-Lev Beam
    this.addPlatform(new THREE.Vector3(5.5, 7.4, -22.5), new THREE.Vector3(3.0, 0.4, 2.4), this.materials.diamondPlate);

    // 5. Suspended Mag-Lev Monorail Guideway at (5.5, 8.2, -26.0), length 10m
    this.assets.createMagLevRail(new THREE.Vector3(5.5, 8.2, -26.0), 10.0, 2.6, 0);

    // Stepping Catwalks connecting Mag-Lev Rail to Spire Spiral
    this.addPlatform(new THREE.Vector3(4.5, 9.6, -29.5), new THREE.Vector3(3.2, 0.4, 3.0), this.materials.diamondPlate);
    this.addPlatform(new THREE.Vector3(2.5, 11.0, -32.0), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);
    this.addPlatform(new THREE.Vector3(0.5, 12.4, -32.0), new THREE.Vector3(3.0, 0.4, 3.0), this.materials.ceramicWhite);

    // Smooth transition steps from z=-32 to central tower radius (z=-9.5)
    let currY = 12.4;
    let currZ = -32.0;
    for (let s = 0; s < 10; s++) {
      currY += 1.40;
      currZ += 2.25;
      const x = Math.sin(s * 0.5) * 1.5;
      this.addPlatform(new THREE.Vector3(x, currY, currZ), new THREE.Vector3(3.2, 0.4, 3.2), s % 2 === 0 ? this.materials.ceramicWhite : this.materials.diamondPlate);
    }

    this.collectibles.addCell(new THREE.Vector3(0, currY + 1.0, currZ)); // Energy Cell 3

    // Spiral steps up to Checkpoint 1 at 60m (23 steps from ~26.4m to 58.6m)
    let currAngle = Math.PI * 1.5;
    const rad = 9.5;
    for (let i = 0; i < 23; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const x = Math.cos(currAngle) * rad;
      const z = Math.sin(currAngle) * rad;
      this.addPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(3.2, 0.4, 3.2), i % 2 === 0 ? this.materials.ceramicWhite : this.materials.diamondPlate);
    }

    this.collectibles.addCell(new THREE.Vector3(Math.cos(currAngle) * rad, currY + 1.2, Math.sin(currAngle) * rad)); // Energy Cell 4

    // JUMP PAD 2: On upper step launching straight to Checkpoint 1
    this.addLaunchPlatform(new THREE.Vector3(Math.cos(currAngle) * rad, currY, Math.sin(currAngle) * rad), new THREE.Vector3(3.2, 0.4, 3.2), 25);

    // Checkpoint 1: Orbital Telemetry Silo Deck at 60m (center at y=59.4, top at y=60.0)
    currY += 1.40;
    currAngle += 0.22;
    const cp1X = Math.cos(currAngle) * rad;
    const cp1Z = Math.sin(currAngle) * rad;
    const cp1Pos = new THREE.Vector3(cp1X, currY, cp1Z);
    this.addPlatform(cp1Pos, new THREE.Vector3(9.0, 1.2, 9.0), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_1', 'TELEMETRY RELAY SILO', new THREE.Vector3(cp1X, currY + 0.6, cp1Z));
  }

  // ==========================================
  // SECTION 2: MAG-LEV CORRIDOR & POWER CONDUITS (60m - 180m)
  // ==========================================
  private buildSection2MagLevCorridor(): void {
    const cp1 = this.checkpoints[1].position;
    let currY = cp1.y - 0.6;
    let currAngle = Math.atan2(cp1.z, cp1.x);
    const rad = 9.5;

    // 85 spiral steps climbing smoothly from 60m to 179m
    for (let i = 0; i < 85; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const x = Math.cos(currAngle) * rad;
      const z = Math.sin(currAngle) * rad;

      // Features along the way:
      if (i === 12) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.0, z)); // Energy Cell 5
      } else if (i === 26) {
        // JUMP PAD 3: Power Conduit Booster at ~97m
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 6
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(4.5, 0.6, 4.5), 30);
        continue;
      } else if (i === 38) {
        // High-Tech Fusion Turbine at ~114m
        const turbine = this.assets.createFusionCore(new THREE.Vector3(x * 1.3, currY, z * 1.3), 3.4, 4.5, 1.4);
        this.obstacles.push(turbine.obstacle);
      } else if (i === 55) {
        // JUMP PAD 4: Canyon Leaper at ~138m
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(4.5, 0.6, 4.5), 32);
        continue;
      } else if (i === 70) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.0, z)); // Energy Cell 7
      }

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.45, 3.2),
        i % 2 === 0 ? this.materials.solarCells : this.materials.ceramicWhite
      );
    }

    // Checkpoint 2: Solar Conduit Ridge at 180m
    currY += 1.0;
    currAngle += 0.22;
    const cp2X = Math.cos(currAngle) * rad;
    const cp2Z = Math.sin(currAngle) * rad;
    const cp2Pos = new THREE.Vector3(cp2X, currY, cp2Z);
    this.addPlatform(cp2Pos, new THREE.Vector3(9.0, 0.8, 9.0), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_2', 'SOLAR CONDUIT RIDGE', new THREE.Vector3(cp2X, currY + 0.4, cp2Z));
    currY += 0.2;
  }

  // ==========================================
  // SECTION 3: SUSPENDED ORBITAL CARGO BAY (180m - 360m)
  // ==========================================
  private buildSection3CargoBay(): void {
    const cp2 = this.checkpoints[2].position;
    let currY = cp2.y - 0.4;
    let currAngle = Math.atan2(cp2.z, cp2.x);
    const rad = 9.5;

    // 128 spiral steps climbing from 180m to 359m
    for (let i = 0; i < 128; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const x = Math.cos(currAngle) * rad;
      const z = Math.sin(currAngle) * rad;

      if (i === 20) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.0, z)); // Energy Cell 8
      } else if (i === 46) {
        // JUMP PAD 5: Cargo Apex Launcher at ~245m
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(5.0, 0.6, 5.0), 34);
        continue;
      } else if (i === 70) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 9
      } else if (i === 86) {
        // JUMP PAD 6: Tower Crane Booster at ~300m
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(5.0, 0.6, 5.0), 38);
        continue;
      } else if (i === 110) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 10
      }

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.45, 3.2),
        i % 2 === 0 ? this.materials.hazardOrange : this.materials.brushedSteel
      );
    }

    // Checkpoint 3: Orbital Cargo Haven at 360m
    currY += 1.0;
    currAngle += 0.22;
    const cp3X = Math.cos(currAngle) * rad;
    const cp3Z = Math.sin(currAngle) * rad;
    const cp3Pos = new THREE.Vector3(cp3X, currY, cp3Z);
    this.addPlatform(cp3Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_3', 'ORBITAL CARGO HAVEN', new THREE.Vector3(cp3X, currY + 0.4, cp3Z));
    currY += 0.2;
  }

  // ==========================================
  // SECTION 4: THE CLOCKWORK FUSION FOUNDRY (360m - 600m)
  // ==========================================
  private buildSection4ClockworkFoundry(): void {
    const cp3 = this.checkpoints[3].position;
    let currY = cp3.y - 0.4;
    let currAngle = Math.atan2(cp3.z, cp3.x);
    const rad = 9.5;

    // First leg: 360m to 490m (92 steps)
    for (let i = 0; i < 92; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const x = Math.cos(currAngle) * rad;
      const z = Math.sin(currAngle) * rad;

      if (i === 2) {
        // Foundry Entrance Launcher at 363m
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(5.0, 0.6, 5.0), 42);
        continue;
      } else if (i === 20) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 11
        const fusionCore = this.assets.createFusionCore(new THREE.Vector3(x * 1.3, currY, z * 1.3), 4.2, 5.2, 2.0);
        this.obstacles.push(fusionCore.obstacle);
      } else if (i === 60) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 12
      }

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.45, 3.2),
        i % 2 === 0 ? this.materials.brassGear : this.materials.hazardOrange
      );
    }

    // Checkpoint 4: Fusion Core Gantry at 490m
    currY += 1.0;
    currAngle += 0.22;
    const cp4X = Math.cos(currAngle) * rad;
    const cp4Z = Math.sin(currAngle) * rad;
    const cp4Pos = new THREE.Vector3(cp4X, currY, cp4Z);
    this.addPlatform(cp4Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.ceramicSlate);
    this.addCheckpoint('checkpoint_4', 'FUSION CORE GANTRY', new THREE.Vector3(cp4X, currY + 0.4, cp4Z));
    currY += 0.2;

    // Second leg: 490m to 602m (79 steps)
    for (let i = 0; i < 79; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const x = Math.cos(currAngle) * rad;
      const z = Math.sin(currAngle) * rad;

      if (i === 17) {
        // High Elevator Landing with JUMP PAD 8 at ~514m
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 13
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(5.0, 0.6, 5.0), 44);
        continue;
      } else if (i === 50) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.0, z)); // Energy Cell 14
      }

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.45, 3.2),
        i % 2 === 0 ? this.materials.ceramicWhite : this.materials.brushedSteel
      );
    }

    // Checkpoint 5: Vertigo Monoliths Base at 602m
    currY += 1.0;
    currAngle += 0.22;
    const cp5X = Math.cos(currAngle) * rad;
    const cp5Z = Math.sin(currAngle) * rad;
    const cp5Pos = new THREE.Vector3(cp5X, currY, cp5Z);
    this.addPlatform(cp5Pos, new THREE.Vector3(9.5, 0.8, 9.5), this.materials.monolithStone);
    this.addCheckpoint('checkpoint_5', 'VERTIGO MONOLITHS BASE', new THREE.Vector3(cp5X, currY + 0.4, cp5Z));
    currY += 0.2;
  }

  // ==========================================
  // SECTION 5: THE VERTIGO MONOLITHS - HIGH RISK (600m - 850m)
  // ==========================================
  private buildSection5VertigoMonoliths(): void {
    const cp5 = this.checkpoints[5].position;
    let currY = cp5.y - 0.4;
    let currAngle = Math.atan2(cp5.z, cp5.x);
    const rad = 9.5;

    // 176 spiral steps climbing from 602m to 848.4m
    for (let i = 0; i < 176; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const x = Math.cos(currAngle) * rad;
      const z = Math.sin(currAngle) * rad;

      // Spawn monolithic architecture spires every 14 steps
      if (i % 14 === 0) {
        const needleHeight = 18;
        this.assets.createBrutalistMonolith(new THREE.Vector3(x, currY - needleHeight, z), needleHeight, 3.6);
      }

      // High Altitude Jump Pads on spires
      if (i === 28 || i === 70 || i === 112 || i === 154) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z));
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(3.8, 0.6, 3.8), 36);
        continue;
      }

      if (i === 170) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cell 18
      }

      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.45, 3.2),
        this.materials.monolithStone
      );
    }

    // Checkpoint 6: Celestial Threshold at 850m (top at 850.7m)
    currY += 1.0;
    currAngle += 0.22;
    const cp6X = Math.cos(currAngle) * rad;
    const cp6Z = Math.sin(currAngle) * rad;
    const cp6Pos = new THREE.Vector3(cp6X, currY, cp6Z);
    this.addPlatform(cp6Pos, new THREE.Vector3(10.0, 0.8, 10.0), this.materials.darkTitanium);
    this.addCheckpoint('checkpoint_6', 'CELESTIAL THRESHOLD', new THREE.Vector3(cp6X, currY + 0.4, cp6Z));
    currY += 0.2;
  }

  // ==========================================
  // SECTION 6: THE APEX ZENITH & SUMMIT (850m - 1000m)
  // ==========================================
  private buildSection6ApexZenith(): void {
    const cp6 = this.checkpoints[6].position;
    let currY = cp6.y - 0.4;
    let currAngle = Math.atan2(cp6.z, cp6.x);
    const rad = 9.5;

    this.assets.createCelestialGateway(new THREE.Vector3(cp6.x, currY, cp6.z), 8.0, 7.5, currAngle);

    // 88 spiral steps circling inward to 975m
    for (let i = 0; i < 88; i++) {
      currY += 1.40;
      currAngle += 0.22;
      const tierRad = Math.max(4.0, rad - (i / 88) * 5.0);
      const x = Math.cos(currAngle) * tierRad;
      const z = Math.sin(currAngle) * tierRad;

      if (i === 25 || i === 60) {
        this.collectibles.addCell(new THREE.Vector3(x, currY + 1.2, z)); // Energy Cells 19, 20
        this.addLaunchPlatform(new THREE.Vector3(x, currY, z), new THREE.Vector3(3.4, 0.5, 3.4), 35);
        continue;
      }

      const isGold = i % 2 === 0;
      this.addPlatform(
        new THREE.Vector3(x, currY, z),
        new THREE.Vector3(3.2, 0.45, 3.2),
        isGold ? this.materials.celestialGold : this.materials.celestialWhite
      );
    }

    // GRAND ZENITH LAUNCH PAD at 975m
    this.addLaunchPlatform(new THREE.Vector3(0, 975.0, 0), new THREE.Vector3(7.0, 1.2, 7.0), 45, this.materials.celestialWhite);

    // THE SUMMIT SANCTUARY (1000m)
    const summitY = 1000.0;
    this.summitPosition.set(0, summitY, 0);

    const plazaGeo = new THREE.CylinderGeometry(12, 13, 2.0, 32);
    const plazaMesh = new THREE.Mesh(plazaGeo, this.materials.celestialWhite);
    plazaMesh.position.set(0, summitY - 1.0, 0);
    plazaMesh.receiveShadow = true;
    this.scene.add(plazaMesh);

    const plazaVol = new CollisionVolume(VolumeType.CYLINDER, new THREE.Vector3(12, 1.0, 12), new THREE.Vector3(0, summitY - 1.0, 0));
    plazaVol.mesh = plazaMesh;
    this.physics.addVolume(plazaVol);

    // Spire
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

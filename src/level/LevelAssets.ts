import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { CollisionVolume, VolumeType } from '../physics/CollisionVolume';
import { UpdatableObstacle } from './Obstacles';
import { TextureFactory } from '../materials/TextureFactory';

export class LevelAssets {
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
    darkTitanium: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
      flatShading: true
    }),
    brushedSteel: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.25,
      metalness: 0.8,
      flatShading: true
    }),
    hazardOrange: new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.45,
      metalness: 0.3,
      flatShading: true
    }),
    pipeTeal: new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.35,
      metalness: 0.5,
      flatShading: true
    }),
    cyanGlow: new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    }),
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
    celestialWhite: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.4,
      flatShading: true
    }),
  };

  constructor(private scene: THREE.Scene, private physics: PhysicsWorld) {}

  /**
   * 1. Automated Planetary Survey Rover (6-Wheeled Sci-Fi Transport)
   * Designed with guaranteed climbable step heights:
   * Ground (0m) -> Bumper (0.5m) -> Hood Deck (1.2m) -> Cab Roof (2.1m) -> Cargo Pod (2.8m)
   */
  public createSurveyRover(position: THREE.Vector3, yaw = 0): THREE.Group {
    const roverGroup = new THREE.Group();
    roverGroup.position.copy(position);
    roverGroup.rotation.y = yaw;

    // Step 1: Reinforced Front Bumper / Winch Deck (Height: 0.5m)
    const bumperGeo = new THREE.BoxGeometry(2.6, 0.45, 0.6);
    const bumper = new THREE.Mesh(bumperGeo, this.materials.hazardStripe);
    bumper.position.set(0, 0.25, 3.2);
    bumper.castShadow = true;
    bumper.receiveShadow = true;
    roverGroup.add(bumper);

    // Step 2: Front Sensor Hood Deck (Height: 1.2m)
    const hoodGeo = new THREE.BoxGeometry(2.5, 0.7, 1.6);
    const hood = new THREE.Mesh(hoodGeo, this.materials.ceramicWhite);
    hood.position.set(0, 0.85, 2.1);
    hood.castShadow = true;
    hood.receiveShadow = true;
    roverGroup.add(hood);

    // Cyan sensor headlights
    const lightGeo = new THREE.BoxGeometry(0.5, 0.15, 0.1);
    const lLight = new THREE.Mesh(lightGeo, this.materials.cyanGlow);
    lLight.position.set(-0.8, 0.85, 2.92);
    roverGroup.add(lLight);

    const rLight = new THREE.Mesh(lightGeo, this.materials.cyanGlow);
    rLight.position.set(0.8, 0.85, 2.92);
    roverGroup.add(rLight);

    // Step 3: Command Module Cab (Height: 2.1m)
    const cabGeo = new THREE.BoxGeometry(2.5, 0.9, 1.4);
    const cab = new THREE.Mesh(cabGeo, this.materials.ceramicWhite);
    cab.position.set(0, 1.65, 0.8);
    cab.castShadow = true;
    cab.receiveShadow = true;
    roverGroup.add(cab);

    // Cockpit sensor visor
    const visorGeo = new THREE.BoxGeometry(2.3, 0.45, 0.1);
    const visor = new THREE.Mesh(visorGeo, this.materials.cyanGlow);
    visor.position.set(0, 1.75, 1.51);
    roverGroup.add(visor);

    // Step 4: Pressurized Scientific Cargo Pod Roof (Height: 2.8m)
    const cargoGeo = new THREE.BoxGeometry(2.7, 1.6, 4.0);
    const cargo = new THREE.Mesh(cargoGeo, this.materials.ceramicSlate);
    cargo.position.set(0, 2.0, -1.6);
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    roverGroup.add(cargo);

    // Roof walkway solar strip
    const solarRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 3.6), this.materials.solarCells);
    solarRoof.position.set(0, 2.85, -1.6);
    solarRoof.receiveShadow = true;
    roverGroup.add(solarRoof);

    // 6 Heavy Planetary Rover Wheels with cyan magnetic hubcaps
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.4, 12);
    const wheelMat = this.materials.darkTitanium;
    const wheelZPositions = [2.2, 0.2, -1.8];

    wheelZPositions.forEach(z => {
      [-1.45, 1.45].forEach(x => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.48, z);
        w.castShadow = true;
        roverGroup.add(w);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.42, 8), this.materials.cyanGlow);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(x, 0.48, z);
        roverGroup.add(hub);
      });
    });

    // Precise Collision Volumes for every step
    const bumperPos = new THREE.Vector3(0, 0.25, 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(position);
    const bumperVol = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(1.3, 0.25, 0.3), bumperPos);
    bumperVol.setRotationFromEuler(0, yaw, 0);
    this.physics.addVolume(bumperVol);

    const hoodPos = new THREE.Vector3(0, 0.85, 2.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(position);
    const hoodVol = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(1.25, 0.35, 0.8), hoodPos);
    hoodVol.setRotationFromEuler(0, yaw, 0);
    this.physics.addVolume(hoodVol);

    const cabPos = new THREE.Vector3(0, 1.65, 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(position);
    const cabVol = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(1.25, 0.45, 0.7), cabPos);
    cabVol.setRotationFromEuler(0, yaw, 0);
    this.physics.addVolume(cabVol);

    const cargoPos = new THREE.Vector3(0, 2.0, -1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(position);
    const cargoVol = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(1.35, 0.85, 2.0), cargoPos);
    cargoVol.setRotationFromEuler(0, yaw, 0);
    this.physics.addVolume(cargoVol);

    this.scene.add(roverGroup);
    return roverGroup;
  }

  /**
   * 2. Modular Pressurized Habitation / Server Pod
   */
  public createHabPod(position: THREE.Vector3, size = new THREE.Vector3(5.0, 3.2, 4.0), yaw = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = yaw;

    // Ceramic Hull
    const hullGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const hull = new THREE.Mesh(hullGeo, this.materials.ceramicWhite);
    hull.position.y = size.y / 2;
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    // Roof Solar Deck (Walkable surface)
    const roofGeo = new THREE.BoxGeometry(size.x - 0.2, 0.15, size.z - 0.2);
    const roof = new THREE.Mesh(roofGeo, this.materials.solarCells);
    roof.position.y = size.y + 0.08;
    roof.receiveShadow = true;
    group.add(roof);

    // Hazard warning rim
    const rimGeo = new THREE.BoxGeometry(size.x + 0.1, 0.2, size.z + 0.1);
    const rim = new THREE.Mesh(rimGeo, this.materials.hazardStripe);
    rim.position.y = size.y;
    group.add(rim);

    // Circular Airlock Hatch with cyan glow ring
    const hatchGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.2, 16);
    const hatch = new THREE.Mesh(hatchGeo, this.materials.darkTitanium);
    hatch.rotation.x = Math.PI / 2;
    hatch.position.set(0, 1.4, size.z / 2 + 0.05);
    group.add(hatch);

    const ringGeo = new THREE.TorusGeometry(0.92, 0.04, 8, 24);
    const ring = new THREE.Mesh(ringGeo, this.materials.cyanGlow);
    ring.position.set(0, 1.4, size.z / 2 + 0.12);
    group.add(ring);

    // Collision: Walkable roof surface
    const roofHalfExtents = new THREE.Vector3(size.x * 0.5, 0.25, size.z * 0.5);
    const worldCenter = position.clone().add(new THREE.Vector3(0, size.y - 0.25, 0));
    const volume = new CollisionVolume(VolumeType.OBB, roofHalfExtents, worldCenter);
    volume.setRotationFromEuler(0, yaw, 0);
    this.physics.addVolume(volume);

    this.scene.add(group);
    return group;
  }

  /**
   * 3. Photovoltaic Solar Tracker Array
   */
  public createSolarArray(
    position: THREE.Vector3,
    width = 6.0,
    depth = 3.6,
    pedestalHeight = 4.0,
    tiltDeg = 18
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);

    // Central Titanium Pedestal
    const pedGeo = new THREE.CylinderGeometry(0.3, 0.45, pedestalHeight, 8);
    const pedestal = new THREE.Mesh(pedGeo, this.materials.darkTitanium);
    pedestal.position.y = pedestalHeight / 2;
    pedestal.castShadow = true;
    group.add(pedestal);

    // Solar Panel Wing (Walkable tilted surface)
    const panelGroup = new THREE.Group();
    panelGroup.position.set(0, pedestalHeight, 0);
    panelGroup.rotation.x = (tiltDeg * Math.PI) / 180;

    const panelGeo = new THREE.BoxGeometry(width, 0.25, depth);
    const panel = new THREE.Mesh(panelGeo, this.materials.solarCells);
    panel.castShadow = true;
    panel.receiveShadow = true;
    panelGroup.add(panel);

    const frameGeo = new THREE.BoxGeometry(width + 0.1, 0.1, depth + 0.1);
    const frame = new THREE.Mesh(frameGeo, this.materials.brushedSteel);
    frame.position.y = -0.12;
    panelGroup.add(frame);

    group.add(panelGroup);

    // Collision Volume for Solar Wing
    const panelWorld = position.clone().add(new THREE.Vector3(0, pedestalHeight, 0));
    const volume = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(width / 2, 0.2, depth / 2), panelWorld);
    volume.setRotationFromEuler((tiltDeg * Math.PI) / 180, 0, 0);
    this.physics.addVolume(volume);

    this.scene.add(group);
    return group;
  }

  /**
   * 4. Telemetry Radar Dish Array with Service Walkway
   */
  public createTelemetryRadarDish(
    position: THREE.Vector3,
    dishDiameter = 8.0,
    towerHeight = 14.0
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);

    // Lattice Support Tower
    const towerGeo = new THREE.CylinderGeometry(0.8, 1.4, towerHeight, 6);
    const tower = new THREE.Mesh(towerGeo, this.materials.darkTitanium);
    tower.position.y = towerHeight / 2;
    tower.castShadow = true;
    group.add(tower);

    // Circular Service Catwalk at top of tower (Walkable deck!)
    const catwalkGeo = new THREE.CylinderGeometry(dishDiameter * 0.55, dishDiameter * 0.55, 0.35, 12);
    const catwalk = new THREE.Mesh(catwalkGeo, this.materials.diamondPlate);
    catwalk.position.y = towerHeight + 0.18;
    catwalk.receiveShadow = true;
    group.add(catwalk);

    // Parabolic Radar Dish
    const dishGeo = new THREE.SphereGeometry(dishDiameter / 2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const dish = new THREE.Mesh(dishGeo, this.materials.ceramicWhite);
    dish.position.set(0, towerHeight + 2.5, 0);
    dish.rotation.x = Math.PI - 0.4;
    dish.castShadow = true;
    group.add(dish);

    // Central Feed Horn Antenna with cyan signal diode
    const hornGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6);
    const horn = new THREE.Mesh(hornGeo, this.materials.brushedSteel);
    horn.position.set(0, towerHeight + 2.8, 1.2);
    horn.rotation.x = -0.4;
    group.add(horn);

    const emitter = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), this.materials.cyanGlow);
    emitter.position.set(0, towerHeight + 3.8, 1.8);
    group.add(emitter);

    // Catwalk Walkway Collision
    const catVol = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(dishDiameter * 0.55, 0.25, dishDiameter * 0.55),
      position.clone().add(new THREE.Vector3(0, towerHeight + 0.18, 0))
    );
    this.physics.addVolume(catVol);

    this.scene.add(group);
    return group;
  }

  /**
   * 5. Suspended Magnetic Levitation (Mag-Lev) Monorail Guideway
   */
  public createMagLevRail(
    startPos: THREE.Vector3,
    length = 18.0,
    width = 2.6,
    rotationYaw = 0
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(startPos);
    group.rotation.y = rotationYaw;

    // Brushed titanium beam
    const beamGeo = new THREE.BoxGeometry(width, 0.5, length);
    const beam = new THREE.Mesh(beamGeo, this.materials.brushedSteel);
    beam.position.set(0, 0, length / 2);
    beam.castShadow = true;
    beam.receiveShadow = true;
    group.add(beam);

    // Glowing cyan mag-lev center induction track
    const trackGeo = new THREE.BoxGeometry(0.35, 0.08, length);
    const track = new THREE.Mesh(trackGeo, this.materials.cyanGlow);
    track.position.set(0, 0.28, length / 2);
    group.add(track);

    // Edge hazard stripes
    const edgeGeo = new THREE.BoxGeometry(0.18, 0.1, length);
    const lEdge = new THREE.Mesh(edgeGeo, this.materials.hazardStripe);
    lEdge.position.set(-width / 2 + 0.09, 0.28, length / 2);
    group.add(lEdge);

    const rEdge = new THREE.Mesh(edgeGeo, this.materials.hazardStripe);
    rEdge.position.set(width / 2 - 0.09, 0.28, length / 2);
    group.add(rEdge);

    // Collision
    const worldCenter = new THREE.Vector3(0, 0, length / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationYaw).add(startPos);
    const volume = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(width / 2, 0.25, length / 2), worldCenter);
    volume.setRotationFromEuler(0, rotationYaw, 0);
    this.physics.addVolume(volume);

    this.scene.add(group);
    return group;
  }

  /**
   * 6. Cylindrical Plasma Fusion Reactor Core
   */
  public createFusionCore(
    position: THREE.Vector3,
    radius = 3.6,
    height = 5.0,
    spinSpeed = 1.2
  ): { group: THREE.Group; obstacle: UpdatableObstacle } {
    const group = new THREE.Group();
    group.position.copy(position);

    // Reactor Chamber Body
    const coreGeo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const core = new THREE.Mesh(coreGeo, this.materials.ceramicSlate);
    core.position.y = height / 2;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    // Walkable Diamond Plate Top Cap
    const topCapGeo = new THREE.CylinderGeometry(radius + 0.2, radius + 0.2, 0.35, 16);
    const topCap = new THREE.Mesh(topCapGeo, this.materials.diamondPlate);
    topCap.position.y = height + 0.18;
    topCap.receiveShadow = true;
    group.add(topCap);

    // Rotating Magnetic Containment Rings
    const ringGroup = new THREE.Group();
    ringGroup.position.y = height / 2;

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.15, 0.16, 8, 24), this.materials.hazardOrange);
    ring1.rotation.x = Math.PI / 2;
    ringGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.25, 0.12, 8, 24), this.materials.cyanGlow);
    ring2.rotation.x = Math.PI / 2.3;
    ringGroup.add(ring2);

    group.add(ringGroup);

    this.scene.add(group);

    const obstacle: UpdatableObstacle = {
      update: (delta: number) => {
        ringGroup.rotation.y += spinSpeed * delta;
        ringGroup.rotation.z += (spinSpeed * 0.5) * delta;
      }
    };

    return { group, obstacle };
  }

  /**
   * 7. Brutalist Monolith with Glowing Runes
   */
  public createBrutalistMonolith(position: THREE.Vector3, height = 24.0, width = 3.2): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);

    const pillarGeo = new THREE.CylinderGeometry(width * 0.4, width * 0.5, height, 8);
    const pillar = new THREE.Mesh(pillarGeo, this.materials.monolithStone);
    pillar.position.y = height / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    // Glowing cyan energy conduit
    const conduitGeo = new THREE.BoxGeometry(0.18, height * 0.9, 0.18);
    const conduit = new THREE.Mesh(conduitGeo, this.materials.cyanGlow);
    conduit.position.set(0, height / 2, width * 0.42);
    group.add(conduit);

    // Walkable top cap
    const capGeo = new THREE.CylinderGeometry(width * 0.55, width * 0.4, 0.6, 8);
    const cap = new THREE.Mesh(capGeo, this.materials.diamondPlate);
    cap.position.y = height + 0.3;
    cap.receiveShadow = true;
    group.add(cap);

    this.scene.add(group);
    return group;
  }

  /**
   * 8. Celestial Gateway Archway
   */
  public createCelestialGateway(position: THREE.Vector3, span = 7.0, height = 8.0, rotationYaw = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = rotationYaw;

    const columnWidth = 0.9;
    const colGeo = new THREE.BoxGeometry(columnWidth, height, columnWidth);

    const leftCol = new THREE.Mesh(colGeo, this.materials.celestialGold);
    leftCol.position.set(-span / 2, height / 2, 0);
    leftCol.castShadow = true;
    group.add(leftCol);

    const rightCol = new THREE.Mesh(colGeo, this.materials.celestialGold);
    rightCol.position.set(span / 2, height / 2, 0);
    rightCol.castShadow = true;
    group.add(rightCol);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(span + columnWidth * 2, 1.2, columnWidth * 1.4), this.materials.celestialWhite);
    lintel.position.set(0, height + 0.6, 0);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    group.add(lintel);

    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), this.materials.cyanGlow);
    jewel.position.set(0, height + 0.6, 0);
    group.add(jewel);

    this.scene.add(group);
    return group;
  }
}

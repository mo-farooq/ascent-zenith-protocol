import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { CollisionVolume, VolumeType } from '../physics/CollisionVolume';
import { TextureFactory } from '../materials/TextureFactory';

export class GroundEnvironment {
  public group = new THREE.Group();

  constructor(private scene: THREE.Scene, private physics: PhysicsWorld) {
    this.buildHighTechStagingBase();
    this.scene.add(this.group);
  }

  private buildHighTechStagingBase(): void {
    const padSize = 90.0;

    // 1. High-Tech Composite Tarmac (90m x 90m)
    const padGeo = new THREE.BoxGeometry(padSize, 1.2, padSize);
    const padMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.getHighTechTarmac(),
      roughness: 0.65,
      metalness: 0.35,
      flatShading: true
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, -0.6, 0);
    pad.receiveShadow = true;
    this.group.add(pad);

    const padVol = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(padSize / 2, 0.6, padSize / 2),
      new THREE.Vector3(0, -0.6, 0)
    );
    this.physics.addVolume(padVol);

    // 2. Perimeter Energy Pylons & Guidance Lights
    this.buildPerimeterGuidance(padSize - 4);

    // 3. High-Tech Telemetry Pylons (Angled Floodlight Beams)
    this.buildLightPylon(new THREE.Vector3(28, 0, -28), 18.0);
    this.buildLightPylon(new THREE.Vector3(-28, 0, 28), 18.0);
    this.buildLightPylon(new THREE.Vector3(28, 0, 28), 18.0);
  }

  private buildLightPylon(pos: THREE.Vector3, height = 18.0): void {
    const pylonGroup = new THREE.Group();
    pylonGroup.position.copy(pos);

    const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.85, flatShading: true });
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // Sleek faceted pylon mast
    const mastGeo = new THREE.CylinderGeometry(0.25, 0.45, height, 6);
    const mast = new THREE.Mesh(mastGeo, titaniumMat);
    mast.position.y = height / 2;
    mast.castShadow = true;
    pylonGroup.add(mast);

    // Vertical neon conduit strip
    const conduitGeo = new THREE.BoxGeometry(0.06, height * 0.9, 0.06);
    const conduit = new THREE.Mesh(conduitGeo, cyanMat);
    conduit.position.set(0, height / 2, 0.3);
    pylonGroup.add(conduit);

    // Light head fixture
    const headGeo = new THREE.BoxGeometry(2.4, 0.8, 0.4);
    const head = new THREE.Mesh(headGeo, titaniumMat);
    head.position.set(0, height, 0);
    head.rotation.x = 0.35;
    pylonGroup.add(head);

    // 3 Clean White Floodlights
    const lampGlow = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.2), lampGlow);
      lamp.position.set(-0.7 + i * 0.7, height, 0.2);
      lamp.rotation.x = 0.35;
      pylonGroup.add(lamp);
    }

    // Spot light casting soft illumination on ground center
    const spot = new THREE.SpotLight(0xdbeafe, 2.5, 50, Math.PI / 4, 0.4);
    spot.position.set(0, height, 0.4);
    spot.target.position.set(-pos.x * 0.35, 0, -pos.z * 0.35);
    pylonGroup.add(spot);
    pylonGroup.add(spot.target);

    // Collision
    const col = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(0.5, height / 2, 0.5),
      pos.clone().add(new THREE.Vector3(0, height / 2, 0))
    );
    this.physics.addVolume(col);

    this.group.add(pylonGroup);
  }

  private buildPerimeterGuidance(sideLength: number): void {
    const group = new THREE.Group();
    const halfL = sideLength / 2;
    const count = 10;
    const step = sideLength / count;

    const beaconGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6);
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8, flatShading: true });
    const cyanLightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const sides = [
      { start: new THREE.Vector3(-halfL, 0, -halfL), dir: new THREE.Vector3(1, 0, 0) },
      { start: new THREE.Vector3(halfL, 0, -halfL), dir: new THREE.Vector3(0, 0, 1) },
      { start: new THREE.Vector3(halfL, 0, halfL), dir: new THREE.Vector3(-1, 0, 0) },
      { start: new THREE.Vector3(-halfL, 0, halfL), dir: new THREE.Vector3(0, 0, -1) },
    ];

    sides.forEach(s => {
      for (let i = 0; i <= count; i++) {
        const p = s.start.clone().addScaledVector(s.dir, i * step);

        const baseMesh = new THREE.Mesh(beaconGeo, beaconMat);
        baseMesh.position.set(p.x, 0.4, p.z);
        group.add(baseMesh);

        const capMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), cyanLightMat);
        capMesh.position.set(p.x, 0.85, p.z);
        group.add(capMesh);
      }
    });

    this.group.add(group);
  }
}

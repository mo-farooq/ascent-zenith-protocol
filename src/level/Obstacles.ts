import * as THREE from 'three';
import { CollisionVolume, VolumeType } from '../physics/CollisionVolume';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export interface UpdatableObstacle {
  update(delta: number): void;
}

export class MovingPlatform implements UpdatableObstacle {
  public mesh: THREE.Mesh;
  public volume: CollisionVolume;
  private startPos: THREE.Vector3;
  private endPos: THREE.Vector3;
  private speed: number;
  private progress = 0;
  private direction = 1;

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    start: THREE.Vector3,
    end: THREE.Vector3,
    size: THREE.Vector3,
    speed = 2.5,
    material?: THREE.Material
  ) {
    this.startPos = start.clone();
    this.endPos = end.clone();
    this.speed = speed;

    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = material || new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.4,
      metalness: 0.3,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(start);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.volume = new CollisionVolume(VolumeType.BOX, size.clone().multiplyScalar(0.5), start);
    this.volume.isMoving = true;
    this.volume.mesh = this.mesh;
    physics.addVolume(this.volume);
  }

  public update(delta: number): void {
    const totalDist = this.startPos.distanceTo(this.endPos);
    if (totalDist < 0.01) return;

    const step = (this.speed * delta) / totalDist;
    this.progress += step * this.direction;

    if (this.progress >= 1.0) {
      this.progress = 1.0;
      this.direction = -1;
    } else if (this.progress <= 0.0) {
      this.progress = 0.0;
      this.direction = 1;
    }

    const prevPos = this.volume.position.clone();

    // Smooth ease in/out
    const t = 0.5 - 0.5 * Math.cos(this.progress * Math.PI);
    const newPos = new THREE.Vector3().lerpVectors(this.startPos, this.endPos, t);

    this.mesh.position.copy(newPos);
    this.volume.position.copy(newPos);
    this.volume.updateMatrices();

    // Linear velocity for momentum transfer
    if (delta > 0) {
      this.volume.linearVelocity.copy(newPos).sub(prevPos).divideScalar(delta);
    }
  }
}

export class RotatingObstacle implements UpdatableObstacle {
  public group: THREE.Group = new THREE.Group();
  public volume: CollisionVolume;
  private rotationSpeed: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    position: THREE.Vector3,
    size: THREE.Vector3,
    rotationSpeed: THREE.Vector3, // rad/sec per axis
    material?: THREE.Material
  ) {
    this.rotationSpeed = rotationSpeed;

    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = material || new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
      metalness: 0.4,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    this.group.position.copy(position);
    scene.add(this.group);

    this.volume = new CollisionVolume(VolumeType.OBB, size.clone().multiplyScalar(0.5), position);
    this.volume.isMoving = true;
    this.volume.mesh = this.group;
    physics.addVolume(this.volume);
  }

  public update(delta: number): void {
    this.group.rotation.x += this.rotationSpeed.x * delta;
    this.group.rotation.y += this.rotationSpeed.y * delta;
    this.group.rotation.z += this.rotationSpeed.z * delta;

    this.volume.rotation.copy(this.group.quaternion);
    this.volume.angularVelocity.copy(this.rotationSpeed);
    this.volume.updateMatrices();
  }
}

export class SwingingPendulum implements UpdatableObstacle {
  public group: THREE.Group = new THREE.Group();
  public volume: CollisionVolume;
  private pivot: THREE.Vector3;
  private length: number;
  private maxAngle: number;
  private speed: number;
  private timer = 0;

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    pivot: THREE.Vector3,
    length = 6,
    maxAngle = 0.8,
    speed = 2.2
  ) {
    this.pivot = pivot.clone();
    this.length = length;
    this.maxAngle = maxAngle;
    this.speed = speed;

    this.group.position.copy(pivot);

    // Cable
    const cableGeo = new THREE.CylinderGeometry(0.06, 0.06, length, 8);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const cableMesh = new THREE.Mesh(cableGeo, cableMat);
    cableMesh.position.y = -length / 2;
    this.group.add(cableMesh);

    // Heavy weight bob at bottom
    const bobSize = 1.8;
    const bobGeo = new THREE.BoxGeometry(bobSize, bobSize, bobSize);
    const bobMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.6,
      flatShading: true
    });
    const bobMesh = new THREE.Mesh(bobGeo, bobMat);
    bobMesh.position.y = -length;
    bobMesh.castShadow = true;
    this.group.add(bobMesh);

    scene.add(this.group);

    const bobPos = pivot.clone().add(new THREE.Vector3(0, -length, 0));
    this.volume = new CollisionVolume(VolumeType.OBB, new THREE.Vector3(bobSize/2, bobSize/2, bobSize/2), bobPos);
    this.volume.isMoving = true;
    this.volume.mesh = this.group;
    physics.addVolume(this.volume);
  }

  public update(delta: number): void {
    this.timer += delta * this.speed;
    const angle = Math.sin(this.timer) * this.maxAngle;

    this.group.rotation.z = angle;

    // Compute bob world position
    const bobLocal = new THREE.Vector3(0, -this.length, 0);
    const bobWorld = bobLocal.clone().applyMatrix4(this.group.matrixWorld);

    const prevPos = this.volume.position.clone();
    this.volume.position.copy(bobWorld);
    this.volume.rotation.copy(this.group.quaternion);
    this.volume.updateMatrices();

    if (delta > 0) {
      this.volume.linearVelocity.copy(bobWorld).sub(prevPos).divideScalar(delta);
    }
  }
}

export class LaunchPad implements UpdatableObstacle {
  public mesh: THREE.Mesh;
  public volume: CollisionVolume;
  private glowRing: THREE.Mesh;
  private chevrons: THREE.Group = new THREE.Group();
  private time = Math.random() * 10;
  private pointLight: THREE.PointLight;

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    position: THREE.Vector3,
    size = new THREE.Vector3(2.5, 0.4, 2.5),
    impulse = 27
  ) {
    const geo = new THREE.CylinderGeometry(size.x * 0.5, size.x * 0.55, size.y, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.85,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Hazard dark metallic housing base
    const baseGeo = new THREE.CylinderGeometry(size.x * 0.58, size.x * 0.64, size.y * 0.9, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.6 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.copy(position);
    baseMesh.position.y -= 0.05;
    scene.add(baseMesh);

    // Pulsating cyan induction core
    const ringGeo = new THREE.TorusGeometry(size.x * 0.32, 0.08, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.position.copy(position);
    this.glowRing.position.y += size.y * 0.52;
    scene.add(this.glowRing);

    // Floating animated holographic arrows
    for (let i = 0; i < 3; i++) {
      const arrowGeo = new THREE.ConeGeometry(0.28, 0.45, 4);
      arrowGeo.rotateY(Math.PI / 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(0, 0.4 + i * 0.5, 0);
      this.chevrons.add(arrow);
    }
    this.chevrons.position.copy(position);
    scene.add(this.chevrons);

    // Point Light
    this.pointLight = new THREE.PointLight(0x00f0ff, 1.2, 6.0);
    this.pointLight.position.set(position.x, position.y + 0.8, position.z);
    scene.add(this.pointLight);

    this.volume = new CollisionVolume(VolumeType.LAUNCH_PAD, size.clone().multiplyScalar(0.5), position);
    this.volume.launchImpulse = impulse;
    this.volume.mesh = this.mesh;
    physics.addVolume(this.volume);
  }

  public update(delta: number): void {
    this.time += delta;
    const pulse = 0.6 + Math.sin(this.time * 5.0) * 0.4;
    (this.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    this.glowRing.scale.setScalar(0.95 + pulse * 0.1);

    // Chevron bob and pulse
    this.chevrons.children.forEach((c, idx) => {
      c.position.y = 0.4 + idx * 0.45 + Math.sin(this.time * 4 + idx) * 0.12;
      c.rotation.y += delta * 1.2;
    });
  }
}

export class CrumblingPlatform implements UpdatableObstacle {
  public mesh: THREE.Mesh;
  public volume: CollisionVolume;
  private respawnTimer = 0;
  private initialPos: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    position: THREE.Vector3,
    size: THREE.Vector3
  ) {
    this.initialPos = position.clone();
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.7,
      metalness: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.9
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.volume = new CollisionVolume(VolumeType.CRUMBLING, size.clone().multiplyScalar(0.5), position);
    this.volume.mesh = this.mesh;
    physics.addVolume(this.volume);
  }

  public update(delta: number): void {
    if (this.volume.isCumbled) {
      this.respawnTimer += delta;
      // Respawn after 3.2 seconds
      if (this.respawnTimer > 3.2) {
        this.respawnTimer = 0;
        this.volume.isCumbled = false;
        this.volume.isCrumbling = false;
        this.volume.crumbleTimer = 0;
        this.mesh.visible = true;
        this.mesh.position.copy(this.initialPos);
      }
    }
  }
}

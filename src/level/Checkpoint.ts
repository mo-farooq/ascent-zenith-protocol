import * as THREE from 'three';
import { AudioManager } from '../core/Audio';

export class Checkpoint {
  public id: string;
  public name: string;
  public position: THREE.Vector3;
  public isActivated = false;

  private group: THREE.Group = new THREE.Group();
  private baseMesh!: THREE.Mesh;
  private ringMesh!: THREE.Mesh;
  private light!: THREE.PointLight;
  private activeMat: THREE.MeshStandardMaterial;
  private inactiveMat: THREE.MeshStandardMaterial;

  constructor(
    scene: THREE.Scene,
    id: string,
    name: string,
    position: THREE.Vector3,
    initiallyActive = false
  ) {
    this.id = id;
    this.name = name;
    this.position = position.clone();
    this.isActivated = initiallyActive;

    this.inactiveMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
      flatShading: true
    });

    this.activeMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.6,
      flatShading: true
    });

    this.buildMesh();
    this.group.position.copy(position);
    scene.add(this.group);

    if (this.isActivated) {
      this.applyActiveState();
    }
  }

  private buildMesh(): void {
    // Hexagonal platform pad
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.4, 6);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, flatShading: true });
    this.baseMesh = new THREE.Mesh(baseGeo, darkMat);
    this.baseMesh.receiveShadow = true;
    this.group.add(this.baseMesh);

    // Glowing inner circle
    const innerGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.42, 16);
    const innerMesh = new THREE.Mesh(innerGeo, this.isActivated ? this.activeMat : this.inactiveMat);
    this.group.add(innerMesh);

    // Floating rotating halo ring
    const ringGeo = new THREE.TorusGeometry(1.8, 0.08, 8, 24);
    this.ringMesh = new THREE.Mesh(ringGeo, this.isActivated ? this.activeMat : this.inactiveMat);
    this.ringMesh.rotation.x = Math.PI / 2;
    this.ringMesh.position.y = 1.0;
    this.group.add(this.ringMesh);

    // Light
    this.light = new THREE.PointLight(this.isActivated ? 0x00ff88 : 0xf59e0b, this.isActivated ? 2.5 : 0.8, 12);
    this.light.position.set(0, 1.2, 0);
    this.group.add(this.light);
  }

  public checkActivation(playerPos: THREE.Vector3, audio: AudioManager): boolean {
    if (this.isActivated) return false;

    // Check distance in XZ plane and Y proximity
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const horizDist = Math.hypot(dx, dz);
    const vertDist = Math.abs(playerPos.y - this.position.y);

    if (horizDist < 2.5 && vertDist < 2.0) {
      this.isActivated = true;
      this.applyActiveState();
      audio.playCheckpoint();
      return true;
    }
    return false;
  }

  private applyActiveState(): void {
    this.ringMesh.material = this.activeMat;
    this.light.color.setHex(0x00ff88);
    this.light.intensity = 2.8;
  }

  public update(delta: number): void {
    if (this.ringMesh) {
      this.ringMesh.rotation.z += delta * (this.isActivated ? 2.5 : 0.8);
      this.ringMesh.position.y = 1.0 + Math.sin(performance.now() * 0.003) * 0.15;
    }
  }
}

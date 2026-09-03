import * as THREE from 'three';
import { AudioManager } from '../core/Audio';

export class EnergyCell {
  public group: THREE.Group;
  public collected = false;
  private coreMesh: THREE.Mesh;
  private ringMesh: THREE.Mesh;
  private light: THREE.PointLight;
  private time = Math.random() * 10;
  private baseY: number;

  constructor(private scene: THREE.Scene, public position: THREE.Vector3) {
    this.baseY = position.y;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    // Glowing energy core (octahedron)
    const coreGeo = new THREE.OctahedronGeometry(0.35, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
      flatShading: true
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.coreMesh);

    // Orbiting containment ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.2
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(this.ringMesh);

    // Light
    this.light = new THREE.PointLight(0x00f0ff, 1.5, 5);
    this.group.add(this.light);

    scene.add(this.group);
  }

  public update(delta: number): void {
    if (this.collected) return;
    this.time += delta;

    this.group.position.y = this.baseY + Math.sin(this.time * 2.5) * 0.15;
    this.coreMesh.rotation.y += delta * 1.5;
    this.coreMesh.rotation.x += delta * 0.8;

    this.ringMesh.rotation.x += delta * 2.0;
    this.ringMesh.rotation.y += delta * 1.2;
  }

  public collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.scene.remove(this.group);
  }
}

export class CollectiblesManager {
  private cells: EnergyCell[] = [];
  public collectedCount = 0;
  public totalCount = 0;
  private onCollectCallback?: (count: number, total: number) => void;

  constructor(private scene: THREE.Scene, private audio: AudioManager) {}

  public addCell(pos: THREE.Vector3): void {
    const cell = new EnergyCell(this.scene, pos);
    this.cells.push(cell);
    this.totalCount = this.cells.length;
  }

  public setOnCollect(cb: (count: number, total: number) => void): void {
    this.onCollectCallback = cb;
  }

  public update(delta: number, playerPos: THREE.Vector3): void {
    for (const cell of this.cells) {
      if (cell.collected) continue;
      cell.update(delta);

      // Check pickup radius (1.4m)
      const distSq = cell.group.position.distanceToSquared(playerPos);
      if (distSq < 2.0) {
        cell.collect();
        this.collectedCount++;
        this.audio.playCollect();
        this.onCollectCallback?.(this.collectedCount, this.totalCount);
      }
    }
  }

  public reset(): void {
    for (const cell of this.cells) {
      if (cell.collected) {
        cell.collected = false;
        this.scene.add(cell.group);
      }
    }
    this.collectedCount = 0;
  }
}

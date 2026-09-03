import * as THREE from 'three';

interface MarkerData {
  altitude: number;
  label: string;
  zone: string;
}

export class AltitudeMarkers {
  private markersGroup = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.markersGroup);
    this.createMarkers();
  }

  private createMarkers(): void {
    const milestones: MarkerData[] = [
      { altitude: 60, label: '60 METERS', zone: 'THE SCAFFOLDING' },
      { altitude: 180, label: '180 METERS', zone: 'GIRDERS & PIPELINES' },
      { altitude: 360, label: '360 METERS', zone: 'SUSPENDED CARGO BAY' },
      { altitude: 600, label: '600 METERS', zone: 'CLOCKWORK FOUNDRY' },
      { altitude: 850, label: '850 METERS', zone: 'VERTIGO MONOLITHS' },
      { altitude: 1000, label: '1,000 METERS', zone: 'APEX ZENITH' },
    ];

    for (const m of milestones) {
      this.createMarkerObject(m);
    }
  }

  private createMarkerObject(data: MarkerData): void {
    const group = new THREE.Group();
    group.position.set(0, data.altitude, 0);

    // Giant subtle holographic ring in the sky
    const ringGeo = new THREE.TorusGeometry(32, 0.4, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: data.altitude >= 1000 ? 0xffb703 : 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    // Canvas-generated holographic billboard texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    // Draw stylized holographic banner
    ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
    ctx.roundRect(10, 10, 492, 140, 16);
    ctx.fill();

    ctx.strokeStyle = data.altitude >= 1000 ? '#ffb703' : '#00f0ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = data.altitude >= 1000 ? '#ffb703' : '#00f0ff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.label, 256, 70);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(data.zone, 256, 115);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.85
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 5, 1);
    sprite.position.set(0, 3, 0);
    group.add(sprite);

    this.markersGroup.add(group);
  }

  public update(): void {
    const t = performance.now() * 0.0008;
    this.markersGroup.children.forEach((group, idx) => {
      group.rotation.y = t * (idx % 2 === 0 ? 1 : -1) * 0.2;
    });
  }
}

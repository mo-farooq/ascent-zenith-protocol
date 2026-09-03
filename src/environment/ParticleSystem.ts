import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;
  private pointsMesh!: THREE.Points;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;

  constructor(scene: THREE.Scene) {
    this.initMesh(scene);
  }

  private initMesh(scene: THREE.Scene): void {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 4.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointsMesh = new THREE.Points(geo, mat);
    scene.add(this.pointsMesh);
  }

  public emitLandingPuff(pos: THREE.Vector3, count = 16, intensity = 1): void {
    const ringRadius = 0.5 * intensity;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = (1.5 + Math.random() * 3.0) * intensity;

      this.particles.push({
        position: new THREE.Vector3(
          pos.x + Math.cos(angle) * ringRadius,
          pos.y + 0.05,
          pos.z + Math.sin(angle) * ringRadius
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.8 + Math.random() * 1.5,
          Math.sin(angle) * speed
        ),
        color: new THREE.Color(0x88bbdd),
        size: 3.5 * intensity,
        alpha: 0.8,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.3
      });
    }
  }

  public emitLaunchPadBurst(pos: THREE.Vector3): void {
    for (let i = 0; i < 28; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;

      this.particles.push({
        position: new THREE.Vector3(pos.x, pos.y + 0.2, pos.z),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          6.0 + Math.random() * 12.0,
          Math.sin(angle) * speed
        ),
        color: new THREE.Color(0x00f0ff),
        size: 5.0,
        alpha: 1.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4
      });
    }
  }

  public emitSparks(pos: THREE.Vector3, count = 18): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;

      this.particles.push({
        position: new THREE.Vector3(pos.x, pos.y + 0.5, pos.z),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          1.0 + Math.random() * 3.5,
          Math.sin(angle) * speed
        ),
        color: new THREE.Color(Math.random() > 0.4 ? 0x00f0ff : 0xffb703),
        size: 4.0,
        alpha: 1.0,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25
      });
    }
  }

  public emitSummitFireworks(pos: THREE.Vector3): void {
    const hues = [0xffb703, 0x00f0ff, 0xff3366, 0x00ff88, 0xffffff];
    for (let i = 0; i < 120; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const phi = Math.acos(Math.random() * 2 - 1);
      const theta = Math.random() * Math.PI * 2;
      const speed = 8.0 + Math.random() * 18.0;
      const chosenColor = hues[Math.floor(Math.random() * hues.length)];

      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6)),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed + 5,
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        color: new THREE.Color(chosenColor),
        size: 6.0,
        alpha: 1.0,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8
      });
    }
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 9.8 * delta; // gravity
      p.velocity.multiplyScalar(Math.pow(0.85, delta * 60)); // drag

      // Fade size & alpha
      const progress = p.life / p.maxLife;
      p.alpha = 1 - progress;
    }

    // Update GPU buffers
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      this.colors[i * 3] = p.color.r * p.alpha;
      this.colors[i * 3 + 1] = p.color.g * p.alpha;
      this.colors[i * 3 + 2] = p.color.b * p.alpha;

      this.sizes[i] = p.size * (1 - p.life / p.maxLife * 0.5);
    }

    // Zero out unused
    for (let i = count; i < this.maxParticles; i++) {
      this.positions[i * 3 + 1] = -9999;
      this.sizes[i] = 0;
    }

    this.pointsMesh.geometry.attributes.position.needsUpdate = true;
    this.pointsMesh.geometry.attributes.color.needsUpdate = true;
    this.pointsMesh.geometry.attributes.size.needsUpdate = true;
  }
}

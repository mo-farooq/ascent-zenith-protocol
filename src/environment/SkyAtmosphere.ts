import * as THREE from 'three';

export class SkyAtmosphere {
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  private skyMesh!: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;
  private clouds: THREE.Group = new THREE.Group();
  private stars!: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Hemisphere Light (ambient color gradient)
    this.hemiLight = new THREE.HemisphereLight(0x70a0d0, 0x222230, 0.7);
    this.scene.add(this.hemiLight);

    // 2. Main Directional Sunlight with Shadows
    this.dirLight = new THREE.DirectionalLight(0xfff4e0, 1.3);
    this.dirLight.position.set(120, 250, 100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 600;
    this.dirLight.shadow.camera.left = -60;
    this.dirLight.shadow.camera.right = 60;
    this.dirLight.shadow.camera.top = 60;
    this.dirLight.shadow.camera.bottom = -60;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 3. Sky Dome Shader
    this.createSkyDome();

    // 4. Stars Field
    this.createStarField();

    // 5. Drifting Low-Poly Clouds
    this.createCloudLayers();

    // 6. Scene Fog
    this.scene.fog = new THREE.FogExp2(0x182030, 0.0018);
  }

  private createSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(1200, 32, 24);

    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition + offset).y;
        vec3 col = mix(bottomColor, horizonColor, max(pow(max(1.0 - abs(h), 0.0), 3.0), 0.0));
        if (h > 0.0) {
          col = mix(col, topColor, pow(h, exponent));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a365d) },
        horizonColor: { value: new THREE.Color(0xe28743) },
        bottomColor: { value: new THREE.Color(0x0f172a) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyMesh);
  }

  private createStarField(): void {
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1100;

      // Keep stars predominantly in the upper hemisphere
      const y = Math.abs(r * Math.cos(phi)) + 100;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.5,
      transparent: true,
      opacity: 0.0 // starts invisible at ground, brightens at high altitude
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  private createCloudLayers(): void {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xeef2f7,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
      transparent: true,
      opacity: 0.85
    });

    const altitudes = [80, 220, 480, 720];

    altitudes.forEach((alt) => {
      const clusterCount = 8;
      for (let i = 0; i < clusterCount; i++) {
        const cloudGroup = new THREE.Group();
        const puffCount = 5 + Math.floor(Math.random() * 4);

        for (let p = 0; p < puffCount; p++) {
          const puffGeo = new THREE.DodecahedronGeometry(15 + Math.random() * 20, 1);
          const puffMesh = new THREE.Mesh(puffGeo, cloudMat);
          puffMesh.position.set(
            (p - puffCount / 2) * 20 + (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 25
          );
          puffMesh.scale.set(1.4, 0.6, 1.0);
          puffMesh.castShadow = false;
          puffMesh.receiveShadow = false;
          cloudGroup.add(puffMesh);
        }

        const angle = (i / clusterCount) * Math.PI * 2 + Math.random();
        const dist = 140 + Math.random() * 220;
        cloudGroup.position.set(
          Math.cos(angle) * dist,
          alt + (Math.random() - 0.5) * 40,
          Math.sin(angle) * dist
        );

        this.clouds.add(cloudGroup);
      }
    });

    this.scene.add(this.clouds);
  }

  public update(delta: number, playerAltitude: number, playerPos: THREE.Vector3): void {
    // Keep sky dome centered on player
    this.skyMesh.position.copy(playerPos);
    this.stars.position.copy(playerPos);

    // Follow player with shadow camera
    this.dirLight.position.set(playerPos.x + 80, playerPos.y + 140, playerPos.z + 60);
    this.dirLight.target.position.copy(playerPos);
    this.dirLight.target.updateMatrixWorld();

    // Slowly drift clouds
    this.clouds.children.forEach((cloud, idx) => {
      cloud.position.x += delta * (1.5 + (idx % 3) * 0.8);
      if (cloud.position.x > 400) {
        cloud.position.x = -400;
      }
    });

    // Altitude color transition (0m to 1000m)
    const normAlt = Math.max(0, Math.min(1, playerAltitude / 1000));

    // Uniform colors interpolation
    const u = this.skyMaterial.uniforms;

    if (normAlt < 0.25) {
      // Zone 1: Morning Earthy Horizon
      const t = normAlt / 0.25;
      u.topColor.value.setHex(0x1a365d).lerp(new THREE.Color(0x0a2540), t);
      u.horizonColor.value.setHex(0xe28743).lerp(new THREE.Color(0x38bdf8), t);
      u.bottomColor.value.setHex(0x0f172a);
      (this.stars.material as THREE.PointsMaterial).opacity = 0.05;
      (this.scene.fog as THREE.FogExp2).color.setHex(0x182030).lerp(new THREE.Color(0x0e1726), t);
    } else if (normAlt < 0.6) {
      // Zone 2-3: Bright High Azure into Cobalt
      const t = (normAlt - 0.25) / 0.35;
      u.topColor.value.setHex(0x0a2540).lerp(new THREE.Color(0x060f24), t);
      u.horizonColor.value.setHex(0x38bdf8).lerp(new THREE.Color(0x6366f1), t);
      (this.stars.material as THREE.PointsMaterial).opacity = 0.1 + t * 0.4;
      (this.scene.fog as THREE.FogExp2).color.setHex(0x0e1726).lerp(new THREE.Color(0x080d1a), t);
    } else if (normAlt < 0.85) {
      // Zone 4-5: Violet Inversion Layer & Emerging Stratosphere
      const t = (normAlt - 0.6) / 0.25;
      u.topColor.value.setHex(0x060f24).lerp(new THREE.Color(0x030612), t);
      u.horizonColor.value.setHex(0x6366f1).lerp(new THREE.Color(0xec4899), t);
      (this.stars.material as THREE.PointsMaterial).opacity = 0.5 + t * 0.4;
      (this.scene.fog as THREE.FogExp2).color.setHex(0x080d1a).lerp(new THREE.Color(0x04060f), t);
    } else {
      // Zone 6: Celestial Zenith (Golden aurora aura & deep void)
      const t = (normAlt - 0.85) / 0.15;
      u.topColor.value.setHex(0x030612).lerp(new THREE.Color(0x050410), t);
      u.horizonColor.value.setHex(0xec4899).lerp(new THREE.Color(0xffb703), t);
      (this.stars.material as THREE.PointsMaterial).opacity = 0.9;
      (this.scene.fog as THREE.FogExp2).color.setHex(0x04060f).lerp(new THREE.Color(0x08051a), t);
    }
  }
}

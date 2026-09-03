import * as THREE from 'three';

export class TextureFactory {
  private static cache = new Map<string, THREE.CanvasTexture>();

  /**
   * High-Tech Ceramic Sci-Fi Panels (Matte white / slate with crisp technical chamfer seams)
   */
  public static getCeramicPanels(baseHex = '#e2e8f0', seamHex = '#334155'): THREE.CanvasTexture {
    const key = `ceramic_${baseHex}_${seamHex}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base ceramic surface
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    // Subtle micro-surface texture
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Technical panel division grid
    ctx.strokeStyle = seamHex;
    ctx.lineWidth = 2.5;

    // Outer border chamfers
    ctx.strokeRect(4, 4, size - 8, size - 8);
    ctx.strokeRect(size / 2, 4, size / 2 - 4, size / 2 - 4);
    ctx.strokeRect(4, size / 2, size / 2 - 4, size / 2 - 4);

    // Tech bolts on corners
    ctx.fillStyle = seamHex;
    const boltPoints = [
      [16, 16], [size - 16, 16], [16, size - 16], [size - 16, size - 16],
      [size / 2 - 12, size / 2 - 12], [size / 2 + 12, size / 2 + 12]
    ];
    boltPoints.forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * High-Tech Carbon Fiber Weave (Dark diagonal composite pattern)
   */
  public static getCarbonFiber(): THREE.CanvasTexture {
    const key = 'carbon_fiber';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    const step = 8;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const isAlternate = ((x / step) + (y / step)) % 2 === 0;
        ctx.fillStyle = isAlternate ? '#1e293b' : '#090d16';
        ctx.fillRect(x, y, step, step);

        // Carbon thread highlight line
        ctx.strokeStyle = isAlternate ? '#334155' : '#020617';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step, y + step);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Photovoltaic Solar Cell Grid (Deep navy solar panel with silver grid lines)
   */
  public static getSolarCells(): THREE.CanvasTexture {
    const key = 'solar_cells';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep space navy blue
    ctx.fillStyle = '#02183a';
    ctx.fillRect(0, 0, size, size);

    // Silicon wafer subtle gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(14, 116, 144, 0.2)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Silver busbars (thick primary conductors)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(size * 0.33, 0);
    ctx.lineTo(size * 0.33, size);
    ctx.moveTo(size * 0.67, 0);
    ctx.lineTo(size * 0.67, size);
    ctx.stroke();

    // Fine grid fingers
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 0.8;
    for (let y = 8; y < size; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Industrial Diamond Plate Walkway Texture
   */
  public static getDiamondPlate(): THREE.CanvasTexture {
    const key = 'diamond_plate';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, size, size);

    const step = 32;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const cx = x + ((y / step) % 2 === 0 ? 0 : step / 2);
        const cy = y;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);

        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Crisp Industrial Hazard Warning Stripes
   */
  public static getHazardStripes(): THREE.CanvasTexture {
    const key = 'hazard_stripes';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#0f172a';
    const stripeWidth = 24;
    for (let x = -size; x < size * 2; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth - size, size);
      ctx.lineTo(x - size, size);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * High-Tech Staging Pad Tarmac (Composite surface with runway markings)
   */
  public static getHighTechTarmac(): THREE.CanvasTexture {
    const key = 'hightech_tarmac';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Matte dark graphite composite
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Subtle carbon aggregate
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5 ? '#1e293b' : '#020617';
      ctx.fillRect(x, y, 2, 2);
    }

    // Crisp cyan telemetry landing ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Corner alignment chevrons
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    const pad = 36;
    const arm = 40;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(pad, pad + arm);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + arm, pad);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(size - pad - arm, pad);
    ctx.lineTo(size - pad, pad);
    ctx.lineTo(size - pad, pad + arm);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(pad, size - pad - arm);
    ctx.lineTo(pad, size - pad);
    ctx.lineTo(pad + arm, size - pad);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(size - pad - arm, size - pad);
    ctx.lineTo(size - pad, size - pad);
    ctx.lineTo(size - pad, size - pad - arm);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Celestial Glowing Circuit Runes (For high monoliths and 1000m zenith)
   */
  public static getCelestialRunes(): THREE.CanvasTexture {
    const key = 'celestial_runes';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, size, size);

    // Glowing cyan sacred geometry
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 80, 0, Math.PI * 2);
    ctx.arc(size / 2, size / 2, 160, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    ctx.fillStyle = '#ffb703';
    const nodes = [
      [size / 2 - 80, size / 2], [size / 2 + 80, size / 2],
      [size / 2, size / 2 - 80], [size / 2, size / 2 + 80]
    ];
    nodes.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this.cache.set(key, tex);
    return tex;
  }
}

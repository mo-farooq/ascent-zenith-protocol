// Headless environment setup for Node.js test execution

export function initHeadlessEnv(): void {
  if (typeof globalThis.document !== 'undefined') return;

  function createMockCanvas() {
    return {
      width: 512,
      height: 512,
      style: {},
      getContext: () => ({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: () => {},
        strokeRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        roundRect: () => {},
        bezierCurveTo: () => {},
        quadraticCurveTo: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        drawImage: () => {},
        measureText: () => ({ width: 10 }),
        fillText: () => {},
        strokeText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {}
      }),
      toDataURL: () => '',
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }

  // Minimal DOM polyfill
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return createMockCanvas();
      return {
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    },
    getElementById: () => null,
    body: {
      appendChild: () => {},
      removeChild: () => {}
    }
  };

  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 16),
    cancelAnimationFrame: (id: number) => clearTimeout(id)
  };
}

initHeadlessEnv();

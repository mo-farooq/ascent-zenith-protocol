export interface InputState {
  forward: number;  // -1 to 1
  right: number;    // -1 to 1
  jump: boolean;    // is jump held
  jumpPressed: boolean; // was jump pressed this frame
  sprint: boolean;
  mouseDeltaX: number;
  mouseDeltaY: number;
  mouseWheelDelta: number;
  pausePressed: boolean;
  respawnPressed: boolean;
  dashPressed: boolean;
}

export class Input {
  private keys = new Map<string, boolean>();
  private justPressed = new Set<string>();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private mouseWheelDelta = 0;
  private isLocked = false;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private canvas: HTMLCanvasElement | null = null;
  private enabled = true;

  constructor() {
    this.setupListeners();
  }

  public attachToCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    
    // Clicking canvas requests pointer lock
    canvas.addEventListener('click', () => {
      if (this.enabled && !this.isLocked) {
        this.requestLock();
      }
    });

    // Prevent context menu so right-click is dedicated to Thruster Dash
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (e.button === 2) {
        this.justPressed.add('MouseButtonRight');
      }

      if (this.enabled && !this.isLocked) {
        this.requestLock();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.justPressed.clear();
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
      this.mouseWheelDelta = 0;
      this.isMouseDown = false;
    }
  }

  public requestLock(): void {
    if (this.canvas && document.pointerLockElement !== this.canvas) {
      try {
        const promise = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {
            // Pointer lock failed or rejected, drag fallback works automatically
          });
        }
      } catch (e) {
        // Fallback to drag mode
      }
    }
  }

  public exitLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public isPointerLocked(): boolean {
    return this.isLocked;
  }

  public getState(): InputState {
    if (!this.enabled) {
      return {
        forward: 0,
        right: 0,
        jump: false,
        jumpPressed: false,
        sprint: false,
        mouseDeltaX: 0,
        mouseDeltaY: 0,
        mouseWheelDelta: 0,
        pausePressed: false,
        respawnPressed: false,
        dashPressed: false
      };
    }

    let f = 0;
    let r = 0;

    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) f += 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) f -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) r += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) r -= 1;

    // Normalize diagonal keyboard input so player doesn't move faster diagonally
    if (f !== 0 && r !== 0) {
      const invSqrt2 = 0.70710678;
      f *= invSqrt2;
      r *= invSqrt2;
    }

    // Check gamepad if available
    const gp = this.getGamepad();
    if (gp) {
      const deadzone = 0.15;
      const gpX = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
      const gpY = Math.abs(gp.axes[1]) > deadzone ? -gp.axes[1] : 0;
      if (Math.hypot(gpX, gpY) > 0.05) {
        r = gpX;
        f = gpY;
      }
    }

    const jumpHeld = this.isKeyDown('Space') || (gp ? gp.buttons[0]?.pressed : false);
    const jumpPressed = this.consumeJustPressed('Space') || (gp ? gp.buttons[0]?.pressed : false);
    const sprint = this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight') || (gp ? gp.buttons[10]?.pressed : false);
    const pausePressed = this.consumeJustPressed('Escape') || (gp ? gp.buttons[9]?.pressed : false);
    const respawnPressed = this.consumeJustPressed('KeyR') || (gp ? gp.buttons[8]?.pressed : false);
    const dashPressed = this.consumeJustPressed('KeyE') || this.consumeJustPressed('KeyQ') || this.consumeJustPressed('MouseButtonRight') || (gp ? gp.buttons[2]?.pressed : false);

    const deltaX = this.mouseDeltaX;
    const deltaY = this.mouseDeltaY;
    const wheelDelta = this.mouseWheelDelta;

    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseWheelDelta = 0;

    return {
      forward: f,
      right: r,
      jump: jumpHeld,
      jumpPressed,
      sprint,
      mouseDeltaX: deltaX,
      mouseDeltaY: deltaY,
      mouseWheelDelta: wheelDelta,
      pausePressed,
      respawnPressed,
      dashPressed
    };
  }

  public isKeyDown(code: string): boolean {
    return this.keys.get(code) === true;
  }

  public wasJustPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  private consumeJustPressed(code: string): boolean {
    const has = this.justPressed.has(code);
    if (has) {
      this.justPressed.delete(code);
    }
    return has;
  }

  public endFrame(): void {
    this.justPressed.clear();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default scrolling for space and arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.get(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;

      if (this.isLocked) {
        this.mouseDeltaX += e.movementX || 0;
        this.mouseDeltaY += e.movementY || 0;
      } else if (this.isMouseDown) {
        // Drag fallback when pointer lock is not active
        const dx = e.movementX !== undefined && e.movementX !== 0 ? e.movementX : (e.clientX - this.lastMouseX);
        const dy = e.movementY !== undefined && e.movementY !== 0 ? e.movementY : (e.clientY - this.lastMouseY);
        this.mouseDeltaX += dx;
        this.mouseDeltaY += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse wheel zoom
    window.addEventListener('wheel', (e) => {
      if (this.enabled) {
        this.mouseWheelDelta += Math.sign(e.deltaY);
      }
    }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('pointerlockerror', () => {
      this.isLocked = false;
    });
  }

  private getGamepad(): Gamepad | null {
    if (!navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i]!.connected) {
        return gamepads[i];
      }
    }
    return null;
  }
}

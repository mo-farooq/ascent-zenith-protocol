import * as THREE from 'three';
import { PhysicsWorld, GroundCheckResult } from '../physics/PhysicsWorld';
import { CollisionVolume, VolumeType } from '../physics/CollisionVolume';
import { CharacterModel, CharacterAnimState } from './CharacterModel';
import { InputState } from '../core/Input';
import { AudioManager } from '../core/Audio';

export interface PlayerStats {
  altitude: number;
  peakAltitude: number;
  horizontalSpeed: number;
  isGrounded: boolean;
  isFalling: boolean;
  fallDistance: number;
}

export class Player {
  public position = new THREE.Vector3(0, 1.0, 0); // feet position
  public velocity = new THREE.Vector3(0, 0, 0);
  public model: CharacterModel;

  // Controller parameters
  public readonly radius = 0.35;
  public readonly height = 1.7;

  private walkSpeed = 6.0;
  private sprintSpeed = 9.2;
  private groundAccel = 45.0;
  private groundDecel = 24.0;
  private airAccel = 15.0;
  private airDrag = 1.2;
  private jumpVelocity = 11.2;
  private gravity = 28.0;
  private fallGravityMultiplier = 1.35;

  // State
  private isGrounded = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private groundNormal = new THREE.Vector3(0, 1, 0);
  private currentPlatform: CollisionVolume | null = null;
  private lastPlatformPos = new THREE.Vector3();

  // Falling & Respawn
  private isFalling = false;
  private fallStartTime = 0;
  private fallStartAltitude = 0;
  private fallDistanceReported = 0;
  private onFallCallback?: (fallDistance: number) => void;
  private onRespawnCallback?: () => void;

  // Checkpoints
  private respawnPosition = new THREE.Vector3(0, 0.2, 0);
  private respawnYaw = 0;

  // Stats tracking
  private peakAltitude = 0;
  private stepTimer = 0;

  // Facing orientation
  public facingYaw = 0;

  constructor(private physics: PhysicsWorld, private audio: AudioManager) {
    this.position.set(0, 0.2, 0);
    this.model = new CharacterModel();
    this.model.group.position.copy(this.position);
  }

  public setCallbacks(
    onFall: (fallDistance: number) => void,
    onRespawn: () => void
  ): void {
    this.onFallCallback = onFall;
    this.onRespawnCallback = onRespawn;
  }

  public setCheckpoint(pos: THREE.Vector3, yaw = 0): void {
    this.respawnPosition.copy(pos);
    this.respawnPosition.y = pos.y + 0.15; // clean offset resting feet directly on platform surface
    this.respawnYaw = yaw;
  }

  public respawn(): void {
    this.position.copy(this.respawnPosition);
    this.velocity.set(0, 0, 0);
    this.facingYaw = this.respawnYaw;
    this.isFalling = false;
    this.isGrounded = true;
    this.currentPlatform = null;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.facingYaw;
    this.onRespawnCallback?.();
  }

  public update(delta: number, input: InputState, cameraYaw: number): PlayerStats {
    // Clamp excessive frame deltas (e.g. tab switches)
    const dt = Math.min(0.05, delta);

    if (this.isFalling) {
      this.updateFallingState(dt);
      return this.getStats();
    }

    // Manual quick-respawn key
    if (input.respawnPressed) {
      this.respawn();
      return this.getStats();
    }

    // Timers
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;

    if (input.jumpPressed) {
      this.jumpBufferTimer = 0.12; // 120ms buffer
    }

    // 1. Moving Platform Delta Transport
    if (this.currentPlatform && this.isGrounded) {
      if (this.currentPlatform.isMoving) {
        const platformDelta = this.currentPlatform.position.clone().sub(this.lastPlatformPos);
        // Guard against any sudden teleport jumps > 2 meters
        if (platformDelta.lengthSq() < 4.0) {
          this.position.add(platformDelta);
        }
      }
      this.lastPlatformPos.copy(this.currentPlatform.position);
    }

    // 2. Ground Detection (multi-ray sweep)
    const ground: GroundCheckResult = this.physics.checkGround(this.position, this.radius, 0.35);
    const wasGrounded = this.isGrounded;
    this.isGrounded = ground.isGrounded;
    this.groundNormal.copy(ground.normal);

    // Launch Pad Trigger
    if (this.isGrounded && ground.isLaunchPad) {
      this.velocity.y = ground.launchImpulse;
      // Add forward momentum boost in facing direction for cinematic arc
      const forwardDir = new THREE.Vector3(-Math.sin(this.facingYaw), 0, -Math.cos(this.facingYaw));
      this.velocity.x = forwardDir.x * 8.0;
      this.velocity.z = forwardDir.z * 8.0;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.audio.playLaunchPad();
      this.audio.playLanding(5);
      this.model.triggerLandSquash(0.8);
    }

    if (this.isGrounded) {
      this.coyoteTimer = 0.11; // 110ms coyote window
      if (ground.volume !== this.currentPlatform) {
        this.currentPlatform = ground.volume;
        if (this.currentPlatform) {
          this.lastPlatformPos.copy(this.currentPlatform.position);
        }
      }

      // Snap to ground surface if not jumping
      if (this.velocity.y <= 0.1) {
        this.position.y = ground.groundY;
        this.velocity.y = 0;
      }

      // Hard landing sound & squash
      if (!wasGrounded) {
        const fallDist = Math.max(0, this.fallStartAltitude - this.position.y);
        this.audio.playLanding(fallDist);
        this.model.triggerLandSquash(Math.min(1.0, fallDist / 8));
      }
      this.fallStartAltitude = this.position.y;
    } else {
      if (wasGrounded) {
        this.fallStartAltitude = this.position.y;
      }
      this.currentPlatform = null;
    }

    // 3. Jump Processing
    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
      this.executeJump();
    }

    // Variable jump height truncation: releasing Space cuts vertical velocity
    if (!input.jump && this.velocity.y > 2.0) {
      this.velocity.y *= 0.55;
    }

    // 4. Horizontal Movement Input
    const moveDir = new THREE.Vector3();
    if (input.forward !== 0 || input.right !== 0) {
      // Calculate movement direction relative to camera yaw
      const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
      const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
      moveDir.addScaledVector(forward, input.forward);
      moveDir.addScaledVector(right, input.right);
      moveDir.normalize();

      // Smoothly rotate character to face movement direction
      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      this.facingYaw = this.lerpAngle(this.facingYaw, targetYaw, dt * 16);
    }

    const targetSpeed = input.sprint ? this.sprintSpeed : this.walkSpeed;
    const targetVelX = moveDir.x * targetSpeed;
    const targetVelZ = moveDir.z * targetSpeed;

    // 5. Accelerate & Damp Velocity
    if (this.isGrounded) {
      // Check slope sliding (> 45 degrees)
      if (ground.surfaceAngle > 46) {
        // Slide downhill along gravity projected on slope
        const downhill = new THREE.Vector3(0, -1, 0).projectOnPlane(ground.normal).normalize();
        this.velocity.x += downhill.x * this.gravity * 0.8 * dt;
        this.velocity.z += downhill.z * this.gravity * 0.8 * dt;
      } else {
        // Normal ground walking acceleration / friction
        const accel = (moveDir.lengthSq() > 0.01) ? this.groundAccel : this.groundDecel;
        this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, accel, dt);
        this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, accel, dt);

        // Footstep sounds
        const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (horizSpeed > 1.2) {
          this.stepTimer += dt * (input.sprint ? 13 : 9);
          if (this.stepTimer >= Math.PI) {
            this.stepTimer -= Math.PI;
            this.audio.playFootstep(input.sprint);
          }
        }
      }
    } else {
      // Air acceleration (skill-based air control)
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, this.airAccel, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, this.airAccel, dt);
      this.velocity.x *= Math.pow(1 - this.airDrag * 0.05, dt * 60);
      this.velocity.z *= Math.pow(1 - this.airDrag * 0.05, dt * 60);

      // Apply Gravity
      const currentGrav = this.velocity.y < 0 ? (this.gravity * this.fallGravityMultiplier) : this.gravity;
      this.velocity.y -= currentGrav * dt;
    }

    // 6. Integrate Position & Swept Collision Resolution
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // Resolve capsule penetration with environment geometry
    this.physics.resolveCapsuleCollisions(this.position, this.velocity, this.radius, this.height);

    // 7. Fall Out-of-Bounds Detection
    // If player falls below -8m (below ground tarmac) or drops drastically without landing
    if (this.position.y < -8.0 || (!this.isGrounded && this.position.y < this.respawnPosition.y - 35 && this.velocity.y < -15)) {
      this.triggerFall();
    }

    // Update peak altitude
    if (this.position.y > this.peakAltitude) {
      this.peakAltitude = this.position.y;
    }

    // 8. Update Character Visuals & Animation
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.facingYaw;

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    let animState = CharacterAnimState.IDLE;
    if (!this.isGrounded) {
      animState = this.velocity.y > 0 ? CharacterAnimState.JUMP : CharacterAnimState.FALL;
    } else if (horizSpeed > 0.5) {
      animState = input.sprint ? CharacterAnimState.SPRINT : CharacterAnimState.WALK;
    }

    this.model.update(dt, animState, horizSpeed, this.isGrounded, this.velocity.y);

    // Update audio engine with current altitude and vertical velocity
    this.audio.updateAltitude(this.position.y, this.velocity.y);

    return this.getStats();
  }

  private executeJump(): void {
    this.velocity.y = this.jumpVelocity;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    // If standing on moving platform, transfer its horizontal momentum
    if (this.currentPlatform && this.currentPlatform.isMoving) {
      this.velocity.x += this.currentPlatform.linearVelocity.x * 0.7;
      this.velocity.z += this.currentPlatform.linearVelocity.z * 0.7;
    }

    this.audio.playJump();
  }

  private triggerFall(): void {
    if (this.isFalling) return;
    this.isFalling = true;
    this.fallStartTime = performance.now();
    this.fallDistanceReported = Math.max(0, this.peakAltitude - this.position.y);
    this.audio.playFallScream();
    this.onFallCallback?.(this.fallDistanceReported);
  }

  private updateFallingState(dt: number): void {
    // Continue falling briefly for dramatic vertigo camera tracking
    this.velocity.y -= this.gravity * 1.5 * dt;
    this.position.y += this.velocity.y * dt;
    this.model.group.position.copy(this.position);
    this.model.update(dt, CharacterAnimState.FALL, 0, false, this.velocity.y);
    this.audio.updateAltitude(this.position.y, this.velocity.y);

    // Respawn after 1.4 seconds of dramatic plunge
    if (performance.now() - this.fallStartTime > 1400) {
      this.respawn();
    }
  }

  private lerpAngle(from: number, to: number, t: number): number {
    const diff = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    return from + diff * Math.min(1, Math.max(0, t));
  }

  public getStats(): PlayerStats {
    return {
      altitude: Math.max(0, Math.round(this.position.y * 10) / 10),
      peakAltitude: Math.max(0, Math.round(this.peakAltitude * 10) / 10),
      horizontalSpeed: Math.hypot(this.velocity.x, this.velocity.z),
      isGrounded: this.isGrounded,
      isFalling: this.isFalling,
      fallDistance: Math.round(this.fallDistanceReported * 10) / 10
    };
  }
}

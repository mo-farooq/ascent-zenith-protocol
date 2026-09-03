import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  
  // Current interpolated values
  public yaw = 0;
  public pitch = 0.2; // slight downward look angle initially

  // Target values for smooth interpolation
  public targetYaw = 0;
  public targetPitch = 0.2;

  // Camera settings
  public sensitivity = 1.2;
  public invertY = false;
  public baseFov = 75;
  public targetDistance = 5.2;
  private currentDistance = 5.2;

  // Smoothing targets
  private targetLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private idealCameraPos = new THREE.Vector3();

  // Screen shake / trauma
  private trauma = 0;
  private shakeTimer = 0;

  constructor(private physics: PhysicsWorld, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 2000);
    this.camera.position.set(0, 2, 5);
  }

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public handleMouseMove(deltaX: number, deltaY: number): void {
    const factor = 0.0022 * this.sensitivity;
    
    // Horizontal rotation: moving mouse right rotates view right
    this.targetYaw -= deltaX * factor;

    // Vertical pitch:
    // Moving mouse UP (deltaY < 0) tilts view UP (pitch decreases, camera drops lower to look up)
    // Moving mouse DOWN (deltaY > 0) tilts view DOWN (pitch increases, camera raises higher to look down)
    const ySign = this.invertY ? -1 : 1;
    this.targetPitch += deltaY * factor * ySign;

    // Clamp pitch between -1.25 rad (-72 deg, looking high up) and +1.25 rad (+72 deg, looking steep down)
    this.targetPitch = Math.max(-1.25, Math.min(1.25, this.targetPitch));
  }

  public handleWheel(wheelDelta: number): void {
    // Zoom in / out with mouse wheel
    this.targetDistance += wheelDelta * 0.8;
    this.targetDistance = Math.max(2.5, Math.min(12.0, this.targetDistance));
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerVelocity: THREE.Vector3,
    isFalling: boolean
  ): void {
    const dt = Math.min(0.05, delta);

    // Smoothly damp yaw and pitch towards targets for silky camera navigation
    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 32, dt);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 32, dt);

    // Dynamic focus point (center of climber chest/head)
    this.targetLookAt.set(playerPos.x, playerPos.y + 1.35, playerPos.z);

    // Smooth camera target tracking
    this.currentLookAt.lerp(this.targetLookAt, Math.min(1, dt * 20));

    // Fall camera dramatic behavior
    let effectivePitch = this.pitch;
    let effectiveDist = this.targetDistance;

    if (isFalling) {
      // Tilt camera upward-angle so player plunges downward into the framed abyss
      effectivePitch = Math.min(0.9, this.pitch + 0.4);
      effectiveDist = this.targetDistance + 1.8;
    }

    // Dynamic FOV based on vertical speed (vertigo rush)
    const vertSpeed = Math.abs(playerVelocity.y);
    const fovBoost = Math.min(15, (vertSpeed / 30) * 15);
    const targetFov = this.baseFov + fovBoost;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 10);
    this.camera.updateProjectionMatrix();

    // Compute spherical camera offset from target
    const cosPitch = Math.cos(effectivePitch);
    const sinPitch = Math.sin(effectivePitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const dirX = sinYaw * cosPitch;
    const dirY = sinPitch;
    const dirZ = cosYaw * cosPitch;

    const camDir = new THREE.Vector3(dirX, dirY, dirZ).normalize();

    // Collision raycast against geometry to avoid clipping through platforms
    const maxRayDist = effectiveDist;
    const hitDist = this.physics.raycastCamera(this.currentLookAt, camDir, maxRayDist);

    // Asymmetric distance lerping: instant snap-in when occluded by geometry, smooth lerp when pulling back out
    const safeDist = (hitDist < maxRayDist) ? Math.max(0.4, hitDist - 0.25) : maxRayDist;
    if (safeDist < this.currentDistance) {
      // Instant snap-in when occluded by geometry to prevent wall ingress
      this.currentDistance = safeDist;
      this.idealCameraPos.copy(this.currentLookAt).addScaledVector(camDir, this.currentDistance);
      this.camera.position.copy(this.idealCameraPos);
    } else {
      // Smooth lerp when pulling back out into open space
      this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, safeDist, Math.min(1, dt * 10));
      this.idealCameraPos.copy(this.currentLookAt).addScaledVector(camDir, this.currentDistance);
      this.camera.position.lerp(this.idealCameraPos, Math.min(1, dt * 28));
    }

    // Apply trauma screen shake
    if (this.trauma > 0.001) {
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
      this.shakeTimer += dt;
      const shake = this.trauma * this.trauma;
      const shakeX = (Math.sin(this.shakeTimer * 50) * 0.25 + (Math.random() - 0.5) * 0.1) * shake;
      const shakeY = (Math.cos(this.shakeTimer * 42) * 0.25 + (Math.random() - 0.5) * 0.1) * shake;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
    }

    this.camera.lookAt(this.currentLookAt);
  }

  public snapToTarget(targetPos: THREE.Vector3): void {
    // Focus lookAt on climber center (1.35m above feet)
    const lookTarget = new THREE.Vector3(targetPos.x, targetPos.y + 1.35, targetPos.z);
    this.currentLookAt.copy(lookTarget);
    this.targetLookAt.copy(lookTarget);
    this.pitch = this.targetPitch;
    this.yaw = this.targetYaw;

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const camDir = new THREE.Vector3(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch).normalize();

    // Call occlusion raycasting in snapToTarget()
    const maxRayDist = this.targetDistance;
    const hitDist = this.physics.raycastCamera(this.currentLookAt, camDir, maxRayDist);
    const safeDist = (hitDist < maxRayDist) ? Math.max(0.4, hitDist - 0.25) : maxRayDist;
    this.currentDistance = safeDist;

    this.idealCameraPos.copy(this.currentLookAt).addScaledVector(camDir, this.currentDistance);
    this.camera.position.copy(this.idealCameraPos);
    this.camera.lookAt(this.currentLookAt);
  }

  public setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}


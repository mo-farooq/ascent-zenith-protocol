import * as THREE from 'three';
import { CollisionVolume, CollisionResult, VolumeType } from './CollisionVolume';

export interface GroundCheckResult {
  isGrounded: boolean;
  groundY: number;
  normal: THREE.Vector3;
  volume: CollisionVolume | null;
  surfaceAngle: number; // degrees from horizontal
  isLaunchPad: boolean;
  launchImpulse: number;
  targetPosition?: THREE.Vector3;
  launchVelocity?: THREE.Vector3;
  launchDuration?: number;
}

export class PhysicsWorld {
  private volumes: CollisionVolume[] = [];
  private tempBox = new THREE.Box3();
  private tempVec = new THREE.Vector3();

  constructor() {}

  public addVolume(volume: CollisionVolume): void {
    this.volumes.push(volume);
  }

  public removeVolume(volume: CollisionVolume): void {
    const idx = this.volumes.indexOf(volume);
    if (idx !== -1) {
      this.volumes.splice(idx, 1);
    }
  }

  public getVolumes(): CollisionVolume[] {
    return this.volumes;
  }

  public update(delta: number): void {
    // Update dynamic volumes (crumbling tiles, etc.)
    for (const vol of this.volumes) {
      if (vol.isCrumbling && vol.crumbleTimer > 0) {
        vol.crumbleTimer -= delta;
        if (vol.mesh) {
          // Visual vibration jitter when crumbling
          const jitter = (Math.random() - 0.5) * 0.08;
          vol.mesh.position.x = vol.position.x + jitter;
          vol.mesh.position.z = vol.position.z + jitter;
        }

        if (vol.crumbleTimer <= 0) {
          vol.isCumbled = true;
          if (vol.mesh) {
            vol.mesh.visible = false;
          }
        }
      }
    }
  }

  /**
   * Comprehensive downward ground check with 5 rays (center + 4 corners)
   */
  public checkGround(
    feetPosition: THREE.Vector3,
    radius = 0.35,
    checkDist = 0.35,
    verticalVelocity = 0,
    dt = 0.016
  ): GroundCheckResult {
    const downwardSpeed = verticalVelocity < 0 ? -verticalVelocity : 0;
    const effectiveCheckDist = Math.max(checkDist, downwardSpeed * dt * 2.5 + 0.55);

    const offsets = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(radius * 0.65, 0, 0),
      new THREE.Vector3(-radius * 0.65, 0, 0),
      new THREE.Vector3(0, 0, radius * 0.65),
      new THREE.Vector3(0, 0, -radius * 0.65),
    ];

    let highestHitY = -Infinity;
    let bestNormal = new THREE.Vector3(0, 1, 0);
    let bestVolume: CollisionVolume | null = null;
    let hitFound = false;

    // Search query box expanded by dynamic check distance
    const queryBox = new THREE.Box3(
      new THREE.Vector3(feetPosition.x - radius - 1, feetPosition.y - effectiveCheckDist - 1, feetPosition.z - radius - 1),
      new THREE.Vector3(feetPosition.x + radius + 1, feetPosition.y + 1, feetPosition.z + radius + 1)
    );

    const candidates = this.queryAABB(queryBox);

    for (const offset of offsets) {
      const rayOrigin = feetPosition.clone().add(offset);
      rayOrigin.y += 0.15; // start slightly inside capsule

      for (const vol of candidates) {
        if (vol.isCumbled || vol.isHazard) continue;

        const hit = vol.raycastDown(rayOrigin, effectiveCheckDist + 0.15);
        if (hit && hit.hit) {
          const hitY = rayOrigin.y - hit.dist;
          if (hitY > highestHitY) {
            highestHitY = hitY;
            bestNormal.copy(hit.normal);
            bestVolume = vol;
            hitFound = true;
          }
        }
      }
    }

    if (hitFound && highestHitY >= feetPosition.y - effectiveCheckDist) {
      // Calculate slope angle: angle between normal and (0,1,0)
      const dot = Math.max(-1, Math.min(1, bestNormal.dot(new THREE.Vector3(0, 1, 0))));
      const angleDeg = Math.acos(dot) * (180 / Math.PI);

      // Trigger crumble if volume is crumbling
      if (bestVolume && bestVolume.type === VolumeType.CRUMBLING && bestVolume.crumbleTimer === 0 && !bestVolume.isCumbled) {
        bestVolume.isCrumbling = true;
        bestVolume.crumbleTimer = 0.9; // 900ms before falling away
      }

      return {
        isGrounded: true,
        groundY: highestHitY,
        normal: bestNormal,
        volume: bestVolume,
        surfaceAngle: angleDeg,
        isLaunchPad: bestVolume?.type === VolumeType.LAUNCH_PAD,
        launchImpulse: bestVolume?.launchImpulse || 26,
        targetPosition: bestVolume?.targetPosition,
        launchVelocity: bestVolume?.launchVelocity,
        launchDuration: bestVolume?.launchDuration
      };
    }

    return {
      isGrounded: false,
      groundY: -Infinity,
      normal: new THREE.Vector3(0, 1, 0),
      volume: null,
      surfaceAngle: 0,
      isLaunchPad: false,
      launchImpulse: 0
    };
  }

  /**
   * Swept capsule horizontal collision and penetration resolution
   */
  public resolveCapsuleCollisions(
    position: THREE.Vector3, // feet position
    velocity: THREE.Vector3,
    radius = 0.35,
    height = 1.7,
    maxStepHeight = 0.3
  ): void {
    const queryBox = new THREE.Box3(
      new THREE.Vector3(position.x - radius - 0.5, position.y - 0.5, position.z - radius - 0.5),
      new THREE.Vector3(position.x + radius + 0.5, position.y + height + 0.5, position.z + radius + 0.5)
    );

    const candidates = this.queryAABB(queryBox);
    if (candidates.length === 0) return;

    // Test 3 spheres along capsule axis
    const sphereYOffsets = [
      radius + 0.05,            // bottom sphere
      height * 0.5,             // waist sphere
      height - radius - 0.05    // head sphere
    ];

    // Up to 3 solver relaxation passes
    for (let pass = 0; pass < 3; pass++) {
      for (const vol of candidates) {
        if (vol.isCumbled) continue;

        for (let sIdx = 0; sIdx < sphereYOffsets.length; sIdx++) {
          const sphereCenter = new THREE.Vector3(
            position.x,
            position.y + sphereYOffsets[sIdx],
            position.z
          );

          const res: CollisionResult = vol.testSphere(sphereCenter, radius);
          if (res.hit && res.depth > 0.001) {
            // Is this a step-up opportunity on the lower sphere?
            const contactY = res.contactPoint.y;
            const stepDiff = contactY - position.y;

            if (sIdx === 0 && stepDiff > 0.02 && stepDiff <= maxStepHeight && res.normal.y >= 0.5) {
              // Smoothly step up onto small ledge
              position.y += stepDiff * 0.5;
              continue;
            }

            // Head collision check (hitting ceiling)
            if (sIdx === 2 && res.normal.y < -0.6) {
              if (velocity.y > 0) {
                velocity.y = 0;
              }
            }

            // Horizontal pushout (project out along normal)
            const pushVec = res.normal.clone().multiplyScalar(res.depth);
            position.add(pushVec);

            // Cancel velocity into the surface
            const dot = velocity.dot(res.normal);
            if (dot < 0) {
              velocity.sub(res.normal.clone().multiplyScalar(dot));
            }
          }
        }
      }
    }
  }

  /**
   * Broadphase AABB query with altitude pre-filtering
   */
  public queryAABB(box: THREE.Box3): CollisionVolume[] {
    const hits: CollisionVolume[] = [];
    const minY = box.min.y - 4.0;
    const maxY = box.max.y + 4.0;

    for (const vol of this.volumes) {
      if (vol.isCumbled) continue;
      // Fast altitude rejection incorporating vertical halfExtents
      if (vol.position.y - vol.halfExtents.y > maxY || vol.position.y + vol.halfExtents.y < minY) continue;

      vol.getAABB(this.tempBox);
      if (box.intersectsBox(this.tempBox)) {
        hits.push(vol);
      }
    }
    return hits;
  }

  private camInvDir = new THREE.Vector3();

  /**
   * Camera raycast for wall occlusion avoidance with altitude filtering
   */
  public raycastCamera(rayOrigin: THREE.Vector3, rayDir: THREE.Vector3, maxDist: number): number {
    let closestDist = maxDist;
    this.camInvDir.set(1 / rayDir.x, 1 / rayDir.y, 1 / rayDir.z);
    const minY = rayOrigin.y - maxDist - 2.0;
    const maxY = rayOrigin.y + maxDist + 2.0;

    for (const vol of this.volumes) {
      if (vol.isCumbled || vol.isHazard) continue;
      // Fast altitude rejection incorporating vertical halfExtents
      if (vol.position.y - vol.halfExtents.y > maxY || vol.position.y + vol.halfExtents.y < minY) continue;

      vol.getAABB(this.tempBox);
      // Fast AABB intersection
      const t = this.intersectRayAABB(rayOrigin, this.camInvDir, this.tempBox);
      if (t !== null && t < closestDist && t > 0.1) {
        closestDist = t;
      }
    }

    return closestDist;
  }

  private intersectRayAABB(origin: THREE.Vector3, invDir: THREE.Vector3, aabb: THREE.Box3): number | null {
    let tmin = (aabb.min.x - origin.x) * invDir.x;
    let tmax = (aabb.max.x - origin.x) * invDir.x;

    if (tmin > tmax) { const tmp = tmin; tmin = tmax; tmax = tmp; }

    let tymin = (aabb.min.y - origin.y) * invDir.y;
    let tymax = (aabb.max.y - origin.y) * invDir.y;

    if (tymin > tymax) { const tmp = tymin; tymin = tymax; tymax = tmp; }

    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (aabb.min.z - origin.z) * invDir.z;
    let tzmax = (aabb.max.z - origin.z) * invDir.z;

    if (tzmin > tzmax) { const tmp = tzmin; tzmin = tzmax; tzmax = tmp; }

    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    return tmin >= 0 ? tmin : (tmax >= 0 ? tmax : null);
  }
}

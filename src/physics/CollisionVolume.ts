import * as THREE from 'three';

export enum VolumeType {
  BOX = 'BOX',
  OBB = 'OBB',
  CYLINDER = 'CYLINDER',
  LAUNCH_PAD = 'LAUNCH_PAD',
  CRUMBLING = 'CRUMBLING'
}

export interface CollisionResult {
  hit: boolean;
  normal: THREE.Vector3;
  depth: number;
  contactPoint: THREE.Vector3;
  volume?: CollisionVolume;
}

export class CollisionVolume {
  public type: VolumeType;
  public position = new THREE.Vector3();
  public halfExtents = new THREE.Vector3(); // half-width, half-height, half-depth
  public rotation = new THREE.Quaternion();
  public rotationEuler = new THREE.Euler();
  
  // Dynamics
  public isMoving = false;
  public linearVelocity = new THREE.Vector3();
  public angularVelocity = new THREE.Vector3();
  public launchImpulse = 26; // for LAUNCH_PAD
  public targetPosition?: THREE.Vector3;
  public launchVelocity?: THREE.Vector3;
  public launchDuration?: number;
  public isCrumbling = false;
  public crumbleTimer = 0;
  public isCumbled = false;
  public isHazard = false;

  // Visual mesh reference (optional)
  public mesh?: THREE.Object3D;

  // Cached matrix
  public matrixWorld = new THREE.Matrix4();
  public matrixWorldInverse = new THREE.Matrix4();

  constructor(type: VolumeType, halfExtents: THREE.Vector3, position = new THREE.Vector3()) {
    this.type = type;
    this.halfExtents.copy(halfExtents);
    this.position.copy(position);
    this.updateMatrices();
  }

  public setRotationFromEuler(x: number, y: number, z: number): void {
    this.rotationEuler.set(x, y, z);
    this.rotation.setFromEuler(this.rotationEuler);
    this.updateMatrices();
  }

  public updateMatrices(): void {
    this.matrixWorld.compose(this.position, this.rotation, new THREE.Vector3(1, 1, 1));
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }

  public getAABB(outBox: THREE.Box3): THREE.Box3 {
    if (this.type === VolumeType.BOX && this.rotation.x === 0 && this.rotation.y === 0 && this.rotation.z === 0) {
      outBox.min.copy(this.position).sub(this.halfExtents);
      outBox.max.copy(this.position).add(this.halfExtents);
      return outBox;
    }

    // Compute bounding box of rotated halfExtents
    const corners = [
      new THREE.Vector3(-this.halfExtents.x, -this.halfExtents.y, -this.halfExtents.z),
      new THREE.Vector3(this.halfExtents.x, -this.halfExtents.y, -this.halfExtents.z),
      new THREE.Vector3(-this.halfExtents.x, this.halfExtents.y, -this.halfExtents.z),
      new THREE.Vector3(this.halfExtents.x, this.halfExtents.y, -this.halfExtents.z),
      new THREE.Vector3(-this.halfExtents.x, -this.halfExtents.y, this.halfExtents.z),
      new THREE.Vector3(this.halfExtents.x, -this.halfExtents.y, this.halfExtents.z),
      new THREE.Vector3(-this.halfExtents.x, this.halfExtents.y, this.halfExtents.z),
      new THREE.Vector3(this.halfExtents.x, this.halfExtents.y, this.halfExtents.z),
    ];

    outBox.makeEmpty();
    for (const c of corners) {
      c.applyMatrix4(this.matrixWorld);
      outBox.expandByPoint(c);
    }
    return outBox;
  }

  /**
   * Raycast downwards against this volume in local coordinates
   */
  public raycastDown(rayOrigin: THREE.Vector3, maxDist: number): { hit: boolean; dist: number; normal: THREE.Vector3 } | null {
    if (this.isCumbled) return null;

    // Transform ray to local space
    const localOrigin = rayOrigin.clone().applyMatrix4(this.matrixWorldInverse);
    const localDir = new THREE.Vector3(0, -1, 0).transformDirection(this.matrixWorldInverse).normalize();

    // Check against local AABB [-halfExtents, +halfExtents]
    let tmin = -Infinity;
    let tmax = Infinity;
    let hitNormal = new THREE.Vector3(0, 1, 0);

    const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
    for (const axis of axes) {
      const originVal = localOrigin[axis];
      const dirVal = localDir[axis];
      const minVal = -this.halfExtents[axis];
      const maxVal = this.halfExtents[axis];

      if (Math.abs(dirVal) < 1e-6) {
        if (originVal < minVal || originVal > maxVal) return null;
      } else {
        let t1 = (minVal - originVal) / dirVal;
        let t2 = (maxVal - originVal) / dirVal;
        let norm = new THREE.Vector3();
        norm[axis] = -1;

        if (t1 > t2) {
          const tmp = t1; t1 = t2; t2 = tmp;
          norm[axis] = 1;
        }

        if (t1 > tmin) {
          tmin = t1;
          hitNormal = norm;
        }
        tmax = Math.min(tmax, t2);

        if (tmin > tmax) return null;
      }
    }

    if (tmin >= 0 && tmin <= maxDist + 1e-4) {
      // Transform local hit normal back to world space
      const worldNormal = hitNormal.clone().transformDirection(this.matrixWorld).normalize();
      return {
        hit: true,
        dist: tmin,
        normal: worldNormal
      };
    }

    // Origin is inside the bounding box (tmin < 0 <= tmax): detect ground without dropping raycast
    if (tmin < 0 && tmax >= 0) {
      const worldNormal = new THREE.Vector3(0, 1, 0).transformDirection(this.matrixWorld).normalize();
      return {
        hit: true,
        dist: 0,
        normal: worldNormal
      };
    }

    return null;
  }

  /**
   * Test sphere overlap and minimum translation vector (local space)
   */
  public testSphere(center: THREE.Vector3, radius: number): CollisionResult {
    if (this.isCumbled) {
      return { hit: false, normal: new THREE.Vector3(), depth: 0, contactPoint: new THREE.Vector3() };
    }

    // Transform sphere center to local box coordinates
    const localCenter = center.clone().applyMatrix4(this.matrixWorldInverse);

    // Find closest point on local box
    const closest = new THREE.Vector3(
      Math.max(-this.halfExtents.x, Math.min(this.halfExtents.x, localCenter.x)),
      Math.max(-this.halfExtents.y, Math.min(this.halfExtents.y, localCenter.y)),
      Math.max(-this.halfExtents.z, Math.min(this.halfExtents.z, localCenter.z))
    );

    const diff = localCenter.clone().sub(closest);
    const distSq = diff.lengthSq();

    // Inside the box
    if (distSq < 1e-8) {
      // Point is inside: find distance to closest surface
      const dx = this.halfExtents.x - Math.abs(localCenter.x);
      const dy = this.halfExtents.y - Math.abs(localCenter.y);
      const dz = this.halfExtents.z - Math.abs(localCenter.z);

      const localNormal = new THREE.Vector3();
      let depth = radius;
      if (localCenter.y > this.halfExtents.y - radius * 0.5) {
        // Prioritize upward vertical normal on top surface and edges to eliminate horizontal ejection into void
        localNormal.set(0, 1, 0);
        depth += dy;
      } else if (dx < dy && dx < dz) {
        localNormal.set(Math.sign(localCenter.x) || 1, 0, 0);
        depth += dx;
      } else if (dy < dz) {
        localNormal.set(0, Math.sign(localCenter.y) || 1, 0);
        depth += dy;
      } else {
        localNormal.set(0, 0, Math.sign(localCenter.z) || 1);
        depth += dz;
      }

      const worldNormal = localNormal.transformDirection(this.matrixWorld).normalize();
      const worldContact = closest.applyMatrix4(this.matrixWorld);

      return {
        hit: true,
        normal: worldNormal,
        depth: depth,
        contactPoint: worldContact,
        volume: this
      };
    }

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const localNormal = diff.divideScalar(dist);
      const worldNormal = localNormal.transformDirection(this.matrixWorld).normalize();
      const worldContact = closest.applyMatrix4(this.matrixWorld);

      return {
        hit: true,
        normal: worldNormal,
        depth: radius - dist,
        contactPoint: worldContact,
        volume: this
      };
    }

    return { hit: false, normal: new THREE.Vector3(), depth: 0, contactPoint: new THREE.Vector3() };
  }
}

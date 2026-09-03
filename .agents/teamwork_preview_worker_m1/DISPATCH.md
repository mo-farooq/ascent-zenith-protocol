## 2026-09-03T15:51:48Z

Implement Milestone 1 (Physics Stability, Collision Engine & Respawn Safety - R4):
1. Fix Contact Normal Selection & Edge Snagging in src/physics/CollisionVolume.ts:
   In testSphere(), when the contact penetration is resolved and the sphere center is above the top surface (localCenter.y > halfExtents.y - radius * 0.5), prioritize the upward vertical normal (0, 1, 0) instead of flipping to horizontal normals on platform edges. Eliminate horizontal ejection into the void.
2. Fix Step-Up on Vertical Walls in src/physics/PhysicsWorld.ts:
   In resolveCapsuleCollisions(), require that contact normal satisfies res.normal.y >= 0.5 before applying step-up logic. Vertical walls (normal.y close to 0) must undergo normal horizontal pushout, preventing wall penetration, snagging, and upward vibration.
3. Implement Dynamic Fall Ground Detection & Anti-Tunneling in src/physics/PhysicsWorld.ts & CollisionVolume.ts:
   In checkGround(), compute dynamic check distance based on downward speed (Math.max(checkDist, Math.abs(verticalVelocity || 0) * dt + 0.35)). In CollisionVolume.raycastDown(), correctly handle rays whose origin is inside the bounding box (where tmin < 0 <= tmax) so the ground is detected and doesn't return null.
4. Fix Altitude Broadphase Query in src/physics/PhysicsWorld.ts:
   In queryAABB(), incorporate vol.halfExtents.y into the altitude filter: (vol.position.y - vol.halfExtents.y <= maxY && vol.position.y + vol.halfExtents.y >= minY) so tall monoliths and pylons maintain collisions near their top.
5. Fix Camera Wall Ingress & Snap Bypass in src/entities/CameraController.ts:
   Implement asymmetric distance lerping (instant snap-in when occluded by geometry, smooth lerp when pulling back out) and call occlusion raycasting in snapToTarget().
6. Fix Void Respawn Safety in src/entities/Player.ts:
   Ensure respawn position has safe clearance (+0.35m above verified ground), linear velocities (x, y, z) are zeroed upon respawn, and camera is snapped cleanly to target.

Exclusive file ownership:
- src/physics/CollisionVolume.ts
- src/physics/PhysicsWorld.ts
- src/entities/Player.ts
- src/entities/CameraController.ts

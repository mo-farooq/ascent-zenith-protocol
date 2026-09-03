# Milestone 1: Physics Stability, Collision Engine & Respawn Safety (R4) Changes

## Summary of Changes
Implemented comprehensive stability fixes across the 4 owned files addressing Requirement R4:
1. `src/physics/CollisionVolume.ts`: Fixed edge snagging and contact normal inversion; handled interior raycast origins (`tmin < 0 <= tmax`); added trajectory properties.
2. `src/physics/PhysicsWorld.ts`: Enforced `res.normal.y >= 0.5` for step-up to prevent vertical wall penetration/snagging; implemented dynamic fall ground check distance (`Math.max(checkDist, Math.abs(verticalVelocity || 0) * dt + 0.35)`); updated altitude broadphase filters to include `vol.halfExtents.y`.
3. `src/entities/CameraController.ts`: Implemented asymmetric distance lerping (instant snap-in when occluded, smooth lerping when pulling out); integrated occlusion raycasting directly into `snapToTarget()`.
4. `src/entities/Player.ts`: Guaranteed safe ground clearance (+0.35m above verified ground) on respawn and checkpoint set; zeroed linear velocities upon respawn; integrated dynamic fall parameters into ground check; cleaned up void fall condition.

---

## Detailed Modifications

### 1. `src/physics/CollisionVolume.ts`
- **Contact Normal Selection (`testSphere`)**:
  When contact penetration is resolved inside the box (`distSq < 1e-8`) and the sphere center is above `this.halfExtents.y - radius * 0.5`, the solver prioritizes the upward vertical normal `(0, 1, 0)` with `depth = radius + dy`. This prevents selecting horizontal normals (`dx < dy`) on platform edges, eliminating horizontal ejection into the void.
- **Interior Raycast Recovery (`raycastDown`)**:
  When ray origin starts inside the box (`tmin < 0 && tmax >= 0`), rather than returning `null` (which dropped ground checks and caused tunneling), the raycast now returns `{ hit: true, dist: 0, normal: worldNormalUp }`.
- **Ballistic Properties**:
  Added optional `targetPosition?: THREE.Vector3`, `launchVelocity?: THREE.Vector3`, `launchDuration?: number` for M1/M3 interface compatibility.

### 2. `src/physics/PhysicsWorld.ts`
- **Vertical Wall Step-Up Check (`resolveCapsuleCollisions`)**:
  Changed step-up condition from `res.normal.y > -0.2` to `res.normal.y >= 0.5`. Contact points on vertical walls (`res.normal.y ≈ 0`) no longer trigger step-up logic and instead undergo standard horizontal pushout, stopping wall clipping, snagging, and upward vibration.
- **Dynamic Downward Fall Ground Detection (`checkGround`)**:
  Computes `effectiveCheckDist = Math.max(checkDist, Math.abs(verticalVelocity || 0) * dt + 0.35)`. Expands the candidate search query box and downward probe rays to intercept platforms before the discrete position step tunnels past them.
- **Broadphase Altitude Query Bounds (`queryAABB` & `raycastCamera`)**:
  Updated vertical filter to `vol.position.y - vol.halfExtents.y > maxY || vol.position.y + vol.halfExtents.y < minY`. Ensures tall structures (monoliths, pylons, towers) remain active in spatial collision queries when players or cameras are near their top.
- **Interface Support**:
  Updated `GroundCheckResult` to include optional trajectory fields.

### 3. `src/entities/CameraController.ts`
- **Asymmetric Distance Lerping (`update`)**:
  When `safeDist < this.currentDistance` (geometry occlusion detected), `currentDistance` instantly snaps to `safeDist` and `camera.position` snaps to `idealCameraPos` to prevent wall ingress. When `safeDist >= this.currentDistance` (pulling out into open space), the camera smoothly lerps out (`Math.min(1, dt * 10)`).
- **Occlusion Raycasting on Snap (`snapToTarget`)**:
  `snapToTarget` now computes `camDir`, performs `this.physics.raycastCamera()`, and calculates `safeDist = Math.max(1.5, hitDist - 0.25)`, positioning `currentDistance` and `camera.position` outside geometry upon respawn. Focuses lookAt cleanly on climber center (+1.35m above feet).

### 4. `src/entities/Player.ts`
- **Safe Respawn Clearance (`setCheckpoint` & `respawn`)**:
  Both `setCheckpoint` and `respawn` verify ground elevation via `this.physics.checkGround()` and position the player at `ground.groundY + 0.35` (+0.35m above verified ground). Linear velocities (`x, y, z`) are set to `(0, 0, 0)` upon respawn.
- **Camera Snapping on Respawn**:
  `respawn()` cleanly snaps camera to target via `cameraController?.snapToTarget(this.position)` and `onRespawnCallback?.()`.
- **Dynamic Ground Check Integration**:
  Passes `this.velocity.y` and `dt` to `this.physics.checkGround()`.
- **Robust Void Detection**:
  Triggers fall cleanly if `this.position.y < -8.0 || (!this.isGrounded && this.position.y < this.respawnPosition.y - 25.0)`.

---

## Build Verification Output

Command executed: `npm run build`
```
> ascent-zenith-protocol@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 35 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 25.48 kB │ gzip:   5.52 kB
dist/assets/index-B7-KoN3D.js  597.68 kB │ gzip: 151.20 kB
✓ built in 1.04s
```
Status: Zero TypeScript compilation errors, exit code 0.

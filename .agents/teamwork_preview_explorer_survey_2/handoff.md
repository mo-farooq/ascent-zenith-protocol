# Handoff Report: R4 Physics Stability, Collision Snagging, Bug Fixes & Camera Survey

**Agent**: teamwork_preview_explorer_survey_2  
**Role**: Explorer / Survey  
**Working Directory**: `/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_2`  
**Parent Agent**: `b2ee6bb6-9070-4fe4-8271-5f255aa4fca8`  
**Detailed Report Reference**: `/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_2/survey_physics.md`  

---

## 1. Observation

Direct observations and verbatim code inspected within `/Users/Farooq/Desktop/game`:

1. **Edge-Snagging & Ejection Logic**:
   - In `src/physics/CollisionVolume.ts` lines 176–186:
     ```typescript
     if (dx < dy && dx < dz) {
       localNormal.set(Math.sign(localCenter.x) || 1, 0, 0);
       depth += dx;
     } else if (dy < dz) {
       localNormal.set(0, Math.sign(localCenter.y) || 1, 0);
       depth += dy;
     } else {
       localNormal.set(0, 0, Math.sign(localCenter.z) || 1);
       depth += dz;
     }
     ```
   - In `src/physics/PhysicsWorld.ts` lines 193–195:
     ```typescript
     const pushVec = res.normal.clone().multiplyScalar(res.depth);
     position.add(pushVec);
     ```

2. **Step-Up False Positive on Vertical Surfaces**:
   - In `src/physics/PhysicsWorld.ts` lines 176–183:
     ```typescript
     const contactY = res.contactPoint.y;
     const stepDiff = contactY - position.y;

     if (sIdx === 0 && stepDiff > 0.02 && stepDiff <= maxStepHeight && res.normal.y > -0.2) {
       // Smoothly step up onto small ledge
       position.y += stepDiff * 0.5;
       continue;
     }
     ```

3. **Tunneling & Dropped Raycast Ground Detection**:
   - In `src/physics/PhysicsWorld.ts` line 61:
     ```typescript
     public checkGround(feetPosition: THREE.Vector3, radius = 0.35, checkDist = 0.35): GroundCheckResult
     ```
   - In `src/physics/CollisionVolume.ts` line 133:
     ```typescript
     if (tmin >= 0 && tmin <= maxDist) {
     ```
     When `rayOrigin` is inside the box, `tmin < 0`, so `raycastDown()` returns `null`.

4. **Altitude Broadphase Rejection Bug**:
   - In `src/physics/PhysicsWorld.ts` lines 212–218:
     ```typescript
     const minY = box.min.y - 4.0;
     const maxY = box.max.y + 4.0;

     for (const vol of this.volumes) {
       if (vol.isCumbled) continue;
       // Fast altitude rejection
       if (vol.position.y < minY || vol.position.y > maxY) continue;
     ```

5. **Camera Occlusion Smoothing Ingress & Snap Bypass**:
   - In `src/entities/CameraController.ts` lines 114–120:
     ```typescript
     const safeDist = Math.max(1.5, hitDist - 0.25);
     this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, safeDist, Math.min(1, dt * 18));
     this.idealCameraPos.copy(this.currentLookAt).addScaledVector(camDir, this.currentDistance);
     this.camera.position.lerp(this.idealCameraPos, Math.min(1, dt * 28));
     ```
   - In `src/entities/CameraController.ts` lines 136–152 (`snapToTarget`): Sets camera position without calling `raycastCamera`.

6. **Launch Pad Trajectory Truncation**:
   - In `src/entities/Player.ts` lines 158–159 and 206–208:
     ```typescript
     if (this.isGrounded && ground.isLaunchPad) {
       this.velocity.y = ground.launchImpulse;
       // ...
     }
     // ...
     if (!input.jump && this.velocity.y > 2.0) {
       this.velocity.y *= 0.55;
     }
     ```

7. **Void Respawn Logic**:
   - In `src/entities/Player.ts` line 275:
     ```typescript
     if (this.position.y < -8.0 || (!this.isGrounded && this.position.y < this.respawnPosition.y - 35 && this.velocity.y < -15))
     ```
   - In `src/entities/Player.ts` lines 87–91:
     ```typescript
     this.respawnPosition.y = pos.y + 0.15;
     ```

---

## 2. Logic Chain

1. **Edge Ejection**:
   - From Observation 1: When a player lands or walks near a platform edge, the horizontal distance to the side face `dx` is less than the vertical distance to the top surface `dy`.
   - The solver chooses `localNormal = (±1, 0, 0)` rather than upward `(0, 1, 0)`.
   - `position.add(normal * depth)` projects the player along this horizontal normal by `radius + dx` (up to 0.45m), actively pushing the player off the platform into the abyss.
2. **Vertical Wall Snagging**:
   - From Observation 2: The condition `res.normal.y > -0.2` allows vertical surfaces where `normal.y = 0.0`.
   - Running into any flat wall triggers `position.y += stepDiff * 0.5; continue;`.
   - The horizontal pushout is skipped, leaving the player penetrated into the wall and vibrating upward along the flat vertical surface.
3. **Tunneling / Falling Through Thin Platforms**:
   - From Observation 3: At terminal fall velocities ($-35\text{ m/s}$), the displacement per frame is $-0.6\text{m}$ to $-1.2\text{m}$.
   - The downward ground check ray extends only $0.50\text{m}$.
   - Once the player's feet pass through or sink $>0.15\text{m}$ into a $0.4\text{m}$ platform, `tmin` in `raycastDown` becomes negative, returning `null`.
   - Ground detection drops to `false`, and discrete sphere tests miss the platform entirely, resulting in complete tunneling.
4. **Camera Geometry Clipping**:
   - From Observation 5: Symmetric distance damping (`dt * 18`) takes 100–200ms to pull the camera in when wall occlusion occurs.
   - During those frames, the camera frustum is positioned behind the wall.
   - Furthermore, `snapToTarget()` places the camera 5.2m away without testing occlusion, causing instant clipping on checkpoint load or respawn.
5. **Void Respawn Loops**:
   - From Observations 1 and 7: If a checkpoint is near a platform boundary, spawning at `respawnPosition` immediately triggers the edge ejection bug on frame 1.
   - The player is knocked off into the void, falls 35m, triggers fall, waits 1.4s, respawns at the same spot, and is immediately knocked off again.
6. **Launch Pad Impulses Cut**:
   - From Observation 6: Stepping onto a launch pad sets `velocity.y = 35`.
   - If the player is not holding `Space`, variable jump truncation multiplies `velocity.y` by 0.55 each frame, reducing vertical impulse by over 80% within 3 frames.

---

## 3. Caveats

- **No Source Code Modifications**: Under the explorer role constraints, zero edits were made to game source files. All findings and proposed code changes are documented in `survey_physics.md`.
- **Hardware-Dependent Frame Rates**: High-refresh monitors (144Hz+) mitigate tunneling due to smaller $\Delta t$, whereas 30–60Hz systems experience more severe tunneling. Proposed Continuous Collision Detection (CCD) fixes are designed to be rock-solid regardless of refresh rate.
- **Alternative Physics Engines**: Integrating an external physics library (e.g. Rapier or Cannon-es) was considered, but optimizing the existing lightweight custom solver was deemed significantly lower risk and better suited to the project's zero-dependency, high-performance architecture.

---

## 4. Conclusion

The physics, collision, and camera issues outlined in Requirement R4 are caused by five distinct, well-isolated mathematical and architectural flaws:
1. Contact normal inversion in `CollisionVolume.testSphere()`.
2. Permissive wall slope check in `PhysicsWorld.resolveCapsuleCollisions()`.
3. Lack of dynamic downward sweep and interior ray handling in `PhysicsWorld.checkGround()`.
4. Symmetric camera distance smoothing and unconstrained respawn camera placement in `CameraController`.
5. Variable jump truncation stealing Launch Pad momentum in `Player.ts`.

A complete, actionable technical blueprint for fixing all five issues has been delivered in `/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_2/survey_physics.md`.

---

## 5. Verification Method

To independently verify this analysis:

1. **Verify Source References**:
   - Inspect `src/physics/CollisionVolume.ts` (lines 176–186) to verify contact normal calculation.
   - Inspect `src/physics/PhysicsWorld.ts` (lines 176–183) to verify wall step-up logic.
   - Inspect `src/entities/CameraController.ts` (lines 114–120, 136–152) to verify camera distance lerping and `snapToTarget`.
   - Inspect `src/entities/Player.ts` (lines 206–208) to verify variable jump height truncation.
2. **Build Verification**:
   - Run `npm run build` in `/Users/Farooq/Desktop/game` to confirm zero TypeScript compilation errors.
3. **Invalidation Conditions**:
   - The analysis would be invalidated if `resolveCapsuleCollisions` possessed an existing normal filter preventing horizontal ejection on top faces, or if continuous swept-volume checks were already active. File inspections confirm neither exists.

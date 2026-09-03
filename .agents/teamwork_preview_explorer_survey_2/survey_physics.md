# Comprehensive Physics, Collision, Camera & Respawn Stability Survey (R4)

**Project**: Ascent: Zenith Protocol (3D Precision Climbing Platformer)  
**Survey Date**: 2026-09-03  
**Focus**: Requirement R4 (Physics Stability, Collision Snagging, Bug Fixes & Camera)  
**Author**: teamwork_preview_explorer_survey_2  

---

## Executive Summary

A comprehensive architectural and mathematical audit of the physics engine, collision detection, player controller, camera controller, and respawn mechanisms in `/Users/Farooq/Desktop/game` was conducted. While the game possesses strong mechanical concepts (variable jump height, coyote time, thruster dashes, and multi-zone platforming from 0m to 1,000m), several systemic architectural bugs cause platform clipping, edge snagging/ejection, camera geometry clipping, and void respawn loops.

This report documents the exact lines of code, mathematical root causes, and concrete implementation blueprints required to achieve rock-solid 60+ FPS physics stability.

---

## 1. Player Controller & Movement Dynamics

### 1.1 Velocity Integration & Variable Timestep
- **Observed Code**: `src/entities/Player.ts` (lines 110–111, 240–268)
  ```typescript
  const dt = Math.min(0.05, delta);
  // ...
  this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, accel, dt);
  this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, accel, dt);
  // ...
  this.position.x += this.velocity.x * dt;
  this.position.z += this.velocity.z * dt;
  this.position.y += this.velocity.y * dt;
  ```
- **Analysis**:
  1. **Euler Integration Sensitivity**: The integration is variable-timestep semi-implicit Euler. Because `dt` fluctuates between 0.016s (60 FPS) and 0.050s (20 FPS cap), drag and damping equations behave non-deterministically across frame rates.
  2. **Air Drag Inconsistency**: Line 257 uses `Math.pow(1 - this.airDrag * 0.05, dt * 60)`. While this approximates framerate independence, horizontal damping via `THREE.MathUtils.damp` uses a non-linear exponential smoothing that causes jumps at 30 FPS to cover different distances than jumps at 120 FPS.
  3. **Order of Operations Vulnerability**:
     - `checkGround()` runs at the start of `player.update()`.
     - `this.position.y = ground.groundY; this.velocity.y = 0;` (lines 181–184) snaps the player to ground *before* horizontal movement.
     - Horizontal position updates: `position.x += velocity.x * dt`.
     - Capsule collision resolution runs at the very end of the frame.
     - Consequently, walking off a ledge keeps the player at the old `groundY` for the remainder of the frame without downward acceleration, while walking up a slope causes the horizontal step to drive the player's feet into the geometry *before* collision resolution runs.

### 1.2 Moving Platform Delta Transport Desynchronization
- **Observed Code**: `src/entities/Player.ts` (lines 140–149) vs `src/core/Game.ts` (lines 263–270)
  ```typescript
  // In Game.ts animate loop:
  const stats: PlayerStats = this.player.update(delta, inputState, this.cameraController.yaw);
  // ...
  this.physics.update(delta);
  this.levelBuilder.update(delta, this.player.position);
  ```
- **Root Cause**:
  `player.update()` runs *before* `levelBuilder.update()` (which updates `MovingPlatform`).
  When standing on a moving platform:
  1. `player.update()` calculates platform delta using `currentPlatform.position - lastPlatformPos`.
  2. `levelBuilder.update()` then moves the platform to its new position.
  3. This introduces a 1-frame latency in platform tracking:
     - When a platform moves vertically upward, the platform moves into the player after the player already resolved collisions.
     - When moving downward, the platform drops away after ground checks, causing the ground check to register separation or jitter between grounded and airborne states.

---

## 2. Collision System, Platform Snagging & Clipping

### 2.1 The Edge-Snagging & Ejection Bug (Mathematical Breakdown)
- **Observed Code**: `src/physics/CollisionVolume.ts` (lines 168–197) and `src/physics/PhysicsWorld.ts` (lines 193–201)
  ```typescript
  // In CollisionVolume.testSphere():
  if (distSq < 1e-8) {
    const dx = this.halfExtents.x - Math.abs(localCenter.x);
    const dy = this.halfExtents.y - Math.abs(localCenter.y);
    const dz = this.halfExtents.z - Math.abs(localCenter.z);

    const localNormal = new THREE.Vector3();
    let depth = radius;
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
- **Mechanism of Failure**:
  When a player lands near the boundary of a platform:
  - Suppose a platform has dimensions `(3.0m, 0.4m, 3.0m)` with `halfExtents = (1.5, 0.2, 1.5)`.
  - The player's bottom collision sphere center penetrates slightly into the top surface by $0.08\text{m}$, so `localCenter.y = 0.20 - 0.08 = 0.12m`. The distance to the top surface is `dy = 0.20 - 0.12 = 0.08m`.
  - If the player is $0.06\text{m}$ from the side edge, `localCenter.x = 1.44m`. The distance to the side face is `dx = 1.50 - 1.44 = 0.06m`.
  - The algorithm compares: `dx (0.06) < dy (0.08)`.
  - Result: `localNormal` is set to `(1, 0, 0)` (horizontal outward normal)!
  - In `PhysicsWorld.resolveCapsuleCollisions()`:
    ```typescript
    const pushVec = res.normal.clone().multiplyScalar(res.depth);
    position.add(pushVec);
    ```
  - The engine applies a horizontal ejection vector of magnitude `depth = radius + dx = 0.35 + 0.06 = 0.41m` along the X-axis!
  - **Outcome**: Instead of supporting the player on the platform top, the physics solver violently propels the player sideways off the platform into the abyss.

### 2.2 Flawed Step-Up Logic on Vertical Walls
- **Observed Code**: `src/physics/PhysicsWorld.ts` (lines 176–183)
  ```typescript
  const contactY = res.contactPoint.y;
  const stepDiff = contactY - position.y;

  if (sIdx === 0 && stepDiff > 0.02 && stepDiff <= maxStepHeight && res.normal.y > -0.2) {
    // Smoothly step up onto small ledge
    position.y += stepDiff * 0.5;
    continue;
  }
  ```
- **Mechanism of Failure**:
  1. The filter `res.normal.y > -0.2` accepts `normal.y == 0.0`, which represents a **purely vertical wall**.
  2. When the player runs into a vertical wall or crate edge, `contactY` is calculated from the closest point on the wall. If `contactY - position.y <= 0.3m`, the solver mistakes the vertical wall for a climbable stair step.
  3. It raises `position.y += stepDiff * 0.5` and executes `continue;`, which **skips horizontal collision pushout**.
  4. The player penetrates deeper into the wall, snagging, stuttering, and creeping up the vertical surface before getting wedged or ejected.

### 2.3 Tunneling / Clipping During High-Speed Falls
- **Observed Code**: `src/physics/PhysicsWorld.ts` (lines 61, 84–91) and `src/entities/Player.ts` (lines 261–271)
- **Mathematical Analysis**:
  - Effective downward gravity: $g_{\text{fall}} = 28.0 \times 1.35 = 37.8\text{ m/s}^2$.
  - Falling from a height of 30m produces vertical terminal speeds exceeding $v_y = -35\text{ m/s}$.
  - In a single frame at 30 FPS ($\Delta t = 0.033\text{s}$), the vertical displacement is:
    $$\Delta y = -35 \times 0.033 = -1.16\text{ meters}$$
  - Most platforms in `LevelBuilder.ts` have thickness $0.4\text{m}$ to $0.5\text{m}$.
  - In `checkGround()`, the ray length is fixed at `checkDist + 0.15 = 0.50m`.
  - Because collision resolution only performs discrete sphere overlap tests at the post-integration position, a player traveling $> 0.5\text{m}$ in a single frame moves completely through the platform without the ray or sphere ever intersecting the platform volume.

### 2.4 Interior Raycast Failure in `CollisionVolume.raycastDown()`
- **Observed Code**: `src/physics/CollisionVolume.ts` (lines 113–133)
  ```typescript
  let t1 = (minVal - originVal) / dirVal;
  let t2 = (maxVal - originVal) / dirVal;
  if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
  if (t1 > tmin) { tmin = t1; hitNormal = norm; }
  // ...
  if (tmin >= 0 && tmin <= maxDist) { return { hit: true, dist: tmin, normal: worldNormal }; }
  return null;
  ```
- **Mechanism of Failure**:
  If a frame hitch or downward step causes `feetPosition.y` to sink slightly below the platform surface, `rayOrigin.y` (`feetPosition.y + 0.15`) enters the interior of the box.
  When the origin is inside the box, the intersection distance to the upper boundary is behind the ray direction ($t < 0$).
  `tmin` becomes negative.
  Because line 133 enforces `tmin >= 0`, the raycast returns `null`.
  The ground check reports `isGrounded = false`. Gravity continues unabated, ensuring the player tunnels through to the void.

### 2.5 Broadphase Altitude Rejection Defect
- **Observed Code**: `src/physics/PhysicsWorld.ts` (lines 212–218, 236–242)
  ```typescript
  const minY = box.min.y - 4.0;
  const maxY = box.max.y + 4.0;

  for (const vol of this.volumes) {
    if (vol.isCumbled) continue;
    // Fast altitude rejection
    if (vol.position.y < minY || vol.position.y > maxY) continue;
  ```
- **Mechanism of Failure**:
  `vol.position.y` is the **geometric center** of the volume.
  The condition tests `vol.position.y < minY` without adding `vol.halfExtents.y`.
  For tall structures (such as Brutalist Monoliths with height $18\text{m}$ to $24\text{m}$, or Light Pylons with height $18\text{m}$):
  - When the player stands on top of an 18m pylon, `vol.position.y = 9.0m`.
  - The query box is at $y \approx 18.0\text{m}$, giving `minY = 18.0 - 4.0 = 14.0m`.
  - `vol.position.y (9.0m) < minY (14.0m)` evaluates to `true`!
  - `queryAABB` skips the volume entirely, causing the player to fall right through the top of tall structures.

---

## 3. Camera Controller Audit

### 3.1 Occlusion Avoidance Lag & Geometry Ingress
- **Observed Code**: `src/entities/CameraController.ts` (lines 114–120)
  ```typescript
  const maxRayDist = effectiveDist;
  const hitDist = this.physics.raycastCamera(this.currentLookAt, camDir, maxRayDist);

  // Smoothly adjust camera distance
  const safeDist = Math.max(1.5, hitDist - 0.25);
  this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, safeDist, Math.min(1, dt * 18));

  this.idealCameraPos.copy(this.currentLookAt).addScaledVector(camDir, this.currentDistance);
  this.camera.position.lerp(this.idealCameraPos, Math.min(1, dt * 28));
  ```
- **Root Cause**:
  1. **Symmetric Smoothing on Distance**: When the player approaches a wall or rotates near geometry, `safeDist` drops immediately. However, `currentDistance` is damped using `dt * 18`, and `camera.position` is further damped using `dt * 28`.
  2. Over the course of 5–12 frames (100–200ms), the camera position remains farther back than `safeDist`, placing the camera inside the wall or platform geometry.
  3. **Absence of Camera Collision on Snap**: In `CameraController.snapToTarget()` (lines 136–152), the camera is placed at `this.targetDistance` (5.2m) without executing `raycastCamera`. Upon respawning at any checkpoint adjacent to a wall or tower, the camera initializes inside solid geometry.

### 3.2 Camera Raycast Limitations
- **Observed Code**: `src/physics/PhysicsWorld.ts` (lines 233–253)
  1. `raycastCamera` performs a single line raycast from `currentLookAt` to `camera.position`. It does not account for the camera near-clipping plane ($0.1\text{m}$) or viewport frustum width, allowing the edges of the viewport to clip into corners.
  2. `intersectRayAABB` tests against the world AABB returned by `vol.getAABB(this.tempBox)`. For rotated platforms (OBBs), the bounding box contains empty air. The camera ray clips against invisible empty space, causing premature zooming.
  3. In line 235: `this.camInvDir.set(1 / rayDir.x, 1 / rayDir.y, 1 / rayDir.z)`. If `rayDir` aligns with any principal axis, division by zero produces `Infinity` and `(0) * Infinity = NaN`, leading to failed occlusion checks.

### 3.3 Vertical Tracking Lag During High Launches
- **Observed Code**: `src/entities/CameraController.ts` (line 78)
  `this.currentLookAt.lerp(this.targetLookAt, Math.min(1, dt * 20));`
  When a Launch Pad imparts vertical impulse of $35\text{ m/s}$ to $45\text{ m/s}$, the character moves upward by $0.7\text{m}$ per frame, whereas `currentLookAt` lags significantly behind. The character flies into the upper margin of the screen, creating severe orientation disorientation.

---

## 4. Void Detection, Death Triggers, Checkpoints & Respawn

### 4.1 Void Detection Inconsistencies
- **Observed Code**: `src/entities/Player.ts` (lines 274–277)
  ```typescript
  if (this.position.y < -8.0 || (!this.isGrounded && this.position.y < this.respawnPosition.y - 35 && this.velocity.y < -15)) {
    this.triggerFall();
  }
  ```
- **Failure Cases**:
  1. **Strict Fall Speed Gate**: Requiring `velocity.y < -15` means that if a player slips off a platform and slides slowly along an angled strut or performs thruster dashes in the abyss, void death will not trigger until they reach $y < -8.0\text{m}$. In Zone 5 (altitude 750m), the player must fall 758 meters through empty space before respawning.
  2. **Void Respawn Loop Mechanism**:
     - When `respawn()` is called, `this.position.copy(this.respawnPosition)`.
     - In `Player.setCheckpoint()` (lines 87–91), `this.respawnPosition.y = pos.y + 0.15`.
     - If the checkpoint platform has decorative geometry (e.g. Checkpoint ring/base at $y = \text{pos.y} + 0.20\text{m}$) or if the checkpoint coordinate is placed near the edge of a platform, `resolveCapsuleCollisions()` detects an interior penetration or edge contact on the very first frame after respawning.
     - As detailed in Section 2.1, the edge-ejection bug pushes the player horizontally into the void immediately upon respawn.
     - The player plunges, triggers fall after 35m, waits 1.4s, respawns at the same location, and is ejected again—an **infinite void respawn loop**.

### 4.2 Summit Checkpoint Collision Conflict
- **Observed Code**: `src/level/LevelBuilder.ts` (lines 661–687)
  ```typescript
  const spireGeo = new THREE.CylinderGeometry(0.6, 1.8, 28, 12);
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, summitY + 14, 0); // Base sits at y = 1000m, radius = 1.8m
  // ...
  this.addCheckpoint('checkpoint_summit', 'THE APEX ZENITH', new THREE.Vector3(0, summitY, 0));
  ```
  The summit checkpoint is positioned at `(0, 1000, 0)`, directly inside the base of the Celestial Golden Beacon Spire (radius 1.8m).

---

## 5. Jump Pads, Jump Dynamics & Air Control Calibration

### 5.1 Launch Pad Impulses Mutilated by Variable Jump Cut
- **Observed Code**: `src/entities/Player.ts` (lines 158–169, 206–208)
  ```typescript
  // Launch Pad Trigger (lines 158-164):
  if (this.isGrounded && ground.isLaunchPad) {
    this.velocity.y = ground.launchImpulse; // e.g. 35 m/s
    // ...
  }

  // Jump Processing (lines 206-208):
  // Variable jump height truncation: releasing Space cuts vertical velocity
  if (!input.jump && this.velocity.y > 2.0) {
    this.velocity.y *= 0.55;
  }
  ```
- **Impact**:
  If a player walks or sprints onto a Launch Pad without actively pressing or holding the `Space` key, `input.jump` is `false`.
  In the very next execution step of that same frame:
  - `velocity.y` ($35\text{ m/s}$) is multiplied by $0.55 \to 19.25\text{ m/s}$.
  - Next frame: $19.25 \times 0.55 \to 10.58\text{ m/s}$.
  - Next frame: $10.58 \times 0.55 \to 5.82\text{ m/s}$.
  The launch impulse is gutted by up to 83% over 3 frames, causing the player to plummet short of the intended landing platform.

### 5.2 Air Damping Strangling Horizontal Momentum
- **Observed Code**: `src/entities/Player.ts` (lines 255–258)
  ```typescript
  this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, this.airAccel, dt);
  this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, this.airAccel, dt);
  ```
  Launch pads and thruster dashes impart high horizontal velocities ($18\text{ m/s}$ to $22\text{ m/s}$).
  Because `targetVelX` is bounded by `sprintSpeed` ($9.2\text{ m/s}$) or is $0$ if no directional key is pressed, `MathUtils.damp` rapidly bleeds off the forward momentum, dropping the trajectory into a steep, unnatural fall.

---

## 6. Concrete Fix Strategies & Architectural Requirements

### Requirement 1: Physics Engine Stability & Separation of Concerns
1. **Separation of Vertical Ground Resolution from Horizontal Penetration**:
   - `checkGround()` must be the sole authority for vertical elevation on walkable surfaces.
   - When grounded, vertical position snaps directly to `ground.groundY`, and downward velocity is zeroed.
   - `resolveCapsuleCollisions()` must ignore top faces ($N_y > 0.6$) so it never pushes the player horizontally off a walkable surface.
2. **Normal Resolution in `CollisionVolume.testSphere()`**:
   - When the sphere center is inside a box, determine the resolution axis based on the capsule sphere index:
     - For the bottom sphere (`sIdx === 0`), if the sphere center is near the top half of the box, push **upward** ($N = [0, 1, 0]$), never sideways.
   - Clamp horizontal pushout when $N_y > 0.5$.
3. **Step-Up Verification**:
   - Require `res.normal.y > 0.5` on the step surface or ensure a forward ray confirms an open flat landing surface before incrementing `position.y`. Never execute step-up on vertical walls ($N_y \approx 0$).

### Requirement 2: Continuous Collision Detection (CCD) & Tunneling Prevention
1. **Dynamic Swept Ground Probe**:
   - In `PhysicsWorld.checkGround()`, calculate check distance dynamically:
     $$\text{checkDist} = \max\left(0.35, -v_y \cdot \Delta t + 0.20\right)$$
   - When falling at $35\text{ m/s}$ with $\Delta t = 0.02\text{s}$, the check ray extends $0.90\text{m}$ downwards, intercepting thin platforms before the position step tunnels past them.
2. **Internal Ray Recovery in `raycastDown()`**:
   - If `rayOrigin` is inside the box ($-\text{halfExtents} \le \text{localOrigin} \le \text{halfExtents}$), return:
     `{ hit: true, dist: 0, normal: worldNormalUp }`
   - This prevents dropped ground detection when a player sinks slightly into geometry during frame hitches.
3. **Correct Broadphase Altitude Bounds**:
   - In `PhysicsWorld.queryAABB()` and `raycastCamera()`:
     ```typescript
     const volMinY = vol.position.y - vol.halfExtents.y;
     const volMaxY = vol.position.y + vol.halfExtents.y;
     if (volMaxY < box.min.y || volMinY > box.max.y) continue;
     ```
   - Pre-compute and cache `worldAABB` on static `CollisionVolume` instances during construction to eliminate thousands of matrix operations per frame.

### Requirement 3: Camera Occlusion & Tracking Polish
1. **Asymmetric Occlusion Distance Smoothing**:
   - **Zooming In (Occlusion detected, $safeDist < currentDistance$)**:
     Snap immediately or use near-instantaneous damping ($\tau = 80$) to guarantee the camera frustum never clips inside geometry.
   - **Zooming Out (Clear space restored, $safeDist > currentDistance$)**:
     Smoothly lerp back out ($\tau = 10$).
2. **Camera Viewport Margin**:
   - Enforce a collision margin of $0.35\text{m}$ in `raycastCamera` (`safeDist = Math.max(1.2, hitDist - 0.35)`) to account for camera near-plane clipping.
3. **Safe Camera Snapping**:
   - In `CameraController.snapToTarget()`, execute `raycastCamera()` immediately before setting position so respawning never places the camera inside a wall.
4. **Adaptive Look-At Tracking**:
   - Increase vertical look-at tracking speed during high vertical speeds ($|v_y| > 15\text{ m/s}$) to keep the player character centered during launch pad flights.

### Requirement 4: Safe Respawn & Void Guarding
1. **Robust Void Trigger**:
   - Simplify void condition to:
     `if (this.position.y < -8.0 || (!this.isGrounded && this.position.y < this.respawnPosition.y - 25.0))`
   - Remove the `velocity.y < -15` dependency so that any sustained fall beyond 25m below the checkpoint triggers clean respawn.
2. **Verified Ground Clearance on Checkpoint Set**:
   - When a checkpoint is registered, cast a downward ray to locate the precise solid surface $Y_{\text{surface}}$ and set:
     $$\text{respawnPosition.y} = Y_{\text{surface}} + 0.05\text{m}$$
   - Zero out horizontal velocities and grant a $0.15\text{s}$ stabilization grace period upon respawn to ensure clean resting contact.

### Requirement 5: Launch Pad & Momentum Protection
1. **Launch Pad Flight State (`launchPadTimer`)**:
   - When triggered, set `launchPadTimer = 0.65\text{s}`.
   - While active:
     - Bypass variable jump truncation (`velocity.y *= 0.55` is inhibited).
     - Protect horizontal momentum: allow air control to adjust direction without clamping magnitude down to `walkSpeed`/`sprintSpeed`.
2. **Targeted Trajectory Projection**:
   - Configure launch pads to launch along their designated directional vectors or towards their target landing platforms rather than relying exclusively on character facing yaw.

---

## 7. Verification Plan

The architectural fixes outlined above can be verified independently via the following checklist:

1. **Build & Type Integrity**:
   - Run `npm run build` to ensure all TypeScript types, interfaces, and bundler configurations compile cleanly with 0 errors.
2. **Edge Snagging Regression Test**:
   - Walk and jump repeatedly on the perimeter edges of narrow platforms (e.g. $2.8\text{m} \times 2.8\text{m}$ platforms in Zone 1 and Zone 5). Verify that the player lands stably on the edge without being violently ejected sideways.
3. **High-Speed Terminal Fall CCD Test**:
   - Jump off a platform at $y = 120\text{m}$ and land on a $0.4\text{m}$ thick platform at $y = 60\text{m}$. Verify that the player does not tunnel through the platform into the abyss.
4. **Camera Wall Occlusion Test**:
   - Back up against a monolith or wall in Zone 1 and Zone 4. Rotate the camera directly into the wall. Verify that the camera zooms in smoothly without clipping into the geometry, and returns smoothly to default distance when turning away.
5. **Launch Pad Trajectory Test**:
   - Run onto Launch Pad 1 (Hab Pod 2 roof) without pressing `Space`. Verify that the player reaches the Radar Catwalk smoothly without losing trajectory.
6. **Void Respawn Loop Test**:
   - Intentionally jump into the void from Checkpoint 1, Checkpoint 2, and Checkpoint 3. Verify that the player respawns resting flat on the platform deck, with the camera aligned and zero ejection impulse.

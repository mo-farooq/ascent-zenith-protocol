# Empirical Challenge Report: Camera Occlusion & Void Respawn Safety (Milestone 1)

**Agent**: teamwork_preview_challenger_m1_2  
**Working Directory**: `/Users/Farooq/Desktop/game/.agents/teamwork_preview_challenger_m1_2`  
**Parent Agent ID**: `b2ee6bb6-9070-4fe4-8271-5f255aa4fca8`  
**Milestone**: Milestone 1 (Physics Stability & Respawn Safety - R4)  
**Verdict**: **REQUEST_CHANGES**

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While worker M1 successfully implemented core physics stability improvements (eliminating edge normal flipping, preventing vertical wall step-up false positives, zeroing respawn velocities, and achieving 100/100 zero-loop respawn recoveries), empirical stress testing revealed **three high-severity defects** and **one latent side-effect defect** in `CameraController.ts`, `Player.ts`, and `CollisionVolume.ts`:

1. **Unconditional Camera Distance Truncation (`CameraController.ts:114, 158`)**: `safeDist = Math.max(1.5, hitDist - 0.25)` unconditionally subtracts `0.25m` even when `hitDist == maxRayDist` (no obstacle detected). The follow camera in open air is permanently clamped to `4.95m` instead of the configured `5.20m`, causing test `F5-3` to FAIL.
2. **Close Obstacle Geometry Penetration (`CameraController.ts:114, 158`)**: Hardcoding `Math.max(1.5, ...)` forces the camera distance to at least `1.5m` even when an obstacle is within `1.5m` of the player (e.g., climbing with back against a wall at `1.0m`). The camera penetrates `0.5m` inside obstacle geometry.
3. **Airborne State on Respawn (`Player.ts:121`)**: `respawn()` explicitly sets `this.isGrounded = false;`. This causes immediate failure in E2E test `S-RESP-LOOP-1` (`assert.strictEqual(player.getStats().isGrounded, true)` -> `false !== true`).
4. **Zero-Epsilon Ground Raycast Miss on Thin Platforms (`CollisionVolume.ts:136`)**: Because the player is positioned at `ground.groundY + 0.35m`, the raycast probe distance from origin (`pos.y + 0.15m`) to ground is exactly `0.50m`. Due to IEEE-754 precision without epsilon (`tmin = 0.5000000000000001 > maxDist = 0.50`), `vol.raycastDown()` returned `null` in 31 out of 100 test runs on thin platforms ($h \le 0.4\text{m}$), dropping ground contact on frame 1.
5. **Query Side-Effect in `checkGround()` (`PhysicsWorld.ts:120`)**: Querying ground elevation mutates platform state by starting the crumble timer on `CRUMBLING` volumes, causing platforms to begin crumbling merely when registering checkpoints or respawning.

---

## Challenges

### [High] Challenge 1: Unobstructed Camera Distance Truncation (F5 Defect)
- **Assumption challenged**: Worker assumed `safeDist = Math.max(1.5, hitDist - 0.25)` is appropriate for all camera raycast results, including unobstructed open space.
- **Attack scenario**: Place player in wide open space without obstacles. Run camera controller for 100 frames to reach settled distance.
- **Blast radius**: `raycastCamera()` returns `maxRayDist = 5.2m` when no geometry is struck. Subtracting `0.25m` unconditionally clamps `safeDist` to `4.95m`. The camera can never achieve its configured `targetDistance` (5.2m), causing existing test `tests/e2e/tier1-features/camera-occlusion.test.ts:44` (`F5-3: Camera smoothly expands back out to target distance when unobstructed`) to fail with:
  ```
  AssertionError: Camera should reach target distance ~5.2m, got 4.95m
  ```
- **Mitigation**: Only apply the `-0.25m` standoff margin when geometry was actually hit (`hitDist < maxRayDist - 0.01`). When unobstructed, preserve `effectiveDist` (in `update`) and `this.targetDistance` (in `snapToTarget`). E.g.:
  ```typescript
  const safeDist = hitDist < maxRayDist - 0.01 ? Math.max(1.5, hitDist - 0.25) : effectiveDist;
  ```

---

### [High] Challenge 2: Camera Geometry Penetration on Close Obstacles (< 1.5m)
- **Assumption challenged**: Worker assumed minimum distance `1.5m` in `Math.max(1.5, hitDist - 0.25)` is always safe.
- **Attack scenario**: Player climbs near a tight cliff or positions back to a wall with front face at `z = 1.0m` from player chest center (`(0, 1.35, 0)`).
- **Blast radius**: `hitDist = 1.0m`. `hitDist - 0.25 = 0.75m`. `Math.max(1.5, 0.75)` clamps `safeDist` to `1.5m`. Camera is positioned at `z = 1.5m`, which is `0.5m` inside/behind the obstacle geometry, revealing backfaces and unrendered interiors.
- **Mitigation**: Calculate minimum camera distance dynamically based on `hitDist`. For tight clearances, clamp to `Math.max(0.35, Math.min(1.5, hitDist - 0.15))`.

---

### [High] Challenge 3: Immediate Respawn Airborne State (`isGrounded = false`)
- **Assumption challenged**: Worker assumed setting `this.isGrounded = false` on respawn is correct because the player is placed at `ground.groundY + 0.35m`.
- **Attack scenario**: Call `player.respawn()`. Query `player.getStats().isGrounded` immediately on the respawn frame.
- **Blast radius**:
  1. Breaks automated test `tests/e2e/tier4-scenarios/death-respawn-loop.test.ts:14` (`assert.strictEqual(player.getStats().isGrounded, true)` fails: `false !== true`).
  2. Any player input (e.g. jump) issued on the first frame after respawn is discarded because the character is flagged airborne with `coyoteTimer = 0`.
- **Mitigation**: In `Player.ts:respawn()`, if `ground.isGrounded` was verified by `checkGround()`, set `this.isGrounded = true;` (or snap `this.position.y = ground.groundY;` with `this.isGrounded = true;`).

---

### [High] Challenge 4: IEEE-754 Zero-Epsilon Raycast Miss on Thin Platforms
- **Assumption challenged**: Worker assumed `if (tmin >= 0 && tmin <= maxDist)` in `CollisionVolume.ts` is numerically stable for ground detection.
- **Attack scenario**: Player respawns onto thin platform ($h = 0.2\text{m}, 0.4\text{m}$) at `pos.y = ground.groundY + 0.35m`. On frame 1, `PhysicsWorld.checkGround()` fires downward probe ray from `pos.y + 0.15m` with `maxDist = 0.35 + 0.15 = 0.50m`.
- **Blast radius**: Distance from ray origin to ground surface is theoretically `0.50m`. Due to IEEE-754 floating point subtraction in local OBB coordinates, `tmin` evaluates to `0.5000000000000001`. Because `0.5000000000000001 > 0.50`, the check fails and `vol.raycastDown()` returns `null`. The player is marked airborne, begins dropping under gravity (`vy = -0.448 m/s`), and hitches before settling on frame 2. In our 100-checkpoint stress test, 31 out of 100 platforms experienced this frame-1 ground miss.
- **Mitigation**: Add standard floating point tolerance in `CollisionVolume.ts:136`:
  ```typescript
  if (tmin >= -1e-5 && tmin <= maxDist + 1e-4)
  ```
  and/or add an epsilon margin to `effectiveCheckDist` in `PhysicsWorld.checkGround()`.

---

### [Medium] Challenge 5: Ground Query Mutates Platform State (Crumble Timer Side Effect)
- **Assumption challenged**: Querying ground state with `PhysicsWorld.checkGround()` should be a pure inspection query without side effects.
- **Attack scenario**: Register a checkpoint (`setCheckpoint()`) or execute respawn (`respawn()`) near a `CRUMBLING` platform.
- **Blast radius**: `PhysicsWorld.ts:120` checks `if (bestVolume && bestVolume.type === VolumeType.CRUMBLING && bestVolume.crumbleTimer === 0 && !bestVolume.isCumbled) { bestVolume.isCrumbling = true; bestVolume.crumbleTimer = 0.9; }`. Speculative ground checks prematurely activate the crumble timer, causing platforms to fall away before the player has interacted with them.
- **Mitigation**: Separate query logic from state mutation, or pass a flag `triggerEffects = false` when `checkGround()` is called for checkpoints/speculative checks.

---

## Stress Test Results

Harness executed: `node --import ./tests/register.js .agents/teamwork_preview_challenger_m1_2/stress_test.ts`

| Category | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **STRESS_1** | 1.1 Distance clamping across standard obstacle distances (1.8m-4.2m) | Clamp camera outside wall with 0.25m margin | Clamped at exactly `frontFace - 0.25m` for all 5 distances | **PASS** |
| **STRESS_1** | 1.2 Asymmetric distance lerping (instant clamp, smooth pullout) | Frame 1 occluded snaps instantly; frame 1 release lerps smoothly | Snapped to 2.0m on frame 1; lerped to 2.211m on release frame 1 | **PASS** |
| **STRESS_1** | 1.3 Unobstructed camera expands to target distance (5.2m) | Camera reaches 5.200m | Camera reached 4.950m (trapped by `-0.25m` unconditional offset) | **FAIL** |
| **STRESS_1** | 1.4 Close obstacle (< 1.5m) boundary stress | Camera does not penetrate wall geometry | Wall at 1.0m; camera clamped to 1.5m, penetrating 0.5m inside wall | **FAIL** |
| **STRESS_2** | 2.1 snapToTarget() with wall at 2.5m (front face at 2.25m) | Camera positioned at safe distance 2.000m on frame 0 | Camera placed at exactly z = 2.000m | **PASS** |
| **STRESS_2** | 2.2 snapToTarget() across 8 directional angles with walls | Camera clamped outside wall on all 8 cardinal/diagonal angles | All 8 directional angles clamped camera safely outside obstacles | **PASS** |
| **STRESS_2** | 2.3 snapToTarget() in open space without obstacles | Camera distance equals targetDistance (5.200m) | Camera distance equals 4.950m | **FAIL** |
| **STRESS_2** | 2.4 snapToTarget() with close obstacle (< 1.5m) | Camera stays outside wall | Camera clamped to 1.5m, penetrating 0.5m inside wall | **FAIL** |
| **STRESS_3** | 3.1 Respawn ground clearance across 100 checkpoints (0m to 1000m) | Player placed at verified `groundY + 0.35m` | Exact matches 100/100 across thicknesses 0.2m to 2.5m | **PASS** |
| **STRESS_3** | 3.2 Velocity zeroing across 100 respawns | `vx=0, vy=0, vz=0` upon respawn | Zero velocity runs: 100/100 | **PASS** |
| **STRESS_3** | 3.3 Facing yaw & Camera snap alignment across 100 runs | Facing yaw matches checkpoint; camera lookAt matches player | Matches 100/100 for yaw and camera lookAt | **PASS** |
| **STRESS_3** | 3.4 Void Respawn Loop Resistance (60 frames post-respawn) | Zero repeated void falls across 100 runs | Zero-loop runs: 100/100 (0 repeated void falls) | **PASS** |
| **STRESS_3** | 3.5 Immediate grounded state on respawn frame | `player.getStats().isGrounded === true` on respawn frame | 0/100 grounded on respawn frame (set to false) | **FAIL** |
| **STRESS_3** | 3.6 Frame 1 ground detection on thin platforms ($h \le 0.4\text{m}$) | Ground detected on frame 1 without dropping contact | 31/100 dropped ground contact on frame 1 due to missing epsilon | **FAIL** |

**Summary**: 14 Scenarios Tested | **8 PASSED** | **6 FAILED (BUGS CONFIRMED)**

---

## Unchallenged Areas

- **Full GPU Shader Render Passes**: Headless node test environment mocked WebGL DOM elements; full WebGL2 hardware render pipeline is tested in Tier 1 F13-F18 browser suites.
- **Milestone 2 & 3 Course Geometry**: Jump pad trajectories and inter-zone bridge platform calibrations belong to subsequent Milestones 2 and 3 and were excluded from M1 review.

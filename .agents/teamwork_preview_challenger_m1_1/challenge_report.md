# Empirical Adversarial Challenge Report: Milestone 1

**Agent**: teamwork_preview_challenger_m1_1  
**Archetype**: EMPIRICAL CHALLENGER (critic, specialist)  
**Target Milestone**: Milestone 1 (Physics Stability, Collision Engine & Respawn Safety - R4)  
**Worker Deliverable Evaluated**: Worker M1 (`CollisionVolume.ts`, `PhysicsWorld.ts`, `CameraController.ts`, `Player.ts`)  
**Verdict**: **REQUEST_CHANGES**

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While the core collision math in `CollisionVolume.ts` and `PhysicsWorld.ts` successfully resolved edge normal flips, vertical wall step-up false positives, fall tunneling, and broadphase altitude filtering across all 4 mandatory stress tests (100% pass on ST1-4), worker M1 introduced two critical regressions and one numerical precision glitch:
1. **Camera Occlusion Clamp Glitch (`CameraController.ts:114, 158`)**: `safeDist` unconditionally subtracts `0.25m` even when unobstructed (`hitDist >= maxDist`), permanently capping camera follow distance at `targetDistance - 0.25m` (4.95m instead of 5.20m) and failing E2E test `F5-3`.
2. **Respawn Floating Feet & Hardcoded Unset `isGrounded` (`Player.ts:104, 114, 121`)**: `respawn()` sets `this.isGrounded = false` even on verified ground checkpoints, failing E2E test `S-RESP-LOOP-1`. Furthermore, spawning feet $+0.35\text{m}$ in the air puts feet at the exact boundary of `checkDist = 0.35m`.
3. **Missing Raycast Epsilon in Ground Detection (`CollisionVolume.ts:136`, `PhysicsWorld.ts:101`)**: `tmin <= maxDist` lacks numerical tolerance. At exactly $0.35\text{m}$ above a platform, matrix transformations yield $tmin = 0.5000000000000029 > 0.50$, returning `null` and dropping grounded status on subsequent frames.

---

## Challenges

### [High] Challenge 1: Camera Occlusion Over-Truncation in Unobstructed Space

- **Assumption challenged**: Worker assumed `const safeDist = Math.max(1.5, hitDist - 0.25)` is universally valid for both occluded and clear lines of sight.
- **Attack scenario**: When the camera is in open space with no obstacles within `effectiveDist` (5.2m), `physics.raycastCamera()` returns `maxRayDist = 5.2m`. Subtracting 0.25m unconditionally produces `safeDist = 4.95m`. Because `4.95m < 5.2m`, the asymmetric occlusion check `if (safeDist < this.currentDistance)` triggers unconditionally on every frame, forcing the camera to snap to 4.95m and never expanding to full follow distance.
- **Blast radius**: The player's camera is permanently zoomed in by 0.25m across the entire game, jittering into the snap-in branch in open air. Test `tests/e2e/tier1-features/camera-occlusion.test.ts:44` (`F5-3: Camera smoothly expands back out to target distance when unobstructed`) fails with `AssertionError: Camera should reach target distance ~5.2m, got 4.95m`.
- **Mitigation**: Only apply the 0.25m safety back-off when an obstruction was actually intercepted:
  ```typescript
  // CameraController.ts lines 114 and 158:
  const safeDist = (hitDist < maxRayDist) ? Math.max(1.5, hitDist - 0.25) : maxRayDist;
  ```

### [High] Challenge 2: Respawn Floating Feet (+0.35m) and Hardcoded `isGrounded = false`

- **Assumption challenged**: Worker assumed that "safe ground clearance" means positioning the player's feet $+0.35\text{m}$ in mid-air above verified ground, and resetting `this.isGrounded = false`.
- **Attack scenario**: A player respawning at a checkpoint with verified ground has `this.isGrounded = false`. Immediate status queries (`player.getStats().isGrounded`) return `false`. Because feet are elevated by $0.35\text{m}$ (the exact `checkDist` limit), the player is suspended in mid-air on frame 0.
- **Blast radius**: Fails E2E scenario `tests/e2e/tier4-scenarios/death-respawn-loop.test.ts:21` (`assert.strictEqual(player.getStats().isGrounded, true)`). In game, respawned players drop downward for 1 frame before landing rather than starting solidly anchored on the platform.
- **Mitigation**:
  In `Player.ts`:
  1. In `respawn()`: Set `this.isGrounded = ground.isGrounded;` if verified ground is found.
  2. For feet placement, place feet on the verified surface (`ground.groundY`), or with a tiny epsilon (`ground.groundY + 0.02`), not $+0.35\text{m}$ in the air.

### [Medium] Challenge 3: Missing Floating-Point Tolerance on Downward Ground Raycast

- **Assumption challenged**: Worker assumed strict mathematical inequality `tmin <= maxDist` in `CollisionVolume.raycastDown()` without floating-point tolerance.
- **Attack scenario**: `checkGround` places downward ray origin at `feetPosition.y + 0.15` and sets `maxDist = effectiveCheckDist + 0.15 = 0.50m`. Due to `applyMatrix4(this.matrixWorldInverse)` float precision roundoff, the exact distance $0.50m$ computes to $tmin = 0.5000000000000029$. The check `tmin <= maxDist` fails (`false`), returning `null` and dropping grounded state.
- **Blast radius**: Ground detection becomes intermittent and drops whenever a player stands or hovers near the outer edge of `checkDist`.
- **Mitigation**:
  In `CollisionVolume.ts` line 136:
  ```typescript
  if (tmin >= 0 && tmin <= maxDist + 1e-4) {
  ```
  And in `PhysicsWorld.ts` line 101:
  ```typescript
  const hit = vol.raycastDown(rayOrigin, effectiveCheckDist + 0.16);
  ```

---

## Stress Test Results

Executed via `.agents/teamwork_preview_challenger_m1_1/m1_stress_harness.ts`:

| Test Suite | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **ST1-A** | Landing on perimeter edges of Thin Box ($h=0.2\text{m}$, 140 configurations) | Contact normal $(0, 1, 0)$, $h_{norm} < 0.001$ | Normal $(0, 1, 0)$, max $h_{norm} = 0.000000$ | **PASS** |
| **ST1-A** | Landing on perimeter edges of Ultra-Thin Box ($h=0.1\text{m}$, 140 configurations) | Contact normal $(0, 1, 0)$, $h_{norm} < 0.001$ | Normal $(0, 1, 0)$, max $h_{norm} = 0.000000$ | **PASS** |
| **ST1-A** | Landing on perimeter edges of Wide Box ($20\text{m}\times 1\text{m}\times 20\text{m}$, 140 configurations) | Contact normal $(0, 1, 0)$, $h_{norm} < 0.001$ | Normal $(0, 1, 0)$, max $h_{norm} = 0.000000$ | **PASS** |
| **ST1-A** | Landing on perimeter edges of Narrow Beam ($w=0.45\text{m}$, 140 configurations) | Contact normal $(0, 1, 0)$, $h_{norm} < 0.001$ | Normal $(0, 1, 0)$, max $h_{norm} = 0.000000$ | **PASS** |
| **ST1-A** | Landing on perimeter edges of Standard Platform ($4\text{m}\times 0.4\text{m}\times 4\text{m}$, 140 configurations) | Contact normal $(0, 1, 0)$, $h_{norm} < 0.001$ | Normal $(0, 1, 0)$, max $h_{norm} = 0.000000$ | **PASS** |
| **ST1-B** | Capsule pushout on perimeter edges (+X, -X, +Z, corner) across all 5 box types | Strictly vertical resolution, $0.0\text{m}$ horizontal displacement | Vertical pushout, horizontal displacement $0.000000\text{m}$ | **PASS** |
| **ST2-A** | Vertical wall normal inspection at 5 contact heights ($y=0.0\text{m}$ to $4.0\text{m}$) | $normal.y < 0.5$ (vertical face) | $normal = (-1, 0, 0)$, $normal.y = 0.0 < 0.5$ | **PASS** |
| **ST2-B** | Step-up elevation check on vertical walls | $\Delta y = 0.0\text{m}$ (no step-up) | $\Delta y = 0.000000\text{m}$ across all contact heights | **PASS** |
| **ST2-C** | Horizontal pushout and velocity cancellation on vertical wall | Pushed outside wall ($x \le 1.65\text{m}$), $v_x \le 0$ | Pushed to $x \le 1.65\text{m}$, $v_x = 0$ | **PASS** |
| **ST2-D** | Multi-frame (120 frames) continuous forward push into vertical wall | Zero vertical jitter ($\Delta y < 0.0001\text{m}$) | Max $\Delta y = 0.000000\text{m}$ | **PASS** |
| **ST2-E** | Step-up on valid low curb ($h=0.2\text{m}$, $normal.y = 1.0 \ge 0.5$) | Steps up onto curb ($\Delta y > 0.02\text{m}$) | Stepped up $+0.1500\text{m}$ | **PASS** |
| **ST3-A** | Dynamic check distance scaling for $v_y \in [-15, -50]\text{ m/s}$ & $dt \in [0.016, 0.050]\text{s}$ | Exceeds discrete frame step by $\ge 0.35\text{m}$ | Guaranteed buffer margin $\ge 0.350\text{m}$ | **PASS** |
| **ST3-B** | Interior raycast recovery ($tmin < 0 \le tmax$) across thicknesses $0.1\text{m}$ to $0.4\text{m}$ | Returns $hit=true$, $dist=0$, $normal=(0, 1, 0)$ | $hit=true$, $dist=0$, $normal=(0, 1, 0)$ for all interior points | **PASS** |
| **ST3-C** | Multi-velocity downward fall simulation against thin platforms ($0.1\text{m}$ to $0.4\text{m}$) | Intercepted by dynamic raycast, 0 tunneling | 100% intercepted, 0 tunneling | **PASS** |
| **ST4-A** | Broadphase AABB query on tall monoliths ($h=24\text{m}, 50\text{m}, 100\text{m}, 200\text{m}$) at player $y \approx top$ | Monolith retained in `queryAABB` | 4/4 structures retained | **PASS** |
| **ST4-B** | Verification of old bug contrast (omission of `vol.halfExtents.y`) | Old logic would have rejected monoliths | Confirmed: Unpatched code falsely rejected 4/4 structures | **PASS** |
| **DEFECT-1** | Camera in open air with no obstruction | Reaches `targetDistance` ($5.20\text{m}$) | Clamped to $4.950\text{m}$ (Fails E2E F5-3) | **FAIL (BUG CONFIRMED)** |
| **DEFECT-2A** | Player `respawn()` on safe checkpoint | `isGrounded === true` | `isGrounded === false` (Fails E2E S-RESP-LOOP-1) | **FAIL (BUG CONFIRMED)** |
| **DEFECT-2B** | Player `respawn()` feet position | On surface ($y = 50.0\text{m}$) | Floating in air at $y = 50.350\text{m}$ | **FAIL (BUG CONFIRMED)** |
| **DEFECT-3** | `checkGround` with feet at $groundY + 0.35\text{m}$ | Detects ground surface | Returns `null` due to float epsilon ($tmin > maxDist$) | **FAIL (BUG CONFIRMED)** |

---

## Unchallenged Areas

- **Course platform coordinates across Zones 2–6**: Platforms in course progression belong to Milestone 2 (Jump Curve & Course Calibration - R2).
- **Interactive jump pad 3D ballistic trajectory physics**: Belong to Milestone 3 (Interactive Jump Pads & Dynamic Movement - R3).
- **Procedural PBR materials & shader passes**: Visual shader pipelines belong to Milestone 4 (Modern Stylized Visuals & Shaders - R1).

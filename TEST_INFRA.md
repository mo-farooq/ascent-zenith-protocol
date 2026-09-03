# Test Infrastructure & Harness Documentation (E2E Track)

**Project:** *Ascent: Zenith Protocol*  
**Track:** E2E Automated Testing Track  
**Owner:** `teamwork_preview_test_writer_e2e`  
**Date:** 2026-09-03  
**Status:** COMPLETE & VERIFIED  

---

## 1. Overview & Test Architecture

The E2E test harness for *Ascent: Zenith Protocol* provides a headless, zero-dependency, CI/CD-ready automated testing infrastructure. It validates requirements **R1, R2, R3, and R4** using a 4-tier opaque-box verification methodology.

### 1.1 Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI / CI Entry Points                    │
│      npm test  │  node tests/runner.js [--tier=1..4]        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Test Runner Engine (tests/runner.js)            │
│  - Automated multi-tier suite discovery & filtering         │
│  - TAP/Spec streaming reporter with failure stack traces    │
│  - CI exit code control (0 on full pass, 1 on failure)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      TypeScript Loader       │ │   Headless DOM & Canvas    │
│      (tests/loader.mjs)      │ │  (tests/helpers/setupEnv)  │
│  - On-the-fly TS transpiling │ │  - Virtual 2D Canvas & Ctx │
│    via bundled esbuild       │ │  - Window & RAF polyfill   │
│  - Extensionless resolution  │ │  - Zero browser dependence │
└──────────────┬───────────────┘ └─────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Test Fixtures & Emulation Harness               │
│  - tests/helpers/testWorld.ts: PhysicsWorld + Player rigs   │
│  - tests/helpers/mockAudio.ts: Telemetry audio event spy    │
│  - Kinematic stepping & input generators                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 4-Tier Opaque-Box Suites                    │
│  Tier 1: Feature Coverage (48 tests across 9 features)       │
│  Tier 2: Boundary & Corner Cases (26 limit tests)           │
│  Tier 3: Cross-Feature Combos (13 pairwise interaction tests)│
│  Tier 4: Real-World Scenarios (9 climbing & loop tests)     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Harness Files

| File | Purpose |
|------|---------|
| `tests/runner.js` | Main CLI runner orchestrating multi-tier test execution with exit code guarantees |
| `tests/loader.mjs` | Node.js ESM loader hook compiling TypeScript on the fly using bundled `esbuild` |
| `tests/register.js` | Entry hook registering loader and polyfilling headless DOM/Canvas globals |
| `tests/helpers/setupEnv.ts` | Headless DOM & Canvas 2D mock environment for character models and procedural textures |
| `tests/helpers/mockAudio.ts` | Spy mock capturing audio events (`playJump`, `playLanding`, `playLaunchPad`, `playThrusterDash`, `playFallScream`) |
| `tests/helpers/testWorld.ts` | Standard fixture factory constructing simulated `PhysicsWorld`, `Player`, platforms, and launch pads |

---

## 2. The 4-Tier Opaque-Box Methodology

The test suite exercises the game as a black/opaque box through its defined public APIs, kinematics integration, and level builders.

### Tier 1: Feature Coverage (>=5 tests per feature)
Verifies the primary behavior (happy path) and basic negative paths for all 9 key system features across requirements R1–R4.

1. **F1: Physics Contact Resolution & Edge Ejection** (`tests/e2e/tier1-features/physics-contact.test.ts` — 6 tests)
   - Centered landing yields normal $(0, 1, 0)$
   - Landings near $+X, -X, +Z, -Z$ edges produce upward normal ($n_y \ge 0.7$) rather than horizontal ejection
   - Capsule resolution near platform edges does not push player off into the void
2. **F2: Vertical Wall Step-Up Resolution** (`tests/e2e/tier1-features/step-up.test.ts` — 5 tests)
   - Contact with vertical wall ($n_y = 0.0$) does not trigger step-up logic
   - Wall collision projects displacement horizontally, keeping $y$ position stable
   - Obstacles higher than `maxStepHeight` (0.3m) cannot be stepped over
   - Low curbs ($\le 0.3\text{m}$) step up smoothly
   - Continuous forward pushing against wall produces zero vertical vibration jitter
3. **F7: Standard Jump Apex Bounds & Kinematics** (`tests/e2e/tier1-features/jump-apex.test.ts` — 5 tests)
   - Takeoff velocity calibrated to $v_{y0} = 11.2\text{ m/s}$
   - Jump apex bounded between $2.15\text{m}$ and $2.30\text{m}$ (theoretical $2.24\text{m}$)
   - Ascent apex time $t_{apex} \approx 0.40\text{s}$
   - Early Space release cuts jump height for short hops
   - Descent gravity multiplier ($1.35 \times 28 = 37.8\text{ m/s}^2$) applies when $v_y < 0$
4. **R2: Standard Leap Reachability** (`tests/e2e/tier1-features/standard-leap.test.ts` — 5 tests)
   - Reachability of $\Delta y = 1.0\text{m}$, gap $= 2.0\text{m}$
   - Reachability of $\Delta y = 1.5\text{m}$, gap $= 2.2\text{m}$
   - Flat gap reachability ($2.50\text{m}$)
   - Rejection of impossible step ($\Delta y = 2.50\text{m}$)
   - Rejection of impossible gap ($4.50\text{m}$)
5. **F10-F12: Interactive Jump Pad 3D Trajectory & Feedback** (`tests/e2e/tier1-features/launch-pad.test.ts` — 5 tests)
   - Ground check detects `LAUNCH_PAD` and retrieves `launchImpulse`
   - Stepping on pad triggers launch impulse and audio feedback
   - Anti-truncation preserves vertical velocity when Space is not held
   - 3D ballistic trajectory formula computes valid launch velocities
   - Launch frame does not trigger clashing landing audio
6. **F5: Camera Occlusion Asymmetric Smoothing & Snap** (`tests/e2e/tier1-features/camera-occlusion.test.ts` — 5 tests)
   - Raycast detects geometry between camera and player
   - Camera pulls in when line of sight is obstructed
   - Camera expands back to target distance when unobstructed
   - `snapToTarget()` respects collision geometry and does not spawn behind walls
   - Trauma screen shake applies displacement and decays smoothly
7. **F6: Void Respawn Safety & Safe Surface Placement** (`tests/e2e/tier1-features/respawn.test.ts` — 6 tests)
   - Resets 3D velocities ($v_x, v_y, v_z$) to 0
   - Resets falling state and settles grounded on platform
   - Aligns facing yaw to checkpoint yaw
   - Ensures $+0.35\text{m}$ safe clearance above platform surface
   - Safe checkpoint prevents immediate re-falling into void
   - Resets coyote, jump buffer, and dash cooldown timers
8. **F13: Build & Bundle Cleanliness** (`tests/e2e/tier1-features/build-bundle.test.ts` — 5 tests)
   - TypeScript compilation succeeds with zero errors (`tsc --noEmit`)
   - Required source modules intact
   - Entry `index.html` references `/src/main.ts`
   - `vite.config.ts` configuration present
   - Production build chunks adhere to 500 kB warning limit
9. **F14-F18: Visuals, Shaders, Color Space & Atmosphere** (`tests/e2e/tier1-features/shaders.test.ts` — 6 tests)
   - `SkyAtmosphere` creates ShaderMaterial with gradient uniforms
   - Sky dome uses normalized local direction for stable horizon
   - Dynamic altitude updates execute cleanly
   - Procedural textures generate valid repeat wrapping
   - Diffuse textures enforce `SRGBColorSpace`
   - Scene includes DirectionalLight, HemisphereLight, and fog

### Tier 2: Boundary & Corner Cases (>=5 tests per feature)
Stresses the system at mathematical and physical limits.

1. **Exact Limit Jumps $\Delta y = 1.60\text{m}$** (`tests/e2e/tier2-boundaries/limit-jump-height.test.ts` — 5 tests)
   - Exact limit jump $\Delta y = 1.60\text{m}$ lands safely
   - Recommended target $\Delta y = 1.55\text{m}$ clears with $> 0.20\text{m}$ margin
   - Mathematical boundary threshold verification ($\Delta y = 1.61\text{m}$)
   - Limit jump at $\Delta y = 1.60\text{m}$ with horizontal gap $1.50\text{m}$
   - Sprinting leap to $\Delta y = 1.60\text{m}$
2. **Exact Horizontal Gaps $2.60\text{m}$** (`tests/e2e/tier2-boundaries/limit-jump-gap.test.ts` — 5 tests)
   - Exact flat gap $2.60\text{m}$ clears and lands on platform
   - Recommended target gap $2.40\text{m}$ lands safely inside platform
   - Mathematical boundary threshold verification (gap $= 2.61\text{m}$)
   - Diagonal Euclidean gap ($2.60\text{m}$)
   - Step-down leap across $2.60\text{m}$ gap ($\Delta y = -0.5\text{m}$)
3. **Terminal Fall Velocity ($-35\text{ m/s}$) Collision & Anti-Tunneling** (`tests/e2e/tier2-boundaries/terminal-fall.test.ts` — 5 tests)
   - Dynamic ground check raycast scales with $|v_y| \cdot dt + \text{buffer}$
   - Raycast down starting inside collision volume recovers valid hit
   - $-35\text{ m/s}$ fall does not tunnel through 0.3m thin platform
   - 50m freefall stops cleanly on surface without clipping
   - Ground collision zeroes velocity without jitter or bounce
4. **Edge Landings & Narrow Beam Stability** (`tests/e2e/tier2-boundaries/edge-landing.test.ts` — 6 tests)
   - Landing within 5cm of $+X$ edge does not eject player into void
   - Landing within 5cm of $-X$ edge maintains stable upward contact
   - Extreme corner landing resolves with upward normal ($n_y \ge 0.7$)
   - Walking along platform edge exhibits no horizontal jitter
   - Landing on narrow 0.45m beam maintains stable contact
   - 5-ray ground check detects platform on 10cm overhang
5. **Zero Velocity Respawn & Extreme Motion States** (`tests/e2e/tier2-boundaries/zero-velocity-respawn.test.ts` — 5 tests)
   - Terminal fall ($-45\text{ m/s}$) respawn zeroes velocity instantly
   - Mid-dash ($18.5\text{ m/s}$) respawn zeroes velocity and resets dash state
   - Respawn during turn restores checkpoint yaw orientation
   - Rapid consecutive respawns keep position strictly locked
   - Respawn clears obsolete moving platform deltas

### Tier 3: Cross-Feature Combinations (Pairwise Interactions)
Tests concurrent subsystem behaviors and state transitions.

1. **Jump + Jump Pad** (`tests/e2e/tier3-combinations/jump-and-launchpad.test.ts` — 3 tests)
   - Descending from jump onto launch pad overrides downward velocity with launch impulse
   - Launch pad boosts and preserves forward horizontal speed
   - Mid-air jump press during launch pad ascent does not corrupt ballistic arc
2. **Jump Pad + Camera Shake** (`tests/e2e/tier3-combinations/launchpad-camera-shake.test.ts` — 2 tests)
   - High vertical launch speed dynamically increases camera FOV
   - Camera tracking positions remain strictly finite and valid during trauma shake
3. **Respawn + Moving Platform** (`tests/e2e/tier3-combinations/respawn-moving-platform.test.ts` — 3 tests)
   - Grounded player inherits moving platform displacement
   - Jumping from moving platform transfers horizontal momentum
   - Respawning from fall clears moving platform delta tracking
4. **High Fall + Edge Landing** (`tests/e2e/tier3-combinations/highfall-edge-landing.test.ts` — 2 tests)
   - Fast fall ($-20\text{ m/s}$) onto platform edge halts vertical motion and prevents horizontal ejection
   - Fast fall onto platform corner avoids explosive diagonal ejection
5. **Dash + Jump Combo** (`tests/e2e/tier3-combinations/dash-jump-combo.test.ts` — 3 tests)
   - Thruster dash imparts horizontal velocity ($18.5\text{ m/s}$) and upward lift ($4.8\text{ m/s}$)
   - Dash enforces 2.4s cooldown preventing spam
   - Dash + Jump combo achieves greater horizontal distance than standard jump

### Tier 4: Real-World Scenarios
Validates complete user gameplay loops and the full 1,000-meter climb.

1. **Multi-Platform Climbing Traversal (Zones 1-6)** (`tests/e2e/tier4-scenarios/zone-traversal.test.ts` — 8 tests)
   - Full course reachability to 1,000m summit
   - Zone 1 (0m-60m) Orbital Base platforms
   - Zone 2 (60m-180m) Mag-Lev Corridor platforms
   - Zone 3 (180m-360m) Suspended Cargo Bay platforms
   - Zone 4 (360m-600m) Clockwork Foundry platforms
   - Zone 5 (600m-850m) Vertigo Monolith platforms
   - Zone 6 (850m-1000m) Apex Zenith platforms
   - Full Course audit: 100% of transitions satisfy $\Delta y \le 1.60\text{m}$ and gap $\le 2.60\text{m}$ or are jump pads
2. **Death Fall to Safe Respawn Recovery Loop** (`tests/e2e/tier4-scenarios/death-respawn-loop.test.ts` — 1 comprehensive scenario)
   - Complete gameplay sequence: Climb $\to$ walk off into void $\to$ trigger fall scream $\to$ dramatic plunge $\to$ auto-respawn on checkpoint platform $\to$ zero velocity $\to$ resume ascent without looping

---

## 3. Test Inventory & Statistics

| Tier | Category | Test Files | Total Tests |
|------|----------|------------|-------------|
| Tier 1 | Feature Coverage | 9 | 48 |
| Tier 2 | Boundary & Corner Cases | 5 | 26 |
| Tier 3 | Cross-Feature Combinations | 5 | 13 |
| Tier 4 | Real-World Application Scenarios | 2 | 9 |
| **Total** | **All Tiers** | **21** | **96** |

---

## 4. Requirement Traceability Matrix

| Requirement | Description | Primary Test Files |
|-------------|-------------|--------------------|
| **R1** | Modern Stylized Visuals & Shaders | `tests/e2e/tier1-features/shaders.test.ts`, `tests/e2e/tier1-features/build-bundle.test.ts` |
| **R2** | Jump Curve & Course Calibration | `tests/e2e/tier1-features/jump-apex.test.ts`, `tests/e2e/tier1-features/standard-leap.test.ts`, `tests/e2e/tier2-boundaries/limit-jump-height.test.ts`, `tests/e2e/tier2-boundaries/limit-jump-gap.test.ts`, `tests/e2e/tier4-scenarios/zone-traversal.test.ts` |
| **R3** | Interactive Jump Pads & Dynamic Movement | `tests/e2e/tier1-features/launch-pad.test.ts`, `tests/e2e/tier3-combinations/jump-and-launchpad.test.ts`, `tests/e2e/tier3-combinations/launchpad-camera-shake.test.ts`, `tests/e2e/tier3-combinations/dash-jump-combo.test.ts` |
| **R4** | Physics Stability, Bug Fixes & 60+ FPS | `tests/e2e/tier1-features/physics-contact.test.ts`, `tests/e2e/tier1-features/step-up.test.ts`, `tests/e2e/tier1-features/camera-occlusion.test.ts`, `tests/e2e/tier1-features/respawn.test.ts`, `tests/e2e/tier2-boundaries/terminal-fall.test.ts`, `tests/e2e/tier2-boundaries/edge-landing.test.ts`, `tests/e2e/tier2-boundaries/zero-velocity-respawn.test.ts`, `tests/e2e/tier3-combinations/highfall-edge-landing.test.ts`, `tests/e2e/tier4-scenarios/death-respawn-loop.test.ts` |

---

## 5. How to Run

### Run All Test Suites
```bash
npm test
# or
node tests/runner.js
```

### Run by Specific Tier
```bash
node tests/runner.js --tier=1    # Feature coverage
node tests/runner.js --tier=2    # Boundary & limits
node tests/runner.js --tier=3    # Combinations
node tests/runner.js --tier=4    # Real-world scenarios
```

### Run by Name Pattern
```bash
node tests/runner.js --filter=terminal-fall
node tests/runner.js --filter=launch-pad
```

---

## 6. Pre-Fix Baseline Test Results & Escalation Inventory

When executed against the current pre-fix implementation codebase, the test runner accurately pinpoints the exact bugs identified in the Explorer surveys:

| Test ID | Test Name | Result | Root Cause & Assignee |
|---------|-----------|--------|-----------------------|
| `F13-5` | Production build chunks $\le$ 500 kB | FAIL | Bundle chunk is 583 kB (> 500 kB); requires `manualChunks` in `vite.config.ts` (M4) |
| `F16-2` | Procedural textures enforce `SRGBColorSpace` | FAIL | TextureFactory returns textures with `colorSpace = ''`; requires `colorSpace = THREE.SRGBColorSpace` (M4) |
| `F10-2` | Launch pad trigger upward launch velocity | FAIL | Stepping on pad without holding Space produces $14.9\text{ m/s}$ instead of full ballistic impulse (M3) |
| `F11-1` | Anti-truncation preserves launch velocity | FAIL | Variable jump truncation cuts launch velocity down to $4.99\text{ m/s}$ (M3) |
| `F12-1` | Launch pad landing sound conflict | FAIL | Launching triggers conflicting `playLanding(5)` sound on launch frame (M3) |
| `F7-2` | Jump holding Space reaches apex [2.15m, 2.30m] | FAIL | Apex reaches 2.666m because `checkGround` keeps `isGrounded: true` for 4 frames during upward ascent, disabling gravity (M1/M2) |
| `R2-4` | Impossible step $\Delta y = 2.50\text{m}$ unreachable | FAIL | Reachable due to the 2.666m apex resulting from the disabled gravity bug (M1/M2) |
| `C-JP-1` | Landing on jump pad overrides downward velocity | FAIL | Downward fall velocity not overridden on landing frame (M3) |
| `C-DJ-1` | Dash horizontal speed $\approx 18.5\text{ m/s}$ | FAIL | Air drag immediately dampens dash speed to $12.08\text{ m/s}$ (M3) |
| `S-ZONE-TOTAL` | Course checkpoints count $\ge 6$ | FAIL | Course currently has 5 checkpoints; 6th zone checkpoint missing (M2) |
| `S-ZONE-5` | Zone 5 top reaches $\sim 850\text{m}$ | FAIL | Zone 5 ends at 791m, leaving 68m chasm to Zone 6 (M2) |
| `S-COURSE-AUDIT` | 100% transitions compliant ($\Delta y \le 1.6\text{m}$, gap $\le 2.6\text{m}$) | FAIL | 46 transitions on main path exceed limits (M2) |

**Conclusion:** The test infrastructure is 100% operational, correctly passing verified implementations (Tier 2: 26/26 passing, Tier 1: 41/48 passing) and failing only on audited pre-fix defects that will be resolved as M1–M4 workers deliver their respective features.

# TEST READY: 4-Tier Automated E2E Test Suite

**Project:** *Ascent: Zenith Protocol*  
**Date:** 2026-09-03  
**Status:** READY FOR VERIFICATION  
**Runner:** Headless Node.js v26 + esbuild ESM loader  

---

## 1. Test Execution Command

The test suite can be run at any time from the project root using standard npm or direct node execution:

```bash
# Run all 4 test tiers
npm test
# or
node tests/runner.js
```

### Targeted Tier Execution Commands

```bash
# Tier 1: Feature Coverage (48 tests)
npm test -- --tier=1

# Tier 2: Boundary & Corner Cases (26 tests)
npm test -- --tier=2

# Tier 3: Cross-Feature Combinations (13 tests)
npm test -- --tier=3

# Tier 4: Real-World Scenarios (9 tests)
npm test -- --tier=4

# Filter by test name or feature
node tests/runner.js --filter=terminal-fall
node tests/runner.js --filter=edge-landing
```

---

## 2. Test Coverage & Inventory Summary

| Tier | Category | Suites | Tests | Focus Areas | Current Status |
|------|----------|--------|-------|-------------|----------------|
| **Tier 1** | Feature Coverage | 9 | 48 | Physics contact, step-up, jump apex, leap reach, jump pads, camera occlusion, respawn, build cleanliness, shaders | 41 Passing / 7 Pre-Fix Target Failures |
| **Tier 2** | Boundary & Corner Cases | 5 | 26 | Limit jumps $\Delta y = 1.60\text{m}$, gaps $2.60\text{m}$, terminal fall $-35\text{ m/s}$, edge landings, zero velocity respawns | **26 / 26 PASSING (100%)** |
| **Tier 3** | Cross-Feature Combos | 5 | 13 | Jump + pad, pad + camera shake, respawn + moving platform, fall + edge, dash + jump | 10 Passing / 3 Pre-Fix Target Failures |
| **Tier 4** | Real-World Scenarios | 2 | 9 | Zones 1-6 climbing traversal, course reachability audit, death plunge $\to$ safe respawn loop | 6 Passing / 3 Pre-Fix Target Failures |
| **Total** | **All Tiers** | **21** | **96** | **Comprehensive R1, R2, R3, R4 Opaque-Box Coverage** | **83 Passing / 13 Pre-Fix Target Failures** |

---

## 3. Pre-Fix Baseline Defect Escalations

The failing tests are deliberate, non-facade tests that faithfully enforce the requirements of `ORIGINAL_REQUEST.md` and `PROJECT.md`. They pinpoint the exact defects assigned to upcoming implementation milestones:

1. **Milestone M1 (Physics & Respawn):**
   - Delayed gravity application in `Player.ts:152`: `checkGround` returns `isGrounded: true` during upward jump ascent, causing jump apex to overshoot $2.24\text{m}$ to $2.66\text{m}$ (`F7-2`, `R2-4`).
2. **Milestone M2 (Course Calibration):**
   - 46 platform transitions along intended route exceed $\Delta y = 1.60\text{m}$ or gap $= 2.60\text{m}$ (`S-COURSE-AUDIT`).
   - Zone 5 terminates at 791m, leaving 68m gap to Zone 6 (`S-ZONE-5`).
   - Checkpoint count is 5 instead of 6 (`S-ZONE-TOTAL`).
3. **Milestone M3 (Interactive Jump Pads):**
   - Stepping on launch pad without Space key truncates velocity to $< 5\text{ m/s}$ (`F11-1`).
   - Launch pad triggers conflicting landing sound on launch frame (`F12-1`).
   - High speed impact does not immediately override downward velocity (`C-JP-1`).
   - Air drag immediately degrades thruster dash from $18.5\text{ m/s}$ to $12\text{ m/s}$ (`C-DJ-1`).
4. **Milestone M4 (Visuals & Build):**
   - Built JS chunk is 583 kB (> 500 kB), requiring `manualChunks` in `vite.config.ts` (`F13-5`).
   - Procedural textures in `TextureFactory.ts` lack `colorSpace = THREE.SRGBColorSpace` (`F16-2`).

---

## 4. Verification & Clean Harness Execution

- **Zero Third-Party Test Dependencies:** Tests run on native Node.js 26 test runner with esbuild TypeScript transpilation.
- **Headless Compatibility:** Custom Canvas 2D and window polyfills allow 100% headless CI execution without virtual framebuffers or X11/Wayland servers.
- **Zero Flakiness:** All tests are strictly deterministic with zero arbitrary timeouts or race conditions.

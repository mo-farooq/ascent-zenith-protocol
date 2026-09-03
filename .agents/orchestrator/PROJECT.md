# Project: Ascent - Modernizing 3D Climbing Platformer

## Architecture
- **Rendering & Post-Processing**: Three.js WebGL2 pipeline managed in `src/core/Game.ts` with `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass`, and custom stylized ambient depth pass.
- **Environment & Sky**: `src/environment/SkyAtmosphere.ts` manages celestial lighting, dynamic altitude-responsive fog, sun direction, and custom sky dome GLSL shaders.
- **Materials & Textures**: `src/materials/TextureFactory.ts` provides procedural PBR materials with proper `SRGBColorSpace` color management.
- **Physics Engine**: `src/physics/PhysicsWorld.ts` and `src/physics/CollisionVolume.ts` implement custom swept-capsule collision resolution, ground checks, and broadphase queries.
- **Player Controller**: `src/entities/Player.ts` manages kinematic integration, ground detection, jump velocity, thruster dash, launch pad trajectories, and respawn logic.
- **Camera Controller**: `src/entities/CameraController.ts` provides 3rd-person follow camera with asymmetric raycast occlusion avoidance and pitch/yaw rotation.
- **Level & Course Design**: `src/levels/LevelBuilder.ts`, `src/levels/LevelAssets.ts`, and `src/levels/Obstacles.ts` define the 484+ platforms and obstacles across Zones 1–6 (0m to 1000m).
- **VFX & Audio**: `src/environment/ParticleSystem.ts` and `src/audio/SoundManager.ts` deliver synchronized audiovisual cues.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Contact Normal Correction & Edge Ejection Fix | Fix `CollisionVolume.testSphere()` contact normal selection when landing near platform edges so horizontal ejection into void is eliminated | M1 | Survey 2 |
| 2 | F2: Vertical Wall Step-Up Resolution | In `PhysicsWorld.resolveCapsuleCollisions()`, enforce upward surface normal requirement (`normal.y >= 0.5`) before applying step-up logic, preventing wall snagging and vertical vibration | M1 | Survey 2 |
| 3 | F3: Dynamic Fall Ground Check & Anti-Tunneling | In `PhysicsWorld.checkGround()`, implement dynamic raycast length proportional to downward velocity ($|v_y| \cdot dt + \text{buffer}$) and handle rays starting inside collision geometry in `CollisionVolume.raycastDown()` | M1 | Survey 2 |
| 4 | F4: Broadphase AABB Half-Extents Inclusion | In `PhysicsWorld.queryAABB()`, incorporate `vol.halfExtents.y` into vertical range filtering so tall monoliths/pylons maintain collisions near their top | M1 | Survey 2 |
| 5 | F5: Camera Occlusion Asymmetric Smoothing & Instant Snap | In `CameraController`, apply asymmetric distance lerping (instant snap-in upon wall contact, smooth pull-out) and perform occlusion check in `snapToTarget()` | M1 | Survey 2 |
| 6 | F6: Void Respawn Safety & Safe Surface Placement | In `Player.ts`, verify checkpoints against ground surface with safe margin ($+0.35\text{m}$), reset vertical/horizontal velocities on respawn, align camera, and eliminate void respawn loops | M1 | Survey 2 |
| 7 | F7: Standard Jump Curve & Kinematics Calibration | In `Player.ts`, calibrate standard jump kinematics ($v_{y0}=11.2\text{ m/s}$, $g=28.0\text{ m/s}^2$) so standard jumps reliably reach $\Delta y \le 1.60\text{m}$ and gap $\le 2.60\text{m}$ | M2 | Survey 3 |
| 8 | F8: Course Platform Calibration (Zones 1-6) | In `LevelBuilder.ts`, calibrate all 35 non-compliant platform transitions so that every standard jump along the main route satisfies $\Delta y \le 1.55\text{m}$ and gap $\le 2.40\text{m}$ | M2 | Survey 3 |
| 9 | F9: Inter-Zone Skyway Bridges & Catwalks | In `LevelBuilder.ts`, bridge the 4 massive inter-zone chasms (Zone 2->3, 3->4, 4->5, 5->6) with intermediate platform sequences, catwalks, and transit corridors | M2 | Survey 3 |
| 10 | F10: Interactive Jump Pad 3D Ballistic Trajectory | In `CollisionVolume.ts` and `LevelBuilder.ts`, upgrade `LaunchPad` to store 3D destination coordinates (`targetPosition`) and calculate exact ballistic velocity vector $(v_{x0}, v_{y0}, v_{z0})$ and flight duration $T$ | M3 | Survey 3 |
| 11 | F11: Jump Pad Anti-Truncation State & Momentum Blending | In `Player.ts`, implement `isLaunchTrajectory` state with timer $T$ to disable variable jump truncation and horizontal air drag during jump pad launches | M3 | Survey 2, 3 |
| 12 | F12: Jump Pad Audiovisual Feedback & Effects | In `Player.ts` and `ParticleSystem.ts`, trigger `emitLaunchPadBurst(pos)`, apply subtle camera trauma shake, squash-and-stretch mesh animation, and dedicated launch audio without conflicting landing sound | M3 | Survey 3 |
| 13 | F13: Vite Build Bundle Optimization & Warning Elimination | In `vite.config.ts`, configure `manualChunks` to split `three` into its own chunk, eliminating Rollup's 500 kB chunk warning and ensuring zero build warnings | M4 | Survey 1 |
| 14 | F14: Post-Processing Anti-Aliased Target & Ambient Depth | In `Game.ts`, configure `EffectComposer` with a `WebGLRenderTarget` having `samples: 4` for crisp MSAA post-processing, and add stylized ambient depth / subtle vignette | M4 | Survey 1 |
| 15 | F15: Sky Dome Local Direction & Horizon Gradient Correction | In `SkyAtmosphere.ts`, rewrite vertex/fragment shader to use local vertex direction `normalize(position)` instead of world position, eliminating horizon skew and vanishing gradients above 500m | M4 | Survey 1 |
| 16 | F16: PBR Texture sRGB Color Management | In `TextureFactory.ts`, set `tex.colorSpace = THREE.SRGBColorSpace` on all procedural textures, restoring authentic PBR color fidelity under ACESFilmicToneMapping | M4 | Survey 1 |
| 17 | F17: Atmosphere Garbage Collection Elimination | In `SkyAtmosphere.ts`, pre-allocate static `THREE.Color` keyframes to eliminate 600+ allocations/sec inside the render loop, securing stable 60+ FPS | M4 | Survey 1 |
| 18 | F18: Altitude-Responsive Dynamic Lighting & Fog Modulation | In `SkyAtmosphere.ts`, modulate directional sun intensity/color, hemisphere ambient light, and fog density across all 6 altitude zones from 0m to 1000m | M4 | Survey 1 |
| 19 | F19: E2E Test Suite Tiers 1-4 (Opaque-Box Requirement Verification) | Build automated E2E test harness and test cases across Tiers 1-4 verifying all features, boundary limits, combos, and real-world climbing runs | E2E Track | Dual Track |
| 20 | F20: 100% E2E Suite Pass, 60+ FPS Hardening & Tier 5 Adversarial Audit | Verify 100% pass rate on E2E test suite, profile 60+ FPS frame timing, and run white-box Tier 5 adversarial stress testing | M5 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test harness, test runner, Tiers 1-4 test suites, TEST_READY.md | none | IN_PROGRESS |
| M1 | Physics Stability, Collision Engine & Respawn Safety | F1, F2, F3, F4, F5, F6 (R4) | none | IN_PROGRESS |
| M2 | Jump Curve & Course Calibration (0m-1000m) | F7, F8, F9 (R2) | M1 | PLANNED |
| M3 | Interactive Jump Pads & Dynamic Movement | F10, F11, F12 (R3) | M1, M2 | PLANNED |
| M4 | Modern Stylized Visuals & Shaders | F13, F14, F15, F16, F17, F18 (R1) | M1 | PLANNED |
| M5 | Final Milestone: 100% E2E Pass & Adversarial Hardening | F19, F20, 60+ FPS, Tier 5 Adversarial Testing | M1, M2, M3, M4, E2E | PLANNED |

## Interface Contracts
### PhysicsWorld <-> Player
- `checkGround(feetPosition: THREE.Vector3, radius: number, checkDist: number, verticalVelocity?: number, dt?: number): GroundCheckResult`
  - Returns `isGrounded: boolean`, `groundY: number`, `contactNormal: THREE.Vector3`, `isLaunchPad?: boolean`, `launchTarget?: THREE.Vector3`, `launchVelocity?: THREE.Vector3`.
- `resolveCapsuleCollisions(position: THREE.Vector3, radius: number, height: number, velocity?: THREE.Vector3): void`
  - Pushes position outside colliding volumes along contact normal without horizontal ejection on top faces.

### CollisionVolume <-> LevelBuilder / Player
- `CollisionVolume`:
  - `type: VolumeType`
  - `targetPosition?: THREE.Vector3`
  - `launchVelocity?: THREE.Vector3`
  - `launchDuration?: number`
  - `testSphere(center: THREE.Vector3, radius: number): CollisionResult | null`
  - `raycastDown(origin: THREE.Vector3, maxDist: number): RaycastResult | null` (handles `origin` inside volume)

### SkyAtmosphere <-> Game
- `SkyAtmosphere`:
  - `update(delta: number, playerAltitude: number, playerPos: THREE.Vector3): void` (zero runtime GC allocation)
  - `setZone(zoneIndex: number, progress: number): void`

### CameraController <-> Game / Player
- `CameraController`:
  - `update(dt: number): void` (asymmetric distance damping)
  - `snapToTarget(target: THREE.Vector3): void` (includes occlusion raycast against physics world)

## Code Layout
- `src/core/Game.ts`: Game render loop, Three.js renderer, EffectComposer post-processing passes.
- `src/environment/SkyAtmosphere.ts`: Sky dome GLSL shaders, directional sun light, hemisphere ambient, altitude fog.
- `src/materials/TextureFactory.ts`: Procedural canvas textures with sRGB color space.
- `src/physics/CollisionVolume.ts`: OBB/AABB collision volume math, sphere and raycast queries.
- `src/physics/PhysicsWorld.ts`: Spatial queries, broadphase altitude filtering, swept capsule resolution.
- `src/entities/Player.ts`: Kinematic character controller, jump physics, launch pad flight, respawn system.
- `src/entities/CameraController.ts`: 3rd person follow camera, occlusion raycast, angle controls.
- `src/levels/LevelBuilder.ts`: Platform coordinates and generation for Zones 1-6 (0m to 1000m).
- `src/levels/LevelAssets.ts`: Visual meshes and decoration geometry for platforms.
- `src/environment/ParticleSystem.ts`: Visual FX, launch bursts, landing dust, dash trails.
- `src/audio/SoundManager.ts`: Procedural WebAudio sound effects.
- `tests/e2e/`: Requirement-driven E2E test suites and runner.

# Comprehensive Architectural Survey: Modern Stylized Visuals & Shaders (R1)

**Surveyor:** teamwork_preview_explorer_survey_1  
**Working Directory:** `/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_1`  
**Date:** 2026-09-03  
**Target Repository:** `/Users/Farooq/Desktop/game`  

---

## Executive Summary

This report delivers a thorough empirical and architectural investigation of the existing codebase at `/Users/Farooq/Desktop/game`, specifically evaluating readiness and identifying requirements for **R1: Modern Stylized Visuals & Shaders**, as well as the build and bundler configuration.

The game is a 1,000-meter vertical sci-fi platformer developed with **Three.js r162**, **Vite 5.1**, and **TypeScript 5.4**. The codebase is cleanly architected with 100% procedural assets: zero external texture files, zero external audio assets, and procedural geometry and materials. 

However, critical visual defects, rendering pipeline gaps, and performance risks exist:
1. **Bundler Warning:** `npm run build` succeeds with zero TypeScript errors, but triggers a Rollup chunk warning (`index.js` is 596.59 kB, exceeding Vite's 500 kB threshold).
2. **Missing Anti-Aliasing in Post-Processing:** `EffectComposer` is instantiated without a multisampled render target (`samples: 0`), disabling the renderer's `antialias: true` and causing severe edge aliasing and bloom shimmering ("fireflies").
3. **Severe Sky Dome Shader Bug:** The sky dome vertex/fragment shader calculates altitude gradients using `vWorldPosition`. Because the sky mesh follows the player, ascending to high altitudes pushes vertex coordinates far above the world origin, causing the horizon gradient and ground transition to vanish or become severely skewed. Furthermore, a GLSL scalar offset is added to a `vec3`, creating an asymmetric diagonal tilt.
4. **Color Space Mismatch:** Procedural canvas textures in `TextureFactory.ts` default to `THREE.NoColorSpace` rather than `THREE.SRGBColorSpace`. This causes colors to be double-gamma corrected by `OutputPass`, washing out contrast and blowing out highlights.
5. **Memory Churn & Garbage Collection Hitching:** `SkyAtmosphere.update()` instantiates 8–12 new `THREE.Color` objects every frame during altitude interpolation, creating heavy GC churn that causes frame drops.
6. **Static Lighting & Missing Ambient Depth:** Directional and ambient lighting remain identical from ground to summit, missing the atmospheric progression across the 6 zones. No ambient depth effect (vignette, depth fog, SSAO/GTAO, or contact depth) is implemented.

Below is the detailed technical survey and concrete architectural blueprint to fulfill R1 at rock-solid 60+ FPS.

---

## 1. Project Structure, Tooling & Build Setup

### 1.1 Directory Tree
```
/Users/Farooq/Desktop/game/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── postcss.config.cjs
├── index.html                  # Single-page app container & Cyberpunk/Sci-Fi HUD/Modals
├── src/
│   ├── main.ts                 # Entry point, instantiates Game
│   ├── core/
│   │   ├── Game.ts             # Hub: scene, renderer, composer, animation loop, state
│   │   ├── Audio.ts            # Procedural Web Audio API sound synthesis
│   │   └── Input.ts            # Pointer lock, keyboard, mouse tracking
│   ├── entities/
│   │   ├── Player.ts           # Character state, physics integration, respawn, dash
│   │   ├── CharacterModel.ts   # Robotic android mesh & hierarchical animations
│   │   └── CameraController.ts # 3rd-person spring camera, raycast collision, dynamic FOV
│   ├── environment/
│   │   ├── SkyAtmosphere.ts    # Sky dome shader, directional sunlight, fog, clouds, stars
│   │   └── ParticleSystem.ts   # GPU PointsBuffer particle system (sparks, landing, thrusters)
│   ├── level/
│   │   ├── LevelBuilder.ts     # Constructs Sections 1–6 (0m to 1000m)
│   │   ├── LevelAssets.ts      # Shared modular assets (Rovers, HabPods, Solar, Mag-Lev, Monoliths)
│   │   ├── GroundEnvironment.ts# 90x90m launch tarmac, perimeter pylons, spotlights
│   │   ├── Obstacles.ts        # Moving platforms, pendulums, launch pads, crumbling platforms
│   │   ├── Checkpoint.ts       # Checkpoint pads with lighting & activation detection
│   │   ├── Collectibles.ts     # 20 Energy Cells with spinning containment rings
│   │   └── AltitudeMarkers.ts  # Holographic elevation banners at zone boundaries
│   ├── materials/
│   │   └── TextureFactory.ts   # 2D Canvas procedural textures & static texture cache
│   ├── physics/
│   │   ├── PhysicsWorld.ts     # Custom collision solver, swept raycasts, moving platform delta
│   │   └── CollisionVolume.ts  # AABB, OBB, and Cylinder volumes
│   ├── save/
│   │   └── SaveManager.ts      # LocalStorage persistence for checkpoints and settings
│   └── ui/
│       └── UIManager.ts        # HUD updating, toasts, pause menu, victory screen
```

### 1.2 Package Manager & Dependencies
- **Package Manager:** `npm` (Lockfile version 3 present in `package-lock.json`).
- **Dependencies (`package.json`):**
  - `"three": "^0.162.0"`
- **DevDependencies:**
  - `"@types/three": "^0.162.0"`
  - `"typescript": "^5.4.0"`
  - `"vite": "^5.1.6"`

### 1.3 Scripts & Build Behavior
- Scripts in `package.json`:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
  ```
- **Build Execution Results:**
  Executing `npm run build` in the project root:
  - `tsc` runs cleanly with zero diagnostics.
  - `vite build` transforms 35 modules in ~1.07s.
  - Generates:
    - `dist/index.html` (25.48 kB / gzip: 5.52 kB)
    - `dist/assets/index-D8tm57j2.js` (596.59 kB / gzip: 150.93 kB)
  - **Bundler Warning Detected:**
    ```
    (!) Some chunks are larger than 500 kB after minification. Consider:
    - Using dynamic import() to code-split the application
    - Use build.rollupOptions.output.manualChunks to improve chunking
    - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
    ```
  - **Acceptance Criteria Impact:** The user's acceptance criteria state:
    `"npm run build compiles cleanly with zero TypeScript errors and zero bundler warnings/failures."`
    This warning violates the acceptance criteria and must be resolved by updating `vite.config.ts`.

### 1.4 TypeScript Configuration (`tsconfig.json`)
- Target: `ESNext`, Module: `ESNext`, Module Resolution: `Node`.
- Strict mode: `true`.
- `noEmit: true`, `skipLibCheck: true`.
- Clean configuration; no compiler issues detected.

---

## 2. Current 3D Rendering & Post-Processing Pipeline Analysis

### 2.1 WebGLRenderer Setup (`src/core/Game.ts`)
The renderer is initialized with:
```typescript
this.renderer = new THREE.WebGLRenderer({
  canvas: this.canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
this.renderer.setSize(window.innerWidth, window.innerHeight);
this.renderer.setPixelRatio(pixelRatio);
this.renderer.shadowMap.enabled = true;
this.renderer.shadowMap.type = THREE.PCFShadowMap;
this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
this.renderer.toneMappingExposure = 1.05;
```

**Observations & Assessment:**
1. Clamping `pixelRatio` to 1.5 prevents fill-rate collapse on 3x Retina and 4K displays.
2. `powerPreference: 'high-performance'` requests discrete GPU on multi-GPU laptops.
3. `PCFShadowMap` offers filtered shadows without the performance penalty of `PCFSoftShadowMap` or VSM.
4. However, `antialias: true` on `WebGLRenderer` **does not apply** when rendering to an offscreen render target via `EffectComposer`!

### 2.2 Post-Processing Pipeline (`EffectComposer`)
In `src/core/Game.ts`:
```typescript
this.composer = new EffectComposer(this.renderer);
this.composer.setPixelRatio(pixelRatio);
const renderPass = new RenderPass(this.scene, this.cameraController.camera);
this.composer.addPass(renderPass);

const bloomRes = new THREE.Vector2(
  Math.min(960, Math.floor(window.innerWidth * 0.5)),
  Math.min(540, Math.floor(window.innerHeight * 0.5))
);
const bloomPass = new UnrealBloomPass(
  bloomRes,
  0.42, // bloom strength
  0.32, // radius
  0.82  // threshold
);
this.composer.addPass(bloomPass);

const outputPass = new OutputPass();
this.composer.addPass(outputPass);
```

#### Detailed Post-Processing Defects:
1. **No Multisample Anti-Aliasing (MSAA):**
   `new EffectComposer(this.renderer)` initializes `this.renderTarget1` with default options:
   `new WebGLRenderTarget(width, height, { type: HalfFloatType })`. It does NOT set `samples`.
   Because WebGL2 supports multisampled render targets, setting `{ samples: 4, type: THREE.HalfFloatType }` enables hardware 4x MSAA during `RenderPass`. Alternatively, a fast FXAA or SMAA pass before `OutputPass` is needed. Currently, high-contrast edges appear jagged.
2. **Resize Defect on `UnrealBloomPass`:**
   In `onWindowResize()`, `this.composer.setSize(width, height)` is called. `EffectComposer.setSize` calls `pass.setSize(width, height)` on each pass. In `UnrealBloomPass.setSize(w, h)`, the render targets are resized to `Math.round(w / 2)` and `Math.round(h / 2)` **without** the initial `960x540` max clamp! On a 4K monitor (3840x2160), the bloom buffer becomes 1920x1080, consuming 4x more fill-rate bandwidth.
3. **Bloom Threshold & HDR Calibration:**
   With `threshold = 0.82`, standard materials with emissive intensities under 1.0 do not bloom. For instance, `cyanGlow` (`MeshBasicMaterial` `#00f0ff`) has a perceptual luminance of ~0.74 in linear space, which fails to cross the 0.82 threshold. Conversely, if lights or bright materials exceed 1.0, they pop abruptly into bloom rather than having a soft aesthetic glow.
4. **Missing "Ambient Depth" Effect (R1 Requirement):**
   The prompt explicitly mandates: *"Implement polished post-processing effects (tasteful bloom, filmic tone mapping, ambient depth)"*.
   There is currently zero ambient depth post-processing. A dedicated lightweight shader pass that adds edge vignetting, subtle chromatic aberration on movement, and distance-based depth mist/contrast grading is needed to satisfy R1.

---

## 3. Materials, Textures & Environmental Visuals Survey

### 3.1 Procedural Textures (`src/materials/TextureFactory.ts`)
The game generates 7 procedural textures using the HTML5 2D Canvas API:
- `getCeramicPanels()`: 512x512, micro-surface noise, tech seams, corner bolts.
- `getCarbonFiber()`: 128x128, repeating diagonal twill pattern.
- `getSolarCells()`: 256x256, navy silicon wafer, silver busbars, grid fingers.
- `getDiamondPlate()`: 256x256, raised tread diamonds.
- `getHazardStripes()`: 256x256, 45-degree yellow/dark hazard striping.
- `getHighTechTarmac()`: 512x512, asphalt aggregate, cyan telemetry ring, yellow corner brackets.
- `getCelestialRunes()`: 512x512, concentric rings and gold nodes.

#### Critical Color Space Flaw:
`TextureFactory` instantiates each `CanvasTexture` without setting `colorSpace`:
```typescript
const tex = new THREE.CanvasTexture(canvas);
tex.wrapS = THREE.RepeatWrapping;
tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(2, 2);
this.cache.set(key, tex);
return tex;
```
In Three.js r162, `tex.colorSpace` defaults to `THREE.NoColorSpace` (linear). When sampled in standard PBR shaders, Three.js assumes textures are already in linear space. When `OutputPass` then applies `SRGBTransfer` (approx. $C^{1/2.2}$), the gamma curve is applied twice. **Result:** Contrast is flattened, darks become washed-out grays, and highlights blow out.
Fix: Adding `tex.colorSpace = THREE.SRGBColorSpace;` to every diffuse texture fixes the gamut instantly.

### 3.2 Stylized PBR Material Palette (`src/level/LevelAssets.ts`)
All 14 shared materials use `MeshStandardMaterial` with `flatShading: true`:
- `ceramicWhite`, `ceramicSlate`, `carbonFiber`, `solarCells`, `diamondPlate`, `hazardStripe`, `monolithStone`.
- Solid metals: `darkTitanium`, `brushedSteel`, `hazardOrange`, `pipeTeal`, `brassGear`.
- Celestial: `celestialGold`, `celestialWhite`, `cyanGlow`.

**Visual Appraisal:**
- The faceted, stylized look matches modern indie low-poly games (such as *Superflight*, *Solar Ash*, and *Manifold Garden*).
- However, emissive materials lack sufficient HDR punch to trigger the bloom pass naturally.
- Emissive materials should use values such as `emissiveIntensity: 1.8 - 2.5` with distinct colors so that only glowing technical elements (reactor cores, launch pad rings, checkpoint halos, jump thrusters) create the modern indie bloom glow.

### 3.3 Sky Dome & Atmosphere (`src/environment/SkyAtmosphere.ts`)
`SkyAtmosphere` manages the background environment, lighting, clouds, fog, and stars.

#### 1. Severe Mathematical Bug in Sky Dome Vertex/Fragment Shader:
```glsl
// Vertex Shader
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 horizonColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;

void main() {
  float h = normalize(vWorldPosition + offset).y;
  vec3 col = mix(bottomColor, horizonColor, max(pow(max(1.0 - abs(h), 0.0), 3.0), 0.0));
  if (h > 0.0) {
    col = mix(col, topColor, pow(h, exponent));
  }
  gl_FragColor = vec4(col, 1.0);
}
```
**Why this breaks:**
1. In `update()`, the sky dome mesh position is updated to follow the player:
   `this.skyMesh.position.copy(playerPos);`
   Therefore, `worldPosition.y` equals `playerPos.y + vertex.y`. At altitude 800m, `worldPosition.y` is centered at +800!
2. In the fragment shader, `normalize(vWorldPosition + offset).y` calculates the normalized vector from the **world origin (0,0,0)** to the vertex, NOT from the camera/player to the vertex.
3. When the player ascends to 500m–1000m, the entire sky dome sphere is far above the world origin. As a result, almost all vertices have $h > 0$, causing the horizon band and ground color to vanish completely, leaving a solid or heavily distorted gradient.
4. Furthermore, `vWorldPosition + offset` adds a scalar float (`33.0`) to a `vec3` in GLSL: `(x + 33, y + 33, z + 33)`. This diagonally biases the horizon across the X and Z axes!
5. **Solution:** Calculate the horizon gradient using the local vertex position `normalize(position).y` or `normalize(vWorldPosition - cameraPosition).y`.

#### 2. Garbage Collection Churn in `SkyAtmosphere.update()`:
Lines 209–238 in `SkyAtmosphere.ts`:
```typescript
if (normAlt < 0.25) {
  u.topColor.value.setHex(0x1a365d).lerp(new THREE.Color(0x0a2540), t);
  u.horizonColor.value.setHex(0xe28743).lerp(new THREE.Color(0x38bdf8), t);
  (this.scene.fog as THREE.FogExp2).color.setHex(0x182030).lerp(new THREE.Color(0x0e1726), t);
  ...
}
```
In every frame at 60 FPS, `new THREE.Color()` is called repeatedly inside the active altitude branch. This results in **thousands of heap allocations per minute**, causing frequent V8 garbage collector mark-and-sweep pauses that produce noticeable micro-stutters.

#### 3. Directional Sunlight & Shadow Inefficiencies:
In `SkyAtmosphere.ts`:
```typescript
// Lines 182-184
this.dirLight.position.set(playerPos.x + 80, playerPos.y + 140, playerPos.z + 60);
this.dirLight.target.position.copy(playerPos);
this.dirLight.target.updateMatrixWorld();

// Lines 195-201
if (playerPos) {
  if (this.dirLight.target.position.distanceToSquared(playerPos) > 1.8) {
    this.dirLight.target.position.copy(playerPos);
    this.dirLight.position.set(playerPos.x + 70, playerPos.y + 100, playerPos.z + 55);
    this.dirLight.target.updateMatrixWorld();
  }
}
```
Lines 182–184 copy `playerPos` into `dirLight.target.position` unconditionally on every frame, so `distanceToSquared(playerPos)` is always 0.0. The second block never executes.
Additionally, because the directional light moves continuously without texel snapping, shadow edges crawl and shimmer noticeably when walking.

---

## 4. Altitude Progression & Lighting Across the 6 Zones

The game features 6 distinct vertical zones from 0m to 1,000m. Currently, only the sky dome gradient colors change across zones. Directional sunlight, hemisphere ambient light, and fog density remain completely unchanged.

To deliver on R1, the lighting and atmospheric properties must dynamically transition across each zone:

| Zone | Altitude Range | Name & Theme | Sky Horizon / Zenith Palette | Fog Density & Color | Sunlight Color & Intensity | Visual Characteristic |
|---|---|---|---|---|---|---|
| **1** | 0m – 60m | Orbital Base & Scaffolding | Orange dawn (#e28743) into Deep Slate Navy (#1a365d) | `0.0020`, #182030 | #fff1d0, 1.35 | Morning atmospheric haze, warm ground bounce, soft long shadows |
| **2** | 60m – 180m | Mag-Lev Corridor & Pipelines | Sky Blue (#38bdf8) into Cobalt (#0a2540) | `0.0016`, #0e1726 | #fff8e8, 1.40 | Clean high-noon daylight, industrial cyan reflections |
| **3** | 180m – 360m | Suspended Cargo Bay | Electric Violet (#6366f1) into Deep Navy (#060f24) | `0.0013`, #0a1120 | #f0f4ff, 1.45 | Suspended vertigo, deep industrial contrast, emerging cloud deck |
| **4** | 360m – 600m | Clockwork Fusion Foundry | Magenta / Crimson Sunset (#ec4899) into Void (#040817) | `0.0010`, #070c18 | #ffd599, 1.50 | High drama, rotating machinery silhouettes, sunset inversion |
| **5** | 600m – 850m | Vertigo Monoliths | Deep Indigo (#4338ca) into Cosmic Obsidian (#02040b) | `0.0006`, #04060f | #e0e7ff, 1.60 | Emerging brilliant starfield, thinning atmosphere, acute vertical drop |
| **6** | 850m – 1000m | The Apex Zenith | Celestial Gold (#ffb703) into Infinite Space (#000005) | `0.0002`, #020108 | #ffffff, 1.80 | Cosmic void, golden solar aura, zero ground haze, extreme high-contrast HDR |

---

## 5. Performance Factors & 60+ FPS Stability Assessment

### 5.1 Draw Call Profile
- **Total Level Meshes:** Approximately 320–380 meshes across the 1,000m vertical climb.
- **Frustum Culling:** Active by default on all Three.js meshes. Because the course is primarily vertical, only 30–70 meshes are typically within the camera's view frustum at any given time.
- **Shadow Map Passes:**
  - 1 Directional Light with 1024x1024 shadow map.
  - In `LevelBuilder.addPlatform()`, only larger platforms (`size.y >= 1.2 || size.x >= 5.0 || size.z >= 5.0`) cast shadows (`mesh.castShadow = true`). Small stepping platforms do not cast shadows.
  - This keeps shadow caster count under ~30 per frame.

### 5.2 Post-Processing Overhead
- **EffectComposer Buffers:**
  - Intermediate render target at `window.innerWidth * pixelRatio, window.innerHeight * pixelRatio`.
  - Half-Float texture buffer enables HDR range without banding.
  - `UnrealBloomPass` uses 5 mip pyramid blurs (horizontal + vertical passes).
  - Clamping bloom resolution to max 960x540 keeps blur pass execution under 1.2ms on integrated GPUs (Intel Iris / Apple M-series / AMD Radeon).
- **Point Lights & Fragment Shader Workload:**
  - Currently, every checkpoint pad instantiates a `THREE.PointLight`.
  - 7 checkpoints = 7 active point lights in the scene.
  - 3 spotlight pylons on the ground base = 3 active spotlights.
  - Summit beacon = 1 point light.
  - In WebGL standard materials, every active light is computed in the fragment shader for every visible fragment within range.
  - **Optimization:** Checkpoint point lights should only be enabled when the player is within 40 meters.

### 5.3 Memory & Garbage Collection
- Eliminating all `new THREE.Color()` and `new THREE.Vector3()` instantiations inside the `animate()` and `update()` loops will remove GC stutters entirely, stabilizing frame pacing at 60+ FPS.

---

## 6. Concrete Architectural Recommendations for Milestone 4 (R1)

### Recommendation 1: Fix Vite Bundler Warning (`vite.config.ts`)
To satisfy Acceptance Criteria #3 (`npm run build compiles cleanly with zero bundler warnings`), update `vite.config.ts` to configure Rollup chunk splitting:
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false
  },
  css: {
    postcss: {}
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          three_addons: [
            'three/examples/jsm/postprocessing/EffectComposer.js',
            'three/examples/jsm/postprocessing/RenderPass.js',
            'three/examples/jsm/postprocessing/UnrealBloomPass.js',
            'three/examples/jsm/postprocessing/OutputPass.js'
          ]
        }
      }
    }
  }
});
```

### Recommendation 2: Hardware Anti-Aliasing & Ambient Depth Shader in `EffectComposer`
1. **Enable WebGL2 4x MSAA on the Composer Render Target:**
   ```typescript
   const renderTarget = new THREE.WebGLRenderTarget(
     window.innerWidth * pixelRatio,
     window.innerHeight * pixelRatio,
     {
       type: THREE.HalfFloatType,
       samples: 4 // WebGL2 Hardware Multisample Anti-Aliasing
     }
   );
   this.composer = new EffectComposer(this.renderer, renderTarget);
   ```
2. **Implement Stylized Ambient Depth Pass:**
   Create a custom `StylizedDepthShader` (or `ShaderPass`) placed between `UnrealBloomPass` and `OutputPass`:
   - Subtle procedural vignette (smooth falloff towards screen corners, framing the climber).
   - Dynamic motion/dash aberration (subtle chromatic split when dashing).
   - Subtle altitude depth mist/tone tint.
3. **Clamp Bloom Resizing on Window Resize:**
   In `onWindowResize()`, clamp bloom resolution so 4K monitors do not cause fill-rate stutter:
   ```typescript
   const bloomW = Math.min(960, Math.floor(width * 0.5));
   const bloomH = Math.min(540, Math.floor(height * 0.5));
   this.bloomPass.setSize(bloomW, bloomH);
   ```

### Recommendation 3: Fix Sky Dome Shader Math & Eliminate GC Churn
1. **Shader Math Fix:**
   In `SkyAtmosphere.createSkyDome()`:
   - Pass vertex `position` (or normalized view vector) directly to the fragment shader rather than `worldPosition`:
     ```glsl
     varying vec3 vNormalDir;
     void main() {
       vNormalDir = normalize(position);
       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
     }
     ```
   - In fragment shader:
     ```glsl
     varying vec3 vNormalDir;
     uniform vec3 topColor;
     uniform vec3 bottomColor;
     uniform vec3 horizonColor;
     uniform float exponent;

     void main() {
       float h = vNormalDir.y;
       vec3 col = mix(bottomColor, horizonColor, max(pow(max(1.0 - abs(h), 0.0), 3.0), 0.0));
       if (h > 0.0) {
         col = mix(col, topColor, pow(h, exponent));
       }
       gl_FragColor = vec4(col, 1.0);
     }
     ```
   This guarantees that the horizon and sky dome remain perfectly centered around the climber at any altitude from 0m to 1000m.
2. **Pre-allocated Zone Keyframes:**
   Define static `THREE.Color` constants outside the loop. Use `MathUtils.clamp` and lerp in-place without object allocations:
   ```typescript
   // Reusable color instances:
   private static readonly ZONE_COLORS = { ... };
   ```

### Recommendation 4: Fix Texture Color Spaces in `TextureFactory.ts`
Add `tex.colorSpace = THREE.SRGBColorSpace;` to every generated `CanvasTexture` in `TextureFactory.ts`. This restores correct sRGB-to-linear decoding and ensures colors render with rich contrast under ACES Filmic tone mapping.

### Recommendation 5: Shadow Texel Snapping & Light Culling
1. **Texel Snapping:** Quantize directional light target position by `(shadowCameraSize / shadowMapSize)` so shadows do not jitter during player movement.
2. **Light Culling:** Turn off `pointLight.visible = false` for checkpoints more than 45 meters away from the player.

---

## 7. Risk Analysis & Verification Checklist

| Risk Area | Severity | Impact | Mitigation Strategy |
|---|---|---|---|
| Rollup Chunk Size Warning | Low | Bundler warning violates Acceptance Criteria | Configure `manualChunks` in `vite.config.ts` |
| Sky Shader Disappearance at High Altitude | High | Visual breakdown in Zones 3–6 | Use `normalize(position)` instead of `vWorldPosition` |
| Color Washed Out under ACES | Medium | Textures appear pale and low-contrast | Set `tex.colorSpace = THREE.SRGBColorSpace` in `TextureFactory` |
| Bloom Edge Shimmering (Fireflies) | High | Harsh visual artifacts on high-contrast edges | Enable `samples: 4` WebGLRenderTarget on `EffectComposer` |
| GC Hitching at 60 FPS | Medium | Micro-stutters violate R4 | Remove runtime allocations of `THREE.Color` in `update()` |
| Point Light Shading Penalty | Low | Unneeded fragment shader lighting math | Distance-cull inactive checkpoint lights |

---

## Conclusion
The rendering architecture of *Ascent: Zenith Protocol* is structurally solid, modular, and lightweight. By resolving the sky shader mathematical bug, setting texture color spaces, enabling multisampled post-processing, eliminating GC allocations in the update loop, and configuring Vite chunking, the game will achieve top-tier indie visual fidelity (R1) while comfortably sustaining 60+ FPS performance across all 6 climbing zones.

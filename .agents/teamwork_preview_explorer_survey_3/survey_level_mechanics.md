# Survey Report: Level Mechanics, Jump Curve & Course Calibration (R2 & R3)

**Author:** teamwork_preview_explorer_survey_3  
**Date:** 2026-09-03  
**Scope:** R2 (Jump Curve & Course Calibration 0m–1000m) and R3 (Interactive Jump Pads & Dynamic Movement)  
**Target Files Analyzed:**
- `src/entities/Player.ts`
- `src/physics/PhysicsWorld.ts`
- `src/physics/CollisionVolume.ts`
- `src/level/LevelBuilder.ts`
- `src/level/LevelAssets.ts`
- `src/level/Obstacles.ts`
- `src/environment/ParticleSystem.ts`
- `src/core/Audio.ts`
- `src/core/Game.ts`

---

## 1. Executive Summary

This survey provides a comprehensive mathematical and empirical investigation into the player jump envelope, level progression geometry, and launch pad mechanics of the 1,000-meter climb in *Ascent Zenith Protocol*.

### Key Findings:
1. **The Physical Standard Jump Envelope:**
   - With an initial vertical jump impulse $v_{y0} = 11.2\text{ m/s}$, upward gravity $g_{up} = 28.0\text{ m/s}^2$, and downward gravity $g_{down} = 37.8\text{ m/s}^2$, the theoretical maximum apex height is $\Delta y_{max} = 2.24\text{ m}$.
   - The operational maximum standard jump step-up is strictly $\Delta y \le 1.60\text{ m}$ (providing a $0.64\text{ m}$ safety margin for capsule collision clearance and jump timing).
   - The operational maximum horizontal gap is strictly $\text{gap} \le 2.60\text{ m}$ edge-to-edge ($3.30\text{ m}$ center-to-center for $6.0\text{ m/s}$ walking speed).
2. **Current Level Calibration Status (484 Volumes, 483 Transitions Audited):**
   - Main routes contain **35 impossible standard jumps** where $\Delta y > 1.60\text{ m}$ (reaching as high as $7.80\text{ m}$) or $\text{gap} > 2.60\text{ m}$ (reaching as wide as $8.15\text{ m}$).
   - There are **4 catastrophic inter-zone chasms** where progression completely breaks between zones (Zone 2 $\to$ Zone 3: gap $133.1\text{m}$, $\Delta y = 24.6\text{m}$; Zone 3 $\to$ Zone 4: gap $94.7\text{m}$, $\Delta y = 39.5\text{m}$; Zone 4 $\to$ Zone 5: gap $76.4\text{m}$, $\Delta y = 45.1\text{m}$; Zone 5 $\to$ Zone 6: gap $31.0\text{m}$, $\Delta y = 68.2\text{m}$).
3. **Forensic Root Cause of Non-Functioning Jump Pads:**
   - Jump pads are currently **100% broken** due to two compounding bugs in `Player.ts`:
     - **Variable Jump Height Truncation:** Stepping on a jump pad does not hold the Space key (`!input.jump`), which triggers `velocity.y *= 0.55` on every frame. A $45\text{ m/s}$ impulse decays to $0.82\text{ m}$ apex within 5 frames (83ms).
     - **Severe Air Drag Decay:** Air drag multiplies horizontal velocity by $0.94$ every frame at 60 FPS. The mathematical limit of horizontal flight from any launch impulse is only $2.22\text{ m}$, causing players to stop dead in mid-air and plunge into the abyss.
     - **Directional Misalignment:** Launches use player facing angle (`facingYaw`) rather than pad-to-target vectors, launching off-course if approached at an angle.
     - **Missing Feedback:** `emitLaunchPadBurst` is never called, `playLanding(5)` clashes with `playLaunchPad()`, and the character model is squashed downward rather than stretched upward.

---

## 2. Character Physics Engine & Exact Jump Dynamics

### 2.1 Physics Constants in `src/entities/Player.ts`

| Parameter | Code Variable | Value | Description |
|---|---|---|---|
| Walk Speed | `walkSpeed` | $6.0\text{ m/s}$ | Default ground movement speed |
| Sprint Speed | `sprintSpeed` | $9.2\text{ m/s}$ | Sprint ground movement speed (Shift) |
| Ground Acceleration | `groundAccel` | $45.0\text{ m/s}^2$ | Snappy directional responsiveness |
| Ground Deceleration | `groundDecel` | $24.0\text{ m/s}^2$ | Friction damping when stopping |
| Air Acceleration | `airAccel` | $15.0\text{ m/s}^2$ | In-air directional control |
| Air Drag Multiplier | `airDrag` | $1.2$ | Per-frame decay factor: $(1 - 1.2 \times 0.05)^{\Delta t \cdot 60} = 0.94$ |
| Jump Initial Velocity | `jumpVelocity` | $11.2\text{ m/s}$ | $v_{y0}$ vertical takeoff velocity |
| Ascent Gravity | `gravity` | $28.0\text{ m/s}^2$ | Gravity while $v_y \ge 0$ |
| Descent Gravity | `gravity * fallGravityMultiplier` | $37.8\text{ m/s}^2$ | Snappy downward gravity ($28.0 \times 1.35$) |
| Capsule Radius | `radius` | $0.35\text{ m}$ | Horizontal bounding cylinder radius |
| Capsule Height | `height` | $1.70\text{ m}$ | Full character height |

### 2.2 Mathematical Derivations

#### A. Maximum Standard Jump Height ($\Delta y$)
For an upward launch with $v_{y0} = 11.2\text{ m/s}$ under constant deceleration $g_{up} = 28.0\text{ m/s}^2$:
$$t_{apex} = \frac{v_{y0}}{g_{up}} = \frac{11.2}{28.0} = 0.400\text{ s}$$
$$\Delta y_{apex} = \frac{v_{y0}^2}{2 g_{up}} = \frac{11.2^2}{2 \times 28.0} = \frac{125.44}{56.0} = 2.240\text{ m}$$

To land safely on top of an elevated platform, the character's feet must clear the landing surface before the peak and maintain adequate vertical clearance:
$$\Delta y(t) = v_{y0} t - \frac{1}{2} g_{up} t^2$$
For a platform at $\Delta y = 1.60\text{ m}$:
$$14 t^2 - 11.2 t + 1.6 = 0 \implies t_1 = 0.186\text{ s}, \quad t_2 = 0.614\text{ s}$$
- Window of opportunity above $1.60\text{ m}$: $\Delta t = 0.614 - 0.186 = 0.428\text{ s}$.
- Apex clearance above platform: $\Delta y_{apex} - 1.60\text{ m} = 0.640\text{ m}$ ($64\text{ cm}$).
- **Conclusion:** Any step height exceeding $1.60\text{ m}$ leaves less than $0.6\text{ m}$ clearance, leading to capsule collision snagging on platform rims. Steps must be calibrated to $\Delta y \le 1.55\text{ m}$.

#### B. Maximum Standard Leap Distance (Gap)
Air time to land on a platform at equal altitude ($\Delta y = 0$):
$$t_{up} = 0.400\text{ s}$$
$$t_{down} = \sqrt{\frac{2 \Delta y_{apex}}{g_{down}}} = \sqrt{\frac{2 \times 2.24}{37.8}} = 0.344\text{ s}$$
$$t_{total} = 0.400 + 0.344 = 0.744\text{ s}$$

Air time to land on a platform stepped up at $\Delta y = +1.55\text{ m}$:
$$h_{fall} = 2.24 - 1.55 = 0.690\text{ m}$$
$$t_{fall} = \sqrt{\frac{2 \times 0.69}{37.8}} = 0.191\text{ s}$$
$$t_{air} = t_{up} + t_{fall} = 0.400 + 0.191 = 0.591\text{ s}$$

Under standard walking speed ($v_x = 6.0\text{ m/s}$), horizontal displacement:
$$X_{walk} \approx 6.0 \times 0.55 = 3.30\text{ m (center-to-center)}$$
Subtracting capsule radius ($0.35\text{ m}$) and landing margin ($0.35\text{ m}$):
$$\text{Max Safe Horizontal Gap} = 2.60\text{ m (edge-to-edge)}$$

---

## 3. Climb Course Architecture & 6-Zone Structural Audit

The entire climbing course is built deterministically in `src/level/LevelBuilder.ts`. Below is the zone-by-zone elevation and layout breakdown:

```
Altitude Profile (0m - 1000m):
===================================================================================================
1000m | [Summit Plaza (1000m)] <--- Grand Zenith Jump Pad (972.4m)
      |   Zone 6: The Apex Zenith & Summit (858m - 1000m) [4 Celestial Colonnade Tiers]
 850m | [Checkpoint 3: Vertigo Monoliths (Actual 791.6m vs Claimed 850m)]
      |   Zone 5: The Vertigo Monoliths (605m - 791m) [14 Brutalist Monoliths & Bridges]
 600m |
      |   Zone 4: The Clockwork Fusion Foundry (362m - 560m) [Rotating Cogs, Pendulums, Elevator]
 360m | [Checkpoint 2: Orbital Cargo Haven (Actual 322.9m vs Claimed 360m)]
      |   Zone 3: Suspended Orbital Cargo Bay (182m - 323m) [Hab Pods, Shuttle, Rotating Crane]
 180m | [Section 2 End Deck (160.6m)]
      |   Zone 2: Mag-Lev Corridor & Power Conduits (60.6m - 160.6m) [Solar Panels, Conduits, Turbine]
  60m | [Checkpoint 1: Telemetry Relay Silo (60.6m)]
      |   Zone 1: Orbital Base & Telemetry Ascent (0m - 60.6m) [Rover, Hab Pods, Spire Spiral, Dish]
   0m | [Checkpoint 0: Orbital Base Launchpad (0.2m)]
===================================================================================================
```

---

## 4. Comprehensive Gap Audit & Impossible Leap Inventory

Our automated audit script parsed and simulated all 484 collision volumes and 483 transitions across all 6 zones.

### 4.1 Summary of Violations by Zone

| Zone | Altitude Range | Total Transitions | Bad $\Delta y$ ($>1.6\text{m}$) | Bad Gap ($>2.6\text{m}$) | Jump Pads | Status |
|---|---|---|---|---|---|---|
| **Zone 1** | 0m – 60m | 40 | 7 | 0 | 2 | Impassable Walls |
| **Zone 2** | 60m – 160m | 61 | 5 | 0 | 2 | Impassable Walls |
| **Zone 3** | 182m – 323m | 98 | 11 | 4 | 2 | Impassable Jumps & Gaps |
| **Zone 4** | 362m – 560m | 67 | 9 | 5 | 2 | Wide Gaps & Super-Cliffs |
| **Zone 5** | 605m – 791m | 138 | 2 | 6 | 4 | Wide Chasm Gaps ($7-8\text{m}$) |
| **Zone 6** | 858m – 1000m | 79 | 1 | 1 | 5 | Tier Transitions ($6-9\text{m}$) |
| **Total** | 0m – 1000m | **483** | **35** | **16** | **17** | **Needs Calibration** |

### 4.2 The 4 Inter-Zone Disconnections (Critical Blockers)

These four transitions represent complete structural disconnects where geometry terminates without connecting platforms:

1. **Zone 2 End Deck $\to$ Zone 3 Cargo Module 1:**
   - From: `(-5.9, 160.6, 149.9)`
   - To: `(14.0, 185.2, 10.0)`
   - Vertical step: $\Delta y = +24.60\text{ m}$
   - Horizontal gap: $\text{gap} = 133.06\text{ m}$
   - *Issue:* Zone 2 ends at $z = 149.9$, Zone 3 begins at $z = 10.0, y = 182.0$. The player is stranded at 160.6m.

2. **Zone 3 Checkpoint 2 Haven Deck $\to$ Zone 4 Foundry Launch Platform:**
   - From: `(27.7, 322.9, 100.8)`
   - To: `(4.0, 362.4, 0.0)`
   - Vertical step: $\Delta y = +39.55\text{ m}$
   - Horizontal gap: $\text{gap} = 94.66\text{ m}$
   - *Issue:* Checkpoint 2 is placed at $y = 322.9\text{m}$, while Zone 4 starts at $(4.0, 362.4, 0.0)$ with no path between them.

3. **Zone 4 Foundry High Risk Step 28 $\to$ Zone 5 Monolith Top 1:**
   - From: `(16.0, 560.2, 19.7)`
   - To: `(8.0, 605.3, -60.0)`
   - Vertical step: $\Delta y = +45.10\text{ m}$
   - Horizontal gap: $\text{gap} = 76.44\text{ m}$
   - *Issue:* Zone 4 ends at 560.2m, Zone 5 begins at 605.3m with no linking structure.

4. **Zone 5 Checkpoint 3 Vertigo Deck $\to$ Zone 6 Colonnade Tier 1:**
   - From: `(-10.4, 791.6, -35.1)`
   - To: `(10.0, 859.8, 0.0)`
   - Vertical step: $\Delta y = +68.15\text{ m}$
   - Horizontal gap: $\text{gap} = 31.00\text{ m}$
   - *Issue:* Checkpoint 3 is at 791.6m, Zone 6 begins at 859.8m. A 68-meter sheer vertical cliff with zero platforms.

### 4.3 Detailed Intra-Zone Impossible Leaps

#### Zone 1: Orbital Base & Telemetry Ascent
- `Catwalk 2 (2.5, 11.2, -32.0)` $\to$ `Spire Step 1 (5.2, 14.2, -32.0)`: $\Delta y = +3.05\text{ m}$ ($> 1.6\text{m}$).
- `Radar Catwalk (-6.0, 32.4, -32.0)` $\to$ `Mag-Lev Mast Rail (-6.0, 34.2, -25.0)`: $\Delta y = +1.82\text{ m}$ ($> 1.6\text{m}$).
- `Mag-Lev Mast Rail (-6.0, 34.2, -25.0)` $\to$ `Upper Transition 1 (-6.0, 38.7, -28.0)`: $\Delta y = +4.45\text{ m}$ ($> 1.6\text{m}$).
- `Upper Transition 1` $\to$ `Upper Transition 2`: $\Delta y = +1.70\text{ m}$ ($> 1.6\text{m}$).
- `Upper Transition 2` $\to$ `Upper Transition 3`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$).
- `Upper Transition 3` $\to$ `Upper Step 1`: $\Delta y = +3.05\text{ m}$ ($> 1.6\text{m}$).

#### Zone 2: Mag-Lev Corridor & Power Conduits
- `Checkpoint 1 Deck` $\to$ `MagLev Step 1`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$).
- `Solar Catwalk 14 (-5.9, 93.4, 34.0)` $\to$ `Power Conduit Hub 98m (-5.9, 98.2, 41.5)`: $\Delta y = +4.83\text{ m}$ ($> 1.6\text{m}$).
- `Walking Step 8 (-5.9, 110.6, 56.4)` $\to$ `Fusion Turbine 116m (-5.9, 118.4, 60.4)`: $\Delta y = +7.80\text{ m}$ ($> 1.6\text{m}$).
- `Solar Energy Ramp (-5.9, 116.7, 64.4)` $\to$ `Mag-Lev Bridge 128m (-5.9, 119.0, 76.4)`: $\Delta y = +2.30\text{ m}$ ($> 1.6\text{m}$).
- `Crumbling Tile 3` $\to$ `Section 2 End Deck`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$).

#### Zone 3: Suspended Orbital Cargo Bay
- `Cargo Step 1-4` $\to$ `Cargo Module 2`: $\Delta y = +3.00\text{ m}$ ($> 1.6\text{m}$).
- `Cargo Step 2-4` $\to$ `Cargo Module 3`: $\Delta y = +3.00\text{ m}$ ($> 1.6\text{m}$).
- `Cargo Step 3-4` $\to$ `Cargo Module 4`: $\Delta y = +3.00\text{ m}$ ($> 1.6\text{m}$).
- `Cargo Step 4-4` $\to$ `Cargo Module 5`: $\Delta y = +3.00\text{ m}$ ($> 1.6\text{m}$).
- `Cargo Step 5-4` $\to$ `Cargo Module 6`: $\Delta y = +3.00\text{ m}$ ($> 1.6\text{m}$).
- `Cargo Step 6-4` $\to$ `Cargo Shuttle`: $\Delta y = +1.70\text{ m}$ ($> 1.6\text{m}$).
- `Cargo Shuttle` $\to$ `Shuttle Landing Deck`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 6.68\text{ m}$ ($> 2.6\text{m}$).
- `Cargo Climb Step 25` $\to$ `Rotating Crane Arm`: $\Delta y = +2.00\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 5.20\text{ m}$ ($> 2.6\text{m}$).
- `Rotating Crane Arm` $\to$ `Crane Landing Deck`: $\Delta y = +2.10\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 3.05\text{ m}$ ($> 2.6\text{m}$).
- `Haven Spiral Step 36` $\to$ `Checkpoint 2 Haven Deck`: $\Delta y = +1.90\text{ m}$ ($> 1.6\text{m}$).

#### Zone 4: The Clockwork Fusion Foundry
- `Cog Walkway 1-4` $\to$ `Clockwork Cog 2`: $\Delta y = +1.85\text{ m}$ ($> 1.6\text{m}$).
- `Cog Walkway 2-4` $\to$ `Clockwork Cog 3`: $\Delta y = +1.85\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 3.65\text{ m}$ ($> 2.6\text{m}$).
- `Cog Walkway 3-4` $\to$ `Clockwork Cog 4`: $\Delta y = +1.85\text{ m}$ ($> 1.6\text{m}$).
- `Cog Walkway 4-4` $\to$ `Pendulum Platform 1`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$).
- `Pendulum Step 1-3` $\to$ `Pendulum Platform 2`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 8.05\text{ m}$ ($> 2.6\text{m}$).
- `Pendulum Step 2-3` $\to$ `Pendulum Platform 3`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 8.05\text{ m}$ ($> 2.6\text{m}$).
- `Pendulum Step 3-3` $\to$ `Foundry Elevator`: $\Delta y = +1.80\text{ m}$ ($> 1.6\text{m}$), $\text{gap} = 3.80\text{ m}$ ($> 2.6\text{m}$).

#### Zone 5: The Vertigo Monoliths
- `Monolith Bridge 3-8` $\to$ `Monolith Top 4`: $\text{gap} = 7.93\text{ m}$ ($> 2.6\text{m}$).
- `Monolith Bridge 6-8` $\to$ `Monolith Top 7`: $\text{gap} = 7.07\text{ m}$ ($> 2.6\text{m}$).
- `Monolith Bridge 9-8` $\to$ `Monolith Top 10`: $\text{gap} = 8.15\text{ m}$ ($> 2.6\text{m}$).
- `Monolith Bridge 12-8` $\to$ `Monolith Top 13`: $\text{gap} = 7.87\text{ m}$ ($> 2.6\text{m}$).
- `Monolith Bridge 14-8` $\to$ `Jump Pad 11`: $\text{gap} = 5.57\text{ m}$ ($> 2.6\text{m}$).
- `Pre CP3 Step 7` $\to$ `Checkpoint 3 Vertigo Deck`: $\Delta y = +1.95\text{ m}$ ($> 1.6\text{m}$).

---

## 5. Forensic Breakdown of Jump Pad Physics Failures

### 5.1 Bug 1: Variable Jump Height Velocity Truncation
In `Player.ts`, lines 205–208:
```typescript
// Variable jump height truncation: releasing Space cuts vertical velocity
if (!input.jump && this.velocity.y > 2.0) {
  this.velocity.y *= 0.55;
}
```
When a player touches a launch pad, they are simply walking over it without pressing or holding the Spacebar. On the immediate frame following launch:
- Frame 0 (takeoff): $v_y = 45.0\text{ m/s}$
- Frame 1 (16.6ms): $v_y = 45.0 \times 0.55 = 24.75\text{ m/s}$
- Frame 2 (33.3ms): $v_y = 24.75 \times 0.55 = 13.61\text{ m/s}$
- Frame 3 (50.0ms): $v_y = 13.61 \times 0.55 = 7.49\text{ m/s}$
- Frame 4 (66.6ms): $v_y = 7.49 \times 0.55 = 4.12\text{ m/s}$
- Frame 5 (83.3ms): $v_y = 4.12 \times 0.55 = 2.26\text{ m/s}$

**Consequence:** The entire vertical launch energy is destroyed in under $0.1$ seconds. A $45\text{ m/s}$ launch produces a hop of only $0.82\text{ m}$!

### 5.2 Bug 2: Horizontal Air Drag Velocity Annihilation
In `Player.ts`, lines 257–258:
```typescript
this.velocity.x *= Math.pow(1 - this.airDrag * 0.05, dt * 60);
this.velocity.z *= Math.pow(1 - this.airDrag * 0.05, dt * 60);
```
At 60 FPS ($\Delta t \cdot 60 = 1$), the multiplier is $1 - 1.2 \times 0.05 = 0.94$.
The horizontal distance traveled by an object launched at speed $v_{x0}$ under geometric decay is:
$$X_{\infty} = \sum_{n=0}^{\infty} v_{x0} (0.94)^n \cdot \frac{1}{60} = \frac{v_{x0}}{60 \times (1 - 0.94)} = \frac{v_{x0}}{3.60}$$
With the hard-coded launch speed $v_{x0} = 8.0\text{ m/s}$:
$$X_{max} = \frac{8.0}{3.60} = 2.22\text{ meters}$$
**Consequence:** A player can **never** travel further than $2.22\text{ meters}$ horizontally in the air from a launch pad! When pads attempt to span 7m to 18m gaps, the player freezes horizontally in mid-air and falls straight down.

### 5.3 Bug 3: Player Facing Direction Coupling
In `Player.ts`, lines 160–163:
```typescript
const forwardDir = new THREE.Vector3(-Math.sin(this.facingYaw), 0, -Math.cos(this.facingYaw));
this.velocity.x = forwardDir.x * 8.0;
this.velocity.z = forwardDir.z * 8.0;
```
The launch direction is derived from `this.facingYaw` rather than the angle pointing toward the landing platform. If the player steps onto the pad backwards or sideways, they are launched directly into empty space.

### 5.4 Bug 4: Visual and Audio Defects
1. `ParticleSystem.emitLaunchPadBurst` is implemented but uncalled.
2. Line 167 calls `this.audio.playLanding(5)` right when launching, creating an abrasive thud that drowns out `playLaunchPad()`.
3. Line 168 calls `this.model.triggerLandSquash(0.8)`, crushing the character down onto the platform during takeoff instead of stretching upward.

---

## 6. Calibrated Ballistic Trajectory Engine Formulation

To ensure jump pads reliably launch players to target landing platforms regardless of input, approach angle, or air drag, the physics engine requires a deterministic targeted ballistic solver.

### 6.1 Mathematical Formulation
Given:
- Launch origin $P_0 = (x_0, y_0, z_0)$
- Landing target $P_1 = (x_1, y_1, z_1)$
- Target clearances: $\Delta x = x_1 - x_0$, $\Delta y = y_1 - y_0$, $\Delta z = z_1 - z_0$

1. **Calculate Apex Height ($H$)**:
   Choose an apex height above the pad providing a cinematic arc and clear clearance over obstacles:
   $$H = \max(\Delta y + \text{extra\_apex}, 5.0\text{ m}) \quad (\text{where } \text{extra\_apex} \in [4.0, 6.0])$$
2. **Calculate Vertical Velocity ($v_{y0}$)**:
   $$v_{y0} = \sqrt{2 \cdot g_{up} \cdot H}$$
3. **Calculate Flight Timing**:
   Ascent time to apex:
   $$t_{up} = \frac{v_{y0}}{g_{up}} = \sqrt{\frac{2 H}{g_{up}}}$$
   Descent time from apex to landing height $\Delta y$:
   $$t_{down} = \sqrt{\frac{2(H - \Delta y)}{g_{down}}}$$
   Total flight duration:
   $$T = t_{up} + t_{down}$$
4. **Calculate Horizontal Velocity ($v_{x0}, v_{z0}$)**:
   During the launch trajectory state, air drag is bypassed:
   $$v_{x0} = \frac{\Delta x}{T}, \quad v_{z0} = \frac{\Delta z}{T}$$

### 6.2 Empirical Precision Test Results
Simulated with discrete Euler integration ($\Delta t = 1/120\text{ s}$):

| Launch Scenario | $P_0$ (Launch) | $P_1$ (Target) | $\Delta y$ | Horiz Dist | $v_{y0}$ | $(v_{x0}, v_{z0})$ | Flight Time $T$ | Simulated Landing Error |
|---|---|---|---|---|---|---|---|---|
| **Z1 Shortcut Pad** | $(6.5, 6.8, -19.5)$ | $(-6.0, 32.2, -32.0)$ | $+25.4\text{m}$ | $17.7\text{m}$ | $41.3\text{ m/s}$ | $(-6.3, -6.3)\text{ m/s}$ | $1.99\text{ s}$ | $0.32\text{ m}$ |
| **Z4 Foundry Entrance** | $(4.0, 362.4, 0.0)$ | $(16.0, 394.0, 0.0)$ | $+31.6\text{m}$ | $12.0\text{m}$ | $45.9\text{ m/s}$ | $(5.5, 0.0)\text{ m/s}$ | $2.20\text{ s}$ | $0.40\text{ m}$ |
| **Z6 Grand Zenith** | $(0.0, 972.4, 0.0)$ | $(0.0, 1000.0, 0.0)$ | $+27.6\text{m}$ | $0.0\text{m}$ | $42.1\text{ m/s}$ | $(0.0, 0.0)\text{ m/s}$ | $1.96\text{ s}$ | $0.30\text{ m}$ |

*Result:* The error is less than $0.4\text{ m}$, landing cleanly in the center of $5\text{m} - 24\text{m}$ wide landing platforms.

---

## 7. Concrete Calibration Plan for Milestone 2 (Course Redesign)

Milestone 2 workers must apply these exact geometry adjustments across all 6 zones:

### Zone 1 (0m – 60m)
1. **Spire Step 1:** Lower Spire base step from $y = 14.05\text{m}$ to $y = 12.55\text{m}$ (connecting with Catwalk 2 at $11.0\text{m}$, $\Delta y = 1.55\text{m}$).
2. **Mast Rail Transition:** Insert two stepping catwalks between Mag-Lev Mast Rail ($34.0\text{m}$) and Upper Transition 1 ($38.5\text{m}$):
   - Catwalk A: $y = 35.5\text{m}$
   - Catwalk B: $y = 37.0\text{m}$
3. **Upper Steps:** Insert intermediate platform at $y = 43.6\text{m}$ between Upper Transition 3 ($42.0\text{m}$) and Upper Step 1 ($45.0\text{m}$).

### Zone 2 (60m – 180m)
1. **Checkpoint 1 Exit:** Set MagLev Step 1 to $y = 62.15\text{m}$ (relative to CP1 at $60.6\text{m}$, $\Delta y = 1.55\text{m}$).
2. **Power Conduit Hub Ascent:** Insert 3 solar stepping panels between Solar Catwalk 14 ($93.2\text{m}$) and Hub ($98.0\text{m}$):
   - Panel 15: $y = 94.75\text{m}$
   - Panel 16: $y = 96.30\text{m}$
   - Panel 17: $y = 97.85\text{m}$
3. **Fusion Turbine Surround:** Surround Fusion Turbine with 4 perimeter stepping ring platforms rising from $110.4\text{m}$ to $116.0\text{m}$ ($\Delta y = 1.4\text{m}$ each) leading to the turbine top cap.
4. **Inter-Zone Connection (Zone 2 $\to$ Zone 3):**
   - Extend Section 2 End Deck from $z = 149.9$ to $z = 10.0$ via a scenic high-speed Mag-Lev skyway corridor rising gradually from $160.6\text{m}$ to $182.0\text{m}$, seamlessly delivering the player to Zone 3 Cargo Module 1.

### Zone 3 (180m – 360m)
1. **Hab Pod Staircases:** Adjust Hab Pod roof intermediate stairs so step drops between pod roofs and stairs are $\le 1.55\text{m}$.
2. **Shuttle & Crane Gaps:**
   - Extend Shuttle Landing Deck closer to shuttle path ($\text{gap} \le 2.0\text{m}$).
   - Adjust Crane arm boarding deck so gap $\le 2.2\text{m}$.
3. **Inter-Zone Connection (Zone 3 $\to$ Zone 4):**
   - Reposition Checkpoint 2 Haven Deck to coordinate with Zone 4 Entrance, or construct an illuminated orbital cargo transit gantry rising from $323\text{m}$ to $362\text{m}$.

### Zone 4 (360m – 600m)
1. **Clockwork Cogs:** Add perimeter catwalk bridges between rotating cogs to reduce jump gaps from $3.6\text{m}-8.0\text{m}$ down to $2.2\text{m}$.
2. **Pendulums:** Add connecting diamond-plate gangways between pendulum platforms.
3. **Inter-Zone Connection (Zone 4 $\to$ Zone 5):**
   - Add a sequence of 10 stepping thermal conduits from Foundry High Risk Step 28 ($560\text{m}$) leading to Monolith 1 ($605\text{m}$).

### Zone 5 (600m – 850m)
1. **Monolith Bridges:** Lengthen the 8-step stepping stone bridges between monoliths to 12 steps, eliminating the $7\text{m}-8\text{m}$ gaps and ensuring gap $\le 2.2\text{m}$.
2. **Inter-Zone Connection (Zone 5 $\to$ Zone 6):**
   - Insert an ascending grand staircase of celestial rune monoliths connecting Checkpoint 3 Vertigo Deck ($791.6\text{m}$) to Colonnade Tier 1 ($859.8\text{m}$).

### Zone 6 (850m – 1000m)
1. Maintain the 4 Colonnade tiers with calibrated $1.55\text{m}$ steps.
2. Connect tier transitions with calibrated targeted jump pads.

---

## 8. Concrete Implementation Plan for Milestone 3 (Interactive Jump Pads)

### 8.1 Schema Upgrades to `CollisionVolume` and `Obstacles.ts`
1. Expand `CollisionVolume`:
   ```typescript
   public launchTarget?: THREE.Vector3;
   public launchVelocity?: THREE.Vector3;
   ```
2. Expand `LaunchPad` constructor in `Obstacles.ts`:
   ```typescript
   constructor(
     scene: THREE.Scene,
     physics: PhysicsWorld,
     position: THREE.Vector3,
     targetPosition?: THREE.Vector3, // Destination landing point
     size = new THREE.Vector3(2.6, 0.4, 2.6),
     extraApex = 5.0
   )
   ```
   If `targetPosition` is provided, calculate ballistic $(v_{x0}, v_{y0}, v_{z0})$ and store it in `this.volume.launchVelocity`.

### 8.2 Player Physics State Integration in `Player.ts`
1. Add state fields:
   ```typescript
   private isLaunchTrajectory = false;
   private launchTrajectoryTimer = 0;
   ```
2. Trigger in ground detection:
   ```typescript
   if (this.isGrounded && ground.isLaunchPad) {
     const launchVol = ground.volume;
     if (launchVol && launchVol.launchVelocity) {
       this.velocity.copy(launchVol.launchVelocity);
     } else {
       this.velocity.y = ground.launchImpulse;
     }
     this.isLaunchTrajectory = true;
     this.launchTrajectoryTimer = 2.5; // Ballistic protection window
     this.isGrounded = false;
     this.coyoteTimer = 0;
     
     // Visual & Audio
     this.audio.playLaunchPad(); // Do NOT call playLanding!
     this.model.triggerLandSquash(-0.5); // Upward stretch!
     this.onLaunchPadCallback?.(this.position);
   }
   ```
3. Update Loop Protection:
   - While `this.isLaunchTrajectory && this.launchTrajectoryTimer > 0`:
     - Skip variable jump height truncation (`velocity.y *= 0.55`).
     - Skip horizontal drag multiplication (`velocity.x *= 0.94`).
     - Allow gentle air strafing ($\pm 15\%$ user blending).
   - Reset `isLaunchTrajectory = false` upon landing (`this.isGrounded`).

### 8.3 Audiovisual Enhancements
1. **Particle Bursts:** Wire `Player.onLaunchPadCallback` $\to$ `Game.ts` $\to$ `particles.emitLaunchPadBurst(position)`.
2. **Camera Shake & FOV Punch:** In `CameraController.ts`, trigger `addTrauma(0.35)` and temporary $+5^\circ$ FOV kick that smoothly eases back.
3. **Launch Pad Mesh Animation:** In `LaunchPad.update(delta)`:
   - Animate the launch pad center piston with a quick downward compression followed by an explosive spring rebound and glowing cyan shockwave ring.

---

## 9. Verification & Acceptance Criteria Matrix

| Requirement | Metric / Condition | Verification Method | Status |
|---|---|---|---|
| **R2: Max Jump Height** | $\Delta y \le 1.60\text{ m}$ across all standard steps | Run automated course audit script | Calibrated in Plan |
| **R2: Max Horizontal Gap** | $\text{gap} \le 2.60\text{ m}$ across all standard gaps | Run automated course audit script | Calibrated in Plan |
| **R2: 0m–1000m Continuity** | Zero inter-zone chasms; 100% connected path | Walk progression path without noclip | Calibrated in Plan |
| **R3: Deterministic Trajectory** | Landing error $< 0.5\text{ m}$ from pad target | Empirical launch simulation | Calibrated in Plan |
| **R3: Input Invariance** | Holding vs releasing Space does not affect launch | Run trajectory script with Space true/false | Calibrated in Plan |
| **R3: Visual & Audio Feedback** | Particles emit, camera shakes, no landing sound | Audio & Particle call graph verification | Calibrated in Plan |

# Handoff Report: Jump Curve & Course Calibration (R2) & Interactive Jump Pads (R3)

**Agent:** teamwork_preview_explorer_survey_3  
**Parent Conversation ID:** b2ee6bb6-9070-4fe4-8271-5f255aa4fca8  
**Handoff Type:** Hard (Survey Task Complete)  
**Detailed Findings File:** `/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_3/survey_level_mechanics.md`

---

## 1. Observation

1. **Player Physics Constants in `src/entities/Player.ts` (lines 28–37):**
   ```typescript
   private walkSpeed = 6.0;
   private sprintSpeed = 9.2;
   private groundAccel = 45.0;
   private groundDecel = 24.0;
   private airAccel = 15.0;
   private airDrag = 1.2;
   private jumpVelocity = 11.2;
   private gravity = 28.0;
   private fallGravityMultiplier = 1.35;
   ```
2. **Jump Truncation Bug in `src/entities/Player.ts` (lines 205–208):**
   ```typescript
   // Variable jump height truncation: releasing Space cuts vertical velocity
   if (!input.jump && this.velocity.y > 2.0) {
     this.velocity.y *= 0.55;
   }
   ```
3. **Air Drag Multiplication in `src/entities/Player.ts` (lines 257–258):**
   ```typescript
   this.velocity.x *= Math.pow(1 - this.airDrag * 0.05, dt * 60);
   this.velocity.z *= Math.pow(1 - this.airDrag * 0.05, dt * 60);
   ```
4. **Launch Pad Trigger in `src/entities/Player.ts` (lines 158–169):**
   ```typescript
   if (this.isGrounded && ground.isLaunchPad) {
     this.velocity.y = ground.launchImpulse;
     // Add forward momentum boost in facing direction for cinematic arc
     const forwardDir = new THREE.Vector3(-Math.sin(this.facingYaw), 0, -Math.cos(this.facingYaw));
     this.velocity.x = forwardDir.x * 8.0;
     this.velocity.z = forwardDir.z * 8.0;
     this.isGrounded = false;
     this.coyoteTimer = 0;
     this.audio.playLaunchPad();
     this.audio.playLanding(5);
     this.model.triggerLandSquash(0.8);
   }
   ```
5. **Launch Pad Definition in `src/physics/CollisionVolume.ts` (lines 7, 30):**
   ```typescript
   LAUNCH_PAD = 'LAUNCH_PAD',
   public launchImpulse = 26; // for LAUNCH_PAD
   ```
   `CollisionVolume` only stores a scalar `launchImpulse`; it lacks target coordinates, launch velocity vectors, and trajectory duration.
6. **Uncalled Launch Particle Emission in `src/environment/ParticleSystem.ts` (line 75):**
   ```typescript
   public emitLaunchPadBurst(pos: THREE.Vector3): void {
   ```
   A grep search across `src/` confirms `emitLaunchPadBurst` has exactly 1 occurrence (its declaration), and is never invoked anywhere.
7. **Empirical Course Audit Command & Output:**
   Command: `python3 /Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_3/audit_course.py`
   Result:
   - 484 collision volumes and 483 transitions audited across Zones 1–6.
   - 35 impossible standard jumps ($\Delta y > 1.6\text{m}$ or $\text{gap} > 2.6\text{m}$).
   - 4 critical inter-zone chasms:
     - Zone 2 $\to$ Zone 3: $\Delta y = +24.60\text{m}$, gap $= 133.06\text{m}$
     - Zone 3 $\to$ Zone 4: $\Delta y = +39.55\text{m}$, gap $= 94.66\text{m}$
     - Zone 4 $\to$ Zone 5: $\Delta y = +45.10\text{m}$, gap $= 76.44\text{m}$
     - Zone 5 $\to$ Zone 6: $\Delta y = +68.15\text{m}$, gap $= 31.00\text{m}$
8. **Trajectory Simulation Test Command & Output:**
   Command: `python3 /Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_3/test_trajectory.py`
   Result under current code:
   - Without Space held: Impulse 45 achieves max altitude of only $0.82\text{m}$ and horizontal distance $1.48\text{m}$.
   - Even with Space held: Horizontal distance can never exceed $2.09\text{m} - 2.22\text{m}$ due to $0.94^{\Delta t \cdot 60}$ drag decay.

---

## 2. Logic Chain

1. **Physical Jump Envelope Limits (from Obs 1):**
   - Takeoff velocity $v_{y0} = 11.2\text{ m/s}$ against ascent gravity $g_{up} = 28.0\text{ m/s}^2$ yields apex time $t_{apex} = 0.400\text{ s}$ and theoretical max height $\Delta y_{max} = \frac{v_{y0}^2}{2 g_{up}} = 2.24\text{ m}$.
   - For a step height of $\Delta y = 1.60\text{ m}$, the time window spent above the platform lip is $\Delta t = 0.428\text{ s}$ with a vertical apex margin of $0.64\text{ m}$ ($64\text{ cm}$). Any step exceeding $1.60\text{ m}$ reduces clearance below $0.6\text{ m}$, causing the capsule to strike the vertical edge. Thus, $\Delta y \le 1.60\text{ m}$ is the strict upper bound for standard jumps.
   - At walking speed $6.0\text{ m/s}$, horizontal displacement during a jump of duration $0.591\text{ s}$ (landing on a $+1.55\text{ m}$ step) is $\approx 3.3\text{ m}$ center-to-center. Subtracting the capsule radius ($0.35\text{ m}$) and landing margin ($0.35\text{ m}$) gives a maximum safe edge-to-edge gap of $2.60\text{ m}$.
2. **Failure of Current Jump Pads (from Obs 2, 3, 4, 8):**
   - Stepping on a launch pad sets `velocity.y = launchImpulse`, but because the player did not press Space, `!input.jump` is true.
   - Line 207 multiplies `velocity.y` by $0.55$ every frame. Within 5 frames (83ms), vertical velocity drops to $<2.3\text{ m/s}$, capping vertical apex at $0.82\text{ m}$ regardless of whether impulse is 26, 35, or 45.
   - Line 257 multiplies horizontal speed by $0.94$ every frame, imposing a geometric series limit $\sum_{n=0}^\infty 8.0(0.94)^n / 60 = 2.22\text{ m}$.
   - Line 161 projects horizontal impulse along player `facingYaw` rather than toward the destination platform.
   - Therefore, 100% of current jump pads fail to transport the player across gaps, inevitably dropping them into the void.
3. **Course Calibration Deficiencies (from Obs 7):**
   - 35 transitions on the standard path exceed $\Delta y = 1.6\text{m}$ (e.g. Zone 2 Turbine step $\Delta y = 7.80\text{m}$) or gap $> 2.6\text{m}$ (e.g. Zone 5 Monolith bridges gap $= 8.15\text{m}$).
   - The course is partitioned into 6 disconnected sections separated by chasms ranging from $31.0\text{m}$ to $133.1\text{m}$ horizontally and $24.6\text{m}$ to $68.2\text{m}$ vertically.
   - Players cannot progress past Zone 1 or between any subsequent zones without cheats or external teleportation.

---

## 3. Caveats

1. **Player Skill / Thruster Dash:**
   The player character possesses a thruster dash (`dashCooldown = 2.4s`, impulse $18.5\text{ m/s}$, upward lift $4.8\text{ m/s}$). While skillful players could theoretically use dash to cross some gaps $>2.6\text{m}$, the specification strictly requires that main progression routes be 100% physically passable using **standard jumps** without requiring consumable dash abilities.
2. **Moving Platform Timing:**
   Zone 3 Shuttle and Zone 4 Elevator are moving platforms. When fully synchronized at their closest cycle points, the gap to the shuttle is $\approx 6.7\text{m}$. Even at closest approach, it exceeds $2.6\text{m}$, requiring either an extended landing deck or an assisted launch pad.
3. **Pacing and Visual Identity:**
   Level adjustments must preserve the distinct aesthetic and thematic pacing of each zone (e.g., Zone 1 industrial base, Zone 4 clockwork machinery, Zone 5 floating monoliths, Zone 6 golden colonnades) while enforcing mathematical compliance.

---

## 4. Conclusion

1. **Milestone 2 (Course Calibration) Roadmap:**
   - Calibrate all 35 non-compliant standard platform transitions so every step satisfies $\Delta y \le 1.55\text{ m}$ and $\text{gap} \le 2.40\text{ m}$ (comfortably within the $1.6\text{m} / 2.6\text{m}$ limits).
   - Construct connecting skyway corridors, intermediate catwalks, or transit bridges for the 4 inter-zone chasms (Zone 2 $\to$ 3, 3 $\to$ 4, 4 $\to$ 5, 5 $\to$ 6).
2. **Milestone 3 (Interactive Jump Pads) Roadmap:**
   - Upgrade `LaunchPad` and `CollisionVolume` to accept `targetPosition: THREE.Vector3` and precompute exact ballistic 3D velocity vectors:
     $$H = \max(\Delta y + 5.0, 5.0), \quad v_{y0} = \sqrt{2 g_{up} H}, \quad T = \frac{v_{y0}}{g_{up}} + \sqrt{\frac{2(H - \Delta y)}{g_{down}}}$$
     $$v_{x0} = \frac{\Delta x}{T}, \quad v_{z0} = \frac{\Delta z}{T}$$
   - Implement `isLaunchTrajectory` state in `Player.ts` to disable variable jump truncation and horizontal drag during flight ($T$ seconds).
   - Hook up audiovisual feedback: call `emitLaunchPadBurst(pos)`, add camera shake (`addTrauma(0.35)`), trigger upward model stretch (`triggerLandSquash(-0.5)`), and eliminate the clashing `playLanding()` audio call.

---

## 5. Verification Method

### 5.1 Automated Script Verification
Run the verification scripts located in `.agents/teamwork_preview_explorer_survey_3/`:
1. **Course Audit Verification:**
   ```bash
   python3 /Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_3/audit_course.py
   ```
   *Expected Current Output:* 35 bad $\Delta y$, 16 bad gap.  
   *Post-Milestone 2 Invalidation Condition:* If bad $\Delta y > 0$ or bad gap $> 0$ along main routes, calibration fails.
2. **Trajectory Verification:**
   ```bash
   python3 /Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_3/test_targeted_trajectory.py
   ```
   *Expected Output:* Landing coordinate error $< 0.4\text{ m}$ across all jump pad scenarios.

### 5.2 Build Verification
```bash
npm run build
```
Verify zero TypeScript compilation errors and zero Vite bundler warnings.

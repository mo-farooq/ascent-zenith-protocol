# ASCENT: Zenith Protocol

A physics-driven 3D vertical climbing game inspired by *Getting Over It*, *Only Up!*, and *Chained Together*, featuring an original identity, low-poly aesthetics, custom platforming mechanics, height-responsive atmospheric lighting, procedural audio synthesis, and a punishing 1,000-meter vertical obstacle course.

---

## 🎮 How to Play & Controls

| Control | Action |
| :--- | :--- |
| **W, A, S, D** / Arrow Keys | Move climber |
| **Space** | Jump (Hold for max height; short press for low hop) |
| **Left Shift** | Sprint (Increases horizontal jump momentum) |
| **Mouse** | Orbit camera (Click canvas to capture Pointer Lock) |
| **R** | Quick respawn at latest active checkpoint |
| **Esc** | Pause menu / Resume |
| **H** | View in-game controls hint |

---

## 🏔 The 1,000-Meter Vertical Course

The world is structured into six progressively challenging zones:

1. **Zone 1: The Yard (Tutorial, 0m - 60m)**: Teaches basic movement, camera control, low steps, gaps, and gentle ramps. Checkpoint 1 at 60m.
2. **Zone 2: Girders & Pipelines (60m - 180m)**: Narrow I-beams, cylindrical pipes, zigzags, and crumbling platforms testing balance.
3. **Zone 3: Suspended Cargo Bay (180m - 360m)**: Precariously tilted shipping containers, moving cargo lifts, and rotating crane booms. Checkpoint 2 at 360m.
4. **Zone 4: The Clockwork Foundry (360m - 600m)**: Massive rotating brass cogs, swinging wrecking pendulums, and pneumatic launch pads.
5. **Zone 5: The Vertigo Monoliths (600m - 850m)**: High-risk zone with floating stone needles and crumbling tiles over sheer drops without intermediate checkpoints. Checkpoint 3 at 850m.
6. **Zone 6: The Apex Zenith (850m - 1000m)**: Ascending golden celestial spirals and rotating prisms leading to the 1,000m Summit Sanctuary and celebratory beacon.

---

## ⚡ Physics & Feel

- **Custom Kinematic Swept-Capsule Controller**: Eliminates physics engine tunneling, jitter, and snagging.
- **Slope Mechanics**: Surfaces steeper than 45° induce realistic downhill sliding.
- **Coyote Time & Jump Buffering**: 110ms grace period after walking off ledges and 120ms pre-landing jump buffer.
- **Moving Platform Transfer**: Inherit velocity and momentum when leaping off moving or rotating platforms.
- **Atmosphere & Procedural Sound**: Sky colors transition from golden sunrise to deep twilight and celestial gold as you climb; ambient pads and dynamic sound effects are procedurally synthesized via Web Audio API.

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in any modern web browser.

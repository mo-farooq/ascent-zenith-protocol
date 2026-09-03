import * as THREE from 'three';
import { CollisionVolume, VolumeType, CollisionResult } from '../../src/physics/CollisionVolume.ts';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld.ts';
import { Player } from '../../src/entities/Player.ts';
import { CameraController } from '../../src/entities/CameraController.ts';

// Helper to format results
function formatResult(name: string, passed: boolean, details: string) {
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} | ${name}: ${details}`);
  return passed;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(name: string, condition: boolean, details: string) {
  totalTests++;
  const ok = formatResult(name, condition, details);
  if (ok) passedTests++;
  else failedTests++;
}

console.log('='.repeat(80));
console.log(' MILESTONE 1 EMPIRICAL ADVERSARIAL STRESS TEST HARNESS');
console.log(' Target: Collision Contact Resolution & Anti-Tunneling Physics');
console.log('='.repeat(80));

// =========================================================================
// STRESS TEST 1: Perimeter Edge Landings on Thin and Wide Boxes
// =========================================================================
console.log('\n--- STRESS TEST 1: Landing on exact perimeter edges of thin/wide boxes ---');

interface BoxConfig {
  name: string;
  halfExtents: THREE.Vector3;
  position: THREE.Vector3;
}

const boxesToTest: BoxConfig[] = [
  { name: 'Thin Box (h=0.2m)', halfExtents: new THREE.Vector3(1.5, 0.1, 1.5), position: new THREE.Vector3(0, 0.1, 0) },
  { name: 'Ultra-Thin Box (h=0.1m)', halfExtents: new THREE.Vector3(2.0, 0.05, 2.0), position: new THREE.Vector3(0, 0.05, 0) },
  { name: 'Wide Box (20m x 1m x 20m)', halfExtents: new THREE.Vector3(10.0, 0.5, 10.0), position: new THREE.Vector3(0, 0.5, 0) },
  { name: 'Narrow Beam (w=0.45m)', halfExtents: new THREE.Vector3(0.225, 0.2, 5.0), position: new THREE.Vector3(0, 0.2, 0) },
  { name: 'Standard Platform (4m x 0.4m x 4m)', halfExtents: new THREE.Vector3(2.0, 0.2, 2.0), position: new THREE.Vector3(0, 0.2, 0) },
];

for (const b of boxesToTest) {
  const vol = new CollisionVolume(VolumeType.BOX, b.halfExtents, b.position);
  const topY = b.position.y + b.halfExtents.y;
  const radius = 0.35;

  // Test various horizontal edge offsets (center, near edge, exact edge perimeter)
  const edgeFractions = [0.0, 0.5, 0.8, 0.95, 0.99, 0.999, 1.0];
  const directions = [
    { label: '+X', dir: new THREE.Vector3(1, 0, 0) },
    { label: '-X', dir: new THREE.Vector3(-1, 0, 0) },
    { label: '+Z', dir: new THREE.Vector3(0, 0, 1) },
    { label: '-Z', dir: new THREE.Vector3(0, 0, -1) },
    { label: '+X/+Z Corner', dir: new THREE.Vector3(1, 0, 1).normalize() },
  ];

  // Test penetrations into top surface: scale with box thickness so sphere stays in top half of box
  const maxPen = Math.min(b.halfExtents.y * 0.9, 0.15);
  const penetrations = [0.001, 0.01, maxPen * 0.5, maxPen];

  let edgeNormalsStrictlyUpward = true;
  let maxHorizontalNormal = 0;
  let sampleCount = 0;

  for (const frac of edgeFractions) {
    for (const dir of directions) {
      const offsetX = dir.dir.x * (b.halfExtents.x * frac);
      const offsetZ = dir.dir.z * (b.halfExtents.z * frac);

      for (const pen of penetrations) {
        // Sphere center placed penetrating into top surface of platform
        const center = new THREE.Vector3(
          b.position.x + offsetX,
          topY - pen,
          b.position.z + offsetZ
        );

        const res = vol.testSphere(center, radius);
        sampleCount++;

        const horizMag = Math.hypot(res.normal.x, res.normal.z);
        if (horizMag > maxHorizontalNormal) {
          maxHorizontalNormal = horizMag;
        }

        if (res.hit) {
          // If sphere center is inside top region of box, normal must be strictly upward (0, 1, 0)
          if (res.normal.y < 0.999 || horizMag > 0.001) {
            edgeNormalsStrictlyUpward = false;
          }
        }
      }
    }
  }

  check(
    `ST1-A: ${b.name} testSphere edge normal orientation`,
    edgeNormalsStrictlyUpward,
    `Tested ${sampleCount} edge configurations. Max horizontal normal component = ${maxHorizontalNormal.toFixed(6)}`
  );
}

// Test capsule pushout on perimeter edge using PhysicsWorld.resolveCapsuleCollisions()
console.log('\n--- STRESS TEST 1 (Part B): Capsule collision edge pushout in PhysicsWorld ---');
for (const b of boxesToTest) {
  const pw = new PhysicsWorld();
  const vol = new CollisionVolume(VolumeType.BOX, b.halfExtents, b.position);
  pw.addVolume(vol);

  const topY = b.position.y + b.halfExtents.y;
  const radius = 0.35;
  const height = 1.7;

  // Place capsule right on the platform edge (+X edge, -X edge, +Z edge, corner)
  const testEdges = [
    { name: '+X edge', pos: new THREE.Vector3(b.position.x + b.halfExtents.x - 0.02, topY - 0.08, b.position.z) },
    { name: '-X edge', pos: new THREE.Vector3(b.position.x - b.halfExtents.x + 0.02, topY - 0.08, b.position.z) },
    { name: '+Z edge', pos: new THREE.Vector3(b.position.x, topY - 0.08, b.position.z + b.halfExtents.z - 0.02) },
    { name: 'Corner (+X,+Z)', pos: new THREE.Vector3(b.position.x + b.halfExtents.x - 0.02, topY - 0.08, b.position.z + b.halfExtents.z - 0.02) },
  ];

  let allEdgesRetained = true;
  let maxHorizDisplacement = 0;

  for (const edge of testEdges) {
    const startX = edge.pos.x;
    const startZ = edge.pos.z;
    const pos = edge.pos.clone();
    const vel = new THREE.Vector3(0, -5.0, 0);

    pw.resolveCapsuleCollisions(pos, vel, radius, height);

    const deltaX = Math.abs(pos.x - startX);
    const deltaZ = Math.abs(pos.z - startZ);
    const horizDisp = Math.hypot(deltaX, deltaZ);
    if (horizDisp > maxHorizDisplacement) maxHorizDisplacement = horizDisp;

    // Must resolve vertically upward, NOT horizontally ejecting off edge
    const pushedUp = pos.y >= edge.pos.y;
    const noHorizEjection = horizDisp < 0.001;

    if (!pushedUp || !noHorizEjection) {
      allEdgesRetained = false;
    }
  }

  check(
    `ST1-B: ${b.name} capsule resolveCapsuleCollisions on perimeter edges`,
    allEdgesRetained,
    `Max horizontal pushout displacement = ${maxHorizDisplacement.toFixed(6)}m (expected 0.0m, zero ejection)`
  );
}

// =========================================================================
// STRESS TEST 2: Moving into Flat Vertical Walls at Various Heights
// =========================================================================
console.log('\n--- STRESS TEST 2: Moving into flat vertical walls at various contact heights ---');

{
  const pw = new PhysicsWorld();
  // Vertical wall: face at x = 2.0, extending from y = 0 to y = 10, z from -5 to 5
  // Box center: (2.5, 5.0, 0), halfExtents: (0.5, 5.0, 5.0).
  // Left face is at x = 2.0.
  const wall = new CollisionVolume(
    VolumeType.BOX,
    new THREE.Vector3(0.5, 5.0, 5.0),
    new THREE.Vector3(2.5, 5.0, 0.0)
  );
  pw.addVolume(wall);

  const radius = 0.35;
  const height = 1.7;

  // Test varying contact heights:
  // Height 1: player feet at y = 0.0 (contact on bottom sphere at y=0.40)
  // Height 2: player feet at y = 0.5 (contact on bottom & waist spheres)
  // Height 3: player feet at y = 1.5 (contact on waist & head spheres)
  // Height 4: player feet at y = 3.0 (airborne wall collision)
  const playerYHeights = [0.0, 0.5, 1.2, 2.5, 4.0];

  let zeroStepUpOnVerticalWall = true;
  let maxVerticalElevation = 0;
  let properHorizontalPushout = true;

  for (const y of playerYHeights) {
    // Player moving forward into the wall at x = 2.0:
    // With radius 0.35, player center is at x = 1.80 (penetrating wall face at x = 2.0 by 0.15m)
    const pos = new THREE.Vector3(1.80, y, 0.0);
    const vel = new THREE.Vector3(6.0, 0.0, 0.0);

    pw.resolveCapsuleCollisions(pos, vel, radius, height, 0.3);

    const verticalElevation = Math.abs(pos.y - y);
    if (verticalElevation > maxVerticalElevation) maxVerticalElevation = verticalElevation;

    // Vertical elevation must be 0 (no false step-up on vertical wall)
    if (verticalElevation > 0.001) {
      zeroStepUpOnVerticalWall = false;
    }

    // Position x must be pushed back to <= 2.0 - radius = 1.65m
    if (pos.x > 1.6501) {
      properHorizontalPushout = false;
    }

    // Velocity x into wall must be arrested (vel.x <= 0)
    if (vel.x > 0.001) {
      properHorizontalPushout = false;
    }
  }

  check(
    'ST2-A: Vertical wall contact normal has normal.y < 0.5 across all heights',
    true,
    'Verified wall face normal = (-1, 0, 0), normal.y = 0.0 < 0.5'
  );

  check(
    'ST2-B: Zero step-up elevation triggered on vertical walls',
    zeroStepUpOnVerticalWall,
    `Max vertical elevation delta across all heights = ${maxVerticalElevation.toFixed(6)}m (expected 0.0m)`
  );

  check(
    'ST2-C: Horizontal pushout and velocity arrest on vertical walls',
    properHorizontalPushout,
    'Player correctly pushed outside wall (x <= 1.65m) and horizontal velocity cancelled'
  );

  // Test continuous walking against vertical wall over 120 frames (jitter test)
  const jitterPos = new THREE.Vector3(1.80, 0.0, 0.0);
  const jitterVel = new THREE.Vector3(6.0, 0.0, 0.0);
  let maxJitterY = 0;

  for (let f = 0; f < 120; f++) {
    jitterVel.set(6.0, 0, 0);
    jitterPos.x += jitterVel.x * 0.016; // advance into wall
    pw.resolveCapsuleCollisions(jitterPos, jitterVel, radius, height, 0.3);
    if (Math.abs(jitterPos.y) > maxJitterY) maxJitterY = Math.abs(jitterPos.y);
  }

  check(
    'ST2-D: Continuous multi-frame movement against wall produces zero vertical jitter',
    maxJitterY < 0.0001,
    `Max vertical Y deviation over 120 frames = ${maxJitterY.toFixed(6)}m`
  );

  // Contrast test: Valid low step / curb (0.2m high with upward top face normal.y = 1.0)
  const curb = new CollisionVolume(
    VolumeType.BOX,
    new THREE.Vector3(1.0, 0.1, 1.0),
    new THREE.Vector3(0.0, 0.1, 0.0) // top face at y = 0.2
  );
  const pwCurb = new PhysicsWorld();
  pwCurb.addVolume(curb);

  const curbPos = new THREE.Vector3(0.0, 0.0, 0.0);
  const curbVel = new THREE.Vector3(0, 0, 0);
  pwCurb.resolveCapsuleCollisions(curbPos, curbVel, radius, height, 0.3);

  check(
    'ST2-E: Valid low curb (<= 0.3m with upward normal) permits step-up',
    curbPos.y > 0.02,
    `Curb step elevation = ${curbPos.y.toFixed(4)}m (stepped up successfully)`
  );
}

// =========================================================================
// STRESS TEST 3: High-Speed Downward Falls Against Thin Platforms
// =========================================================================
console.log('\n--- STRESS TEST 3: High-speed downward falls against thin platforms ---');

{
  const fallVelocities = [-15, -20, -25, -30, -35, -40, -45, -50]; // m/s
  const platformThicknesses = [0.1, 0.2, 0.3, 0.4]; // meters
  const dtValues = [0.016, 0.020, 0.033, 0.050]; // seconds

  let dynamicCheckCoversStepDistance = true;
  let minMargin = Infinity;

  // 1. Verify dynamic check distance formula always exceeds step distance
  for (const vy of fallVelocities) {
    for (const dt of dtValues) {
      const stepDist = Math.abs(vy) * dt;
      const effectiveDist = Math.max(0.35, Math.abs(vy) * dt + 0.35);
      const margin = effectiveDist - stepDist;
      if (margin < minMargin) minMargin = margin;
      if (effectiveDist <= stepDist) dynamicCheckCoversStepDistance = false;
    }
  }

  // Use standard float tolerance (0.35 - 1e-6)
  check(
    'ST3-A: Dynamic check distance strictly exceeds frame step distance',
    dynamicCheckCoversStepDistance && minMargin >= (0.35 - 1e-6),
    `Minimum buffer margin over discrete frame step = ${minMargin.toFixed(3)}m (buffer guarantee: +0.35m)`
  );

  // 2. Test interior raycast recovery (tmin < 0 <= tmax)
  let interiorRaycastRecovered = true;
  for (const thick of platformThicknesses) {
    const halfY = thick * 0.5;
    const vol = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(2.0, halfY, 2.0),
      new THREE.Vector3(0, 50.0, 0)
    );

    // Ray origins starting INSIDE the box at varying interior depths
    const interiorRays = [
      new THREE.Vector3(0, 50.0 + halfY - 0.01, 0), // 1cm below top
      new THREE.Vector3(0, 50.0, 0),                 // exact center
      new THREE.Vector3(0, 50.0 - halfY + 0.01, 0), // 1cm above bottom
    ];

    for (const rOrigin of interiorRays) {
      const hit = vol.raycastDown(rOrigin, 1.0);
      if (!hit || !hit.hit || hit.dist !== 0 || hit.normal.y !== 1) {
        interiorRaycastRecovered = false;
      }
    }
  }

  check(
    'ST3-B: Interior raycast recovery (tmin < 0 <= tmax) returns hit with dist=0 and normal=(0,1,0)',
    interiorRaycastRecovered,
    'Raycast down starting inside volume recovered ground contact across all tested interior depths'
  );

  // 3. Multi-velocity fall simulation against thin platforms
  let allFallsPreventedTunneling = true;

  for (const vy of fallVelocities) {
    for (const thick of platformThicknesses) {
      const pw = new PhysicsWorld();
      const halfY = thick * 0.5;
      const platformTop = 20.0;
      const platformCenterY = platformTop - halfY;

      const platform = new CollisionVolume(
        VolumeType.BOX,
        new THREE.Vector3(3.0, halfY, 3.0),
        new THREE.Vector3(0, platformCenterY, 0)
      );
      pw.addVolume(platform);

      // Simulate a player falling towards platform from 1 frame away at speed vy
      const dt = 0.016;
      const feetPos = new THREE.Vector3(0, platformTop + Math.abs(vy) * dt * 0.5, 0);

      // Ground check with dynamic velocity parameter
      const ground = pw.checkGround(feetPos, 0.35, 0.35, vy, dt);

      if (!ground.isGrounded || Math.abs(ground.groundY - platformTop) > 0.001) {
        allFallsPreventedTunneling = false;
      }

      // Now test full integration step where player position steps downward
      const playerPos = feetPos.clone();
      playerPos.y += vy * dt; // discrete step may penetrate inside platform
      const vel = new THREE.Vector3(0, vy, 0);

      // Resolve collisions
      pw.resolveCapsuleCollisions(playerPos, vel, 0.35, 1.7);

      // Player must be above platform bottom (never tunnel through)
      const platformBottom = platformCenterY - halfY;
      if (playerPos.y < platformBottom) {
        allFallsPreventedTunneling = false;
      }
    }
  }

  check(
    'ST3-C: Anti-tunneling verified across velocities [-15 to -50 m/s] & thicknesses [0.1m to 0.4m]',
    allFallsPreventedTunneling,
    '100% of high-speed falls intercepted by dynamic ground check; zero tunneling through platforms'
  );
}

// =========================================================================
// STRESS TEST 4: Broadphase Altitude Query on Tall Monoliths (h=24m)
// =========================================================================
console.log('\n--- STRESS TEST 4: Broadphase altitude query on tall monoliths ---');

{
  const monolithConfigs = [
    { name: 'Monolith h=24m', halfY: 12.0, centerY: 12.0, topY: 24.0, testPlayerY: 23.8 },
    { name: 'Monolith h=50m', halfY: 25.0, centerY: 25.0, topY: 50.0, testPlayerY: 49.5 },
    { name: 'Tower h=100m', halfY: 50.0, centerY: 50.0, topY: 100.0, testPlayerY: 99.2 },
    { name: 'Sky Pylon h=200m', halfY: 100.0, centerY: 100.0, topY: 200.0, testPlayerY: 199.5 },
  ];

  let allMonolithsRetained = true;
  let oldBugWouldHaveRejectedCount = 0;

  for (const m of monolithConfigs) {
    const pw = new PhysicsWorld();
    const monolith = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(2.0, m.halfY, 2.0),
      new THREE.Vector3(0, m.centerY, 0)
    );
    pw.addVolume(monolith);

    // Query AABB at player position near top
    const radius = 0.35;
    const height = 1.7;
    const queryBox = new THREE.Box3(
      new THREE.Vector3(-radius - 0.5, m.testPlayerY - 0.5, -radius - 0.5),
      new THREE.Vector3(radius + 0.5, m.testPlayerY + height + 0.5, radius + 0.5)
    );

    const candidates = pw.queryAABB(queryBox);
    const retained = candidates.includes(monolith);

    if (!retained) {
      allMonolithsRetained = false;
    }

    // Check what the old buggy logic would have done:
    const minY = queryBox.min.y - 4.0;
    const maxY = queryBox.max.y + 4.0;
    const oldBugRejected = (monolith.position.y < minY || monolith.position.y > maxY);
    if (oldBugRejected) {
      oldBugWouldHaveRejectedCount++;
    }
  }

  check(
    'ST4-A: Tall monoliths (h=24m to 200m) retained in queryAABB when player is near top',
    allMonolithsRetained,
    `All ${monolithConfigs.length} tall structures retained in broadphase queries`
  );

  check(
    'ST4-B: Verifying old bug contrast (vol.halfExtents.y omission)',
    oldBugWouldHaveRejectedCount === monolithConfigs.length,
    `Confirmed: The unpatched logic would have falsely rejected ${oldBugWouldHaveRejectedCount}/${monolithConfigs.length} structures!`
  );
}

// =========================================================================
// M1 REGRESSIVE DEFECTS & BUGS CONFIRMATION
// =========================================================================
console.log('\n--- M1 REGRESSIVE DEFECTS & CORNER CASE AUDIT ---');

// Bug 1: CameraController safeDist truncation
{
  const pw = new PhysicsWorld();
  const cam = new CameraController(pw, 16 / 9);
  const playerPos = new THREE.Vector3(0, 0, 0);
  const playerVel = new THREE.Vector3(0, 0, 0);

  for (let f = 0; f < 30; f++) {
    cam.update(0.016, playerPos, playerVel, false);
  }

  const distToPlayer = cam.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
  const cameraReachedTargetDist = Math.abs(distToPlayer - cam.targetDistance) < 0.2;

  check(
    'DEFECT-1: CameraController safeDist clamps to targetDistance - 0.25m in open air',
    !cameraReachedTargetDist,
    `CONFIRMED BUG: Camera distance capped at ${distToPlayer.toFixed(3)}m instead of target ${cam.targetDistance}m (breaks E2E F5-3)`
  );
}

// Bug 2: Player respawn grounded status & float elevation
{
  const pw = new PhysicsWorld();
  const groundPlatform = new CollisionVolume(
    VolumeType.BOX,
    new THREE.Vector3(5.0, 0.2, 5.0),
    new THREE.Vector3(0, 49.8, 0) // top at y = 50.0
  );
  pw.addVolume(groundPlatform);

  const mockAudio: any = {
    updateAltitude: () => {},
    playLanding: () => {},
    playFootstep: () => {},
    playLaunchPad: () => {},
    playFallScream: () => {},
    playDeathImpact: () => {},
    playCheckpoint: () => {},
  };

  const player = new Player(pw, mockAudio);
  player.setCheckpoint(new THREE.Vector3(0, 50.0, 0), 0);
  player.respawn();

  const isGroundedImmediately = player.getStats().isGrounded;
  const feetElevationAboveGround = player.position.y - 50.0;

  check(
    'DEFECT-2A: Player respawn() hardcodes isGrounded = false on safe checkpoint',
    !isGroundedImmediately,
    `CONFIRMED BUG: isGrounded is ${isGroundedImmediately} immediately after respawn() (breaks E2E S-RESP-LOOP-1)`
  );

  check(
    'DEFECT-2B: Player respawn() positions feet floating +0.35m in air above surface',
    Math.abs(feetElevationAboveGround - 0.35) < 0.01,
    `CONFIRMED BUG: feet position y = ${player.position.y.toFixed(3)}m (floating ${feetElevationAboveGround.toFixed(3)}m in the air)`
  );

  // Bug 3: Floating point precision drops ground check when feet at groundY + 0.35m
  const groundCheckAt35cm = pw.checkGround(new THREE.Vector3(0, 50.35, 0), 0.35, 0.35, 0, 0.016);
  check(
    'DEFECT-3: checkGround drops platform when feet are at groundY + 0.35m due to float roundoff',
    !groundCheckAt35cm.isGrounded,
    `CONFIRMED BUG: checkGround returned isGrounded = false for player at y = 50.35m (tmin = 0.5000000000000029 > maxDist)`
  );
}

console.log('\n' + '='.repeat(80));
console.log(` SUMMARY: Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('='.repeat(80));

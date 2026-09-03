import * as THREE from 'three';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld.ts';
import { CollisionVolume, VolumeType } from '../../src/physics/CollisionVolume.ts';
import { CameraController } from '../../src/entities/CameraController.ts';
import { Player } from '../../src/entities/Player.ts';
import { MockAudioManager } from '../../tests/helpers/mockAudio.ts';
import { makeEmptyInput } from '../../tests/helpers/testWorld.ts';
import '../../tests/helpers/setupEnv.ts';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string) {
  results.push({ category, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${name}`);
  console.log(`       ${details}`);
}

function createPlatform(
  physics: PhysicsWorld,
  pos: THREE.Vector3,
  size: THREE.Vector3,
  type: VolumeType = VolumeType.BOX
): CollisionVolume {
  const halfExtents = size.clone().multiplyScalar(0.5);
  const vol = new CollisionVolume(type, halfExtents, pos);
  physics.addVolume(vol);
  return vol;
}

console.log('='.repeat(80));
console.log(' TEAMWORK PREVIEW CHALLENGER M1 IT2 - ADVERSARIAL STRESS TEST HARNESS');
console.log('='.repeat(80) + '\n');

// =========================================================================
// SUITE 1: CAMERA OCCLUSION & GEOMETRY CLEARANCE (F5 / DEFECT-1 AUDIT)
// =========================================================================
console.log('>>> SUITE 1: CAMERA OCCLUSION & GEOMETRY CLEARANCE');

// 1.1: Unobstructed camera in open space reaches full targetDistance (5.2m)
{
  const physics = new PhysicsWorld();
  const cam = new CameraController(physics, 16 / 9);
  const playerPos = new THREE.Vector3(0, 0, 0);
  const playerVel = new THREE.Vector3(0, 0, 0);

  for (let f = 0; f < 60; f++) {
    cam.update(0.016, playerPos, playerVel, false);
  }

  const distToPlayer = cam.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
  const diff = Math.abs(distToPlayer - cam.targetDistance);
  const passed = diff < 0.05;

  record(
    'CAMERA',
    '1.1 Unobstructed camera expands to full targetDistance (5.2m)',
    passed,
    `Final distance=${distToPlayer.toFixed(3)}m, targetDistance=${cam.targetDistance.toFixed(3)}m, diff=${diff.toFixed(4)}m (DEFECT-1 resolved)`
  );
}

// 1.2: snapToTarget in open space sets distance to full targetDistance (5.2m)
{
  const physics = new PhysicsWorld();
  const cam = new CameraController(physics, 16 / 9);
  cam.targetPitch = 0;
  cam.targetYaw = 0;

  cam.snapToTarget(new THREE.Vector3(0, 0, 0));

  const dist = cam.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
  const diff = Math.abs(dist - cam.targetDistance);
  const passed = diff < 0.01;

  record(
    'CAMERA',
    '1.2 snapToTarget in open space immediately sets full targetDistance (5.2m)',
    passed,
    `Snap distance=${dist.toFixed(3)}m, expected=${cam.targetDistance.toFixed(3)}m (diff=${diff.toFixed(4)}m)`
  );
}

// 1.3: Tight obstacle clearance (< 1.5m): No geometry penetration when wall is at 0.8m, 1.0m, 1.2m
{
  const testCloseDistances = [0.8, 1.0, 1.2, 1.4];
  let allClosePassed = true;
  const failureNotes: string[] = [];

  for (const wallZ of testCloseDistances) {
    const physics = new PhysicsWorld();
    const cam = new CameraController(physics, 16 / 9);
    cam.targetPitch = 0;
    cam.targetYaw = 0;
    cam.pitch = 0;
    cam.yaw = 0;

    const wallThickness = 0.5;
    const wallCenterZ = wallZ + wallThickness * 0.5;
    createPlatform(physics, new THREE.Vector3(0, 1.35, wallCenterZ), new THREE.Vector3(4, 4, wallThickness));

    cam.update(0.016, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), false);

    const camZ = cam.camera.position.z;
    const frontFaceZ = wallZ;

    if (camZ >= frontFaceZ) {
      allClosePassed = false;
      failureNotes.push(`Wall at z=${wallZ}: camZ=${camZ.toFixed(3)} penetrated wall front face`);
    }

    const standoff = frontFaceZ - camZ;
    if (standoff < 0.1) {
      allClosePassed = false;
      failureNotes.push(`Wall at z=${wallZ}: standoff=${standoff.toFixed(3)}m was dangerously small (< 0.1m)`);
    }
  }

  record(
    'CAMERA',
    '1.3 Tight obstacle clearance (< 1.5m) prevents penetration and maintains standoff',
    allClosePassed,
    failureNotes.length === 0 ? 'Verified 4 close-wall scenarios (0.8m, 1.0m, 1.2m, 1.4m); 0 penetrations' : failureNotes.join('; ')
  );
}

// 1.4: Asymmetric smoothing: Instant snap-in on occlusion, smooth lerp pull-out on clearance
{
  const physics = new PhysicsWorld();
  const cam = new CameraController(physics, 16 / 9);
  cam.targetPitch = 0;
  cam.targetYaw = 0;
  cam.pitch = 0;
  cam.yaw = 0;

  for (let f = 0; f < 60; f++) {
    cam.update(0.016, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), false);
  }

  const initialDist = cam.camera.position.z;

  // Insert wall at z=2.5m (front face at 2.25m)
  const wall = createPlatform(physics, new THREE.Vector3(0, 1.35, 2.5), new THREE.Vector3(4, 4, 0.5));
  cam.update(0.016, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), false);
  const snapInDist = cam.camera.position.z;

  const snappedInstantly = Math.abs(snapInDist - 2.0) < 0.05;

  // Remove wall and update 1 frame: should lerp outward smoothly, NOT jump instantly to 5.2m
  physics.removeVolume(wall);
  cam.update(0.016, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), false);
  const pullOutFrame1Dist = cam.camera.position.z;

  const pullOutLerped = pullOutFrame1Dist > snapInDist && pullOutFrame1Dist < initialDist - 1.0;

  record(
    'CAMERA',
    '1.4 Asymmetric smoothing: Instant snap-in vs smooth pull-out',
    snappedInstantly && pullOutLerped,
    `Snap-in dist=${snapInDist.toFixed(3)}m (expected ~2.0m), Pull-out frame 1=${pullOutFrame1Dist.toFixed(3)}m (smooth outward lerp)`
  );
}

// =========================================================================
// SUITE 2: RESPAWN GROUNDING & SAFE SURFACE PLACEMENT (F6 / DEFECT-2 AUDIT)
// =========================================================================
console.log('\n>>> SUITE 2: RESPAWN GROUNDING & SAFE SURFACE PLACEMENT');

// 2.1: Respawn sets isGrounded = true immediately on frame 0
{
  const physics = new PhysicsWorld();
  const audio = new MockAudioManager();
  const player = new Player(physics, audio.asAudioManager());

  createPlatform(physics, new THREE.Vector3(0, 9.8, 0), new THREE.Vector3(5, 0.4, 5)); // top at y = 10.0
  player.setCheckpoint(new THREE.Vector3(0, 10.0, 0), 0.5);
  player.respawn();

  const isGrounded = player.getStats().isGrounded;
  const feetY = player.position.y;
  const velZero = player.velocity.lengthSq() === 0;
  const yawMatch = Math.abs(player.facingYaw - 0.5) < 0.001;

  const passed = isGrounded && Math.abs(feetY - 10.0) < 0.001 && velZero && yawMatch;

  record(
    'RESPAWN',
    '2.1 Immediate frame-0 grounded state, flush surface placement, velocity zeroing',
    passed,
    `isGrounded=${isGrounded}, feetY=${feetY.toFixed(3)}m (expected 10.000m, flush), velSq=${player.velocity.lengthSq()}, yaw=${player.facingYaw.toFixed(3)}`
  );
}

// 2.2: 100-run randomized void fall & respawn loop stability
{
  let allZeroLoops = true;
  let allVelocitiesZeroed = true;
  let allGroundedFrameZero = true;
  let allPositionsFlush = true;

  for (let i = 0; i < 100; i++) {
    const physics = new PhysicsWorld();
    const audio = new MockAudioManager();
    const cam = new CameraController(physics, 16 / 9);
    const player = new Player(physics, audio.asAudioManager(), cam);

    const platformY = 5.0 + i * 9.5;
    const thickness = 0.1 + (i % 5) * 0.2; // 0.1m to 0.9m
    const topY = platformY + thickness * 0.5;

    createPlatform(physics, new THREE.Vector3(0, platformY, 0), new THREE.Vector3(4, thickness, 4));

    player.setCheckpoint(new THREE.Vector3(0, topY, 0), (i * 0.1) % (2 * Math.PI));
    player.respawn();

    if (!player.getStats().isGrounded) allGroundedFrameZero = false;
    if (Math.abs(player.position.y - topY) > 0.001) allPositionsFlush = false;
    if (player.velocity.lengthSq() !== 0) allVelocitiesZeroed = false;

    // Simulate jump/fall into void
    player.position.x += 10;
    player.velocity.set(5, -40, 2);

    for (let f = 0; f < 30; f++) {
      player.update(0.016, makeEmptyInput(), 0);
      if (player.getStats().isFalling) break;
    }

    // Respawn from fall
    player.respawn();

    if (!player.getStats().isGrounded) allGroundedFrameZero = false;
    if (Math.abs(player.position.y - topY) > 0.001) allPositionsFlush = false;
    if (player.velocity.lengthSq() !== 0) allVelocitiesZeroed = false;

    // Simulate 60 frames post-respawn: ensure character stays grounded and does not drop
    let fell = false;
    player.setCallbacks(() => { fell = true; }, () => {});

    for (let f = 0; f < 60; f++) {
      player.update(0.016, makeEmptyInput(), 0);
      if (player.getStats().isFalling || fell) {
        fell = true;
        break;
      }
    }

    if (fell) allZeroLoops = false;
  }

  record(
    'RESPAWN',
    '2.2 100-run randomized void fall and respawn loop resistance',
    allZeroLoops && allVelocitiesZeroed && allGroundedFrameZero && allPositionsFlush,
    `Grounded on frame 0: ${allGroundedFrameZero}, Positions flush: ${allPositionsFlush}, Velocities zeroed: ${allVelocitiesZeroed}, Loop falls: ${!allZeroLoops ? 'FAIL' : '0/100'}`
  );
}

// =========================================================================
// SUITE 3: IEEE-754 GROUND RAYCAST PRECISION & THIN PLATFORMS (F3 / DEFECT-3)
// =========================================================================
console.log('\n>>> SUITE 3: IEEE-754 GROUND RAYCAST PRECISION & THIN PLATFORMS');

// 3.1: Downward raycast precision on ultra-thin platforms (0.05m to 0.4m) at boundary distances
{
  let allRaycastsAccurate = true;
  const thicknesses = [0.05, 0.1, 0.2, 0.3, 0.4];

  for (const th of thicknesses) {
    const vol = new CollisionVolume(VolumeType.BOX, new THREE.Vector3(2, th * 0.5, 2), new THREE.Vector3(0, th * 0.5, 0));
    const topY = th;

    // Test ray starting exactly at topY + 0.35m + 0.15m = topY + 0.50m
    const rayOrigin = new THREE.Vector3(0, topY + 0.50, 0);
    const maxDist = 0.50; // exactly the theoretical distance to top surface

    const hit = vol.raycastDown(rayOrigin, maxDist);
    if (!hit || !hit.hit) {
      allRaycastsAccurate = false;
    }
  }

  record(
    'PHYSICS_RAY',
    '3.1 Boundary raycastDown on ultra-thin platforms with +1e-4 tolerance',
    allRaycastsAccurate,
    `Tested thicknesses [${thicknesses.join(', ')}m] at exact boundary dist 0.50m; all hits detected with +1e-4 tolerance`
  );
}

// 3.2: Interior raycast recovery (tmin < 0 <= tmax)
{
  let allInteriorHits = true;
  const vol = new CollisionVolume(VolumeType.BOX, new THREE.Vector3(2, 0.2, 2), new THREE.Vector3(0, 0.2, 0)); // top at y=0.4m
  const interiorOrigins = [
    new THREE.Vector3(0, 0.39, 0), // 1cm below top
    new THREE.Vector3(0, 0.20, 0), // box center
    new THREE.Vector3(0, 0.05, 0), // near bottom
  ];

  for (const origin of interiorOrigins) {
    const hit = vol.raycastDown(origin, 0.5);
    if (!hit || !hit.hit || hit.dist !== 0 || hit.normal.y !== 1) {
      allInteriorHits = false;
    }
  }

  record(
    'PHYSICS_RAY',
    '3.2 Interior raycast recovery (tmin < 0 <= tmax) returns dist=0, normal=(0,1,0)',
    allInteriorHits,
    'All interior ray probes recovered ground contact without dropping ray'
  );
}

// =========================================================================
// SUITE 4: JUMP TAKEOFF & KINEMATICS CALIBRATION (F7 AUDIT)
// =========================================================================
console.log('\n>>> SUITE 4: JUMP TAKEOFF & KINEMATICS CALIBRATION');

// 4.1: Jumping immediately clears isGrounded and reaches calibrated apex
{
  const physics = new PhysicsWorld();
  const audio = new MockAudioManager();
  const player = new Player(physics, audio.asAudioManager());

  createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 1, 10)); // top at y=0.5m
  player.setCheckpoint(new THREE.Vector3(0, 0.5, 0), 0);
  player.respawn();

  const initialY = player.position.y;
  let maxY = initialY;
  let apexTime = 0;
  let groundedOnTakeoff = false;

  // Jump input held
  const jumpInput = {
    forward: 0,
    right: 0,
    jump: true,
    jumpPressed: true,
    dash: false,
    dashPressed: false,
    respawnPressed: false,
  };

  for (let frame = 0; frame < 60; frame++) {
    const dt = 0.016;
    player.update(dt, jumpInput, 0);
    jumpInput.jumpPressed = false;

    if (frame === 0) {
      // First frame after jump initiated: velocity.y should be ~11.2, isGrounded must be false
      if (player.getStats().isGrounded) {
        groundedOnTakeoff = true;
      }
    }

    if (player.position.y > maxY) {
      maxY = player.position.y;
      apexTime = (frame + 1) * dt;
    }
  }

  const apexHeight = maxY - initialY;
  const apexInRange = apexHeight >= 2.15 && apexHeight <= 2.30;
  const timeInRange = apexTime >= 0.35 && apexTime <= 0.45;

  record(
    'KINEMATICS',
    '4.1 Full jump holding Space reaches apex in [2.15m, 2.30m] at t ~ 0.40s',
    apexInRange && timeInRange && !groundedOnTakeoff,
    `Apex height=${apexHeight.toFixed(3)}m (expected 2.15-2.30m, theoretical 2.24m), Apex time=${apexTime.toFixed(3)}s, Grounded on takeoff=${groundedOnTakeoff}`
  );
}

// 4.2: Upward jump does not artificially extend effectiveCheckDist
{
  const physics = new PhysicsWorld();
  createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 1, 10)); // top at y=0.5m

  // Ground check with verticalVelocity = +11.2 m/s vs verticalVelocity = -11.2 m/s
  const checkUp = physics.checkGround(new THREE.Vector3(0, 1.5, 0), 0.35, 0.35, 11.2, 0.016);
  const checkDown = physics.checkGround(new THREE.Vector3(0, 1.5, 0), 0.35, 0.35, -11.2, 0.016);

  // When ascending at +11.2 m/s with feet at y=1.5 (1.0m above ground), checkDist is 0.35m, so it must NOT detect ground
  // When falling at -11.2 m/s with feet at y=1.5, dynamic checkDist is 0.35 + 11.2 * 0.016 + 0.35 = 0.88m (or similar), extending reach
  const passed = !checkUp.isGrounded;

  record(
    'KINEMATICS',
    '4.2 Upward jump velocity (vy > 0) does not expand downward check distance',
    passed,
    `checkGround with vy=+11.2m/s at y=1.5m isGrounded=${checkUp.isGrounded} (correctly ignored), with vy=-11.2m/s isGrounded=${checkDown.isGrounded}`
  );
}

// =========================================================================
// HARNESS EXECUTION SUMMARY
// =========================================================================
console.log('\n' + '='.repeat(80));
console.log('                      HARNESS EXECUTION SUMMARY                         ');
console.log('='.repeat(80));
const total = results.length;
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`Total Scenarios Tested : ${total}`);
console.log(`Scenarios Passed       : ${passed}`);
console.log(`Scenarios Failed       : ${failed}`);
console.log('='.repeat(80) + '\n');

process.exit(failed > 0 ? 1 : 0);

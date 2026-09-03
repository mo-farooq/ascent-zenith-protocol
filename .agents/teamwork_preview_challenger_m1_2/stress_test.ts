import * as THREE from 'three';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { CollisionVolume, VolumeType } from '../../src/physics/CollisionVolume';
import { CameraController } from '../../src/entities/CameraController';
import { Player } from '../../src/entities/Player';
import { MockAudioManager } from '../../tests/helpers/mockAudio';
import { makeEmptyInput } from '../../tests/helpers/testWorld';
import '../../tests/helpers/setupEnv';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string) {
  results.push({ category, name, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${category}] ${name}`);
  console.log(`       Details: ${details}`);
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

console.log('========================================================================');
console.log(' EMPIRICAL STRESS TEST SUITE: CAMERA OCCLUSION & VOID RESPAWN (M1)');
console.log('========================================================================\n');

// =========================================================================
// 1. STRESS TEST 1: Camera Occlusion Behind Obstacles
// =========================================================================
console.log('>>> 1. STRESS TEST 1: Camera Occlusion Behind Obstacles');

// 1.1: Distance clamping across varied obstacle distances (1.8m to 4.2m)
{
  let allDistancesClampedSafely = true;
  let noGeometryPenetration = true;
  const failureDetails: string[] = [];

  const testDistances = [1.8, 2.2, 2.8, 3.5, 4.2];
  for (const wallZ of testDistances) {
    const physics = new PhysicsWorld();
    const controller = new CameraController(physics, 16 / 9);
    controller.targetPitch = 0;
    controller.pitch = 0;
    controller.targetYaw = 0;
    controller.yaw = 0;

    const wallThickness = 0.5;
    const wallCenterZ = wallZ + wallThickness * 0.5;
    createPlatform(
      physics,
      new THREE.Vector3(0, 1.35, wallCenterZ),
      new THREE.Vector3(5, 5, wallThickness)
    );

    const playerPos = new THREE.Vector3(0, 0, 0);
    const playerVel = new THREE.Vector3(0, 0, 0);

    controller.update(0.016, playerPos, playerVel, false);

    const frontFaceZ = wallCenterZ - wallThickness * 0.5;
    const camZ = controller.camera.position.z;

    if (camZ > frontFaceZ) {
      noGeometryPenetration = false;
      failureDetails.push(`Wall at z=${wallZ}: penetrated front face (camZ=${camZ.toFixed(3)}, front=${frontFaceZ.toFixed(3)})`);
    }

    const expectedSafeZ = frontFaceZ - 0.25;
    if (Math.abs(camZ - expectedSafeZ) > 0.05) {
      allDistancesClampedSafely = false;
      failureDetails.push(`Wall at z=${wallZ}: camZ=${camZ.toFixed(3)} did not match expected safe distance ${expectedSafeZ.toFixed(3)}`);
    }
  }

  record(
    'STRESS_1',
    '1.1 Distance clamping & non-penetration across standard obstacle distances (1.8m-4.2m)',
    allDistancesClampedSafely && noGeometryPenetration,
    failureDetails.length === 0 ? 'All 5 distance tests clamped safely outside wall geometry (margin: 0.25m)' : failureDetails.join('; ')
  );
}

// 1.2: Asymmetric distance lerping: Instant clamp-in on frame 0 vs smooth pull-out
{
  const physics = new PhysicsWorld();
  const controller = new CameraController(physics, 16 / 9);
  controller.targetPitch = 0;
  controller.pitch = 0;
  controller.targetYaw = 0;
  controller.yaw = 0;

  const playerPos = new THREE.Vector3(0, 0, 0);
  const playerVel = new THREE.Vector3(0, 0, 0);

  // Settle camera in open space for 60 frames
  for (let f = 0; f < 60; f++) {
    controller.update(0.016, playerPos, playerVel, false);
  }
  const initialDist = controller.camera.position.z;

  // Suddenly spawn wall at Z = 2.5m (front face at 2.25m)
  const wall = createPlatform(
    physics,
    new THREE.Vector3(0, 1.35, 2.5),
    new THREE.Vector3(5, 5, 0.5)
  );

  // Frame 1 of occlusion: must immediately snap in to safeDist (2.0m)
  controller.update(0.016, playerPos, playerVel, false);
  const occludedDistFrame1 = controller.camera.position.z;
  const snappedInstantly = Math.abs(occludedDistFrame1 - 2.0) < 0.05;

  // Remove wall and observe pull-out
  physics.removeVolume(wall);
  controller.update(0.016, playerPos, playerVel, false);
  const pullOutFrame1 = controller.camera.position.z;
  const lerpedSmoothly = pullOutFrame1 > occludedDistFrame1 && pullOutFrame1 < initialDist - 0.5;

  record(
    'STRESS_1',
    '1.2 Asymmetric distance lerping: Instant snap-in on occlusion and smooth pull-out on release',
    snappedInstantly && lerpedSmoothly,
    `Frame 1 occluded=${occludedDistFrame1.toFixed(3)}m (expected 2.0m), Frame 1 release=${pullOutFrame1.toFixed(3)}m (smooth lerp towards 4.950m)`
  );
}

// 1.3: Unobstructed camera distance recovery to targetDistance (5.2m)
{
  const physics = new PhysicsWorld();
  const controller = new CameraController(physics, 16 / 9);
  controller.targetPitch = 0;
  controller.pitch = 0;
  controller.targetYaw = 0;
  controller.yaw = 0;

  const playerPos = new THREE.Vector3(0, 0, 0);
  const playerVel = new THREE.Vector3(0, 0, 0);

  for (let f = 0; f < 100; f++) {
    controller.update(0.016, playerPos, playerVel, false);
  }

  const finalDist = controller.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
  const reachesTarget = Math.abs(finalDist - controller.targetDistance) < 0.05;

  record(
    'STRESS_1',
    '1.3 BUG: Unobstructed camera expands to full target distance (5.2m)',
    reachesTarget,
    `Camera reached ${finalDist.toFixed(3)}m, targetDistance is ${controller.targetDistance.toFixed(3)}m (defect: safeDist = hitDist - 0.25 unconditionally subtracts 0.25m in open air)`
  );
}

// 1.4: Close obstacle (< 1.5m) boundary stress
{
  const physics = new PhysicsWorld();
  const controller = new CameraController(physics, 16 / 9);
  controller.targetPitch = 0;
  controller.pitch = 0;
  controller.targetYaw = 0;
  controller.yaw = 0;

  // Wall front face at Z = 1.0m
  createPlatform(physics, new THREE.Vector3(0, 1.35, 1.25), new THREE.Vector3(5, 5, 0.5));

  const playerPos = new THREE.Vector3(0, 0, 0);
  controller.update(0.016, playerPos, new THREE.Vector3(), false);

  const camZ = controller.camera.position.z;
  const penetrates = camZ >= 1.0;

  record(
    'STRESS_1',
    '1.4 BUG: Camera does not penetrate wall when obstacle is closer than 1.5m',
    !penetrates,
    `Wall front face is at 1.0m. Camera clamped to Math.max(1.5, ...)=${camZ.toFixed(3)}m, penetrating inside wall by ${(camZ - 1.0).toFixed(3)}m`
  );
}

// =========================================================================
// 2. STRESS TEST 2: Camera snapToTarget() with Occlusion
// =========================================================================
console.log('\n>>> 2. STRESS TEST 2: Camera snapToTarget() with Occlusion');

// 2.1: snapToTarget with wall behind target at 2.5m (front face at 2.25m)
{
  const physics = new PhysicsWorld();
  createPlatform(physics, new THREE.Vector3(0, 1.35, 2.5), new THREE.Vector3(5, 5, 0.5));

  const controller = new CameraController(physics, 16 / 9);
  controller.targetPitch = 0;
  controller.targetYaw = 0;

  controller.snapToTarget(new THREE.Vector3(0, 0, 0));

  const camZ = controller.camera.position.z;
  const frontFaceZ = 2.25;
  const safeZ = frontFaceZ - 0.25; // 2.0m

  const outsideWall = camZ <= frontFaceZ;
  const exactlySafe = Math.abs(camZ - safeZ) < 0.05;

  record(
    'STRESS_2',
    '2.1 snapToTarget() immediately positions camera at safe distance outside wall',
    outsideWall && exactlySafe,
    `Wall front at 2.25m, expected safe 2.000m; camera placed at z=${camZ.toFixed(3)}m`
  );
}

// 2.2: snapToTarget across 8 directional angles with surrounding walls
{
  let allAnglesSafe = true;
  const angleDetails: string[] = [];

  const angles = [
    0,
    Math.PI / 4,
    Math.PI / 2,
    (3 * Math.PI) / 4,
    Math.PI,
    -(3 * Math.PI) / 4,
    -Math.PI / 2,
    -Math.PI / 4,
  ];

  for (const yaw of angles) {
    const physics = new PhysicsWorld();
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const wallPos = dir.clone().multiplyScalar(3.0);
    wallPos.y = 1.35;
    createPlatform(physics, wallPos, new THREE.Vector3(2, 4, 2));

    const controller = new CameraController(physics, 16 / 9);
    controller.targetPitch = 0;
    controller.targetYaw = yaw;

    controller.snapToTarget(new THREE.Vector3(0, 0, 0));

    const distFromOrigin = controller.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
    if (distFromOrigin > 2.05) {
      allAnglesSafe = false;
      angleDetails.push(`Yaw=${yaw.toFixed(2)}: dist=${distFromOrigin.toFixed(3)}m exceeded wall boundary (~2.0m)`);
    }
  }

  record(
    'STRESS_2',
    '2.2 snapToTarget() respects geometry occlusion across 8 cardinal/diagonal angles',
    allAnglesSafe,
    angleDetails.length === 0 ? 'All 8 directional angles placed camera safely outside obstacle' : angleDetails.join('; ')
  );
}

// 2.3: snapToTarget in open space without obstacles
{
  const physics = new PhysicsWorld();
  const controller = new CameraController(physics, 16 / 9);
  controller.targetPitch = 0;
  controller.targetYaw = 0;

  controller.snapToTarget(new THREE.Vector3(0, 0, 0));

  const dist = controller.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
  const matchesTargetDist = Math.abs(dist - controller.targetDistance) < 0.05;

  record(
    'STRESS_2',
    '2.3 BUG: snapToTarget() in open space sets distance to full targetDistance (5.2m)',
    matchesTargetDist,
    `Snap distance=${dist.toFixed(3)}m, expected targetDistance=${controller.targetDistance.toFixed(3)}m (defect: snapped to 4.95m due to unconditional -0.25m offset)`
  );
}

// 2.4: snapToTarget with obstacle closer than 1.5m
{
  const physics = new PhysicsWorld();
  createPlatform(physics, new THREE.Vector3(0, 1.35, 1.25), new THREE.Vector3(5, 5, 0.5));

  const controller = new CameraController(physics, 16 / 9);
  controller.targetPitch = 0;
  controller.targetYaw = 0;

  controller.snapToTarget(new THREE.Vector3(0, 0, 0));
  const camZ = controller.camera.position.z;
  const penetrates = camZ >= 1.0;

  record(
    'STRESS_2',
    '2.4 BUG: snapToTarget() with close obstacle (< 1.5m) avoids wall penetration',
    !penetrates,
    `Wall front at 1.0m. Camera clamped to Math.max(1.5, ...)=${camZ.toFixed(3)}m, penetrating inside wall by ${(camZ - 1.0).toFixed(3)}m`
  );
}

// =========================================================================
// 3. STRESS TEST 3: Respawn Loop Resistance (100 Iterations Across 6 Zones)
// =========================================================================
console.log('\n>>> 3. STRESS TEST 3: Respawn Loop Resistance (100 Iterations Across 6 Zones)');

{
  let loopFailures = 0;
  let groundDiscrepancies = 0;
  let velocityNonZero = 0;
  let orientationMismatches = 0;
  let cameraMisalignments = 0;
  let initialGroundedFalse = 0;
  let frame1MissCount = 0;

  for (let i = 0; i < 100; i++) {
    const physics = new PhysicsWorld();
    const audio = new MockAudioManager();
    const controller = new CameraController(physics, 16 / 9);
    const player = new Player(physics, audio.asAudioManager(), controller);

    // Distribution across zones 1-6 (0m to 1000m)
    let baseY = 0;
    if (i < 20) baseY = (i / 20) * 55 + 2;               // Zone 1: 0 - 60m
    else if (i < 40) baseY = 60 + ((i - 20) / 20) * 115;  // Zone 2: 60 - 180m
    else if (i < 60) baseY = 180 + ((i - 40) / 20) * 175; // Zone 3: 180 - 360m
    else if (i < 80) baseY = 360 + ((i - 60) / 20) * 235; // Zone 4: 360 - 600m
    else if (i < 95) baseY = 600 + ((i - 80) / 15) * 245; // Zone 5: 600 - 850m
    else baseY = 850 + ((i - 95) / 5) * 145;              // Zone 6: 850 - 1000m

    const posX = ((i * 17) % 80) - 40;
    const posZ = ((i * 23) % 80) - 40;
    const yaw = ((i * 0.37) % (2 * Math.PI)) - Math.PI;

    // Platform thickness variations: 0.2m, 0.4m, 1.0m, 2.5m
    const thickness = [0.2, 0.4, 1.0, 2.5][i % 4];
    const width = 2.0 + (i % 5) * 1.5;
    const depth = 2.0 + ((i + 2) % 5) * 1.5;

    const platformCenterY = baseY - thickness * 0.5;
    createPlatform(
      physics,
      new THREE.Vector3(posX, platformCenterY, posZ),
      new THREE.Vector3(width, thickness, depth)
    );

    const checkpointPos = new THREE.Vector3(posX, baseY, posZ);
    player.setCheckpoint(checkpointPos, yaw);
    player.respawn();

    // Check 1: Safe surface placement at ground.groundY + 0.35m
    const groundCheck = physics.checkGround(checkpointPos, player.radius, 2.0);
    const expectedY = groundCheck.groundY + 0.35;
    if (Math.abs(player.position.y - expectedY) > 0.001) {
      groundDiscrepancies++;
    }

    // Check immediate grounded state on respawn frame
    if (!player.getStats().isGrounded) {
      initialGroundedFalse++;
    }

    // Induce void fall: move player off edge with high downward velocity
    player.position.x += width + 2.0;
    player.velocity.set(5.0, -35.0, 3.0);

    let fallTriggered = false;
    player.setCallbacks(
      () => { fallTriggered = true; },
      () => {}
    );

    for (let f = 0; f < 30; f++) {
      player.update(0.016, makeEmptyInput(), yaw);
      if (player.getStats().isFalling) break;
    }

    // Trigger respawn from fall
    player.respawn();

    // Post-Respawn Checks:
    // 1. Position y == verified ground + 0.35m
    if (Math.abs(player.position.y - expectedY) > 0.001) {
      groundDiscrepancies++;
    }
    // 2. Velocity zeroed
    if (player.velocity.lengthSq() !== 0) {
      velocityNonZero++;
    }
    // 3. Facing yaw aligned
    if (Math.abs(player.facingYaw - yaw) > 0.001) {
      orientationMismatches++;
    }
    // 4. Camera aligned
    const expectedLookAt = new THREE.Vector3(player.position.x, player.position.y + 1.35, player.position.z);
    const camLookDist = (controller as any).currentLookAt.distanceTo(expectedLookAt);
    if (camLookDist > 0.01) {
      cameraMisalignments++;
    }

    // 5. Check frame 1 settle behavior: does checkGround drop ground due to 1e-16 float rounding?
    player.update(0.016, makeEmptyInput(), yaw);
    if (!player.getStats().isGrounded) {
      frame1MissCount++;
    }

    // 6. 60-frame post-respawn stability simulation: check for loop falls
    let fellAgain = false;
    player.setCallbacks(
      () => { fellAgain = true; },
      () => {}
    );

    for (let f = 1; f < 60; f++) {
      player.update(0.016, makeEmptyInput(), yaw);
      if (player.getStats().isFalling || fellAgain) {
        fellAgain = true;
        break;
      }
    }

    if (fellAgain) {
      loopFailures++;
    }
  }

  record(
    'STRESS_3',
    '3.1 Respawn Ground Clearance (+0.35m above verified ground) across 100 checkpoints',
    groundDiscrepancies === 0,
    `Exact matches: ${100 - groundDiscrepancies}/100 across altitudes 2m to 995m and thicknesses 0.2m to 2.5m`
  );

  record(
    'STRESS_3',
    '3.2 Velocity Zeroing (vx=0, vy=0, vz=0) upon respawn across 100 runs',
    velocityNonZero === 0,
    `Zero velocity runs: ${100 - velocityNonZero}/100`
  );

  record(
    'STRESS_3',
    '3.3 Facing yaw & Camera snap alignment upon respawn across 100 runs',
    orientationMismatches === 0 && cameraMisalignments === 0,
    `Facing yaw matches: ${100 - orientationMismatches}/100, Camera lookAt matches: ${100 - cameraMisalignments}/100`
  );

  record(
    'STRESS_3',
    '3.4 Void Respawn Loop Resistance: Zero repeated void falls over 60 frames post-respawn',
    loopFailures === 0,
    `Zero-loop runs: ${100 - loopFailures}/100 (repeated fall count: ${loopFailures})`
  );

  record(
    'STRESS_3',
    '3.5 BUG: Immediate grounded state on respawn frame',
    initialGroundedFalse === 0,
    `Respawn frame isGrounded=true: ${100 - initialGroundedFalse}/100 (defect: Player.ts:121 explicitly sets this.isGrounded = false)`
  );

  record(
    'STRESS_3',
    '3.6 BUG: Zero-epsilon ground raycast drops contact on frame 1 for thin platforms',
    frame1MissCount === 0,
    `Frame 1 ground detection failures: ${frame1MissCount}/100 (defect: tmin=0.5000000000000001 > maxDist=0.50 drops contact without epsilon tolerance)`
  );
}

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n========================================================================');
console.log('                      HARNESS EXECUTION SUMMARY                         ');
console.log('========================================================================');
const passedCount = results.filter(r => r.passed).length;
const failedCount = results.filter(r => !r.passed).length;
console.log(`Total Scenarios Tested : ${results.length}`);
console.log(`Scenarios Passed       : ${passedCount}`);
console.log(`Scenarios Failed (Bugs): ${failedCount}`);
console.log('========================================================================\n');

process.exit(failedCount > 0 ? 1 : 0);

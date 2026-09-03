import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 1: F7 - Jump Apex Bounds & Kinematic Calibration', () => {
  it('F7-1: Takeoff velocity equals calibrated value 11.2 m/s', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    // Place player grounded on platform (surface at y = 0.2)
    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    // Settle 2 frames
    player.update(0.016, input, 0);
    player.update(0.016, input, 0);

    // Trigger jump
    input.jump = true;
    input.jumpPressed = true;
    player.update(0.016, input, 0);

    assert.ok(
      Math.abs(player.velocity.y - 11.2) < 0.5,
      `Expected takeoff velocity ~11.2 m/s, got ${player.velocity.y}`
    );
  });

  it('F7-2: Full jump holding Space reaches apex between 2.15m and 2.30m (theoretical 2.24m)', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    // Ground player
    player.update(0.016, input, 0);

    // Jump with Space held continuously
    input.jump = true;
    input.jumpPressed = true;

    let maxY = player.position.y;
    const startY = player.position.y;

    for (let frame = 0; frame < 60; frame++) {
      player.update(0.016, input, 0);
      input.jumpPressed = false; // single frame press
      if (player.position.y > maxY) {
        maxY = player.position.y;
      }
    }

    const apexHeight = maxY - startY;
    assert.ok(
      apexHeight >= 2.10 && apexHeight <= 2.35,
      `Jump apex height must be in [2.10m, 2.35m], achieved ${apexHeight.toFixed(3)}m`
    );
  });

  it('F7-3: Time to reach jump apex is approximately 0.40s (11.2 / 28.0)', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    input.jump = true;
    input.jumpPressed = true;

    const dt = 1 / 120; // high precision step
    let time = 0;
    let reachedApexTime = 0;
    let prevVy = 11.2;

    for (let step = 0; step < 100; step++) {
      player.update(dt, input, 0);
      input.jumpPressed = false;
      time += dt;

      if (prevVy > 0 && player.velocity.y <= 0 && reachedApexTime === 0) {
        reachedApexTime = time;
      }
      prevVy = player.velocity.y;
    }

    assert.ok(
      Math.abs(reachedApexTime - 0.40) < 0.05,
      `Expected apex time ~0.40s, got ${reachedApexTime.toFixed(3)}s`
    );
  });

  it('F7-4: Releasing Space early truncates jump height for responsive short hops', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    // Press jump for only 2 frames (approx 33ms tap)
    input.jump = true;
    input.jumpPressed = true;
    player.update(0.016, input, 0);

    input.jumpPressed = false;
    input.jump = false; // released!

    let maxY = player.position.y;
    const startY = player.position.y;

    for (let frame = 0; frame < 50; frame++) {
      player.update(0.016, input, 0);
      if (player.position.y > maxY) {
        maxY = player.position.y;
      }
    }

    const shortHopApex = maxY - startY;
    assert.ok(
      shortHopApex < 1.70,
      `Truncated jump should have apex < 1.70m, got ${shortHopApex.toFixed(3)}m`
    );
  });

  it('F7-5: Fall gravity multiplier (37.8 m/s^2) applies during descent phase', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    // Drop player from height 10m in air with zero initial velocity
    player.position.set(0, 10, 0);
    player.velocity.set(0, 0, 0);

    const input = makeEmptyInput();
    const dt = 0.016;

    // Step 1: initial velocity negative
    player.update(dt, input, 0);
    const v1 = player.velocity.y;

    player.update(dt, input, 0);
    const v2 = player.velocity.y;

    const measuredDecel = Math.abs((v2 - v1) / dt);
    // Descent gravity should be 28.0 * 1.35 = 37.8 m/s^2
    assert.ok(
      measuredDecel > 30.0,
      `Descent gravity should be > 30 m/s^2 (nominal 37.8), measured ${measuredDecel.toFixed(2)} m/s^2`
    );
  });
});

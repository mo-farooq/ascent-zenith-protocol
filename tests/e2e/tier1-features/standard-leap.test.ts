import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 1: R2 - Standard Leap Reachability (Δy <= 1.6m, Gap <= 2.6m)', () => {
  it('R2-1: Standard jump cleanly lands on platform at Δy = 1.0m and gap = 2.0m', () => {
    const { physics, player } = createTestWorld();

    // Start platform: x: [-2, 0], y surface at 0.0 (center at -1, -0.2, 0, size 2 x 0.4 x 4)
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));

    // Target platform: gap = 2.0m -> x: [2.0, 4.0], y surface at 1.0m (center at 3, 0.8, 0, size 2 x 0.4 x 4)
    const target = createPlatform(physics, new THREE.Vector3(3, 0.8, 0), new THREE.Vector3(2, 0.4, 4));

    // Place player at edge of start platform (x = -0.35, y = 0.0) facing +X
    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2); // Camera facing +X

    // Run forward and jump
    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landedOnTarget = false;
    for (let frame = 0; frame < 60; frame++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;

      // Check if landed on target platform
      if (player.position.x >= 2.0 && player.position.x <= 4.0 && Math.abs(player.position.y - 1.0) < 0.15) {
        landedOnTarget = true;
        break;
      }
    }

    assert.ok(landedOnTarget, `Player should reach target at Δy=1.0m, gap=2.0m. Final pos: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}`);
  });

  it('R2-2: Standard jump reaches target at Δy = 1.50m and gap = 2.20m', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    createPlatform(physics, new THREE.Vector3(3.2, 1.3, 0), new THREE.Vector3(2, 0.4, 4)); // surface at y=1.5, gap=2.2m

    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let frame = 0; frame < 70; frame++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;

      if (player.position.x >= 2.2 && player.position.x <= 4.2 && Math.abs(player.position.y - 1.5) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, `Player should reach target at Δy=1.5m, gap=2.2m. Final pos: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}`);
  });

  it('R2-3: Standard jump reaches flat gap = 2.50m (Δy = 0m)', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    createPlatform(physics, new THREE.Vector3(3.5, -0.2, 0), new THREE.Vector3(2, 0.4, 4)); // gap = 2.5m

    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let frame = 0; frame < 60; frame++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;

      if (player.position.x >= 2.5 && player.position.x <= 4.5 && Math.abs(player.position.y - 0.0) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, `Player should clear 2.5m flat gap. Final pos: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}`);
  });

  it('R2-4: Impossible step height Δy = 2.50m cannot be reached with standard jump', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    // High platform at y = 2.5
    createPlatform(physics, new THREE.Vector3(1.5, 2.3, 0), new THREE.Vector3(2, 0.4, 4));

    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let reachedTop = false;
    for (let frame = 0; frame < 60; frame++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;
      if (player.position.y >= 2.50) {
        reachedTop = true;
        break;
      }
    }

    assert.strictEqual(reachedTop, false, 'Standard jump should not reach impossible 2.5m elevation');
  });

  it('R2-5: Impossible gap = 4.50m cannot be cleared without jump pad or dash', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    createPlatform(physics, new THREE.Vector3(5.5, -0.2, 0), new THREE.Vector3(2, 0.4, 4)); // gap = 4.5m

    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let reachedTarget = false;
    for (let frame = 0; frame < 80; frame++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;
      if (player.position.x >= 4.5 && player.position.y >= -0.2) {
        reachedTarget = true;
        break;
      }
    }

    assert.strictEqual(reachedTarget, false, 'Standard walking jump must not cross 4.5m gap without special mechanics');
  });
});

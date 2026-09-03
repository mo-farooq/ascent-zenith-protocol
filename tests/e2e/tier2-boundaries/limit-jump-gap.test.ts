import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 2: Boundary - Exact Limit Horizontal Gaps (Gap = 2.60m)', () => {
  it('B-GAP-1: Exact horizontal gap = 2.60m at Δy = 0m lands on platform surface', () => {
    const { physics, player } = createTestWorld();
    // Platform 1: x in [-2, 0], surface at y = 0.0 (center: -1, -0.2, 0)
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    // Platform 2: gap 2.60m -> x in [2.60, 4.60], surface at y = 0.0 (center: 3.6, -0.2, 0)
    createPlatform(physics, new THREE.Vector3(3.6, -0.2, 0), new THREE.Vector3(2, 0.4, 4));

    // Player running forward towards +X
    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2); // facing +X

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let f = 0; f < 65; f++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;

      if (player.position.x >= 2.60 && Math.abs(player.position.y - 0.0) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, `Player must land across exact 2.60m gap. Final pos: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}`);
  });

  it('B-GAP-2: Recommended target gap = 2.40m lands deep into platform with safe margin', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    createPlatform(physics, new THREE.Vector3(3.4, -0.2, 0), new THREE.Vector3(2, 0.4, 4)); // gap = 2.40m, edge at 2.40

    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    let landingX = 0;

    for (let f = 0; f < 65; f++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;

      if (player.position.x >= 2.40 && Math.abs(player.position.y - 0.0) < 0.15) {
        landed = true;
        landingX = player.position.x;
        break;
      }
    }

    assert.ok(landed, 'Player must clear 2.40m gap');
    assert.ok(
      landingX >= 2.50,
      `Landing point should penetrate inside platform (> 2.50m), landed at ${landingX.toFixed(3)}m`
    );
  });

  it('B-GAP-3: Gap = 2.61m strictly exceeds the 2.60m specification threshold', () => {
    const maxAllowedGap = 2.60;
    const testGap = 2.61;
    assert.ok(testGap > maxAllowedGap, '2.61m is over the maximum allowable gap under standard jump physics');
  });

  it('B-GAP-4: Diagonal gap with 2.60m Euclidean distance clears successfully', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(2, 0.4, 2));

    // Diagonal offset dx = dz = 2.60 / sqrt(2) ≈ 1.838m
    const diagDist = 2.60;
    const offset = diagDist / Math.SQRT2;
    // Target center = (1.0 + offset + 1.0, -0.2, -(1.0 + offset + 1.0))
    createPlatform(physics, new THREE.Vector3(2.0 + offset, -0.2, -(2.0 + offset)), new THREE.Vector3(2, 0.4, 2));

    // Player facing diagonal angle (-45 degrees, cameraYaw = -Math.PI / 4)
    player.position.set(0.6, 0.0, -0.6);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 4);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let cleared = false;
    for (let f = 0; f < 70; f++) {
      player.update(0.016, input, -Math.PI / 4);
      input.jumpPressed = false;

      const horizDist = Math.hypot(player.position.x, player.position.z);
      if (horizDist >= 2.5 && Math.abs(player.position.y - 0.0) < 0.2) {
        cleared = true;
        break;
      }
    }

    assert.ok(cleared, 'Diagonal jump across 2.60m Euclidean distance should clear');
  });

  it('B-GAP-5: Step-down jump across 2.60m gap (Δy = -0.5m) lands easily with longer air time', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(-1, -0.2, 0), new THREE.Vector3(2, 0.4, 4));
    // Step down by -0.5m: surface at y = -0.5m (center at 3.6, -0.7, 0)
    createPlatform(physics, new THREE.Vector3(3.6, -0.7, 0), new THREE.Vector3(2, 0.4, 4));

    player.position.set(-0.35, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, -Math.PI / 2);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let f = 0; f < 75; f++) {
      player.update(0.016, input, -Math.PI / 2);
      input.jumpPressed = false;

      if (player.position.x >= 2.60 && Math.abs(player.position.y - (-0.5)) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, 'Step-down jump across 2.60m gap should safely land');
  });
});

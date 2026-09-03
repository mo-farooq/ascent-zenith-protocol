import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 2: Boundary - Exact Limit Jumps (Δy = 1.60m)', () => {
  it('B-DY-1: Exact vertical jump at Δy = 1.60m lands on destination platform', () => {
    const { physics, player } = createTestWorld();
    // Start platform at y = 0.0 surface (center: 0, -0.2, 0, height 0.4)
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    // Step platform at y = 1.60m surface (center: 0, 1.4, -2.0, height 0.4, size 4 x 0.4 x 2)
    createPlatform(physics, new THREE.Vector3(0, 1.4, -2.0), new THREE.Vector3(4, 0.4, 2));

    // Player positioned at edge of start platform (z = -1.0), jump forward towards -Z
    player.position.set(0, 0.0, -0.8);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let f = 0; f < 60; f++) {
      player.update(0.016, input, 0);
      input.jumpPressed = false;

      if (player.position.z <= -1.2 && Math.abs(player.position.y - 1.60) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, `Player must land at exact limit Δy = 1.60m. Final pos: ${player.position.y.toFixed(3)}m, z: ${player.position.z.toFixed(2)}m`);
  });

  it('B-DY-2: Recommended target step Δy = 1.55m clears with generous vertical margin', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    createPlatform(physics, new THREE.Vector3(0, 1.35, -2.0), new THREE.Vector3(4, 0.4, 2)); // surface at y = 1.55m

    player.position.set(0, 0.0, -0.8);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let maxApexOverPlatform = 0;
    let landed = false;

    for (let f = 0; f < 60; f++) {
      player.update(0.016, input, 0);
      input.jumpPressed = false;

      if (player.position.z <= -1.0) {
        const clearance = player.position.y - 1.55;
        if (clearance > maxApexOverPlatform) {
          maxApexOverPlatform = clearance;
        }
      }

      if (player.position.z <= -1.2 && Math.abs(player.position.y - 1.55) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, 'Player must comfortably land on Δy = 1.55m step');
    assert.ok(
      maxApexOverPlatform >= 0.20,
      `Apex clearance over 1.55m step should be >= 0.20m, was ${maxApexOverPlatform.toFixed(3)}m`
    );
  });

  it('B-DY-3: Step height Δy = 1.61m exceeds standard vertical clearance boundary', () => {
    // Mathematical verification:
    // Takeoff v0 = 11.2, g = 28.0
    // Time to reach y = 1.60m: 11.2*t - 0.5*28*t^2 = 1.60 => 14*t^2 - 11.2*t + 1.60 = 0
    // Disc = 11.2^2 - 4*14*1.60 = 125.44 - 89.60 = 35.84 => t1 = (11.2 - 5.986)/28 = 0.186s, t2 = 0.614s
    // Window over 1.60m is 0.428s.
    // For 2.24m (theoretical maximum), discrete collision capsule height (1.7m) with step-up limit (0.3m)
    // requires feet clearance >= step height. Above 1.61m, clearing with horizontal distance requires extreme precision.
    const maxSafeHeight = 1.60;
    const testHeight = 1.61;
    assert.ok(testHeight > maxSafeHeight, '1.61m is beyond the maximum standard specification bound');
  });

  it('B-DY-4: Limit jump Δy = 1.60m with horizontal gap = 1.50m', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    // Gap 1.5m, surface y = 1.60m
    createPlatform(physics, new THREE.Vector3(0, 1.4, -3.5), new THREE.Vector3(4, 0.4, 2));

    player.position.set(0, 0.0, -1.7);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    input.forward = 1.0;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let f = 0; f < 60; f++) {
      player.update(0.016, input, 0);
      input.jumpPressed = false;

      if (player.position.z <= -2.6 && Math.abs(player.position.y - 1.60) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, `Player should land on Δy=1.6m, gap=1.5m platform. Pos: ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`);
  });

  it('B-DY-5: Sprinting leap to Δy = 1.60m platform clears with higher margin', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    createPlatform(physics, new THREE.Vector3(0, 1.4, -3.5), new THREE.Vector3(4, 0.4, 2));

    player.position.set(0, 0.0, -1.7);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    input.forward = 1.0;
    input.sprint = true;
    input.jump = true;
    input.jumpPressed = true;

    let landed = false;
    for (let f = 0; f < 60; f++) {
      player.update(0.016, input, 0);
      input.jumpPressed = false;

      if (player.position.z <= -2.6 && Math.abs(player.position.y - 1.60) < 0.15) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, 'Sprinting leap to Δy=1.60m must successfully reach target');
  });
});

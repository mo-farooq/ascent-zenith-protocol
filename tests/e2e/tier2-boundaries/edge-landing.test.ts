import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';
import { CollisionVolume, VolumeType } from '../../../src/physics/CollisionVolume';

describe('Tier 2: Boundary - Edge Landings & Narrow Beam Stability', () => {
  it('B-EDGE-1: Landing within 0.05m of +X edge does not horizontally eject into void', () => {
    const { physics, player } = createTestWorld();
    // Platform: x: [-2, +2], surface at y = 0.0 (center: 0, -0.2, 0)
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));

    // Place player at x = 1.95 (5cm inside edge)
    player.position.set(1.95, 0.3, 0);
    player.velocity.set(0, -5.0, 0);

    const input = makeEmptyInput();

    // Settle 5 frames
    for (let f = 0; f < 5; f++) {
      player.update(0.016, input, 0);
    }

    // Player must remain on platform (x <= 2.0 + radius) and grounded
    assert.ok(
      player.position.x <= 2.05,
      `Player ejected off +X edge: final x = ${player.position.x.toFixed(3)}`
    );
    assert.strictEqual(player.getStats().isGrounded, true, 'Player must remain grounded on edge');
  });

  it('B-EDGE-2: Landing within 0.05m of -X edge maintains stable upward contact', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));

    // Place player at x = -1.95
    player.position.set(-1.95, 0.3, 0);
    player.velocity.set(0, -5.0, 0);

    const input = makeEmptyInput();

    for (let f = 0; f < 5; f++) {
      player.update(0.016, input, 0);
    }

    assert.ok(
      player.position.x >= -2.05,
      `Player ejected off -X edge: final x = ${player.position.x.toFixed(3)}`
    );
    assert.strictEqual(player.getStats().isGrounded, true);
  });

  it('B-EDGE-3: Corner landing (X and Z edge) resolves with upward normal (normal.y >= 0.7)', () => {
    const vol = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(2.0, 0.5, 2.0),
      new THREE.Vector3(0, 5, 0)
    );

    // Corner test: x = 1.95, z = 1.95, y = 5.6
    const center = new THREE.Vector3(1.95, 5.6, 1.95);
    const res = vol.testSphere(center, 0.35);

    assert.strictEqual(res.hit, true);
    assert.ok(
      res.normal.y >= 0.7,
      `Corner contact normal must be upward (y >= 0.7), got normal=(${res.normal.x.toFixed(3)}, ${res.normal.y.toFixed(3)}, ${res.normal.z.toFixed(3)})`
    );
  });

  it('B-EDGE-4: Walking along platform perimeter does not jitter or oscillate horizontally', () => {
    const { physics, player } = createTestWorld();
    // Long platform along Z axis: x in [-1, +1], z in [-10, +10], surface at y = 0.0
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(2, 0.4, 20));

    // Walk along the right edge at x = 0.85 facing -Z
    player.position.set(0.85, 0.0, 5.0);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    input.forward = 1.0;

    let maxXChange = 0;
    let prevX = player.position.x;

    for (let f = 0; f < 60; f++) {
      player.update(0.016, input, 0);
      const deltaX = Math.abs(player.position.x - prevX);
      if (deltaX > maxXChange) {
        maxXChange = deltaX;
      }
      prevX = player.position.x;
    }

    // Walking straight along Z edge should not suffer violent sideways snapping (> 0.08m per frame)
    assert.ok(
      maxXChange < 0.08,
      `Horizontal jitter detected walking on edge: max per-frame x delta was ${maxXChange.toFixed(3)}m`
    );
    assert.strictEqual(player.getStats().isGrounded, true);
  });

  it('B-EDGE-5: Landing on narrow beam (width 0.45m) maintains stable ground contact', () => {
    const { physics, player } = createTestWorld();
    // Narrow catwalk beam: width 0.45m, length 10m
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(0.45, 0.4, 10));

    player.position.set(0, 1.0, 0);
    player.velocity.set(0, -4.0, 0);

    const input = makeEmptyInput();

    for (let f = 0; f < 20; f++) {
      player.update(0.016, input, 0);
    }

    assert.strictEqual(player.getStats().isGrounded, true, 'Should be grounded on narrow beam');
    assert.ok(
      Math.abs(player.position.y - 0.0) < 0.15,
      `Player feet should rest at y=0 on beam, got ${player.position.y}`
    );
  });

  it('B-EDGE-6: 5-ray ground check detects platform when center overhangs by <= 0.2m', () => {
    const { physics } = createTestWorld();
    // Platform: x in [-2, 2], surface at y = 0.0
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));

    // Feet center at x = 2.10 (overhanging platform edge by 10cm, but within radius 0.35m)
    const feetPos = new THREE.Vector3(2.10, 0.0, 0);
    const ground = physics.checkGround(feetPos, 0.35, 0.35);

    // Inner ray (at x = 2.10 - 0.35*0.65 = 1.87m) hits the platform
    assert.strictEqual(ground.isGrounded, true, 'Multi-ray ground check must detect platform on slight overhang');
  });
});

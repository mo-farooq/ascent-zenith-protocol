import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 3: Combo - High Fall + Edge Landing Simultaneous Stress', () => {
  it('C-HFE-1: Fast fall (vy = -20 m/s) onto platform edge halts vertical motion and prevents horizontal ejection', () => {
    const { physics, player } = createTestWorld();
    // Platform: x in [-3, +3], z in [-3, +3], surface at y = 0.0 (center: 0, -0.2, 0)
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(6, 0.4, 6));

    // Player dropping from y = 3.0 at x = 2.90 (10cm from edge), falling fast
    player.position.set(2.90, 3.0, 0);
    player.velocity.set(0, -20.0, 0);

    const input = makeEmptyInput();

    // Advance simulation until impact
    for (let f = 0; f < 20; f++) {
      player.update(0.016, input, 0);
      if (player.getStats().isGrounded) break;
    }

    // Settle 3 frames
    for (let f = 0; f < 3; f++) {
      player.update(0.016, input, 0);
    }

    // Must not have tunneled through (y >= 0.0 - 0.1)
    assert.ok(
      player.position.y >= -0.1,
      `High fall tunneled through platform edge! y = ${player.position.y}`
    );

    // Must not have ejected horizontally (x <= 3.0 + radius)
    assert.ok(
      player.position.x <= 3.05,
      `High fall ejected player horizontally past edge! x = ${player.position.x}`
    );

    assert.strictEqual(player.getStats().isGrounded, true);
  });

  it('C-HFE-2: Fast fall onto platform corner does not cause explosive diagonal ejection', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(6, 0.4, 6));

    // Corner: x = 2.85, z = 2.85
    player.position.set(2.85, 2.0, 2.85);
    player.velocity.set(0, -18.0, 0);

    const input = makeEmptyInput();

    for (let f = 0; f < 25; f++) {
      player.update(0.016, input, 0);
      if (player.getStats().isGrounded) break;
    }

    const horizSpeed = player.getStats().horizontalSpeed;
    assert.ok(
      horizSpeed < 3.0,
      `Explosive corner ejection detected: horizontalSpeed = ${horizSpeed}`
    );
  });
});

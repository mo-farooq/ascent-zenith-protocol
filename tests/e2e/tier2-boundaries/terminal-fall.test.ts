import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';
import { CollisionVolume, VolumeType } from '../../../src/physics/CollisionVolume';

describe('Tier 2: Boundary - Terminal Fall Velocity (-35 m/s) Collision & Anti-Tunneling', () => {
  it('B-FALL-1: Dynamic ground check raycast handles downward velocity proportional check distance (F3)', () => {
    const { physics } = createTestWorld();
    // Platform surface at y = 0.0 (thickness 0.4m, center at 0, -0.2, 0)
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(6, 0.4, 6));

    // Player feet at y = 0.7m, falling at vy = -35 m/s, dt = 0.016s (per-frame displacement = -0.56m)
    const feetPos = new THREE.Vector3(0, 0.7, 0);
    const vy = -35.0;
    const dt = 0.016;
    const dynamicCheckDist = Math.max(0.35, Math.abs(vy) * dt + 0.25);

    const ground = (physics as any).checkGround(feetPos, 0.35, dynamicCheckDist);
    assert.strictEqual(ground.isGrounded, true, 'Dynamic ground check must detect platform during terminal fall');
    assert.ok(Math.abs(ground.groundY - 0.0) < 0.05, `groundY should be 0.0, got ${ground.groundY}`);
  });

  it('B-FALL-2: Raycast down starting inside collision volume recovers valid hit (F3)', () => {
    // Platform: y from -0.4 to 0.0 (center at 0, -0.2, 0)
    const vol = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(2, 0.2, 2),
      new THREE.Vector3(0, -0.2, 0)
    );

    // Ray origin is slightly inside the platform: y = -0.05
    const insideOrigin = new THREE.Vector3(0, -0.05, 0);
    const hit = vol.raycastDown(insideOrigin, 1.0);

    // F3 requirement: CollisionVolume.raycastDown() must handle rays starting inside geometry
    assert.ok(
      hit !== null && hit.hit,
      'raycastDown() must recover hit even when starting inside volume (tmin < 0)'
    );
  });

  it('B-FALL-3: Falling at terminal velocity -35 m/s does not tunnel through 0.3m thin platform', () => {
    const { physics, player } = createTestWorld();
    // Thin platform: 0.3m thickness, top surface at y = 10.0m
    createPlatform(physics, new THREE.Vector3(0, 9.85, 0), new THREE.Vector3(10, 0.3, 10));

    // Position player 0.5m above platform falling at -35 m/s
    player.position.set(0, 10.5, 0);
    player.velocity.set(0, -35.0, 0);

    const input = makeEmptyInput();

    // Advance 3 frames
    for (let f = 0; f < 3; f++) {
      player.update(0.016, input, 0);
    }

    // Player must NOT tunnel through platform (feet y must be >= 10.0m)
    assert.ok(
      player.position.y >= 9.9,
      `Player tunneled through thin platform! feet y = ${player.position.y.toFixed(3)}m (expected >= 9.9m)`
    );
  });

  it('B-FALL-4: Drop from 50m height stops cleanly on ground surface without clipping', () => {
    const { physics, player } = createTestWorld();
    // Landing pad at y = 0.0
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(20, 0.4, 20));

    player.position.set(0, 50.0, 0);
    player.velocity.set(0, 0, 0);

    const input = makeEmptyInput();

    // Simulate freefall until landing (up to 3 seconds = 180 frames)
    let landed = false;
    for (let f = 0; f < 180; f++) {
      player.update(0.016, input, 0);
      if (player.getStats().isGrounded) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, 'Player must safely land on ground after 50m fall');
    assert.ok(
      Math.abs(player.position.y - 0.0) < 0.15,
      `Player feet should rest on ground surface at y=0, got ${player.position.y}`
    );
    assert.ok(
      Math.abs(player.velocity.y) < 0.1,
      `Downward velocity should be stopped on ground, got ${player.velocity.y}`
    );
  });

  it('B-FALL-5: Ground collision zeroes vertical velocity and prevents bouncing/jitter', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(10, 0.4, 10));

    player.position.set(0, 0.5, 0);
    player.velocity.set(0, -25.0, 0);

    const input = makeEmptyInput();

    // Frame 1: lands
    player.update(0.016, input, 0);
    // Frame 2: settles
    player.update(0.016, input, 0);

    assert.strictEqual(player.getStats().isGrounded, true);
    assert.strictEqual(player.velocity.y, 0);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 3: Combo - Respawn + Moving Platform Interactions', () => {
  it('C-RMP-1: Player standing on moving platform inherits platform displacement', () => {
    const { physics, player } = createTestWorld();
    const plat = createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    plat.isMoving = true;

    player.position.set(0, 0.0, 0);
    const input = makeEmptyInput();

    // Frame 1: player registers ground on platform
    player.update(0.016, input, 0);

    // Platform moves +X by 0.5m
    plat.position.x += 0.5;

    // Frame 2: player updates
    player.update(0.016, input, 0);

    assert.ok(
      Math.abs(player.position.x - 0.5) < 0.15,
      `Player should move with platform delta; expected x ~ 0.5m, got ${player.position.x}`
    );
  });

  it('C-RMP-2: Jumping from moving platform transfers horizontal momentum', () => {
    const { physics, player } = createTestWorld();
    const plat = createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    plat.isMoving = true;
    plat.linearVelocity.set(4.0, 0, 0); // moving at 4 m/s in +X

    player.position.set(0, 0.0, 0);
    const input = makeEmptyInput();

    // Settle on platform
    player.update(0.016, input, 0);

    // Jump
    input.jump = true;
    input.jumpPressed = true;
    player.update(0.016, input, 0);

    // Player should inherit positive velocity.x from platform
    assert.ok(
      player.velocity.x > 1.0,
      `Player should inherit momentum from moving platform, got vx = ${player.velocity.x}`
    );
  });

  it('C-RMP-3: Respawning from fall clears moving platform velocity and delta tracking', () => {
    const { physics, player } = createTestWorld();
    const plat = createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4));
    plat.isMoving = true;
    plat.linearVelocity.set(5.0, 0, 0);

    player.position.set(0, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    // Set stationary checkpoint elsewhere
    player.setCheckpoint(new THREE.Vector3(20, 10.2, 20));

    // Player falls and respawns
    player.respawn();

    assert.strictEqual(player.velocity.x, 0, 'Velocity must be zero after respawn');
    assert.strictEqual(player.position.x, 20);
    assert.strictEqual(player.position.z, 20);

    // Platform moves more, player should not be affected
    plat.position.x += 1.0;
    player.update(0.016, input, 0);

    assert.ok(
      Math.abs(player.position.x - 20) < 0.05,
      'Player at checkpoint should not receive moving platform delta'
    );
  });
});

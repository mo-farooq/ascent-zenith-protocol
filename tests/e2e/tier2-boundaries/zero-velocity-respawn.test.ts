import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 2: Boundary - Zero Velocity Respawn & Extreme Motion States', () => {
  it('B-RESP-1: Respawning from terminal fall velocity (-45 m/s) immediately zeroes velocity', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    player.velocity.set(0, -45.0, 0);
    player.position.set(0, -20.0, 0);

    player.respawn();

    assert.strictEqual(player.velocity.x, 0);
    assert.strictEqual(player.velocity.y, 0);
    assert.strictEqual(player.velocity.z, 0);
    assert.strictEqual(player.getStats().isFalling, false);
  });

  it('B-RESP-2: Respawning mid-dash (18.5 m/s) zeroes velocity and resets dash timers', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    // Initiate dash
    const input = makeEmptyInput();
    input.dashPressed = true;
    player.update(0.016, input, 0);

    assert.ok(player.getStats().horizontalSpeed > 10.0, 'Dash should give high speed');

    // Trigger respawn mid-dash
    player.respawn();

    assert.strictEqual(player.velocity.x, 0);
    assert.strictEqual(player.velocity.y, 0);
    assert.strictEqual(player.velocity.z, 0);
    assert.strictEqual(player.getStats().horizontalSpeed, 0);
    assert.strictEqual(player.dashCooldown, 0, 'Respawn should clear dash cooldown');
  });

  it('B-RESP-3: Respawning while turning accurately restores checkpoint yaw orientation', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    const checkpointYaw = 2.356; // 135 degrees
    player.setCheckpoint(new THREE.Vector3(0, 0.2, 0), checkpointYaw);

    player.facingYaw = -1.2;
    player.respawn();

    assert.strictEqual(player.facingYaw, checkpointYaw);
  });

  it('B-RESP-4: Rapid consecutive respawn inputs keep position locked to checkpoint', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    const checkpointPos = new THREE.Vector3(5.0, 10.2, -3.0);
    player.setCheckpoint(checkpointPos, 0);

    const input = makeEmptyInput();
    input.respawnPressed = true;

    for (let f = 0; f < 10; f++) {
      input.respawnPressed = true;
      player.update(0.016, input, 0);
    }

    assert.ok(
      Math.abs(player.position.x - 5.0) < 0.01 &&
      Math.abs(player.position.z - (-3.0)) < 0.01,
      `Position drifted under repeated respawn: ${player.position.x}, ${player.position.z}`
    );
  });

  it('B-RESP-5: Respawn clears obsolete platform delta references', () => {
    const { physics, player } = createTestWorld();
    const moving = createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 0.4, 4));
    moving.isMoving = true;

    // Ground player on moving platform
    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    // Platform moves 1 meter
    moving.position.x += 1.0;

    // Respawn to stationary checkpoint at (10, 5, 10)
    player.setCheckpoint(new THREE.Vector3(10, 5.2, 10));
    player.respawn();

    // Next frame update should not apply previous platform's movement delta
    player.update(0.016, input, 0);

    assert.ok(
      Math.abs(player.position.x - 10) < 0.1,
      `Obsolete moving platform delta leaked after respawn: pos.x = ${player.position.x}`
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 1: F6 - Void Respawn Safety & Safe Surface Placement', () => {
  it('F6-1: Respawn immediately resets 3D velocity (vx, vy, vz) to exactly 0', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    player.velocity.set(12.5, -35.0, 8.2);
    player.respawn();

    assert.strictEqual(player.velocity.x, 0, 'velocity.x must be reset to 0');
    assert.strictEqual(player.velocity.y, 0, 'velocity.y must be reset to 0');
    assert.strictEqual(player.velocity.z, 0, 'velocity.z must be reset to 0');
  });

  it('F6-2: Respawn resets falling state and marks player grounded', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    player.respawn();
    assert.strictEqual(player.getStats().isFalling, false, 'isFalling must be false after respawn');

    // Settle 1 frame onto checkpoint platform surface
    player.update(0.016, makeEmptyInput(), 0);
    assert.strictEqual(player.getStats().isGrounded, true, 'isGrounded should become true after settling on platform');
  });

  it('F6-3: Respawn aligns facing yaw to checkpoint yaw', () => {
    const { physics, player } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0.4, 10));

    const targetYaw = 1.57; // 90 degrees
    player.setCheckpoint(new THREE.Vector3(0, 0.2, 0), targetYaw);

    player.facingYaw = -2.1;
    player.respawn();

    assert.strictEqual(player.facingYaw, targetYaw, 'Facing yaw must match checkpoint respawnYaw');
  });

  it('F6-4: Checkpoint placement provides safe clearance above platform surface', () => {
    const { physics, player } = createTestWorld();
    // Platform surface at y = 5.0 (halfExtents y=0.5, pos y=4.5)
    createPlatform(physics, new THREE.Vector3(0, 4.5, 0), new THREE.Vector3(4, 1.0, 4));

    player.setCheckpoint(new THREE.Vector3(0, 5.0, 0));
    player.respawn();

    // Player feet position y should be strictly >= 5.0 (not penetrating inside the platform)
    assert.ok(
      player.position.y >= 5.0,
      `Respawn position must be on or above platform surface (y >= 5.0), got ${player.position.y}`
    );
  });

  it('F6-5: Respawned player on safe checkpoint does not trigger immediate fall loop', () => {
    const { physics, player } = createTestWorld();
    // Checkpoint platform 20m high
    createPlatform(physics, new THREE.Vector3(0, 20, 0), new THREE.Vector3(6, 0.4, 6));

    player.setCheckpoint(new THREE.Vector3(0, 20.2, 0));
    player.respawn();

    let fellAgain = false;
    player.setCallbacks(
      () => { fellAgain = true; },
      () => {}
    );

    const input = makeEmptyInput();

    // Simulate 30 frames idle on checkpoint
    for (let f = 0; f < 30; f++) {
      player.update(0.016, input, 0);
    }

    assert.strictEqual(fellAgain, false, 'Player on safe checkpoint should not trigger fall loop');
    assert.strictEqual(player.getStats().isFalling, false);
  });

  it('F6-6: Respawn clears coyote timer, jump buffer, and dash cooldown', () => {
    const { physics, player } = createTestWorld();
    player.dashCooldown = 2.0;

    player.respawn();

    assert.strictEqual(player.dashCooldown, 0, 'Dash cooldown should be reset on respawn');
  });
});

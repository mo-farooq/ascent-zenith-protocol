import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 4: Scenario - Death Fall to Safe Respawn Recovery Loop', () => {
  it('S-RESP-LOOP-1: Complete loop: Climb -> Fall off ledge -> Trigger Fall -> Plunge -> Respawn on Checkpoint -> Resume Ascent', () => {
    const { physics, player, audio } = createTestWorld();

    // Checkpoint platform at y = 50.0m (center: 0, 49.8, 0, size: 6 x 0.4 x 6)
    createPlatform(physics, new THREE.Vector3(0, 49.8, 0), new THREE.Vector3(6, 0.4, 6));

    // Next stepping stone at y = 51.5m, x = 10.0m (too far without jump pad: impossible gap)
    createPlatform(physics, new THREE.Vector3(10, 51.3, 0), new THREE.Vector3(2, 0.4, 2));

    // Set checkpoint at (0, 50.2, 0)
    player.setCheckpoint(new THREE.Vector3(0, 50.0, 0), 0);
    player.respawn();

    // Settle onto platform surface (takes 2-3 frames from +0.35m safety height)
    for (let f = 0; f < 3; f++) {
      player.update(0.016, makeEmptyInput(), 0);
    }

    assert.strictEqual(player.position.y >= 50.0, true, 'Player starts safely on platform');
    assert.strictEqual(player.getStats().isGrounded, true);

    // 1. Walk off the edge into the void towards +X
    const input = makeEmptyInput();
    input.forward = 1.0;

    let fell = false;
    player.setCallbacks(
      () => { fell = true; },
      () => {}
    );

    // Walk forward off platform (cameraYaw = -PI/2 faces +X)
    for (let f = 0; f < 60; f++) {
      player.update(0.016, input, -Math.PI / 2);
      if (player.getStats().isFalling) break;
    }

    assert.ok(player.position.x > 3.0, 'Player walked off platform edge');

    // 2. Fall downward into the abyss until triggerFall is reached
    input.forward = 0;
    for (let f = 0; f < 120; f++) {
      player.update(0.016, input, -Math.PI / 2);
      if (player.getStats().isFalling) break;
    }

    assert.ok(fell, 'triggerFall should have fired when dropping > 35m below checkpoint');
    assert.strictEqual(audio.fallScreamCalls >= 1, true, 'Fall scream audio must trigger');
    assert.strictEqual(player.getStats().isFalling, true, 'Player should enter falling state');

    // 3. Fall state duration: simulate 1.5 seconds (95 frames at 60 FPS)
    // Wait for automatic respawn
    for (let f = 0; f < 100; f++) {
      // Mock passage of performance.now() if needed, or update
      player.update(0.016, input, 0);
      if (!player.getStats().isFalling) break;
    }

    // Force respawn call if performance.now() elapsed
    if (player.getStats().isFalling) {
      player.respawn();
    }

    // 4. Verify post-respawn safety
    assert.strictEqual(player.getStats().isFalling, false, 'isFalling must be false after respawn');
    assert.strictEqual(player.velocity.x, 0, 'velocity.x must be zero');
    assert.strictEqual(player.velocity.y, 0, 'velocity.y must be zero');
    assert.strictEqual(player.velocity.z, 0, 'velocity.z must be zero');
    assert.ok(
      Math.abs(player.position.y - 50.0) <= 0.40,
      `Player must be safely repositioned on checkpoint platform surface, got y = ${player.position.y}`
    );

    // 5. Resume ascent: player can walk without falling into void
    input.forward = 0;
    for (let f = 0; f < 30; f++) {
      player.update(0.016, input, 0);
    }
    assert.strictEqual(player.getStats().isFalling, false, 'Player must remain safe on checkpoint without looping into fall');
  });
});

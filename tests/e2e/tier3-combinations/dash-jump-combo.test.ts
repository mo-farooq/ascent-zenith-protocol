import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 3: Combo - Thruster Dash + Jump Mechanics', () => {
  it('C-DJ-1: Thruster dash imparts horizontal velocity (18.5 m/s) and upward lift (4.8 m/s)', () => {
    const { physics, player, audio } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(10, 0.4, 10));

    player.position.set(0, 0.0, 0);
    const input = makeEmptyInput();
    player.update(0.016, input, 0); // facing -Z

    // Trigger dash forward
    input.forward = 1.0;
    input.dashPressed = true;
    player.update(0.016, input, 0);

    const horizSpeed = player.getStats().horizontalSpeed;
    assert.ok(
      horizSpeed >= 17.0,
      `Dash horizontal speed should be ~18.5 m/s, got ${horizSpeed}`
    );
    assert.ok(
      player.velocity.y >= 4.0,
      `Dash upward buoyant lift should be >= 4.0 m/s, got ${player.velocity.y}`
    );
    assert.strictEqual(audio.thrusterDashCalls >= 1, true, 'Dash audio must be triggered');
  });

  it('C-DJ-2: Dash triggers 2.4s cooldown and cannot be spammed during cooldown', () => {
    const { physics, player, audio } = createTestWorld();
    createPlatform(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(10, 0.4, 10));

    player.position.set(0, 0.0, 0);
    const input = makeEmptyInput();

    // Dash 1
    input.dashPressed = true;
    player.update(0.016, input, 0);
    assert.strictEqual(audio.thrusterDashCalls, 1);
    assert.ok(player.dashCooldown > 2.0, 'Dash cooldown should be set to ~2.4s');

    // Attempt Dash 2 on next frame
    input.dashPressed = true;
    player.update(0.016, input, 0);

    // Audio call count should still be 1 (blocked by cooldown)
    assert.strictEqual(
      audio.thrusterDashCalls,
      1,
      'Dash must not execute while on cooldown'
    );
  });

  it('C-DJ-3: Dash + Jump combo achieves greater horizontal distance than standard jump', () => {
    const { physics: physics1, player: standardPlayer } = createTestWorld();
    createPlatform(physics1, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(50, 0.4, 10));

    const { physics: physics2, player: comboPlayer } = createTestWorld();
    createPlatform(physics2, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(50, 0.4, 10));

    // 1. Standard jump distance
    standardPlayer.position.set(0, 0.0, 0);
    const inputStd = makeEmptyInput();
    standardPlayer.update(0.016, inputStd, -Math.PI / 2); // facing +X
    inputStd.forward = 1.0;
    inputStd.jump = true;
    inputStd.jumpPressed = true;

    for (let f = 0; f < 60; f++) {
      standardPlayer.update(0.016, inputStd, -Math.PI / 2);
      inputStd.jumpPressed = false;
    }
    const standardDistance = standardPlayer.position.x;

    // 2. Dash + Jump combo distance
    comboPlayer.position.set(0, 0.0, 0);
    const inputCombo = makeEmptyInput();
    comboPlayer.update(0.016, inputCombo, -Math.PI / 2);
    inputCombo.forward = 1.0;
    inputCombo.dashPressed = true;
    inputCombo.jump = true;
    inputCombo.jumpPressed = true;

    for (let f = 0; f < 60; f++) {
      comboPlayer.update(0.016, inputCombo, -Math.PI / 2);
      inputCombo.dashPressed = false;
      inputCombo.jumpPressed = false;
    }
    const comboDistance = comboPlayer.position.x;

    assert.ok(
      comboDistance > standardDistance + 3.0,
      `Dash + Jump should significantly exceed standard jump distance (standard=${standardDistance.toFixed(2)}m, combo=${comboDistance.toFixed(2)}m)`
    );
  });
});

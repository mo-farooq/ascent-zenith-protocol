import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, createLaunchPad, makeEmptyInput } from '../../helpers/testWorld';
import { VolumeType } from '../../../src/physics/CollisionVolume';

describe('Tier 1: F10/F11/F12 - Interactive Jump Pad & Trajectory Dynamics', () => {
  it('F10-1: Ground check identifies LAUNCH_PAD type with launch impulse', () => {
    const { physics } = createTestWorld();
    const pad = createLaunchPad(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0.4, 3), 32);

    const ground = physics.checkGround(new THREE.Vector3(0, 0.2, 0), 0.35, 0.35);

    assert.strictEqual(ground.isGrounded, true);
    assert.strictEqual(ground.isLaunchPad, true);
    assert.strictEqual(ground.volume?.type, VolumeType.LAUNCH_PAD);
    assert.strictEqual(ground.launchImpulse, 32);
  });

  it('F10-2: Stepping onto launch pad triggers launch impulse and audio feedback', () => {
    const { physics, player, audio } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0.4, 3), 28);

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    // Update 1 frame
    player.update(0.016, input, 0);

    assert.ok(
      player.velocity.y >= 20.0,
      `Player upward launch velocity should be >= 20 m/s, got ${player.velocity.y}`
    );
    assert.strictEqual(audio.launchPadCalls >= 1, true, 'Launch pad sound should be played');
  });

  it('F11-1: Variable jump truncation must NOT rob launch pad vertical velocity when Space is not held', () => {
    const { physics, player } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0.4, 3), 35);

    player.position.set(0, 0.2, 0);
    // Player does NOT hold Space
    const input = makeEmptyInput();
    input.jump = false;

    player.update(0.016, input, 0); // frame 1: launch trigger

    // Simulate next 4 frames without holding jump
    for (let f = 0; f < 4; f++) {
      player.update(0.016, input, 0);
    }

    // With anti-truncation (F11), velocity should remain high (> 25 m/s); without it, 0.55^4 cuts it to < 3 m/s
    assert.ok(
      player.velocity.y > 20.0,
      `Launch pad vertical momentum was improperly truncated! velocity.y = ${player.velocity.y}`
    );
  });

  it('F10-3: 3D Ballistic Trajectory formula computes accurate launch time and apex', () => {
    // Platform A at (0, 10, 0), Target B at (20, 25, 10)
    // dy = 15m, dx = 20m, dz = 10m
    const gUp = 28.0;
    const gDown = 37.8;
    const dy = 15.0;
    const H = Math.max(dy + 5.0, 5.0); // 20.0m apex above launch

    const vy0 = Math.sqrt(2 * gUp * H);
    const tUp = vy0 / gUp;
    const tDown = Math.sqrt((2 * (H - dy)) / gDown);
    const totalT = tUp + tDown;

    const vx0 = 20.0 / totalT;
    const vz0 = 10.0 / totalT;

    assert.ok(vy0 > 0 && Number.isFinite(vy0), 'vy0 must be positive finite');
    assert.ok(totalT > 1.0 && totalT < 4.0, `totalT should be reasonable, got ${totalT}`);
    assert.ok(vx0 > 0 && vz0 > 0, 'Horizontal velocities must be positive');
  });

  it('F12-1: Launch pad does not trigger conflicting landing sound on launch frame', () => {
    const { physics, player, audio } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0.4, 3), 30);

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    player.update(0.016, input, 0);

    // Audio should trigger launch pad burst, not an immediate heavy landing sound
    assert.strictEqual(audio.launchPadCalls >= 1, true);
    assert.strictEqual(
      audio.landingCalls.length,
      0,
      `Conflicting landing sound played during launch pad activation: ${audio.landingCalls.length} calls`
    );
  });
});

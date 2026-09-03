import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createPlatform, createLaunchPad, makeEmptyInput } from '../../helpers/testWorld';

describe('Tier 3: Combo - Jump + Jump Pad Interactions', () => {
  it('C-JP-1: Landing on jump pad from a jump overrides downward velocity with launch impulse', () => {
    const { physics, player, audio } = createTestWorld();
    // Launch pad at y = 0.0
    createLaunchPad(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4), 30);

    // Player descending from a jump at y = 0.8 with vy = -8.0 m/s
    player.position.set(0, 0.8, 0);
    player.velocity.set(0, -8.0, 0);

    const input = makeEmptyInput();

    // Advance 2 frames to make contact with launch pad
    player.update(0.016, input, 0);
    player.update(0.016, input, 0);

    // Velocity must be converted to positive launch impulse (> 20 m/s)
    assert.ok(
      player.velocity.y > 20.0,
      `Launch pad failed to override descent velocity: velocity.y = ${player.velocity.y}`
    );
    assert.strictEqual(audio.launchPadCalls >= 1, true, 'Launch pad sound should trigger');
  });

  it('C-JP-2: Jump pad launch preserves horizontal forward velocity', () => {
    const { physics, player } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4), 28);

    player.position.set(0, 0.2, 0);
    player.facingYaw = 0; // facing -Z

    const input = makeEmptyInput();
    player.update(0.016, input, 0);

    // Forward speed along facing direction should be boosted or preserved
    const horizSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    assert.ok(
      horizSpeed > 5.0,
      `Launch pad should impart forward momentum, got horizSpeed = ${horizSpeed}`
    );
  });

  it('C-JP-3: Mid-air jump press during launch pad ascent does not double-jump or disrupt trajectory', () => {
    const { physics, player } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4), 32);

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    // Frame 1: launch trigger
    player.update(0.016, input, 0);
    const vyAfterLaunch = player.velocity.y;

    // Frame 2: player presses Space in mid-air
    input.jump = true;
    input.jumpPressed = true;
    player.update(0.016, input, 0);

    // In mid-air, jumpBufferTimer or jump should NOT reset velocity.y to normal jumpVelocity (11.2)
    // It should continue on its ballistic arc (> 25 m/s)
    assert.ok(
      player.velocity.y > 20.0,
      `Mid-air jump corrupted launch pad velocity: vy = ${player.velocity.y} (launched at ${vyAfterLaunch})`
    );
  });
});

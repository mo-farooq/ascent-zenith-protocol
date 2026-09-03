import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, makeEmptyInput, stepSimulation } from '../../helpers/testWorld';

describe('Tier 1: Easter Egg - Jetpack Cheat Code & Free Flight Physics', () => {
  it('JETPACK-1: Cheat code unlocks and activates jetpack flight', () => {
    const { player } = createTestWorld();

    assert.strictEqual(player.isJetpackUnlocked, false);
    assert.strictEqual(player.isJetpackActive, false);

    const input = makeEmptyInput();
    input.cheatUnlocked = 'JETPACK';

    player.update(1 / 60, input, 0);

    assert.strictEqual(player.isJetpackUnlocked, true, 'Jetpack should be unlocked');
    assert.strictEqual(player.isJetpackActive, true, 'Jetpack should be active');
    const stats = player.getStats();
    assert.strictEqual(stats.isJetpackActive, true);
  });

  it('JETPACK-2: Holding jump (Space) produces continuous upward vertical ascent', () => {
    const { player } = createTestWorld();

    player.isJetpackUnlocked = true;
    player.isJetpackActive = true;

    const startY = player.position.y;
    const input = makeEmptyInput();
    input.jump = true;

    stepSimulation(player, input, 2.0, 1 / 60, 0);

    assert.ok(player.position.y > startY + 15.0, `Player should ascend high in 2s, climbed to ${player.position.y}m from ${startY}m`);
    assert.ok(player.velocity.y > 5.0, `Player should have positive ascent velocity, got ${player.velocity.y}`);
    assert.strictEqual(player.isJetpackThrusting, true, 'Jetpack should report thrusting state');
  });

  it('JETPACK-3: Anti-gravity hover stabilizes vertical velocity near 0 without gravity drop', () => {
    const { player } = createTestWorld();

    player.isJetpackUnlocked = true;
    player.isJetpackActive = true;
    player.position.set(0, 50, 0);
    player.velocity.set(0, 0, 0);

    const input = makeEmptyInput();
    stepSimulation(player, input, 1.5, 1 / 60, 0);

    assert.ok(Math.abs(player.position.y - 50.0) < 1.5, `Player should hover near 50m, actual altitude: ${player.position.y}m`);
    assert.ok(Math.abs(player.velocity.y) < 2.0, `Vertical hover velocity should remain near 0, got ${player.velocity.y}`);
  });

  it('JETPACK-4: Holding descend produces smooth controlled downward flight', () => {
    const { player } = createTestWorld();

    player.isJetpackUnlocked = true;
    player.isJetpackActive = true;
    player.position.set(0, 50, 0);

    const input = makeEmptyInput();
    input.descend = true;

    stepSimulation(player, input, 1.0, 1 / 60, 0);

    assert.ok(player.position.y < 45.0, `Player should descend smoothly, actual altitude: ${player.position.y}m`);
    assert.ok(player.velocity.y < -3.0, `Player should have negative descent velocity, got ${player.velocity.y}`);
  });

  it('JETPACK-5: Toggling jetpack off restores standard gravity', () => {
    const { player } = createTestWorld();

    player.isJetpackUnlocked = true;
    player.isJetpackActive = true;
    player.position.set(0, 60, 0);

    const input = makeEmptyInput();
    input.jetpackTogglePressed = true;
    player.update(1 / 60, input, 0);

    assert.strictEqual(player.isJetpackActive, false, 'Jetpack should toggle off');

    stepSimulation(player, makeEmptyInput(), 0.5, 1 / 60, 0);
    assert.ok(player.velocity.y < -5.0, `Standard gravity should accelerate player downward, got vy=${player.velocity.y}`);
  });

  it('JETPACK-6: Free flight allows ascending 200m without out-of-bounds fall death', () => {
    const { player } = createTestWorld();

    player.isJetpackUnlocked = true;
    player.isJetpackActive = true;
    player.setCheckpoint(new THREE.Vector3(0, 1, 0));

    let fallTriggered = false;
    player.setCallbacks(
      () => { fallTriggered = true; },
      () => {}
    );

    const input = makeEmptyInput();
    input.jump = true;

    stepSimulation(player, input, 10.0, 1 / 60, 0);

    assert.ok(player.position.y > 100.0, `Player should ascend past 100m, reached ${player.position.y}m`);
    assert.strictEqual(fallTriggered, false, 'Free flight should not trigger fall-out-of-bounds death');
  });
});

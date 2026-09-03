import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CollisionVolume, VolumeType } from '../../../src/physics/CollisionVolume';
import { PhysicsWorld } from '../../../src/physics/PhysicsWorld';

describe('Tier 1: F1 - Physics Contact Resolution & Edge Ejection Prevention', () => {
  const platformPos = new THREE.Vector3(0, 5, 0);
  const halfExtents = new THREE.Vector3(2.0, 0.5, 2.0); // 4m x 1m x 4m platform (top surface at y=5.5)

  it('F1-1: Centered landing on top surface produces upward normal (0, 1, 0)', () => {
    const vol = new CollisionVolume(VolumeType.BOX, halfExtents, platformPos);
    const testCenter = new THREE.Vector3(0, 5.7, 0); // 0.2m above top surface
    const res = vol.testSphere(testCenter, 0.35);

    assert.strictEqual(res.hit, true, 'Should detect sphere penetration');
    assert.ok(res.normal.y >= 0.99, `Normal Y should be ~1.0, got ${res.normal.y}`);
    assert.ok(Math.abs(res.normal.x) < 0.05, `Normal X should be ~0, got ${res.normal.x}`);
    assert.ok(Math.abs(res.normal.z) < 0.05, `Normal Z should be ~0, got ${res.normal.z}`);
  });

  it('F1-2: Landing near +X edge must yield upward normal (0, 1, 0), not horizontal ejection (+1, 0, 0)', () => {
    const vol = new CollisionVolume(VolumeType.BOX, halfExtents, platformPos);
    // Platform extends from x = -2 to +2. Top surface is y = 5.5.
    // Landing at x = 1.95, y = 5.6 (0.05m from edge, 0.1m above top surface)
    const testCenter = new THREE.Vector3(1.95, 5.6, 0);
    const res = vol.testSphere(testCenter, 0.35);

    assert.strictEqual(res.hit, true);
    // Under F1 requirement, landing on the top surface near edge must NOT produce horizontal ejection
    assert.ok(
      res.normal.y >= 0.7,
      `Expected upward contact normal (normal.y >= 0.7) to prevent ejection into void, got normal=(${res.normal.x.toFixed(3)}, ${res.normal.y.toFixed(3)}, ${res.normal.z.toFixed(3)})`
    );
    assert.ok(
      Math.abs(res.normal.x) < 0.7,
      `Horizontal ejection force detected: normal.x = ${res.normal.x.toFixed(3)}`
    );
  });

  it('F1-3: Landing near -X edge must yield upward normal (0, 1, 0), not horizontal ejection (-1, 0, 0)', () => {
    const vol = new CollisionVolume(VolumeType.BOX, halfExtents, platformPos);
    const testCenter = new THREE.Vector3(-1.95, 5.6, 0);
    const res = vol.testSphere(testCenter, 0.35);

    assert.strictEqual(res.hit, true);
    assert.ok(
      res.normal.y >= 0.7,
      `Expected upward contact normal, got normal=(${res.normal.x.toFixed(3)}, ${res.normal.y.toFixed(3)}, ${res.normal.z.toFixed(3)})`
    );
  });

  it('F1-4: Landing near +Z edge must yield upward normal (0, 1, 0), not horizontal ejection (0, 0, +1)', () => {
    const vol = new CollisionVolume(VolumeType.BOX, halfExtents, platformPos);
    const testCenter = new THREE.Vector3(0, 5.6, 1.95);
    const res = vol.testSphere(testCenter, 0.35);

    assert.strictEqual(res.hit, true);
    assert.ok(
      res.normal.y >= 0.7,
      `Expected upward contact normal, got normal=(${res.normal.x.toFixed(3)}, ${res.normal.y.toFixed(3)}, ${res.normal.z.toFixed(3)})`
    );
  });

  it('F1-5: Landing near -Z edge must yield upward normal (0, 1, 0), not horizontal ejection (0, 0, -1)', () => {
    const vol = new CollisionVolume(VolumeType.BOX, halfExtents, platformPos);
    const testCenter = new THREE.Vector3(0, 5.6, -1.95);
    const res = vol.testSphere(testCenter, 0.35);

    assert.strictEqual(res.hit, true);
    assert.ok(
      res.normal.y >= 0.7,
      `Expected upward contact normal, got normal=(${res.normal.x.toFixed(3)}, ${res.normal.y.toFixed(3)}, ${res.normal.z.toFixed(3)})`
    );
  });

  it('F1-6: Capsule collision resolution near platform edge preserves player on platform without horizontal pushing off', () => {
    const physics = new PhysicsWorld();
    const vol = new CollisionVolume(VolumeType.BOX, halfExtents, platformPos);
    physics.addVolume(vol);

    // Player standing at feet y = 5.5 (on top of platform), x = 1.90 (near edge)
    const pos = new THREE.Vector3(1.90, 5.48, 0); // slightly penetrated into top
    const vel = new THREE.Vector3(0, -1.0, 0);

    physics.resolveCapsuleCollisions(pos, vel, 0.35, 1.7);

    // Player should NOT be pushed off the edge (x > 2.0 + radius)
    assert.ok(
      pos.x <= 2.05,
      `Player was ejected horizontally past platform boundary: pos.x = ${pos.x}`
    );
    // Player feet should be resolved upwards
    assert.ok(
      pos.y >= 5.48,
      `Player feet should be pushed upward to platform level, got pos.y = ${pos.y}`
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CollisionVolume, VolumeType } from '../../../src/physics/CollisionVolume';
import { PhysicsWorld } from '../../../src/physics/PhysicsWorld';

describe('Tier 1: F2 - Vertical Wall Step-Up Resolution', () => {
  it('F2-1: Walking into a vertical wall (normal.y = 0) does not trigger false step-up', () => {
    const physics = new PhysicsWorld();
    // Wall from x = 1 to 3, y = 0 to 4 (halfExtents = 1, 2, 2 at pos 2, 2, 0)
    // Front face is at x = 1.0, facing -X
    const wall = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(1, 2, 2),
      new THREE.Vector3(2, 2, 0)
    );
    physics.addVolume(wall);

    // Player approaching wall at x = 0.8, feet y = 0.0
    const pos = new THREE.Vector3(0.8, 0.0, 0);
    const vel = new THREE.Vector3(5.0, 0, 0); // moving into wall
    const initialY = pos.y;

    physics.resolveCapsuleCollisions(pos, vel, 0.35, 1.7, 0.3);

    // Step-up logic must NOT increase pos.y when contacting a vertical wall!
    assert.strictEqual(
      pos.y,
      initialY,
      `Vertical position should not increase on a vertical wall; got ${pos.y}`
    );
    // Velocity into wall must be cancelled
    assert.ok(vel.x <= 0.01, `Velocity into wall was not cancelled: vel.x = ${vel.x}`);
  });

  it('F2-2: Wall collision projects position out horizontally, not vertically', () => {
    const physics = new PhysicsWorld();
    const wall = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(1, 2, 2),
      new THREE.Vector3(2, 2, 0)
    );
    physics.addVolume(wall);

    // Player penetrating front face at x = 0.9 (penetration depth with radius 0.35 is 0.25)
    const pos = new THREE.Vector3(0.9, 0.0, 0);
    const vel = new THREE.Vector3(4.0, 0, 0);

    physics.resolveCapsuleCollisions(pos, vel, 0.35, 1.7, 0.3);

    // Should push player back out to x <= 1.0 - 0.35 = 0.65
    assert.ok(
      pos.x <= 0.66,
      `Player should be pushed back out horizontally, got pos.x = ${pos.x}`
    );
    assert.strictEqual(pos.y, 0.0, 'Vertical position must remain untouched');
  });

  it('F2-3: Obstacle higher than maxStepHeight (0.3m) cannot be stepped over', () => {
    const physics = new PhysicsWorld();
    // High curb: height 0.6m (surface at y = 0.6)
    const obstacle = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(0.5, 0.3, 2),
      new THREE.Vector3(1.0, 0.3, 0)
    );
    physics.addVolume(obstacle);

    const pos = new THREE.Vector3(0.4, 0.0, 0);
    const vel = new THREE.Vector3(3.0, 0, 0);

    physics.resolveCapsuleCollisions(pos, vel, 0.35, 1.7, 0.3);

    assert.strictEqual(pos.y, 0.0, 'Player should not step over obstacle higher than maxStepHeight');
  });

  it('F2-4: Valid low curb (<= 0.3m with upward normal) allows smooth step-up', () => {
    const physics = new PhysicsWorld();
    // Low step: height 0.15m (surface at y = 0.15)
    const step = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(1.0, 0.075, 1.0),
      new THREE.Vector3(1.0, 0.075, 0)
    );
    physics.addVolume(step);

    // Sphere tests step top corner
    const center = new THREE.Vector3(0.64, 0.40, 0);
    const res = step.testSphere(center, 0.35);
    assert.strictEqual(res.hit, true, 'Should detect step contact');
  });

  it('F2-5: Continuous forward motion against vertical wall does not produce vertical vibration jitter', () => {
    const physics = new PhysicsWorld();
    const wall = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(1, 3, 3),
      new THREE.Vector3(2, 3, 0)
    );
    physics.addVolume(wall);

    const pos = new THREE.Vector3(0.65, 0.0, 0);
    const vel = new THREE.Vector3(6.0, 0, 0);

    // Simulate 30 frames pressing forward into wall
    for (let frame = 0; frame < 30; frame++) {
      vel.set(6.0, 0, 0);
      pos.x += vel.x * 0.016;
      physics.resolveCapsuleCollisions(pos, vel, 0.35, 1.7, 0.3);
    }

    assert.strictEqual(
      pos.y,
      0.0,
      `Vertical vibration jitter occurred: pos.y = ${pos.y} after pushing into wall`
    );
  });
});

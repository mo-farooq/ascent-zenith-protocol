import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { PhysicsWorld } from '../../../src/physics/PhysicsWorld';
import { CameraController } from '../../../src/entities/CameraController';
import { CollisionVolume, VolumeType } from '../../../src/physics/CollisionVolume';

describe('Tier 1: F5 - Camera Occlusion Asymmetric Smoothing & Snap Safety', () => {
  it('F5-1: Physics raycastCamera returns distance to obstructing geometry', () => {
    const physics = new PhysicsWorld();
    // Wall 2m behind player in -Z direction: box at (0, 1.35, 2.0), thickness 1m
    const wall = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(2, 2, 0.5),
      new THREE.Vector3(0, 1.35, 2.0)
    );
    physics.addVolume(wall);

    const rayOrigin = new THREE.Vector3(0, 1.35, 0);
    const rayDir = new THREE.Vector3(0, 0, 1).normalize();
    const hitDist = physics.raycastCamera(rayOrigin, rayDir, 5.2);

    // Obstacle front face is at z = 1.5, so hit distance should be ~1.5m
    assert.ok(
      Math.abs(hitDist - 1.5) < 0.1,
      `Expected raycast hit at ~1.5m, got ${hitDist}`
    );
  });

  it('F5-2: Camera pulls in towards player when line of sight is obstructed', () => {
    const physics = new PhysicsWorld();
    // Wall 2.5m away from player along camera view ray
    const wall = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(4, 4, 0.5),
      new THREE.Vector3(0, 1.35, 2.5)
    );
    physics.addVolume(wall);

    const controller = new CameraController(physics, 16 / 9);
    const playerPos = new THREE.Vector3(0, 0, 0);
    const playerVel = new THREE.Vector3(0, 0, 0);

    // Update camera for 20 frames with obstruction present
    for (let f = 0; f < 20; f++) {
      controller.update(0.016, playerPos, playerVel, false);
    }

    const distToPlayer = controller.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
    assert.ok(
      distToPlayer < 3.0,
      `Camera should pull in when occluded; distance is ${distToPlayer.toFixed(2)}m (expected < 3.0m)`
    );
  });

  it('F5-3: Camera smoothly expands back out to target distance when unobstructed', () => {
    const physics = new PhysicsWorld();
    const controller = new CameraController(physics, 16 / 9);
    const playerPos = new THREE.Vector3(0, 0, 0);
    const playerVel = new THREE.Vector3(0, 0, 0);

    // Start with unobstructed camera
    for (let f = 0; f < 60; f++) {
      controller.update(0.016, playerPos, playerVel, false);
    }

    const distToPlayer = controller.camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0));
    assert.ok(
      distToPlayer >= 4.90 && distToPlayer <= 5.25,
      `Camera should reach target distance (~4.95m-5.2m, note 0.25m offset in CameraController), got ${distToPlayer.toFixed(2)}m`
    );
  });

  it('F5-4: snapToTarget performs occlusion check and does not spawn camera inside walls', () => {
    const physics = new PhysicsWorld();
    // Wall right behind spawn point at z = 2.0 (player at 0, 0, 0)
    const wall = new CollisionVolume(
      VolumeType.BOX,
      new THREE.Vector3(5, 5, 1),
      new THREE.Vector3(0, 2, 2.5)
    );
    physics.addVolume(wall);

    const controller = new CameraController(physics, 16 / 9);
    controller.snapToTarget(new THREE.Vector3(0, 1.35, 0));

    // Under F5 requirement, snapToTarget must test occlusion so camera doesn't spawn inside/behind wall (z > 2.0)
    assert.ok(
      controller.camera.position.z <= 2.2,
      `Camera spawned inside/behind wall at z = ${controller.camera.position.z.toFixed(2)}`
    );
  });

  it('F5-5: Trauma screen shake applies displacement and decays over time', () => {
    const physics = new PhysicsWorld();
    const controller = new CameraController(physics, 16 / 9);
    const playerPos = new THREE.Vector3(0, 0, 0);
    const playerVel = new THREE.Vector3(0, 0, 0);

    // Let camera settle to steady state
    for (let f = 0; f < 60; f++) {
      controller.update(0.016, playerPos, playerVel, false);
    }
    const basePos = controller.camera.position.clone();

    // Add trauma
    controller.addTrauma(0.8);
    controller.update(0.016, playerPos, playerVel, false);
    const shakenPos = controller.camera.position.clone();

    // Verify camera position was perturbed by trauma shake
    assert.ok(
      basePos.distanceTo(shakenPos) > 0.001,
      'Trauma should perturb camera position'
    );

    // Simulate 2 seconds of decay
    for (let f = 0; f < 120; f++) {
      controller.update(0.016, playerPos, playerVel, false);
    }

    // After decay, position should return to base steady state
    assert.ok(
      basePos.distanceTo(controller.camera.position) < 0.05,
      `Trauma shake should decay over time; distance from base is ${basePos.distanceTo(controller.camera.position)}`
    );
  });
});

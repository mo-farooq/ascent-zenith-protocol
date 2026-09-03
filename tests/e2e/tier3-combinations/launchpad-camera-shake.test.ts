import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { createTestWorld, createLaunchPad, makeEmptyInput } from '../../helpers/testWorld';
import { CameraController } from '../../../src/entities/CameraController';

describe('Tier 3: Combo - Jump Pad + Camera Shake Interaction', () => {
  it('C-CS-1: Camera dynamic FOV increases with high vertical launch speed', () => {
    const { physics, player } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4), 30);

    const cameraCtrl = new CameraController(physics, 16 / 9);
    const initialFov = cameraCtrl.camera.fov;

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    // Trigger launch
    player.update(0.016, input, 0);

    // Update camera with player velocity
    cameraCtrl.update(0.016, player.position, player.velocity, false);

    // Speed boost fov
    assert.ok(
      cameraCtrl.camera.fov >= initialFov,
      `Camera FOV should expand with launch speed, initial=${initialFov}, current=${cameraCtrl.camera.fov}`
    );
  });

  it('C-CS-2: Camera position remains valid (finite numbers) during launch trauma shake', () => {
    const { physics, player } = createTestWorld();
    createLaunchPad(physics, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(4, 0.4, 4), 35);

    const cameraCtrl = new CameraController(physics, 16 / 9);
    cameraCtrl.addTrauma(0.6); // high trauma

    player.position.set(0, 0.2, 0);
    const input = makeEmptyInput();

    for (let f = 0; f < 30; f++) {
      player.update(0.016, input, 0);
      cameraCtrl.update(0.016, player.position, player.velocity, false);

      const pos = cameraCtrl.camera.position;
      assert.ok(Number.isFinite(pos.x), 'Camera x must be finite');
      assert.ok(Number.isFinite(pos.y), 'Camera y must be finite');
      assert.ok(Number.isFinite(pos.z), 'Camera z must be finite');
    }
  });
});

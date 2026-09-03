import * as THREE from 'three';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { CollisionVolume, VolumeType } from '../../src/physics/CollisionVolume';
import { Player } from '../../src/entities/Player';
import { MockAudioManager } from './mockAudio';
import { InputState } from '../../src/core/Input';
import './setupEnv';

export function createTestWorld(): {
  physics: PhysicsWorld;
  audio: MockAudioManager;
  player: Player;
} {
  const physics = new PhysicsWorld();
  const audio = new MockAudioManager();
  const player = new Player(physics, audio.asAudioManager());
  return { physics, audio, player };
}

export function createPlatform(
  physics: PhysicsWorld,
  position: THREE.Vector3,
  dimensions: THREE.Vector3,
  type: VolumeType = VolumeType.BOX
): CollisionVolume {
  const halfExtents = dimensions.clone().multiplyScalar(0.5);
  const vol = new CollisionVolume(type, halfExtents, position);
  physics.addVolume(vol);
  return vol;
}

export function createLaunchPad(
  physics: PhysicsWorld,
  position: THREE.Vector3,
  dimensions: THREE.Vector3,
  launchImpulse = 26,
  targetPosition?: THREE.Vector3
): CollisionVolume {
  const vol = createPlatform(physics, position, dimensions, VolumeType.LAUNCH_PAD);
  vol.launchImpulse = launchImpulse;
  if (targetPosition) {
    (vol as any).targetPosition = targetPosition.clone();
  }
  return vol;
}

export function makeEmptyInput(): InputState {
  return {
    forward: 0,
    right: 0,
    sprint: false,
    jump: false,
    jumpPressed: false,
    dashPressed: false,
    respawnPressed: false,
  };
}

export function stepSimulation(
  player: Player,
  input: InputState,
  seconds: number,
  dt = 1 / 60,
  cameraYaw = 0
): void {
  const steps = Math.ceil(seconds / dt);
  for (let i = 0; i < steps; i++) {
    player.update(dt, input, cameraYaw);
    // After first frame, single-frame trigger buttons are cleared
    input.jumpPressed = false;
    input.dashPressed = false;
    input.respawnPressed = false;
  }
}

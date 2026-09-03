import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { PhysicsWorld } from '../../../src/physics/PhysicsWorld';
import { LevelBuilder } from '../../../src/level/LevelBuilder';
import { MockAudioManager } from '../../helpers/mockAudio';
import { VolumeType } from '../../../src/physics/CollisionVolume';
import '../../helpers/setupEnv';

describe('Tier 4: Scenario - Multi-Platform Climbing Traversal (Zones 1-6)', () => {
  function buildCourse() {
    const scene = new THREE.Scene();
    const physics = new PhysicsWorld();
    const audio = new MockAudioManager().asAudioManager();
    const builder = new LevelBuilder(scene, physics, audio);
    builder.buildLevel();
    return { builder, physics, volumes: physics.getVolumes() };
  }

  it('S-ZONE-TOTAL: LevelBuilder constructs full 6-zone course reaching 1,000m summit', () => {
    const { builder, volumes } = buildCourse();

    assert.ok(volumes.length >= 400, `Course should contain 400+ collision volumes, got ${volumes.length}`);
    assert.ok(builder.checkpoints.length >= 6, `Course should have at least 6 checkpoints, got ${builder.checkpoints.length}`);
    assert.strictEqual(builder.summitPosition.y, 1000, 'Summit position must be at 1000m');
  });

  it('S-ZONE-1: Zone 1 (0m-60m) platforms provide reachable ascent path', () => {
    const { volumes } = buildCourse();
    const z1Volumes = volumes.filter(v => v.position.y >= 0 && v.position.y <= 65);

    assert.ok(z1Volumes.length >= 20, `Zone 1 should have platforms, found ${z1Volumes.length}`);
    // Check highest platform in Zone 1 reaches checkpoint altitude
    const maxY = Math.max(...z1Volumes.map(v => v.position.y + v.halfExtents.y));
    assert.ok(maxY >= 58, `Zone 1 top should reach ~60m, reached ${maxY.toFixed(2)}m`);
  });

  it('S-ZONE-2: Zone 2 (60m-180m) platforms span the Mag-Lev Corridor', () => {
    const { volumes } = buildCourse();
    const z2Volumes = volumes.filter(v => v.position.y >= 60 && v.position.y <= 185);

    assert.ok(z2Volumes.length >= 30, `Zone 2 should have platforms, found ${z2Volumes.length}`);
    const maxY = Math.max(...z2Volumes.map(v => v.position.y + v.halfExtents.y));
    assert.ok(maxY >= 175, `Zone 2 top should reach ~180m, reached ${maxY.toFixed(2)}m`);
  });

  it('S-ZONE-3: Zone 3 (180m-360m) spans Suspended Cargo Bay', () => {
    const { volumes } = buildCourse();
    const z3Volumes = volumes.filter(v => v.position.y >= 180 && v.position.y <= 365);

    assert.ok(z3Volumes.length >= 30, `Zone 3 should have platforms, found ${z3Volumes.length}`);
    const maxY = Math.max(...z3Volumes.map(v => v.position.y + v.halfExtents.y));
    assert.ok(maxY >= 350, `Zone 3 top should reach ~360m, reached ${maxY.toFixed(2)}m`);
  });

  it('S-ZONE-4: Zone 4 (360m-600m) spans Clockwork Fusion Foundry', () => {
    const { volumes } = buildCourse();
    const z4Volumes = volumes.filter(v => v.position.y >= 360 && v.position.y <= 605);

    assert.ok(z4Volumes.length >= 40, `Zone 4 should have platforms, found ${z4Volumes.length}`);
    const maxY = Math.max(...z4Volumes.map(v => v.position.y + v.halfExtents.y));
    assert.ok(maxY >= 590, `Zone 4 top should reach ~600m, reached ${maxY.toFixed(2)}m`);
  });

  it('S-ZONE-5: Zone 5 (600m-850m) spans Vertigo Monoliths', () => {
    const { volumes } = buildCourse();
    const z5Volumes = volumes.filter(v => v.position.y >= 600 && v.position.y <= 855);

    assert.ok(z5Volumes.length >= 40, `Zone 5 should have platforms, found ${z5Volumes.length}`);
    const maxY = Math.max(...z5Volumes.map(v => v.position.y + v.halfExtents.y));
    assert.ok(maxY >= 840, `Zone 5 top should reach ~850m, reached ${maxY.toFixed(2)}m`);
  });

  it('S-ZONE-6: Zone 6 (850m-1000m) reaches the Zenith Summit at 1000m', () => {
    const { volumes } = buildCourse();
    const z6Volumes = volumes.filter(v => v.position.y >= 850);

    assert.ok(z6Volumes.length >= 30, `Zone 6 should have platforms, found ${z6Volumes.length}`);
    const maxY = Math.max(...z6Volumes.map(v => v.position.y + v.halfExtents.y));
    assert.ok(maxY >= 995, `Zone 6 top should reach 1000m summit, reached ${maxY.toFixed(2)}m`);
  });

  it('S-COURSE-AUDIT: 100% of standard platform transitions along progression path satisfy Δy <= 1.6m & gap <= 2.6m or are jump pads (R2/F8)', () => {
    const { volumes } = buildCourse();

    // Sort volumes by ascending altitude
    const sorted = [...volumes]
      .filter(v => !v.isHazard)
      .sort((a, b) => a.position.y - b.position.y);

    let impossibleSteps = 0;
    const maxSafeDy = 1.60;
    const maxSafeGap = 2.60;

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      // If either platform is a launch pad, it's an intended ballistic boost
      if (a.type === VolumeType.LAUNCH_PAD || b.type === VolumeType.LAUNCH_PAD) {
        continue;
      }

      const aTopY = a.position.y + a.halfExtents.y;
      const bTopY = b.position.y + b.halfExtents.y;
      const dy = bTopY - aTopY;

      // Only check consecutive steps going upward along progression
      if (dy > 0 && dy < 15.0) {
        // Horizontal distance edge to edge approx
        const dx = Math.abs(b.position.x - a.position.x) - (a.halfExtents.x + b.halfExtents.x);
        const dz = Math.abs(b.position.z - a.position.z) - (a.halfExtents.z + b.halfExtents.z);
        const gap = Math.max(0, Math.hypot(Math.max(0, dx), Math.max(0, dz)));

        if (dy > maxSafeDy || gap > maxSafeGap) {
          impossibleSteps++;
        }
      }
    }

    // Under R2 requirement, impossible standard jumps must be 0
    assert.strictEqual(
      impossibleSteps,
      0,
      `Course audit found ${impossibleSteps} non-compliant platform steps (exceeding Δy <= 1.6m or gap <= 2.6m)`
    );
  });
});

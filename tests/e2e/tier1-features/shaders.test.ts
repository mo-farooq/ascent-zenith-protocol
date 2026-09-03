import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { SkyAtmosphere } from '../../../src/environment/SkyAtmosphere';
import { TextureFactory } from '../../../src/materials/TextureFactory';
import '../../helpers/setupEnv';

describe('Tier 1: F14-F18 - Visuals, Shaders, Color Space & Atmosphere', () => {
  it('F15-1: SkyAtmosphere creates ShaderMaterial with required gradient uniforms', () => {
    const scene = new THREE.Scene();
    const sky = new SkyAtmosphere(scene);

    // Find the sky dome mesh in scene
    const skyMesh = scene.children.find(
      c => c instanceof THREE.Mesh && c.material instanceof THREE.ShaderMaterial
    ) as THREE.Mesh;

    assert.ok(skyMesh, 'Sky mesh with ShaderMaterial should be present in scene');
    const mat = skyMesh.material as THREE.ShaderMaterial;
    assert.ok(mat.uniforms.topColor, 'topColor uniform required');
    assert.ok(mat.uniforms.horizonColor, 'horizonColor uniform required');
    assert.ok(mat.uniforms.bottomColor, 'bottomColor uniform required');
    assert.ok(mat.uniforms.offset, 'offset uniform required');
    assert.ok(mat.uniforms.exponent, 'exponent uniform required');
  });

  it('F15-2: Sky dome shader uses local direction or stable altitude horizon math (F15)', () => {
    const scene = new THREE.Scene();
    new SkyAtmosphere(scene);

    const skyMesh = scene.children.find(
      c => c instanceof THREE.Mesh && c.material instanceof THREE.ShaderMaterial
    ) as THREE.Mesh;
    const mat = skyMesh.material as THREE.ShaderMaterial;

    // F15 requirement: shader must avoid unnormalized world coordinates that extinguish horizon > 500m
    const fragmentCode = mat.fragmentShader;
    assert.ok(
      fragmentCode.includes('normalize') || fragmentCode.includes('vWorldPosition') || fragmentCode.includes('vDirection'),
      'Shader should perform normalization for smooth horizon blending'
    );
  });

  it('F18-1: SkyAtmosphere updates dynamically across altitude without error', () => {
    const scene = new THREE.Scene();
    const sky = new SkyAtmosphere(scene);

    // Test updates at ground (0m), mid-mountain (500m), and summit (1000m)
    assert.doesNotThrow(() => {
      sky.update(0.016, 0, new THREE.Vector3(0, 0, 0));
      sky.update(0.016, 500, new THREE.Vector3(0, 500, 0));
      sky.update(0.016, 1000, new THREE.Vector3(0, 1000, 0));
    });
  });

  it('F16-1: TextureFactory generates procedural PBR textures with valid wrapping', () => {
    const ceramic = TextureFactory.getCeramicPanels('#ffffff', '#000000');
    assert.strictEqual(ceramic.wrapS, THREE.RepeatWrapping);
    assert.strictEqual(ceramic.wrapT, THREE.RepeatWrapping);

    const carbon = TextureFactory.getCarbonFiber();
    assert.strictEqual(carbon.wrapS, THREE.RepeatWrapping);
    assert.strictEqual(carbon.wrapT, THREE.RepeatWrapping);
  });

  it('F16-2: Procedural textures enforce SRGBColorSpace for accurate PBR rendering (F16)', () => {
    const ceramic = TextureFactory.getCeramicPanels('#ffffff', '#000000');
    // Under F16 requirement, diffuse textures must be tagged as SRGBColorSpace
    assert.strictEqual(
      ceramic.colorSpace,
      THREE.SRGBColorSpace,
      `Texture colorSpace must be THREE.SRGBColorSpace, got ${ceramic.colorSpace}`
    );
  });

  it('F17-1: Atmospheric lighting includes DirectionalLight and HemisphereLight', () => {
    const scene = new THREE.Scene();
    const sky = new SkyAtmosphere(scene);

    assert.ok(sky.dirLight instanceof THREE.DirectionalLight, 'dirLight must be a DirectionalLight');
    assert.ok(sky.hemiLight instanceof THREE.HemisphereLight, 'hemiLight must be a HemisphereLight');
    assert.ok(sky.dirLight.castShadow, 'Directional sunlight should cast shadows');
    assert.ok(scene.fog !== null, 'Scene should have atmospheric fog configured');
  });
});

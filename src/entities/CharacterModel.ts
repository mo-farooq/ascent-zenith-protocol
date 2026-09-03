import * as THREE from 'three';
import { TextureFactory } from '../materials/TextureFactory';

export enum CharacterAnimState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  SPRINT = 'SPRINT',
  JUMP = 'JUMP',
  FALL = 'FALL',
  LAND = 'LAND',
  VICTORY = 'VICTORY'
}

export class CharacterModel {
  public group = new THREE.Group();

  // Hierarchical groups for robotic kinematics
  private torsoGroup = new THREE.Group();
  private headGroup = new THREE.Group();
  private thrusterPackGroup = new THREE.Group();

  private leftArmGroup = new THREE.Group();
  private leftForearmGroup = new THREE.Group();
  private rightArmGroup = new THREE.Group();
  private rightForearmGroup = new THREE.Group();

  private leftLegGroup = new THREE.Group();
  private leftShinGroup = new THREE.Group();
  private rightLegGroup = new THREE.Group();
  private rightShinGroup = new THREE.Group();

  // Scarf segments
  private scarfSegments: THREE.Mesh[] = [];
  private scarfPoints: THREE.Vector3[] = [];

  // Animation timing
  private animTimer = 0;
  private landSquash = 0;

  constructor() {
    this.buildAndroidRobotMesh();
  }

  private buildAndroidRobotMesh(): void {
    // Grounded Futuristic Sci-Fi PBR Materials
    const ceramicWhiteMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.getCeramicPanels('#f8fafc', '#94a3b8'),
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true
    });

    const carbonChassisMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.getCarbonFiber(),
      roughness: 0.6,
      metalness: 0.4,
      flatShading: true
    });

    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
      flatShading: true
    });

    const chromeHydraulicMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95,
      flatShading: true
    });

    const hazardOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.45,
      metalness: 0.3,
      flatShading: true
    });

    const opticalCyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    const reactorCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });

    const scarfMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // High-tech cobalt blue aerodynamic scarf
      roughness: 0.5,
      side: THREE.DoubleSide,
      flatShading: true
    });

    // Root offset
    this.group.add(this.torsoGroup);
    this.torsoGroup.position.y = 0.95;

    // ==========================================
    // 1. SLEEK ROBOTIC TORSO & POWER REACTOR
    // ==========================================
    // Internal carbon fiber core chassis
    const coreGeo = new THREE.CylinderGeometry(0.21, 0.17, 0.48, 6);
    const coreMesh = new THREE.Mesh(coreGeo, carbonChassisMat);
    coreMesh.rotation.y = Math.PI / 6;
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    this.torsoGroup.add(coreMesh);

    // Ceramic White Chest Armor Plating (Athletic angled cowl)
    const chestPlateGeo = new THREE.BoxGeometry(0.34, 0.26, 0.15);
    const chestPlate = new THREE.Mesh(chestPlateGeo, ceramicWhiteMat);
    chestPlate.position.set(0, 0.08, 0.10);
    chestPlate.castShadow = true;
    this.torsoGroup.add(chestPlate);

    // Glowing Arc-Reactor Core in center of chest
    const reactorGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12);
    const reactor = new THREE.Mesh(reactorGeo, reactorCoreMat);
    reactor.rotation.x = Math.PI / 2;
    reactor.position.set(0, 0.08, 0.18);
    this.torsoGroup.add(reactor);

    // Orange hazard markings on chest bevels
    const stripeGeo = new THREE.BoxGeometry(0.05, 0.22, 0.16);
    const stripeLeft = new THREE.Mesh(stripeGeo, hazardOrangeMat);
    stripeLeft.position.set(-0.13, 0.08, 0.09);
    stripeLeft.rotation.z = -0.2;
    this.torsoGroup.add(stripeLeft);

    const stripeRight = new THREE.Mesh(stripeGeo, hazardOrangeMat);
    stripeRight.position.set(0.13, 0.08, 0.09);
    stripeRight.rotation.z = 0.2;
    this.torsoGroup.add(stripeRight);

    // Robotic Waist & Pelvis Actuator
    const pelvisGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.12, 6);
    const pelvis = new THREE.Mesh(pelvisGeo, darkTitaniumMat);
    pelvis.position.y = -0.22;
    this.torsoGroup.add(pelvis);

    // ==========================================
    // 2. BACK ION JUMP-THRUSTER PACK
    // ==========================================
    this.thrusterPackGroup.position.set(0, 0.06, -0.16);
    const packBodyGeo = new THREE.BoxGeometry(0.26, 0.34, 0.12);
    const packBody = new THREE.Mesh(packBodyGeo, ceramicWhiteMat);
    packBody.castShadow = true;
    this.thrusterPackGroup.add(packBody);

    // Twin Ion Exhaust Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.12, 8);
    const leftNozzle = new THREE.Mesh(nozzleGeo, darkTitaniumMat);
    leftNozzle.position.set(-0.08, -0.18, 0);
    this.thrusterPackGroup.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, darkTitaniumMat);
    rightNozzle.position.set(0.08, -0.18, 0);
    this.thrusterPackGroup.add(rightNozzle);

    // Thruster glow emitters
    const glowGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8);
    const leftGlow = new THREE.Mesh(glowGeo, opticalCyanGlowMat);
    leftGlow.position.set(-0.08, -0.24, 0);
    this.thrusterPackGroup.add(leftGlow);

    const rightGlow = new THREE.Mesh(glowGeo, opticalCyanGlowMat);
    rightGlow.position.set(0.08, -0.24, 0);
    this.thrusterPackGroup.add(rightGlow);

    this.torsoGroup.add(this.thrusterPackGroup);

    // ==========================================
    // 3. AERODYNAMIC ROBOT HEAD UNIT
    // ==========================================
    this.headGroup.position.set(0, 0.36, 0);

    // Carbon neck servo pivot
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.10, 6);
    const neck = new THREE.Mesh(neckGeo, darkTitaniumMat);
    neck.position.y = -0.05;
    this.headGroup.add(neck);

    // Angular Streamlined Head Shell (Ceramic White)
    const headGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.24, 6);
    const head = new THREE.Mesh(headGeo, ceramicWhiteMat);
    head.position.set(0, 0.11, 0);
    head.rotation.y = Math.PI / 6;
    head.castShadow = true;
    this.headGroup.add(head);

    // Robotic Chin & Jaw Inset (Carbon fiber)
    const jawGeo = new THREE.BoxGeometry(0.16, 0.12, 0.18);
    const jaw = new THREE.Mesh(jawGeo, carbonChassisMat);
    jaw.position.set(0, 0.05, 0.04);
    this.headGroup.add(jaw);

    // Glowing Optical Sensor Eye Visor Slit
    const sensorGeo = new THREE.BoxGeometry(0.20, 0.05, 0.08);
    const sensor = new THREE.Mesh(sensorGeo, opticalCyanGlowMat);
    sensor.position.set(0, 0.13, 0.14);
    this.headGroup.add(sensor);

    // Side telemetry antenna / sensor fin
    const finGeo = new THREE.BoxGeometry(0.02, 0.14, 0.08);
    const fin = new THREE.Mesh(finGeo, hazardOrangeMat);
    fin.position.set(0.16, 0.14, -0.04);
    fin.rotation.z = -0.2;
    this.headGroup.add(fin);

    this.torsoGroup.add(this.headGroup);

    // ==========================================
    // 4. ARTICULATED HYDRAULIC ARMS & MANIPULATORS
    // ==========================================
    const shoulderCowlGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.12, 6);
    const upperArmChassisGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.22, 6);
    const pistonShaftGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6);
    const forearmCasingGeo = new THREE.BoxGeometry(0.09, 0.20, 0.09);
    const handManipulatorGeo = new THREE.BoxGeometry(0.08, 0.12, 0.06);

    // --- Left Arm ---
    this.leftArmGroup.position.set(-0.28, 0.18, 0);

    const lShoulder = new THREE.Mesh(shoulderCowlGeo, ceramicWhiteMat);
    lShoulder.rotation.z = Math.PI / 2;
    this.leftArmGroup.add(lShoulder);

    const lUpperArm = new THREE.Mesh(upperArmChassisGeo, carbonChassisMat);
    lUpperArm.position.y = -0.11;
    lUpperArm.castShadow = true;
    this.leftArmGroup.add(lUpperArm);

    // Exposed chrome hydraulic piston
    const lPiston = new THREE.Mesh(pistonShaftGeo, chromeHydraulicMat);
    lPiston.position.set(0, -0.11, -0.03);
    this.leftArmGroup.add(lPiston);

    this.leftForearmGroup.position.set(0, -0.22, 0);

    const lForearm = new THREE.Mesh(forearmCasingGeo, ceramicWhiteMat);
    lForearm.position.y = -0.10;
    lForearm.castShadow = true;
    this.leftForearmGroup.add(lForearm);

    // Robotic magnetic climbing manipulator (hand)
    const lHand = new THREE.Mesh(handManipulatorGeo, darkTitaniumMat);
    lHand.position.set(0, -0.24, 0);
    lHand.castShadow = true;
    this.leftForearmGroup.add(lHand);

    // Magnetic grip pads on fingertips
    const lGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.04), opticalCyanGlowMat);
    lGrip.position.set(0, -0.30, 0);
    this.leftForearmGroup.add(lGrip);

    this.leftArmGroup.add(this.leftForearmGroup);
    this.torsoGroup.add(this.leftArmGroup);

    // --- Right Arm ---
    this.rightArmGroup.position.set(0.28, 0.18, 0);

    const rShoulder = new THREE.Mesh(shoulderCowlGeo, ceramicWhiteMat);
    rShoulder.rotation.z = -Math.PI / 2;
    this.rightArmGroup.add(rShoulder);

    const rUpperArm = new THREE.Mesh(upperArmChassisGeo, carbonChassisMat);
    rUpperArm.position.y = -0.11;
    rUpperArm.castShadow = true;
    this.rightArmGroup.add(rUpperArm);

    const rPiston = new THREE.Mesh(pistonShaftGeo, chromeHydraulicMat);
    rPiston.position.set(0, -0.11, -0.03);
    this.rightArmGroup.add(rPiston);

    this.rightForearmGroup.position.set(0, -0.22, 0);

    const rForearm = new THREE.Mesh(forearmCasingGeo, ceramicWhiteMat);
    rForearm.position.y = -0.10;
    rForearm.castShadow = true;
    this.rightForearmGroup.add(rForearm);

    const rHand = new THREE.Mesh(handManipulatorGeo, darkTitaniumMat);
    rHand.position.set(0, -0.24, 0);
    rHand.castShadow = true;
    this.rightForearmGroup.add(rHand);

    const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.04), opticalCyanGlowMat);
    rGrip.position.set(0, -0.30, 0);
    this.rightForearmGroup.add(rGrip);

    this.rightArmGroup.add(this.rightForearmGroup);
    this.torsoGroup.add(this.rightArmGroup);

    // ==========================================
    // 5. ROBOTIC LEGS & MAGNETIC CLIMBING FEET
    // ==========================================
    const thighChassisGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.32, 6);
    const kneeActuatorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.10, 8);
    const shinChassisGeo = new THREE.BoxGeometry(0.11, 0.28, 0.11);
    const footBodyGeo = new THREE.BoxGeometry(0.12, 0.10, 0.22);

    // --- Left Leg ---
    this.leftLegGroup.position.set(-0.14, -0.28, 0);

    const lThigh = new THREE.Mesh(thighChassisGeo, carbonChassisMat);
    lThigh.position.y = -0.16;
    lThigh.castShadow = true;
    this.leftLegGroup.add(lThigh);

    this.leftShinGroup.position.set(0, -0.32, 0);

    // Rotary knee servo
    const lKnee = new THREE.Mesh(kneeActuatorGeo, darkTitaniumMat);
    lKnee.rotation.z = Math.PI / 2;
    lKnee.position.set(0, 0, 0.02);
    this.leftShinGroup.add(lKnee);

    const lShin = new THREE.Mesh(shinChassisGeo, ceramicWhiteMat);
    lShin.position.y = -0.14;
    lShin.castShadow = true;
    this.leftShinGroup.add(lShin);

    // Robotic Foot with magnetic base sole
    const lFoot = new THREE.Mesh(footBodyGeo, darkTitaniumMat);
    lFoot.position.set(0, -0.28, 0.04);
    lFoot.castShadow = true;
    this.leftShinGroup.add(lFoot);

    const lSole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.23), opticalCyanGlowMat);
    lSole.position.set(0, -0.34, 0.04);
    this.leftShinGroup.add(lSole);

    this.leftLegGroup.add(this.leftShinGroup);
    this.torsoGroup.add(this.leftLegGroup);

    // --- Right Leg ---
    this.rightLegGroup.position.set(0.14, -0.28, 0);

    const rThigh = new THREE.Mesh(thighChassisGeo, carbonChassisMat);
    rThigh.position.y = -0.16;
    rThigh.castShadow = true;
    this.rightLegGroup.add(rThigh);

    this.rightShinGroup.position.set(0, -0.32, 0);

    const rKnee = new THREE.Mesh(kneeActuatorGeo, darkTitaniumMat);
    rKnee.rotation.z = Math.PI / 2;
    rKnee.position.set(0, 0, 0.02);
    this.rightShinGroup.add(rKnee);

    const rShin = new THREE.Mesh(shinChassisGeo, ceramicWhiteMat);
    rShin.position.y = -0.14;
    rShin.castShadow = true;
    this.rightShinGroup.add(rShin);

    const rFoot = new THREE.Mesh(footBodyGeo, darkTitaniumMat);
    rFoot.position.set(0, -0.28, 0.04);
    rFoot.castShadow = true;
    this.rightShinGroup.add(rFoot);

    const rSole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.23), opticalCyanGlowMat);
    rSole.position.set(0, -0.34, 0.04);
    this.rightShinGroup.add(rSole);

    this.rightLegGroup.add(this.rightShinGroup);
    this.torsoGroup.add(this.rightLegGroup);

    // ==========================================
    // 6. HIGH-TECH AERODYNAMIC SCARF (6 Segments)
    // ==========================================
    const scarfCount = 6;
    for (let i = 0; i < scarfCount; i++) {
      const segWidth = 0.20 * (1 - i * 0.12);
      const segGeo = new THREE.BoxGeometry(segWidth, 0.03, 0.17);
      const segMesh = new THREE.Mesh(segGeo, scarfMat);
      segMesh.castShadow = true;
      this.group.add(segMesh);
      this.scarfSegments.push(segMesh);
      this.scarfPoints.push(new THREE.Vector3(0, 1.25, -0.18 - i * 0.16));
    }
  }

  public triggerLandSquash(intensity: number): void {
    this.landSquash = Math.min(0.42, intensity * 0.25);
  }

  public update(
    delta: number,
    state: CharacterAnimState,
    speed: number,
    isGrounded: boolean,
    verticalVelocity: number
  ): void {
    this.animTimer += delta;

    // Decay hydraulic squash
    if (this.landSquash > 0.001) {
      this.landSquash = THREE.MathUtils.lerp(this.landSquash, 0, delta * 15);
    } else {
      this.landSquash = 0;
    }

    const squashScaleY = 1 - this.landSquash;
    const squashScaleXZ = 1 + this.landSquash * 0.4;
    this.torsoGroup.scale.set(squashScaleXZ, squashScaleY, squashScaleXZ);

    if (state === CharacterAnimState.VICTORY) {
      // Triumphant robot pose
      this.leftArmGroup.rotation.set(-2.8, 0, -0.4);
      this.rightArmGroup.rotation.set(-2.8, 0, 0.4);
      this.leftForearmGroup.rotation.x = -0.2;
      this.rightForearmGroup.rotation.x = -0.2;
      this.leftLegGroup.rotation.set(0, 0, 0);
      this.rightLegGroup.rotation.set(0, 0, 0);
      this.torsoGroup.position.y = 0.95 + Math.sin(this.animTimer * 4) * 0.04;
      return;
    }

    if (!isGrounded) {
      // Airborne Jump / Thruster Kinematics
      if (verticalVelocity > 1) {
        // Jump thruster ascension
        this.leftLegGroup.rotation.x = -0.6;
        this.leftShinGroup.rotation.x = 0.75;
        this.rightLegGroup.rotation.x = -0.35;
        this.rightShinGroup.rotation.x = 0.45;

        this.leftArmGroup.rotation.set(0.8, 0, -0.25);
        this.rightArmGroup.rotation.set(0.8, 0, 0.25);
        this.leftForearmGroup.rotation.x = 0.35;
        this.rightForearmGroup.rotation.x = 0.35;

        this.torsoGroup.rotation.x = 0.12;
      } else {
        // High-speed fall
        const flail = Math.sin(this.animTimer * 14) * 0.22;
        this.leftLegGroup.rotation.x = 0.35 + flail;
        this.leftShinGroup.rotation.x = 0.25;
        this.rightLegGroup.rotation.x = -0.25 - flail;
        this.rightShinGroup.rotation.x = 0.18;

        this.leftArmGroup.rotation.set(-0.35, 0, -1.0 + flail * 0.3);
        this.rightArmGroup.rotation.set(-0.35, 0, 1.0 - flail * 0.3);
        this.leftForearmGroup.rotation.x = -0.35;
        this.rightForearmGroup.rotation.x = -0.35;

        this.torsoGroup.rotation.x = -0.18;
      }
    } else if (speed > 0.4) {
      // Crisp Robotic Stride Cycle
      const strideFreq = state === CharacterAnimState.SPRINT ? 14.5 : 10.0;
      const legStride = Math.sin(this.animTimer * strideFreq) * (state === CharacterAnimState.SPRINT ? 0.75 : 0.52);
      const armStride = -legStride * 0.85;

      this.leftLegGroup.rotation.x = legStride;
      this.leftShinGroup.rotation.x = Math.max(0, -legStride * 0.75);

      this.rightLegGroup.rotation.x = -legStride;
      this.rightShinGroup.rotation.x = Math.max(0, legStride * 0.75);

      this.leftArmGroup.rotation.x = armStride;
      this.leftForearmGroup.rotation.x = -Math.abs(armStride) * 0.35;

      this.rightArmGroup.rotation.x = -armStride;
      this.rightForearmGroup.rotation.x = -Math.abs(armStride) * 0.35;

      const bob = Math.abs(Math.sin(this.animTimer * strideFreq)) * 0.045;
      this.torsoGroup.position.y = 0.95 + bob - this.landSquash;
      this.torsoGroup.rotation.x = state === CharacterAnimState.SPRINT ? 0.20 : 0.10;
      this.torsoGroup.rotation.y = Math.sin(this.animTimer * strideFreq) * 0.07;
    } else {
      // Idle Chassis Standby (subtle optical servo hum)
      const breath = Math.sin(this.animTimer * 2.0) * 0.015;
      this.torsoGroup.position.y = 0.95 + breath - this.landSquash;
      this.torsoGroup.rotation.set(0, 0, 0);

      this.leftLegGroup.rotation.set(0, 0, 0);
      this.leftShinGroup.rotation.set(0, 0, 0);
      this.rightLegGroup.rotation.set(0, 0, 0);
      this.rightShinGroup.rotation.set(0, 0, 0);

      this.leftArmGroup.rotation.set(breath * 1.2, 0, -0.06);
      this.leftForearmGroup.rotation.set(0.08, 0, 0);
      this.rightArmGroup.rotation.set(breath * 1.2, 0, 0.06);
      this.rightForearmGroup.rotation.set(0.08, 0, 0);
    }

    this.updateScarf(delta, speed, verticalVelocity, isGrounded);
  }

  private updateScarf(delta: number, speed: number, verticalVelocity: number, isGrounded: boolean): void {
    const neckPos = new THREE.Vector3(0, 1.28, -0.16);
    this.torsoGroup.localToWorld(neckPos);

    this.scarfPoints[0].copy(neckPos);

    for (let i = 1; i < this.scarfPoints.length; i++) {
      const prev = this.scarfPoints[i - 1];
      const curr = this.scarfPoints[i];

      const target = prev.clone();
      const backOffset = new THREE.Vector3(0, 0, -0.16).applyQuaternion(this.group.quaternion);

      const lift = !isGrounded && verticalVelocity < -2 ? 0.18 : (speed > 1 ? 0.09 : -0.04);
      backOffset.y += lift;

      const flutter = Math.sin(this.animTimer * 11 + i * 1.2) * 0.035;
      backOffset.x += flutter;

      target.add(backOffset);
      curr.lerp(target, Math.min(1, delta * 22));

      const dist = curr.distanceTo(prev);
      const maxDist = 0.17;
      if (dist > maxDist) {
        const dir = curr.clone().sub(prev).normalize();
        curr.copy(prev).add(dir.multiplyScalar(maxDist));
      }

      const segMesh = this.scarfSegments[i];
      segMesh.position.copy(curr);
      segMesh.lookAt(prev);
    }

    this.scarfSegments[0].position.copy(neckPos);
    this.scarfSegments[0].quaternion.copy(this.group.quaternion);
  }
}

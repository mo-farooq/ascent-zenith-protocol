import type { AudioManager } from '../../src/core/Audio';

export class MockAudioManager {
  public jumpCalls = 0;
  public landingCalls: number[] = [];
  public launchPadCalls = 0;
  public footstepCalls: boolean[] = [];
  public thrusterDashCalls = 0;
  public fallScreamCalls = 0;
  public checkpointCalls = 0;
  public collectCalls = 0;
  public victoryFanfareCalls = 0;
  public altitudeUpdates: { altitude: number; verticalVelocity: number }[] = [];

  public init(): void {}
  public resumeContext(): void {}
  public setMasterVolume(_val: number): void {}
  public setMuted(_muted: boolean): void {}
  public toggleMute(): boolean { return false; }
  public isAudioMuted(): boolean { return false; }

  public playFootstep(isSprinting: boolean): void {
    this.footstepCalls.push(isSprinting);
  }

  public playJump(): void {
    this.jumpCalls++;
  }

  public playLanding(fallDistance: number): void {
    this.landingCalls.push(fallDistance);
  }

  public playLaunchPad(): void {
    this.launchPadCalls++;
  }

  public playThrusterDash(): void {
    this.thrusterDashCalls++;
  }

  public playCollect(): void {
    this.collectCalls++;
  }

  public playCheckpoint(): void {
    this.checkpointCalls++;
  }

  public playFallScream(): void {
    this.fallScreamCalls++;
  }

  public playVictoryFanfare(): void {
    this.victoryFanfareCalls++;
  }

  public updateAltitude(altitude: number, verticalVelocity: number): void {
    this.altitudeUpdates.push({ altitude, verticalVelocity });
  }

  public asAudioManager(): AudioManager {
    return this as unknown as AudioManager;
  }

  public reset(): void {
    this.jumpCalls = 0;
    this.landingCalls = [];
    this.launchPadCalls = 0;
    this.footstepCalls = [];
    this.thrusterDashCalls = 0;
    this.fallScreamCalls = 0;
    this.checkpointCalls = 0;
    this.collectCalls = 0;
    this.victoryFanfareCalls = 0;
    this.altitudeUpdates = [];
  }
}

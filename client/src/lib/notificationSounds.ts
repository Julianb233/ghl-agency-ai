/**
 * Notification Sound Utility
 *
 * Manages notification sounds using Web Audio API.
 */

export type SoundType = 'success' | 'error' | 'warning' | 'info' | 'agent-update';

export class NotificationSounds {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window === 'undefined') return;

    // In some environments (e.g. jsdom), `AudioContext` may exist but not be constructible.
    const Ctor =
      (window as any).AudioContext ??
      (window as any).webkitAudioContext ??
      undefined;

    if (typeof Ctor !== 'function') return;

    try {
      this.audioContext = new Ctor();
    } catch {
      // Gracefully degrade: no sounds in environments that don't support AudioContext.
      this.audioContext = null;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private createOscillator(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playSuccessSound() {
    if (!this.audioContext) return;

    // Two-tone ascending chime
    this.createOscillator(523.25, 0.1); // C5
    setTimeout(() => this.createOscillator(659.25, 0.15), 50); // E5
  }

  private playErrorSound() {
    if (!this.audioContext) return;

    // Low descending tones
    this.createOscillator(392, 0.15, 'square'); // G4
    setTimeout(() => this.createOscillator(293.66, 0.2, 'square'), 80); // D4
  }

  private playWarningSound() {
    if (!this.audioContext) return;

    // Single middle tone
    this.createOscillator(440, 0.15, 'triangle'); // A4
  }

  private playInfoSound() {
    if (!this.audioContext) return;

    // Short single tone
    this.createOscillator(523.25, 0.1); // C5
  }

  private playAgentUpdateSound() {
    if (!this.audioContext) return;

    // Quick triple beep
    this.createOscillator(587.33, 0.05); // D5
    setTimeout(() => this.createOscillator(587.33, 0.05), 60);
    setTimeout(() => this.createOscillator(587.33, 0.05), 120);
  }

  play(soundType: SoundType) {
    if (!this.enabled || !this.audioContext) return;

    // Resume audio context if suspended (required for autoplay policies)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    switch (soundType) {
      case 'success':
        this.playSuccessSound();
        break;
      case 'error':
        this.playErrorSound();
        break;
      case 'warning':
        this.playWarningSound();
        break;
      case 'info':
        this.playInfoSound();
        break;
      case 'agent-update':
        this.playAgentUpdateSound();
        break;
    }
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const notificationSounds = new NotificationSounds();

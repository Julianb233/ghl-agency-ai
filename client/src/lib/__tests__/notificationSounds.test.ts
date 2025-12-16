/**
 * NotificationSounds Tests
 *
 * Unit tests for the notification sound utility.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotificationSounds } from '../notificationSounds';

// Mock AudioContext
class MockAudioContext {
  state: 'suspended' | 'running' = 'running';
  currentTime = 0;

  createOscillator() {
    return new MockOscillator();
  }

  createGain() {
    return new MockGainNode();
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }

  get destination() {
    return {};
  }
}

class MockOscillator {
  frequency = { value: 0 };
  type: OscillatorType = 'sine';

  connect() {
    return this;
  }

  start() {}
  stop() {}
}

class MockGainNode {
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };

  connect() {
    return this;
  }
}

describe('NotificationSounds', () => {
  let sounds: any;
  let originalAudioContext: any;

  beforeEach(() => {
    // Mock AudioContext globally
    originalAudioContext = global.AudioContext;
    (global as any).AudioContext = MockAudioContext;

    // Create a new instance for each test
    sounds = new (NotificationSounds as any)();
  });

  afterEach(() => {
    global.AudioContext = originalAudioContext;
    sounds.cleanup();
  });

  it('initializes with sound enabled', () => {
    expect(sounds.isEnabled()).toBe(true);
  });

  it('can enable/disable sounds', () => {
    sounds.setEnabled(false);
    expect(sounds.isEnabled()).toBe(false);

    sounds.setEnabled(true);
    expect(sounds.isEnabled()).toBe(true);
  });

  it('does not play sound when disabled', () => {
    const createOscillatorSpy = vi.spyOn(sounds.audioContext, 'createOscillator');

    sounds.setEnabled(false);
    sounds.play('success');

    expect(createOscillatorSpy).not.toHaveBeenCalled();
  });

  it('plays success sound', () => {
    const createOscillatorSpy = vi.spyOn(sounds.audioContext, 'createOscillator');

    sounds.play('success');

    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('plays error sound', () => {
    const createOscillatorSpy = vi.spyOn(sounds.audioContext, 'createOscillator');

    sounds.play('error');

    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('plays warning sound', () => {
    const createOscillatorSpy = vi.spyOn(sounds.audioContext, 'createOscillator');

    sounds.play('warning');

    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('plays info sound', () => {
    const createOscillatorSpy = vi.spyOn(sounds.audioContext, 'createOscillator');

    sounds.play('info');

    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('plays agent-update sound', () => {
    const createOscillatorSpy = vi.spyOn(sounds.audioContext, 'createOscillator');

    sounds.play('agent-update');

    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('resumes suspended audio context', async () => {
    sounds.audioContext.state = 'suspended';
    const resumeSpy = vi.spyOn(sounds.audioContext, 'resume');

    sounds.play('info');

    expect(resumeSpy).toHaveBeenCalled();
  });

  it('cleans up audio context', () => {
    const closeSpy = vi.spyOn(sounds.audioContext, 'close');

    sounds.cleanup();

    expect(closeSpy).toHaveBeenCalled();
    expect(sounds.audioContext).toBeNull();
  });

  it('handles missing AudioContext gracefully', () => {
    // Completely remove AudioContext to simulate unsupported browser
    const savedAudioContext = global.AudioContext;
    delete (global as any).AudioContext;
    delete (window as any).AudioContext;

    const soundsWithoutAudio = new (NotificationSounds as any)();

    // Should not throw
    expect(() => {
      soundsWithoutAudio.play('success');
    }).not.toThrow();

    // Restore for other tests
    global.AudioContext = savedAudioContext;
  });
});

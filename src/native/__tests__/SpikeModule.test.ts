/**
 * SpikeModule unit tests — Task 8.1 compatibility verification.
 *
 * These tests verify the TypeScript interface is correct.
 * Actual bridge verification requires a real device/simulator build.
 */

import { spikePing, spikeGetPlatform } from '../SpikeModule';

// Mock the native module for unit tests.
jest.mock('react-native', () => ({
  NativeModules: {
    SpikeModule: {
      ping: jest.fn().mockResolvedValue('ok'),
      getPlatform: jest.fn().mockResolvedValue('ios'),
    },
  },
}));

describe('SpikeModule TypeScript interface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('spikePing returns "ok" from native module', async () => {
    const result = await spikePing();
    expect(result).toBe('ok');
  });

  it('spikeGetPlatform returns the platform string', async () => {
    const result = await spikeGetPlatform();
    expect(result).toBe('ios');
  });
});

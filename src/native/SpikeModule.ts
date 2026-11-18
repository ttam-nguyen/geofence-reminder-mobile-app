/**
 * SpikeModule — TypeScript interface for Task 8.1 compatibility verification.
 *
 * Exposes the minimal native module (SpikeModule) for both iOS and Android.
 * This interface will be REMOVED after Task 8.1 passes and replaced by the
 * full GeofencingModule TypeScript interface.
 */

import { NativeModules } from 'react-native';

const { SpikeModule } = NativeModules;

if (!SpikeModule) {
  throw new Error('SpikeModule native module not found. Check that it is registered correctly.');
}

/**
 * Call the native `ping()` method. Returns "ok" if the bridge works.
 */
export async function spikePing(): Promise<string> {
  return SpikeModule.ping();
}

/**
 * Call the native `getPlatform()` method. Returns "ios" or "android".
 */
export async function spikeGetPlatform(): Promise<string> {
  return SpikeModule.getPlatform();
}

/**
 * Type definition for the SpikeModule native interface.
 */
export interface SpikeModuleInterface {
  ping(): Promise<string>;
  getPlatform(): Promise<string>;
}

export default SpikeModule;

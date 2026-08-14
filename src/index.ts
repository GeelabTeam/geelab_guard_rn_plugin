import { NativeModules } from 'react-native';
import TurboModule, { type Spec } from './NativeGeelabGuard';
import {
  GeelabGuardError,
  invalidArgument,
  normalizeNativeError,
} from './errors';
import type { GeelabGuardReceipt } from './types';

const Native = (TurboModule ?? NativeModules.GeelabGuard) as Spec | undefined;

if (!Native) {
  throw new Error(
    'GeelabGuard is not linked. Rebuild the native app after installation.'
  );
}

const requireNonEmptyString = (value: string, name: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidArgument(name);
  }
  return value;
};

const requireString = (value: string, name: string): string => {
  if (typeof value !== 'string') throw invalidArgument(name, 'a string');
  return value;
};

const callNative = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw normalizeNativeError(error);
  }
};

export const GeelabGuard = {
  async initialize(appId: string, serverUrl?: string): Promise<void> {
    requireNonEmptyString(appId, 'appId');
    if (serverUrl !== undefined) {
      requireNonEmptyString(serverUrl, 'serverUrl');
    }
    return callNative(() => Native.initialize(appId, serverUrl ?? null));
  },
  async fetchReceipt(signData: string): Promise<GeelabGuardReceipt> {
    requireString(signData, 'signData');
    return callNative(() => Native.fetchReceipt(signData));
  },
  async submitReceipt(signData: string): Promise<GeelabGuardReceipt> {
    requireString(signData, 'signData');
    return callNative(() => Native.submitReceipt(signData));
  },
  async getVersion(): Promise<string> {
    return callNative(() => Native.getVersion());
  },
};

export { GeelabGuardError };
export type { GeelabGuardErrorCode, GeelabGuardReceipt } from './types';

export default GeelabGuard;

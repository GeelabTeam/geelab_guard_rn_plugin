import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeGeelabGuardReceipt = {
  appId: string | null;
  geeToken: string | null;
  geeId: string | null;
  geeIdTimestamp: string | null;
  respondedGeeToken: string | null;
  originalResponseBase64: string | null;
};

export interface Spec extends TurboModule {
  initialize(appId: string, serverUrl: string | null): Promise<void>;
  fetchReceipt(signData: string): Promise<NativeGeelabGuardReceipt>;
  submitReceipt(signData: string): Promise<NativeGeelabGuardReceipt>;
  getVersion(): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('GeelabGuard');

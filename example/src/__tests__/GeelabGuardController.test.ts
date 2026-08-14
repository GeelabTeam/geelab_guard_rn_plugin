import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { createGeelabGuardController } from '../GeelabGuardController';

const receipt = {
  appId: 'secret-app-id',
  geeToken: 'secret-token',
  geeId: 'secret-id',
  geeIdTimestamp: 'secret-timestamp',
  respondedGeeToken: 'secret-response-token',
  originalResponseBase64: 'secret-response',
};

const fallbackCases: Array<[string, number]> = [
  ['NETWORK_ERROR', -300],
  ['INVALID_RESPONSE', -500],
  ['SERVICE_FAILURE', -501],
];

describe('GeelabGuard example controller', () => {
  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('forwards initialization without exposing its arguments', async () => {
    const native = createNative();
    const controller = createGeelabGuardController(native);

    const result = await controller.initialize(
      'secret-app-id',
      'https://server'
    );

    expect(native.initialize).toHaveBeenCalledWith(
      'secret-app-id',
      'https://server'
    );
    expect(result).toEqual({
      status: 'success',
      operation: 'initialize',
      message: 'SDK initialized',
    });
    expect(JSON.stringify(result)).not.toContain('secret-app-id');
    expect(JSON.stringify(result)).not.toContain('https://server');
  });

  it('returns the complete local receipt for inspection', async () => {
    const native = createNative();
    const controller = createGeelabGuardController(native);

    const result = await controller.fetchReceipt('secret-sign-data');

    expect(result).toEqual({
      status: 'success',
      operation: 'fetchReceipt',
      message: 'Local receipt created',
      receipt,
    });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it.each(fallbackCases)(
    'marks %s submission errors with a receipt as fallback eligible',
    async (code, nativeCode) => {
      const native = createNative();
      native.submitReceipt.mockRejectedValue({
        code,
        nativeCode,
        message: `Native failure ${nativeCode}`,
        receipt,
      });
      const controller = createGeelabGuardController(native);

      const result = await controller.submitReceipt('secret-sign-data');

      expect(result).toEqual({
        status: 'error',
        operation: 'submitReceipt',
        message: `Native failure ${nativeCode}`,
        errorCode: code,
        nativeCode,
        receipt,
        canFallbackToGeeToken: true,
      });
      expect(logSpy).not.toHaveBeenCalled();
    }
  );

  it('does not mark unrelated errors as fallback eligible', async () => {
    const native = createNative();
    native.submitReceipt.mockRejectedValue({
      code: 'UNKNOWN_NATIVE_ERROR',
      nativeCode: -999,
      message: 'Unexpected native status',
      receipt,
    });
    const controller = createGeelabGuardController(native);

    const result = await controller.submitReceipt('secret-sign-data');

    expect(result).toEqual({
      status: 'error',
      operation: 'submitReceipt',
      message: 'Unexpected native status',
      errorCode: 'UNKNOWN_NATIVE_ERROR',
      nativeCode: -999,
      receipt,
      canFallbackToGeeToken: false,
    });
  });

  it('omits token state when an error has no fallback receipt', async () => {
    const native = createNative();
    native.initialize.mockRejectedValue({ code: 'INVALID_ARGUMENT' });
    const controller = createGeelabGuardController(native);

    const result = await controller.initialize('', undefined);

    expect(result).toEqual({
      status: 'error',
      operation: 'initialize',
      message: 'Operation failed',
      errorCode: 'INVALID_ARGUMENT',
      nativeCode: null,
      canFallbackToGeeToken: false,
    });
  });

  it('returns the native SDK version', async () => {
    const native = createNative();
    const controller = createGeelabGuardController(native);

    await expect(controller.getVersion()).resolves.toBe('2.8.1');
  });
});

function createNative() {
  return {
    initialize: jest
      .fn<(appId: string, serverUrl?: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    fetchReceipt: jest
      .fn<(signData: string) => Promise<typeof receipt>>()
      .mockResolvedValue(receipt),
    submitReceipt: jest
      .fn<(signData: string) => Promise<typeof receipt>>()
      .mockResolvedValue(receipt),
    getVersion: jest.fn<() => Promise<string>>().mockResolvedValue('2.8.1'),
  };
}

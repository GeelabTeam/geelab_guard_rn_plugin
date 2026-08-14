import { afterEach, describe, expect, it, jest } from '@jest/globals';

type NativeBoundary = {
  initialize: jest.Mock<
    (appId: string, serverUrl: string | null) => Promise<void>
  >;
  fetchReceipt: jest.Mock<(signData: string) => Promise<unknown>>;
  submitReceipt: jest.Mock<(signData: string) => Promise<unknown>>;
  getVersion: jest.Mock<() => Promise<string>>;
};

const createNativeBoundary = (): NativeBoundary => ({
  initialize: jest
    .fn<(appId: string, serverUrl: string | null) => Promise<void>>()
    .mockResolvedValue(undefined),
  fetchReceipt: jest
    .fn<(signData: string) => Promise<unknown>>()
    .mockResolvedValue({ geeToken: 'local-token' }),
  submitReceipt: jest
    .fn<(signData: string) => Promise<unknown>>()
    .mockResolvedValue({
      geeToken: 'local-token',
      respondedGeeToken: 'responded-token',
    }),
  getVersion: jest.fn<() => Promise<string>>().mockResolvedValue('2.8.1'),
});

const loadFacade = async (
  turboModule: NativeBoundary | null,
  legacyModule: NativeBoundary | undefined = undefined
) => {
  jest.resetModules();
  jest.doMock('../NativeGeelabGuard', () => ({
    __esModule: true,
    default: turboModule,
  }));
  jest.doMock('react-native', () => ({
    NativeModules: { GeelabGuard: legacyModule },
  }));

  return import('../index');
};

describe('GeelabGuard facade', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefers the TurboModule and forwards initialize arguments', async () => {
    const native = createNativeBoundary();
    const legacy = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(native, legacy);

    await GeelabGuard.initialize(
      'app-id',
      'https://riskct-eu.geelabapi.com/api/v1/client_report'
    );

    expect(native.initialize).toHaveBeenCalledWith(
      'app-id',
      'https://riskct-eu.geelabapi.com/api/v1/client_report'
    );
    expect(legacy.initialize).not.toHaveBeenCalled();
  });

  it('falls back to the legacy Native Module', async () => {
    const legacy = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(null, legacy);

    await GeelabGuard.getVersion();

    expect(legacy.getVersion).toHaveBeenCalledTimes(1);
  });

  it('reports the documented rebuild error when native code is not linked', async () => {
    await expect(loadFacade(null)).rejects.toThrow(
      'GeelabGuard is not linked. Rebuild the native app after installation.'
    );
  });

  it('forwards an omitted server URL as null', async () => {
    const native = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(native);

    await GeelabGuard.initialize('app-id');

    expect(native.initialize).toHaveBeenCalledWith('app-id', null);
  });

  it('rejects an empty app ID before calling native code', async () => {
    const native = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(native);

    await expect(GeelabGuard.initialize('')).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      nativeCode: null,
    });
    expect(native.initialize).not.toHaveBeenCalled();
  });

  it('rejects an explicitly empty server URL before calling native code', async () => {
    const native = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(native);

    await expect(GeelabGuard.initialize('app-id', '')).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    expect(native.initialize).not.toHaveBeenCalled();
  });

  it.each(['fetchReceipt', 'submitReceipt'] as const)(
    'rejects a non-string signData for %s',
    async (method) => {
      const native = createNativeBoundary();
      const { GeelabGuard } = await loadFacade(native);

      await expect(GeelabGuard[method](null as never)).rejects.toMatchObject({
        code: 'INVALID_ARGUMENT',
      });
      expect(native[method]).not.toHaveBeenCalled();
    }
  );

  it('allows empty signData and returns a local receipt', async () => {
    const native = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(native);

    await expect(GeelabGuard.fetchReceipt('')).resolves.toEqual({
      geeToken: 'local-token',
    });
    expect(native.fetchReceipt).toHaveBeenCalledWith('');
  });

  it('forwards submitReceipt and getVersion', async () => {
    const native = createNativeBoundary();
    const { GeelabGuard } = await loadFacade(native);

    await expect(GeelabGuard.submitReceipt('order-1')).resolves.toMatchObject({
      respondedGeeToken: 'responded-token',
    });
    await expect(GeelabGuard.getVersion()).resolves.toBe('2.8.1');

    expect(native.submitReceipt).toHaveBeenCalledWith('order-1');
    expect(native.getVersion).toHaveBeenCalledTimes(1);
  });

  it.each<[number, string]>([
    [-200, 'NOT_INITIALIZED'],
    [-300, 'NETWORK_ERROR'],
    [-500, 'INVALID_RESPONSE'],
    [-501, 'SERVICE_FAILURE'],
  ])('maps native code %i to %s', async (nativeCode, publicCode) => {
    const native = createNativeBoundary();
    native.submitReceipt.mockRejectedValue({ code: String(nativeCode) });
    const { GeelabGuard } = await loadFacade(native);

    await expect(GeelabGuard.submitReceipt('order-1')).rejects.toMatchObject({
      code: publicCode,
      nativeCode,
    });
  });

  it('preserves a fallback receipt on network failure', async () => {
    const native = createNativeBoundary();
    native.submitReceipt.mockRejectedValue({
      code: '-300',
      userInfo: {
        nativeCode: -300,
        receipt: { geeToken: 'fallback-token' },
      },
    });
    const { GeelabGuard } = await loadFacade(native);

    await expect(GeelabGuard.submitReceipt('order-1')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      nativeCode: -300,
      receipt: { geeToken: 'fallback-token' },
    });
  });

  it('maps undocumented native failures to UNKNOWN_NATIVE_ERROR', async () => {
    const native = createNativeBoundary();
    native.fetchReceipt.mockRejectedValue({ code: '999' });
    const { GeelabGuard, GeelabGuardError } = await loadFacade(native);

    const rejection = GeelabGuard.fetchReceipt('order-1');
    await expect(rejection).rejects.toBeInstanceOf(GeelabGuardError);
    await expect(rejection).rejects.toMatchObject({
      code: 'UNKNOWN_NATIVE_ERROR',
      nativeCode: 999,
    });
  });
});

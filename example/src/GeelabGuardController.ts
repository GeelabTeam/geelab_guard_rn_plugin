type ReceiptDetails = {
  appId: string | null;
  geeToken: string | null;
  geeId: string | null;
  geeIdTimestamp: string | null;
  respondedGeeToken: string | null;
  originalResponseBase64: string | null;
};

type GeelabGuardClient = {
  initialize(appId: string, serverUrl?: string): Promise<void>;
  fetchReceipt(signData: string): Promise<ReceiptDetails>;
  submitReceipt(signData: string): Promise<ReceiptDetails>;
  getVersion(): Promise<string>;
};

type Operation = 'initialize' | 'fetchReceipt' | 'submitReceipt';

export type PublicOperationResult = {
  status: 'success' | 'error';
  operation: Operation;
  message: string;
  errorCode?: string;
  nativeCode?: number | null;
  receipt?: ReceiptDetails;
  canFallbackToGeeToken?: boolean;
};

const FALLBACK_ERROR_CODES = new Set([
  'NETWORK_ERROR',
  'INVALID_RESPONSE',
  'SERVICE_FAILURE',
]);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const publicFailure = (
  operation: Operation,
  error: unknown
): PublicOperationResult => {
  const nativeError = asRecord(error);
  const receipt = asRecord(nativeError?.receipt);
  const errorCode =
    typeof nativeError?.code === 'string'
      ? nativeError.code
      : 'UNKNOWN_NATIVE_ERROR';
  const nativeCode =
    typeof nativeError?.nativeCode === 'number' ? nativeError.nativeCode : null;
  const normalizedReceipt = receipt as ReceiptDetails | undefined;
  const result: PublicOperationResult = {
    status: 'error',
    operation,
    message:
      typeof nativeError?.message === 'string'
        ? nativeError.message
        : 'Operation failed',
    errorCode,
    nativeCode,
    canFallbackToGeeToken:
      operation === 'submitReceipt' &&
      FALLBACK_ERROR_CODES.has(errorCode) &&
      typeof normalizedReceipt?.geeToken === 'string' &&
      normalizedReceipt.geeToken.length > 0,
  };
  if (normalizedReceipt) result.receipt = normalizedReceipt;
  return result;
};

export const createGeelabGuardController = (client: GeelabGuardClient) => ({
  async initialize(
    appId: string,
    serverUrl?: string
  ): Promise<PublicOperationResult> {
    try {
      await client.initialize(appId, serverUrl);
      return {
        status: 'success',
        operation: 'initialize',
        message: 'SDK initialized',
      };
    } catch (error) {
      return publicFailure('initialize', error);
    }
  },

  async fetchReceipt(signData: string): Promise<PublicOperationResult> {
    try {
      const receipt = await client.fetchReceipt(signData);
      return {
        status: 'success',
        operation: 'fetchReceipt',
        message: 'Local receipt created',
        receipt,
      };
    } catch (error) {
      return publicFailure('fetchReceipt', error);
    }
  },

  async submitReceipt(signData: string): Promise<PublicOperationResult> {
    try {
      const receipt = await client.submitReceipt(signData);
      return {
        status: 'success',
        operation: 'submitReceipt',
        message: 'Receipt submitted',
        receipt,
      };
    } catch (error) {
      return publicFailure('submitReceipt', error);
    }
  },

  getVersion(): Promise<string> {
    return client.getVersion();
  },
});
